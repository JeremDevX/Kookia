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
  saveSettings: (settings: AnalyticsSettings) => Promise<void>;
}

export const useAnalyticsPreferences = (): UseAnalyticsPreferencesResult => {
  const [settings, setSettings] = useState<AnalyticsSettings>(
    DEFAULT_ANALYTICS_SETTINGS
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      const nextSettings = await getAnalyticsPreferences();
      setSettings(nextSettings);
      setLoading(false);
    };

    void loadPreferences();
  }, []);

  const saveSettings = useCallback(async (nextSettings: AnalyticsSettings) => {
    await saveAnalyticsPreferences(nextSettings);
    setSettings(nextSettings);
  }, []);

  return {
    settings,
    loading,
    saveSettings,
  };
};
