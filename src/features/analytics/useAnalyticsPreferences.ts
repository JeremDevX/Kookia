import { useCallback, useEffect, useState } from "react";
import type { AnalyticsSettings } from "../../types/callbacks";
import {
  DEFAULT_ANALYTICS_SETTINGS,
  getAnalyticsPreferences,
  saveAnalyticsPreferences,
} from "../../services/analyticsPreferencesService";

interface UseAnalyticsPreferencesResult {
  settings: AnalyticsSettings;
  loading: boolean;
  error: string | null;
  saveSettings: (settings: AnalyticsSettings) => Promise<void>;
}

export const useAnalyticsPreferences = (): UseAnalyticsPreferencesResult => {
  const [settings, setSettings] = useState<AnalyticsSettings>(
    DEFAULT_ANALYTICS_SETTINGS
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAnalyticsPreferences().then((nextSettings) => {
      if (active) setSettings(nextSettings);
    }, (error: unknown) => {
      if (active) setError(error instanceof Error ? error.message : "Préférences indisponibles.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const saveSettings = useCallback(async (nextSettings: AnalyticsSettings) => {
    await saveAnalyticsPreferences(nextSettings);
    setSettings(nextSettings);
    setError(null);
  }, []);

  return {
    settings,
    loading,
    error,
    saveSettings,
  };
};
