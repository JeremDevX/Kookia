import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { z } from "zod";
import { formatParisDate } from "../../shared/parisDate";
import { offsetDate } from "./calendar";
import { recipeById } from "./catalog";
import { continuationStart, parseCheckpointFile } from "./continuation";
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
  openingFile?: string;
  startDate: string;
  variationFrom?: string;
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
  const timeoutMs = Number(env.WORKSHOP_REQUEST_TIMEOUT_MS ?? 30_000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
    throw new Error("WORKSHOP_REQUEST_TIMEOUT_MS doit être compris entre 1000 et 120000.");
  }

  return { apiOrigin, token, stateFile: operationsStateFile ?? stockStateFile ?? stateFile,
    includeStock: Boolean(stockStateFile), includeOperations: Boolean(operationsStateFile), openingFile,
    startDate: startDate.data, variationFrom: variationFrom.data, timeoutMs };
}

async function readCheckpoint(file: string) {
  try {
    return parseCheckpointFile(await readFile(file, "utf8"));
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
    return undefined;
  }
}

async function saveCheckpoint(file: string, checkpoint: Checkpoint) {
  const temporaryDirectory = await mkdtemp(join(dirname(file), ".workshop-"));
  try {
    const temporaryFile = join(temporaryDirectory, "checkpoint.json");
    await writeFile(temporaryFile, JSON.stringify(checkpoint), { mode: 0o600 });
    await rename(temporaryFile, file);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

const acknowledgmentSchema = z.object({ date: z.iso.date(), replayed: z.boolean(),
  stockApplied: z.literal(true).optional(), operationsApplied: z.literal(true).optional() });

async function sendDay(config: SyncConfig, scenario: Scenario) {
  const day = scenario.days[0];
  const sales = Array.from(dailySales(day).articles, ([recipeId, { sold }]) => ({
    name: recipeById(recipeId).name.normalize("NFC"),
    quantity: sold,
  }));
  const payload = {
    open: day.open,
    sales,
    ...(config.includeStock ? { stock: dailyStock(scenario) } : {}),
    ...(config.includeOperations ? { operations: dailyOperations(scenario) } : {}),
  };
  const endpoint = new URL(`/api/integrations/workshop/days/${day.date}`, config.apiOrigin);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "PUT",
      headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.timeoutMs),
      redirect: "error",
    });
  } catch {
    throw new Error(`Impossible de joindre Kookia pour le ${day.date}.`);
  }
  if (response.status !== 200) {
    await response.body?.cancel();
    throw new Error(`Kookia a refusé le ${day.date} (HTTP ${response.status}).`);
  }

  const acknowledgment = acknowledgmentSchema.safeParse(await response.json().catch(() => null));
  if (!acknowledgment.success || acknowledgment.data.date !== day.date
    || (config.includeStock && acknowledgment.data.stockApplied !== true)
    || (config.includeOperations && acknowledgment.data.operationsApplied !== true)) {
    throw new Error(`Kookia n’a pas confirmé la réception du ${day.date}.`);
  }
  return acknowledgment.data.replayed;
}

export async function syncDaily(config: SyncConfig, now = new Date()) {
  const through = offsetDate(formatParisDate(now), -1);
  const profile = defaultScenarioOptions(config.startDate, 1);
  const variedProfile: typeof profile = { ...profile, incident: "mixed", weather: "varied", hasTerrace: true };
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

  let checkpoint = state ?? opening;
  let date = checkpoint ? continuationStart(checkpoint) : config.startDate;
  let imported = 0;
  let replayed = 0;
  while (date <= through) {
    const dayProfile = config.variationFrom && date >= config.variationFrom ? variedProfile : profile;
    const scenario = generateScenario({ ...dayProfile, start: date }, checkpoint);
    const alreadyReceived = await sendDay(config, scenario);
    await saveCheckpoint(config.stateFile, scenario.checkpoint);
    checkpoint = scenario.checkpoint;
    date = continuationStart(checkpoint);
    if (alreadyReceived) replayed += 1;
    else imported += 1;
  }

  return { imported, replayed };
}
