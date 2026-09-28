import { createContext, useContext } from "react";
import type { ServiceSlot } from "../../../shared/serviceCalendar";
import type { ServiceContext } from "./serviceNavigation";
import type { useServiceWeather } from "./useServiceWeather";

export interface SharedServiceWeather {
  service: ServiceContext;
  followsService: boolean;
  state: ReturnType<typeof useServiceWeather>;
  selectSlot: (slot: ServiceSlot) => void;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}
export const ServiceWeatherContext = createContext<SharedServiceWeather | null>(null);
export function useSharedServiceWeather() {
  const context = useContext(ServiceWeatherContext);
  if (!context) throw new Error("ServiceWeatherProvider is required");
  return context;
}
