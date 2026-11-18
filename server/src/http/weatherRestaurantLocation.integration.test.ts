import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { prisma } from "../infrastructure/database/prisma.js";
import { env } from "../config/env.js";
import { WeatherProviderError } from "../integrations/weatherProvider.js";
import { weatherAccount, weatherDate, weatherPlace, weatherProvider } from "./weatherTestFixture.js";

const users: string[] = [];
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(`${weatherDate}T08:00:00Z`)); });
afterEach(() => { vi.useRealTimers(); });
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });

it("loads weather from the saved city and postal code and replaces it when the restaurant moves", async () => {
  const provider = weatherProvider(), owner = await weatherAccount(users, provider);
  const restaurant = (await owner.agent.get("/api/workspace/restaurant").expect(200)).body;
  const lyon = { ...weatherPlace, id: 2996944, name: "Lyon" };
  const lille = { ...weatherPlace, id: 2998324, name: "Lille" };
  provider.search.mockResolvedValueOnce([lyon, weatherPlace]).mockResolvedValueOnce([lille]);
  await owner.agent.patch("/api/workspace/restaurant").send({ ...restaurant, city: "69001 Lyon", address: "42 Rue de la Pluie" }).expect(200);
  const [first, second] = await Promise.all([owner.weather(), owner.weather()]);
  expect(first).toEqual(second);
  expect(first).toMatchObject({ status: "ready", position: { place: lyon, matchedAt: expect.any(String) }, contextRef: null });
  expect(provider.search.mock.calls).toEqual([["69001", "FR"]]);
  expect(provider.forecast).toHaveBeenCalledTimes(1);
  expect(await owner.location()).toMatchObject({ status: "matched" });
  await owner.agent.patch("/api/workspace/restaurant").send({ ...restaurant, city: "Lille 59000" }).expect(200);
  expect(await owner.weather()).toMatchObject({ status: "ready", position: { place: lille } });
  expect(provider.search.mock.calls).toEqual([["69001", "FR"], ["59000", "FR"]]);
  expect(provider.forecast.mock.calls).toEqual([[lyon], [lille]]);
});

it("asks for a choice when two communes match the saved city and recovers after a provider failure", async () => {
  const provider = weatherProvider(), owner = await weatherAccount(users, provider);
  const restaurant = (await owner.agent.get("/api/workspace/restaurant").expect(200)).body;
  await owner.agent.patch("/api/workspace/restaurant").send({ ...restaurant, city: "Saint-Denis" }).expect(200);
  const second = { ...weatherPlace, name: "Saint-Denis", region: "Occitanie" }, first = { ...second, id: second.id + 1, region: "Île-de-France" };
  provider.search.mockRejectedValueOnce(new WeatherProviderError("unavailable")).mockResolvedValueOnce([first, second]);
  expect(await owner.weather()).toMatchObject({ status: "unavailable", position: null });
  expect(await owner.weather()).toMatchObject({ status: "not_configured", position: null });
  expect(provider.forecast).not.toHaveBeenCalled();
  provider.resolve.mockResolvedValueOnce(second);
  await owner.confirm();
  expect(await owner.weather()).toMatchObject({ status: "ready", position: { place: second }, contextRef: expect.any(String) });
});

it("scopes the optional evaluation connection to the designated restaurant", async () => {
  const provider = weatherProvider(); provider.configured = false;
  const owner = await weatherAccount(users, provider), other = await weatherAccount(users, provider);
  const previous = env.OPEN_METEO_EVALUATION_RESTAURANT_ID;
  try {
    env.OPEN_METEO_EVALUATION_RESTAURANT_ID = owner.restaurantId;
    expect((await owner.location()).configured).toBe(true);
    expect((await other.location()).configured).toBe(false);
    expect((await other.weather()).status).toBe("not_configured");
  } finally { env.OPEN_METEO_EVALUATION_RESTAURANT_ID = previous; }
});
