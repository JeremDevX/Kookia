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
  try {
    const storedSettings = localStorage.getItem(
      ANALYTICS_PREFERENCES_STORAGE_KEY
    );

    if (!storedSettings) {
      return DEFAULT_ANALYTICS_SETTINGS;
    }

    const parsed = JSON.parse(storedSettings);

    return isValidAnalyticsSettings(parsed)
      ? parsed
      : DEFAULT_ANALYTICS_SETTINGS;
  } catch {
    return DEFAULT_ANALYTICS_SETTINGS;
  }
};

export const saveAnalyticsPreferences = async (
  settings: AnalyticsSettings
): Promise<void> => {
  try {
    localStorage.setItem(
      ANALYTICS_PREFERENCES_STORAGE_KEY,
      JSON.stringify(settings)
    );
  } catch {
    throw new Error(
      "Impossible d'enregistrer vos preferences analytics. Veuillez reessayer."
    );
  }
};
