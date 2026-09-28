import { apiRequest } from "../config/api";
import type { ConfirmWeatherPosition, ServiceWeather, WeatherLocationState, WeatherPlace } from "../../shared/serviceWeather";
import type { ServiceSlot } from "../../shared/serviceCalendar";

export const getWeatherLocation = () => apiRequest<WeatherLocationState>("/workspace/weather/location");
export const searchWeatherPlaces = (query: string) => apiRequest<{ places: WeatherPlace[] }>(`/workspace/weather/places?q=${encodeURIComponent(query)}`);
export const confirmWeatherLocation = (input: ConfirmWeatherPosition) => apiRequest<WeatherLocationState>("/workspace/weather/location", {
  method: "POST", body: JSON.stringify(input),
});
export const getServiceWeather = (date: string, slot: ServiceSlot) => apiRequest<ServiceWeather>(
  `/workspace/services/weather?${new URLSearchParams({ date, slot })}`);
