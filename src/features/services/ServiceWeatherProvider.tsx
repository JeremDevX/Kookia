import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import type { ServiceSlot } from "../../../shared/serviceCalendar";
import { formatLocalISODate } from "../../utils/date";
import { weatherServiceContext } from "./serviceNavigation";
import { useServiceWeather } from "./useServiceWeather";
import { ServiceWeatherContext } from "./weather.context";

export default function ServiceWeatherProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [slot, selectSlot] = useState<ServiceSlot>("lunch");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const service = weatherServiceContext(location.pathname, new URLSearchParams(location.search), formatLocalISODate(new Date()), slot);
  const state = useServiceWeather(service.date, service.slot);
  return <ServiceWeatherContext.Provider value={{ service, state, selectSlot, settingsOpen,
    followsService: location.pathname === "/services", openSettings: () => setSettingsOpen(true), closeSettings: () => setSettingsOpen(false) }}>
    {children}
  </ServiceWeatherContext.Provider>;
}
