import { createContext, useContext } from "react";
import type { ServiceContext } from "./serviceNavigation";
import type { useServiceWeather } from "./useServiceWeather";

export interface SharedServiceWeather {
  service: ServiceContext;
  state: ReturnType<typeof useServiceWeather>;
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
