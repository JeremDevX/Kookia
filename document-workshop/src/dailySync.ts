import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { z } from "zod";
import { formatParisDate } from "../../shared/parisDate";
import { workshopApprovedOrdersSchema } from "../../shared/workshopOrders";
import { workshopWeatherSchema, type WorkshopWeather } from "../../shared/workshopWeather";
import { offsetDate } from "./calendar";
import { recipeById } from "./catalog";
import { continuationStart, parseCheckpointFile, validateCheckpoint } from "./continuation";
import { dailyForecast } from "./dailyForecast";
import { dailyOperations } from "./dailyOperations";
import { dailyStock } from "./dailyStock";
import { dailySales } from "./documents";
import type { Checkpoint, Scenario } from "./model";
import { defaultScenarioOptions, generateScenario } from "./scenario";

interface SyncConfig {
  apiOrigin: URL;
  token: string;
  stateFile: string;
  includeStock: boolean;
  includeOperations: boolean;
  includeForecast: boolean;
  openingFile?: string;
  startDate: string;
  variationFrom?: string;
  followOrdersFrom?: string;
  liveWeatherFrom?: string;
  timeoutMs: number;
}

export function readDailySyncConfig(env: NodeJS.ProcessEnv): SyncConfig {
  const apiOrigin = URL.parse(env.WORKSHOP_API_ORIGIN ?? "");
  const loopback = apiOrigin && ["localhost", "127.0.0.1", "[::1]"].includes(apiOrigin.hostname);
  const secure = apiOrigin?.protocol === "https:" || (apiOrigin?.protocol === "http:" && loopback);
  if (!apiOrigin || !secure || apiOrigin.pathname !== "/" || apiOrigin.username || apiOrigin.password
    || apiOrigin.search || apiOrigin.hash) {
    throw new Error("WORKSHOP_API_ORIGIN doit être une origine HTTPS ou une adresse HTTP locale.");
  }

  const token = env.WORKSHOP_IMPORT_TOKEN ?? "";
  if (!/^[A-Za-z0-9._~+/=-]{32,256}$/.test(token)) throw new Error("WORKSHOP_IMPORT_TOKEN est manquant ou invalide.");
  const stateFile = env.WORKSHOP_STATE_FILE ?? "";
  if (!isAbsolute(stateFile)) throw new Error("WORKSHOP_STATE_FILE doit être le chemin absolu du fichier de reprise.");
  const stockStateFile = env.WORKSHOP_STOCK_STATE_FILE || undefined;
  if (stockStateFile && (!isAbsolute(stockStateFile) || resolve(stockStateFile) === resolve(stateFile))) {
    throw new Error("WORKSHOP_STOCK_STATE_FILE doit être un chemin absolu distinct de WORKSHOP_STATE_FILE.");
  }
  const stateFiles = [stateFile, stockStateFile].filter(file => file !== undefined);
  const operationsStateFile = env.WORKSHOP_OPERATIONS_STATE_FILE || undefined;
  if (operationsStateFile && (!isAbsolute(operationsStateFile) || stateFiles.some(file => resolve(file) === resolve(operationsStateFile)))) {
    throw new Error("WORKSHOP_OPERATIONS_STATE_FILE doit être un chemin absolu distinct des fichiers de reprise des ventes et des stocks.");
  }
  if (operationsStateFile) stateFiles.push(operationsStateFile);
  const openingFile = env.WORKSHOP_OPENING_CHECKPOINT_FILE || undefined;
  if (openingFile && (!isAbsolute(openingFile) || stateFiles.some(file => resolve(file) === resolve(openingFile)))) {
    throw new Error("WORKSHOP_OPENING_CHECKPOINT_FILE doit être un chemin absolu distinct des fichiers de reprise.");
  }
  const startDate = z.iso.date().safeParse(env.WORKSHOP_START_DATE);
  if (!startDate.success) throw new Error("WORKSHOP_START_DATE doit être une date valide au format AAAA-MM-JJ.");
  const variationFrom = z.iso.date().optional().safeParse(env.WORKSHOP_VARIATION_FROM || undefined);
  if (!variationFrom.success) throw new Error("WORKSHOP_VARIATION_FROM doit être une date valide au format AAAA-MM-JJ.");
  const forecastEnabled = env.WORKSHOP_FORECAST_ENABLED || "false";
  if (forecastEnabled !== "true" && forecastEnabled !== "false") {
    throw new Error("WORKSHOP_FORECAST_ENABLED doit valoir true ou false.");
  }
  const followOrdersFrom = z.iso.date().optional().safeParse(env.WORKSHOP_FOLLOW_VALIDATED_ORDERS_FROM || undefined);
  if (!followOrdersFrom.success || (followOrdersFrom.data && (!stockStateFile || !operationsStateFile || forecastEnabled !== "true"))) {
    throw new Error("WORKSHOP_FOLLOW_VALIDATED_ORDERS_FROM exige une date valide, les stocks, les opérations et la prévision.");
  }
  const liveWeatherFrom = z.iso.date().optional().safeParse(env.WORKSHOP_LIVE_WEATHER_FROM || undefined);
  if (!liveWeatherFrom.success) throw new Error("WORKSHOP_LIVE_WEATHER_FROM doit être une date valide.");
  const activeStateFile = operationsStateFile ?? stockStateFile ?? stateFile;
  const configuredFiles = [...stateFiles, openingFile].flatMap(file => file ? [resolve(file)] : []);
  if ((followOrdersFrom.data || liveWeatherFrom.data) && configuredFiles.includes(resolve(`${activeStateFile}.pending`))) {
    throw new Error("Le fichier de reprise suivi de .pending est réservé à la journée préparée.");
  }
  if (liveWeatherFrom.data && configuredFiles.includes(resolve(`${activeStateFile}.weather`))) {
    throw new Error("Le fichier de reprise suivi de .weather est réservé aux prévisions relevées.");
  }
  const timeoutMs = Number(env.WORKSHOP_REQUEST_TIMEOUT_MS ?? 30_000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
    throw new Error("WORKSHOP_REQUEST_TIMEOUT_MS doit être compris entre 1000 et 120000.");
  }

  return { apiOrigin, token, stateFile: activeStateFile,
    includeStock: Boolean(stockStateFile), includeOperations: Boolean(operationsStateFile), includeForecast: forecastEnabled === "true", openingFile,
    startDate: startDate.data, variationFrom: variationFrom.data, followOrdersFrom: followOrdersFrom.data,
    liveWeatherFrom: liveWeatherFrom.data, timeoutMs };
}

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

class ApprovedOrderChangedError extends Error {}

async function requestWorkshop(config: SyncConfig, endpoint: string, date: string, payload?: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(new URL(endpoint, config.apiOrigin), {
      method: payload === undefined ? "GET" : "PUT",
      headers: { authorization: `Bearer ${config.token}`, ...(payload !== undefined && { "content-type": "application/json" }) },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.timeoutMs),
      redirect: "error",
    });
  } catch {
    throw new Error(`Impossible de joindre Kookia pour le ${date}.`);
  }
  if (response.status !== 200) {
    const message = `Kookia a refusé le ${date} (HTTP ${response.status}).`;
    if (response.status === 409 && payload !== undefined) {
      const detail = await response.json().catch(() => null);
      if (detail?.error?.code === "WORKSHOP_APPROVED_ORDER_CONFLICT")
        throw new ApprovedOrderChangedError(`Une commande validée a changé pour le ${date}. La prochaine reprise relira les commandes de Kookia.`);
    } else await response.body?.cancel();
    throw new Error(message);
  }
  return response.json().catch(() => null);
}

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

export async function syncDaily(config: SyncConfig, now = new Date()) {
  const today = formatParisDate(now);
  const through = offsetDate(today, -1);
  const profile = defaultScenarioOptions(config.startDate, 1);
  const variedProfile: typeof profile = { ...profile, incident: "mixed", weather: "varied", hasTerrace: true };
  const connectedOn = (date: string) => Boolean(config.followOrdersFrom && date >= config.followOrdersFrom);
  const profileFor = (date: string) => connectedOn(date) || (config.variationFrom && date >= config.variationFrom) ? variedProfile : profile;
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
  while (date <= through) {
    const connected = connectedOn(date);
    const weather = weatherFor(date);
    const replayPrepared = connected || weather !== undefined;
    let prepared: { payload: unknown; checkpoint: Checkpoint } | undefined = replayPrepared ? await readPreparedDay(pendingFile, date) : undefined;
    if (!prepared) {
      const approved = connected ? workshopApprovedOrdersSchema.parse(
        await requestWorkshop(config, `/api/integrations/workshop/approved-orders/${date}`, date)) : undefined;
      const scenario = generateScenario({ ...profileFor(date), start: date }, checkpoint, approved, weather);
      prepared = { payload: dayPayload(config, scenario), checkpoint: scenario.checkpoint };
      if (replayPrepared) await writeState(pendingFile, prepared);
    }
    if (prepared.checkpoint.originStart !== originStart || prepared.checkpoint.seed !== profile.seed)
      throw new Error("La journée préparée ne correspond pas au dossier planifié.");
    let alreadyReceived: boolean;
    try { alreadyReceived = await sendDay(config, date, prepared.payload); }
    catch (cause) {
      if (connected && cause instanceof ApprovedOrderChangedError) await rm(pendingFile, { force: true });
      throw cause;
    }
    await writeState(config.stateFile, prepared.checkpoint);
    if (replayPrepared) await rm(pendingFile, { force: true });
    checkpoint = prepared.checkpoint;
    date = continuationStart(checkpoint);
    if (alreadyReceived) replayed += 1;
    else imported += 1;
  }
  if (config.includeForecast && checkpoint?.asOf === through) {
    const forecast = dailyForecast(today, checkpoint, profileFor(today), connectedOn(today), weatherFor(today));
    const response = await requestWorkshop(config, `/api/integrations/workshop/forecast/${today}`, today, forecast);
    const acknowledgment = forecastAcknowledgmentSchema.safeParse(response);
    if (!acknowledgment.success || acknowledgment.data.date !== today) {
      throw new Error(`Kookia n’a pas confirmé la prévision du ${today}.`);
    }
  }

  return { imported, replayed };
}
