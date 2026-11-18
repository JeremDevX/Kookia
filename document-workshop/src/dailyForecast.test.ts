import { expect, it } from "vitest";
import { workshopForecastSchema } from "../../shared/workshopForecast";
import { salePrice } from "./calendar";
import { dailyForecast } from "./dailyForecast";
import { planService } from "./forecast";
import { defaultScenarioOptions, generateScenario } from "./scenario";
import { scenarioWeather } from "./weather";

it("uses yesterday's lots and the forecast service, with exact hourly totals and gross menu revenue", () => {
  const date = "2026-11-18";
  const checkpoint = generateScenario(defaultScenarioOptions("2026-11-10", 8)).checkpoint;
  const saved = structuredClone(checkpoint);
  const profile = { ...defaultScenarioOptions(date, 1), weather: "varied", hasTerrace: true } as const;
  const forecast = workshopForecastSchema.parse(dailyForecast(date, checkpoint, profile));
  const weather = scenarioWeather(date, profile);
  const { menu } = planService(date, "lunch", profile, weather.percent);
  expect(forecast).toMatchObject({
    provenance: "demo_simulation", date, basedOnDate: "2026-11-17", covers: 27,
    revenueCents: menu.reduce((total, item) => total + item.forecast * salePrice(item.recipe, date), 0),
    hours: [{ hour: 12, covers: 9 }, { hour: 13, covers: 14 }, { hour: 14, covers: 4 }],
  });
  expect(forecast.products).toHaveLength(3);
  expect(forecast.products.every(product => product.deliveryDate === "2026-11-19" && product.quantityMilli > 0)).toBe(true);
  expect(checkpoint).toEqual(saved);
  expect(dailyForecast(date, checkpoint, profile)).toEqual(forecast);
});

it("respects closed days, supplier delivery schedules and separate service windows", () => {
  const sunday = "2026-11-15";
  const saturday = generateScenario(defaultScenarioOptions("2026-11-10", 5)).checkpoint;
  const lunchAndDinner = { ...defaultScenarioOptions(sunday, 1), services: "both" } as const;
  const forecast = workshopForecastSchema.parse(dailyForecast(sunday, saturday, lunchAndDinner));
  expect(forecast.hours.map(row => row.hour)).toEqual([12, 13, 14, 19, 20, 21]);
  expect(forecast.hours.reduce((sum, row) => sum + row.covers, 0)).toBe(forecast.covers);
  expect(forecast.products).toEqual([]);

  const sundayClosing = generateScenario(lunchAndDinner, saturday).checkpoint;
  const monday = "2026-11-16";
  expect(dailyForecast(monday, sundayClosing, lunchAndDinner)).toMatchObject({ covers: 0, revenueCents: 0, hours: [] });
});
