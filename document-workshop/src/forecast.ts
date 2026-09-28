import { expectedCovers } from "./calendar";
import type { Options, ServiceName } from "./model";
import { scenarioWeather } from "./weather";

export function serviceForecast(date: string, name: ServiceName, options: Options) {
  const baselineCovers = expectedCovers(date, name, options);
  const weather = scenarioWeather(date, options);
  return { baselineCovers, forecastCovers: Math.round(baselineCovers * (1 + weather.percent / 100)) };
}
