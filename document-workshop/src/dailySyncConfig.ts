import { isAbsolute, resolve } from "node:path";
import { z } from "zod";

export interface SyncConfig {
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
  controlFrom?: string;
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
  const controlFrom = z.iso.date().optional().safeParse(env.WORKSHOP_CONTROL_FROM || undefined);
  if (!controlFrom.success) throw new Error("WORKSHOP_CONTROL_FROM doit être une date valide au format AAAA-MM-JJ.");
  const activeStateFile = operationsStateFile ?? stockStateFile ?? stateFile;
  const configuredFiles = [...stateFiles, openingFile].flatMap(file => file ? [resolve(file)] : []);
  if ((followOrdersFrom.data || liveWeatherFrom.data || controlFrom.data) && configuredFiles.includes(resolve(`${activeStateFile}.pending`))) {
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
    liveWeatherFrom: liveWeatherFrom.data, controlFrom: controlFrom.data, timeoutMs };
}
