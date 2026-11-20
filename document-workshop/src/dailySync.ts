import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { formatParisDate } from "../../shared/parisDate";
import { workshopRunnerControlSchema, type WorkshopRunEvent, type WorkshopRunIssue, type WorkshopRunnerControl } from "../../shared/workshopControl";
import { workshopApprovedOrdersSchema } from "../../shared/workshopOrders";
import { workshopWeatherSchema, type WorkshopWeather } from "../../shared/workshopWeather";
import { offsetDate } from "./calendar";
import { recipeById } from "./catalog";
import { continuationStart, parseCheckpointFile, validateCheckpoint } from "./continuation";
import { dailyForecast } from "./dailyForecast";
import { requestWorkshop, WorkshopRequestError } from "./dailySyncClient";
import type { SyncConfig } from "./dailySyncConfig";
import { dailyOperations } from "./dailyOperations";
import { dailyStock } from "./dailyStock";
import { dailySales } from "./documents";
import type { Checkpoint, Options, Scenario } from "./model";
import { defaultScenarioOptions, generateScenario } from "./scenario";

async function readCheckpoint(file: string) {
  try {
    return parseCheckpointFile(await readFile(file, "utf8"));
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
    return undefined;
  }
}

async function writeState(file: string, state: unknown) {
  const temporaryDirectory = await mkdtemp(join(dirname(file), ".workshop-"));
  try {
    const temporaryFile = join(temporaryDirectory, "checkpoint.json");
    await writeFile(temporaryFile, JSON.stringify(state), { mode: 0o600 });
    await rename(temporaryFile, file);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

const acknowledgmentSchema = z.object({ date: z.iso.date(), replayed: z.boolean(),
  stockApplied: z.literal(true).optional(), operationsApplied: z.literal(true).optional() });
const forecastAcknowledgmentSchema = z.object({ date: z.iso.date() });

function dayPayload(config: SyncConfig, scenario: Scenario) {
  const day = scenario.days[0];
  const sales = Array.from(dailySales(day).articles, ([recipeId, { sold }]) => ({
    name: recipeById(recipeId).name.normalize("NFC"),
    quantity: sold,
  }));
  return {
    open: day.open,
    sales,
    ...(config.includeStock ? { stock: dailyStock(scenario) } : {}),
    ...(config.includeOperations ? { operations: dailyOperations(scenario) } : {}),
  };
}

async function sendDay(config: SyncConfig, date: string, payload: unknown) {
  const response = await requestWorkshop(config, `/api/integrations/workshop/days/${date}`, date, payload);
  const acknowledgment = acknowledgmentSchema.safeParse(response);
  if (!acknowledgment.success || acknowledgment.data.date !== date
    || (config.includeStock && acknowledgment.data.stockApplied !== true)
    || (config.includeOperations && acknowledgment.data.operationsApplied !== true)) {
    throw new Error(`Kookia n’a pas confirmé la réception du ${date}.`);
  }
  return acknowledgment.data.replayed;
}

const preparedDaySchema = z.strictObject({ payload: z.json(), checkpoint: z.unknown() });

async function readPreparedDay(file: string, date: string) {
  let raw: string;
  try { raw = await readFile(file, "utf8"); }
  catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw cause;
  }
  const prepared = preparedDaySchema.parse(JSON.parse(raw));
  const checkpoint = validateCheckpoint(prepared.checkpoint);
  if (checkpoint.asOf < date) return undefined;
  if (checkpoint.asOf !== date) throw new Error("La journée préparée ne correspond pas à la reprise de l’atelier.");
  return { payload: prepared.payload, checkpoint };
}

const weatherStateSchema = z.array(z.strictObject({ date: z.iso.date(), weather: workshopWeatherSchema })).max(7);
const unavailableWeather: WorkshopWeather = { hasTerrace: null, forecast: null };

async function captureWeather(config: SyncConfig, today: string) {
  const file = `${config.stateFile}.weather`;
  let saved: z.infer<typeof weatherStateSchema> = [];
  try { saved = weatherStateSchema.parse(JSON.parse(await readFile(file, "utf8"))); }
  catch (cause) {
    if (!(cause instanceof SyntaxError) && !(cause instanceof z.ZodError) && (cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
  }
  const byDate = new Map(saved.map(row => [row.date, row.weather]));
  if (!byDate.get(today)?.forecast) {
    let observed: WorkshopWeather | undefined;
    try {
      observed = workshopWeatherSchema.parse(await requestWorkshop(config, "/api/integrations/workshop/weather", today));
    } catch {
      console.warn(`Météo de Kookia indisponible pour le ${today}. Le transfert continue.`);
    }
    if (observed) {
      byDate.set(today, observed);
      await writeState(file, [...byDate].sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([date, weather]) => ({ date, weather })));
    }
  }
  return (date: string) => date >= config.liveWeatherFrom! ? byDate.get(date) ?? unavailableWeather : undefined;
}

type SyncStage = Pick<WorkshopRunEvent, "date" | "step">;
const runAcknowledgment = z.strictObject({ ok: z.literal(true) });

async function transferDays(config: SyncConfig, today: string, control?: WorkshopRunnerControl,
  setStage?: (stage: SyncStage) => Promise<void>) {
  const through = offsetDate(today, -1);
  const profile = defaultScenarioOptions(config.startDate, 1);
  const variedProfile: Options = { ...profile, incident: "mixed", weather: "varied", hasTerrace: true };
  const connectedOn = (date: string) => Boolean(config.followOrdersFrom && date >= config.followOrdersFrom);
  const controlledOn = (date: string) => Boolean(control && config.controlFrom && date >= config.controlFrom);
  const settings = [...(control?.settings ?? [])].sort((a, b) =>
    (b.effectiveFrom ?? "").localeCompare(a.effectiveFrom ?? "") || b.revision - a.revision);
  const profileFor = (date: string): Options => {
    const base = connectedOn(date) || (config.variationFrom && date >= config.variationFrom) ? variedProfile : profile;
    if (!controlledOn(date)) return base;
    const setting = settings.find(version => version.effectiveFrom === null || version.effectiveFrom <= date);
    return { ...base, incident: "mixed", ...(setting && { covers: setting.covers, incidentEvery: setting.incidentEvery }),
      weeklyServices: control?.weeklyServices };
  };
  const pendingFile = `${config.stateFile}.pending`;
  const opening = config.openingFile ? await readCheckpoint(config.openingFile) : undefined;
  if (config.openingFile && !opening) throw new Error("Le fichier de reprise initiale est introuvable.");
  if (opening && (continuationStart(opening) !== config.startDate || opening.seed !== profile.seed)) {
    throw new Error("La reprise initiale doit précéder immédiatement la première journée à transmettre et conserver le numéro du dossier.");
  }

  const state = await readCheckpoint(config.stateFile);
  const originStart = opening?.originStart ?? config.startDate;
  if (state && (state.originStart !== originStart || state.seed !== profile.seed || state.asOf < config.startDate)) {
    throw new Error("Le fichier de reprise ne correspond pas au dossier planifié.");
  }

  const weatherFor = config.liveWeatherFrom && today >= config.liveWeatherFrom ? await captureWeather(config, today) : () => undefined;

  let checkpoint = state ?? opening;
  let date = checkpoint ? continuationStart(checkpoint) : config.startDate;
  let imported = 0;
  let replayed = 0;
  let confirmedDate: string | null = null;
  while (date <= through) {
    await setStage?.({ date, step: "prepare" });
    const connected = connectedOn(date);
    const weather = weatherFor(date);
    const replayPrepared = connected || weather !== undefined || controlledOn(date);
    let prepared: { payload: unknown; checkpoint: Checkpoint } | undefined = replayPrepared ? await readPreparedDay(pendingFile, date) : undefined;
    if (!prepared) {
      if (connected) await setStage?.({ date, step: "orders" });
      const approved = connected ? workshopApprovedOrdersSchema.parse(
        await requestWorkshop(config, `/api/integrations/workshop/approved-orders/${date}`, date)) : undefined;
      await setStage?.({ date, step: "prepare" });
      const scenario = generateScenario({ ...profileFor(date), start: date }, checkpoint, approved, weather,
        controlledOn(date) ? profileFor : undefined);
      prepared = { payload: dayPayload(config, scenario), checkpoint: scenario.checkpoint };
      if (replayPrepared) await writeState(pendingFile, prepared);
    }
    if (prepared.checkpoint.originStart !== originStart || prepared.checkpoint.seed !== profile.seed)
      throw new Error("La journée préparée ne correspond pas au dossier planifié.");
    await setStage?.({ date, step: "import" });
    let alreadyReceived: boolean;
    try { alreadyReceived = await sendDay(config, date, prepared.payload); }
    catch (cause) {
      if (connected && cause instanceof WorkshopRequestError && cause.issue.code === "ORDER_CHANGED") await rm(pendingFile, { force: true });
      throw cause;
    }
    await writeState(config.stateFile, prepared.checkpoint);
    if (replayPrepared) await rm(pendingFile, { force: true });
    checkpoint = prepared.checkpoint;
    confirmedDate = date;
    date = continuationStart(checkpoint);
    if (alreadyReceived) replayed += 1;
    else imported += 1;
  }
  if (config.includeForecast && checkpoint?.asOf === through) {
    await setStage?.({ date: today, step: "forecast" });
    const forecast = dailyForecast(today, checkpoint, profileFor(today), connectedOn(today), weatherFor(today),
      controlledOn(today) ? profileFor : undefined);
    const response = await requestWorkshop(config, `/api/integrations/workshop/forecast/${today}`, today, forecast);
    const acknowledgment = forecastAcknowledgmentSchema.safeParse(response);
    if (!acknowledgment.success || acknowledgment.data.date !== today) {
      throw new Error(`Kookia n’a pas confirmé la prévision du ${today}.`);
    }
    confirmedDate = today;
  }

  return { imported, replayed, confirmedDate };
}

export async function syncDaily(config: SyncConfig, now = new Date(), retryRequested = false) {
  const today = formatParisDate(now);
  if (!config.controlFrom || today < config.controlFrom) {
    if (retryRequested) return undefined;
    const { imported, replayed } = await transferDays(config, today);
    return { imported, replayed };
  }

  const control = workshopRunnerControlSchema.safeParse(await requestWorkshop(config, "/api/integrations/workshop/control", today));
  if (!control.success) throw new Error("Kookia a transmis des réglages d’atelier invalides.");
  if (retryRequested && !control.data.retryRequested) return undefined;

  const id = randomUUID();
  let stage: SyncStage = { date: null, step: "prepare" };
  async function publish(event: Omit<WorkshopRunEvent, "id">) {
    const response = await requestWorkshop(config, "/api/integrations/workshop/run", event.date ?? today, { id, ...event });
    if (!runAcknowledgment.safeParse(response).success) throw new Error("Kookia n’a pas confirmé l’état du transfert.");
  }
  try {
    await publish({ state: "running", ...stage, issue: null });
  } catch (cause) {
    if (cause instanceof WorkshopRequestError && cause.issue.status === 409) return undefined;
    throw cause;
  }

  let lastReportAt = Date.now();
  async function setStage(nextStage: SyncStage) {
    stage = nextStage;
    // Refresh the server lease during a multi-day catch-up.
    if (Date.now() - lastReportAt < 10 * 60_000) return;
    await publish({ state: "running", ...stage, issue: null });
    lastReportAt = Date.now();
  }

  let result: Awaited<ReturnType<typeof transferDays>>;
  try {
    result = await transferDays(config, today, control.data, setStage);
  } catch (cause) {
    const fallbackCode = cause instanceof z.ZodError ? "INVALID_INPUT" : stage.step === "forecast" ? "FORECAST" : "UNKNOWN";
    const incomingIssue = cause instanceof WorkshopRequestError ? cause.issue : null;
    const issue: WorkshopRunIssue = { product: null, status: null, ...incomingIssue,
      code: incomingIssue && incomingIssue.code !== "UNKNOWN" ? incomingIssue.code : fallbackCode };
    try {
      await publish({ state: "failed", ...stage, issue });
    } catch {
      console.warn("Kookia n’a pas confirmé le signalement de l’échec du transfert.");
    }
    throw cause;
  }

  const { imported, replayed, confirmedDate } = result;
  await publish({ state: "succeeded", date: confirmedDate, step: null, issue: null });
  return { imported, replayed };
}
