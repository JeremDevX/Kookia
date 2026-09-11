import { apiRequest } from "../config/api";
import type { AnalyticsSettings } from "../types/callbacks";

const ANALYTICS_PREFERENCES_STORAGE_KEY = "foodai:analytics-preferences";

export const DEFAULT_ANALYTICS_SETTINGS: AnalyticsSettings = {
  wasteTarget: "50",
  showTrends: true,
  showAI: true,
  showROI: true,
  alertThreshold: "80",
};

const isValidAnalyticsSettings = (
  value: unknown
): value is AnalyticsSettings => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const settings = value as Record<string, unknown>;

  return (
    typeof settings.wasteTarget === "string" &&
    typeof settings.showTrends === "boolean" &&
    typeof settings.showAI === "boolean" &&
    typeof settings.showROI === "boolean" &&
    typeof settings.alertThreshold === "string"
  );
};

export const getAnalyticsPreferences = async (): Promise<AnalyticsSettings> => {
  const existing = await apiRequest<AnalyticsSettings | null>("/workspace/preferences");
  if (existing) return existing;
  let initial = DEFAULT_ANALYTICS_SETTINGS;
  try {
    const raw = localStorage.getItem(ANALYTICS_PREFERENCES_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isValidAnalyticsSettings(parsed) && /^\d+(\.\d+)?$/.test(parsed.wasteTarget) && Number(parsed.wasteTarget) <= 10000 && /^\d+(\.\d+)?$/.test(parsed.alertThreshold) && Number(parsed.alertThreshold) <= 100) initial = parsed;
  } catch { /* Local storage unavailable or invalid: initialize server defaults. */ }
  const saved = await apiRequest<AnalyticsSettings>("/workspace/preferences", {
    method: "POST", body: JSON.stringify({ settings: initial, initializeOnly: true }),
  });
  try { localStorage.removeItem(ANALYTICS_PREFERENCES_STORAGE_KEY); } catch { /* Server copy is durable; browser cleanup is best effort. */ }
  return saved;
};

export const saveAnalyticsPreferences = async (settings: AnalyticsSettings): Promise<void> => {
  await apiRequest("/workspace/preferences", { method: "POST", body: JSON.stringify({ settings }) });
};
