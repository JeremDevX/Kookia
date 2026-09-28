import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { formatLocalISODate } from "../../utils/date";
import { weatherServiceContext } from "./serviceNavigation";
import { useServiceWeather } from "./useServiceWeather";
import { ServiceWeatherContext } from "./weather.context";

export default function ServiceWeatherProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const service = weatherServiceContext(location.pathname, new URLSearchParams(location.search), formatLocalISODate(new Date()));
  const state = useServiceWeather(service.date, service.slot);
  return <ServiceWeatherContext.Provider value={{ service, state, settingsOpen,
    openSettings: () => setSettingsOpen(true), closeSettings: () => setSettingsOpen(false) }}>
    {children}
  </ServiceWeatherContext.Provider>;
}
