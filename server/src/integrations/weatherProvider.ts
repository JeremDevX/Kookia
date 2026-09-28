import type { WeatherForecast, WeatherPlace } from "../../../shared/serviceWeather.js";

export interface WeatherProvider {
  configured: boolean;
  provenance: "live" | "fixture";
  search(query: string): Promise<WeatherPlace[]>;
  resolve(id: number): Promise<WeatherPlace>;
  forecast(place: WeatherPlace): Promise<WeatherForecast>;
}
export class WeatherProviderError extends Error {
  constructor(public readonly code: "not_configured" | "unavailable" | "invalid_data" | "rate_limited",
    public readonly retryAt: string | null = null) {
    super(code === "not_configured" ? "La météo n’est pas encore configurée." :
      code === "rate_limited" ? "Le service météo est temporairement occupé. Réessayez plus tard." :
        "Le service météo est indisponible. Vous pouvez continuer sans météo.");
  }
}
