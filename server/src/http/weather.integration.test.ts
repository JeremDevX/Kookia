import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeEach, expect, it } from "vitest";
import { vi } from "vitest";
import { prisma } from "../infrastructure/database/prisma.js";
import { WeatherProviderError } from "../integrations/weatherProvider.js";
import { readWeatherCache } from "../application/workspace/weatherStorage.js";
import { weatherContextForDecision } from "../application/workspace/serviceWeatherService.js";
import { weatherAccount, weatherDate, weatherForecast, weatherPlace, weatherProvider } from "./weatherTestFixture.js";

const users: string[] = [];
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(`${weatherDate}T08:00:00Z`)); });
afterEach(() => { vi.useRealTimers(); });
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); });

it("confirms only server-resolved places, isolates restaurants and invalidates changed-then-restored addresses", async () => {
  const provider = weatherProvider(), owner = await weatherAccount(users, provider), other = await weatherAccount(users, provider);
  await request(owner.app).get("/api/workspace/weather/location").expect(401);
  await request(owner.app).get("/api/workspace/weather/places?q=Paris").expect(401);
  await request(owner.app).get(`/api/workspace/services/weather?date=${weatherDate}&slot=lunch`).expect(401);
  expect(await owner.weather()).toMatchObject({ status: "not_configured", contextRef: null });
  expect((await owner.agent.get("/api/workspace/weather/places?q=Paris").expect(200)).body.places).toEqual([weatherPlace]);
  expect(provider.search).toHaveBeenCalledWith("Paris");
  const location = await owner.location(), input = { placeId: weatherPlace.id, expectedRevision: 0, addressFingerprint: location.addressFingerprint };
  await owner.agent.post("/api/workspace/weather/location").send({ ...input, latitude: 0 }).expect(400);
  provider.resolve.mockResolvedValueOnce({ ...weatherPlace, timezone: "America/New_York" });
  await owner.agent.post("/api/workspace/weather/location").send(input).expect(400);
  const confirmed = (await owner.confirm()).body;
  expect(await owner.location()).toEqual(confirmed);
  expect(confirmed).toMatchObject({ status: "confirmed", revision: 1, position: { precision: "city", confirmedBy: owner.actorId } });
  expect((await other.location()).position).toBeNull();
  await owner.agent.post("/api/workspace/weather/location").send(input).expect(409);
  await owner.weekly(); expect((await owner.weather()).status).toBe("ready");
  await owner.agent.get("/api/workspace/services/weather").query({ date: weatherDate, slot: "lunch", restaurantId: other.restaurantId }).expect(400);
  await owner.agent.get("/api/workspace/services/weather").query({ date: "2026-02-30", slot: "lunch" }).expect(400);
  const restaurant = (await owner.agent.get("/api/workspace/restaurant").expect(200)).body;
  await owner.agent.patch("/api/workspace/restaurant").send({ ...restaurant, city: "Lyon" }).expect(200);
  await owner.agent.patch("/api/workspace/restaurant").send(restaurant).expect(200);
  expect(await owner.location()).toMatchObject({ status: "needs_review", revision: 3 });
  expect(await readWeatherCache(prisma, owner.restaurantId)).toBeNull();
  expect((await owner.weather()).status).toBe("not_configured");
  expect(provider.forecast).toHaveBeenCalledTimes(1);
});

it("coalesces calls, retains valid data on partial/failed responses and observes freshness/Retry-After/expiry", async () => {
  const provider = weatherProvider(), owner = await weatherAccount(users, provider);
  await owner.confirm();
  expect(await owner.weather()).toMatchObject({ status: "unavailable", contextRef: null });
  expect(provider.forecast).not.toHaveBeenCalled();
  await owner.weekly();
  const [first, second] = await Promise.all([owner.weather(), owner.weather()]);
  expect(first).toEqual(second); expect(provider.forecast).toHaveBeenCalledTimes(1);
  await owner.weather(); expect(provider.forecast).toHaveBeenCalledTimes(1);
  vi.setSystemTime(new Date(`${weatherDate}T09:00:00Z`));
  const partial = weatherForecast(); partial.hours.splice(12, 1);
  provider.forecast.mockResolvedValueOnce(partial);
  expect(await owner.weather()).toMatchObject({ status: "stale", fetchedAt: first.fetchedAt, contextRef: first.contextRef });
  vi.setSystemTime(new Date(`${weatherDate}T09:02:00Z`));
  provider.forecast.mockRejectedValueOnce(new WeatherProviderError("rate_limited", `${weatherDate}T09:12:00.000Z`));
  expect((await owner.weather()).status).toBe("stale");
  await owner.weather(); expect(provider.forecast).toHaveBeenCalledTimes(3);
  vi.setSystemTime(new Date(`${weatherDate}T14:00:00Z`));
  provider.forecast.mockRejectedValueOnce(new WeatherProviderError("unavailable"));
  expect(await owner.weather()).toMatchObject({ status: "unavailable", summary: null, contextRef: null });
  expect((await readWeatherCache(prisma, owner.restaurantId))?.forecast).toBeNull();
  vi.setSystemTime(new Date(`${weatherDate}T14:02:00Z`));
  const incomplete = weatherForecast(); incomplete.hours[12].precipitation = null;
  provider.forecast.mockResolvedValueOnce(incomplete);
  expect(await owner.weather()).toMatchObject({ status: "partial", completeHours: 1 });
  const calls = provider.forecast.mock.calls.length;
  for (const date of ["2026-09-27", "2026-10-05"]) {
    expect((await owner.agent.get("/api/workspace/services/weather").query({ date, slot: "lunch" }).expect(200)).body.status).toBe("unavailable");
  }
  expect(provider.forecast).toHaveBeenCalledTimes(calls);
});

it("keeps the consulted decision immutable, rejects cross-context refs without rejecting the plan, and never changes operations", async () => {
  const provider = weatherProvider(), owner = await weatherAccount(users, provider), other = await weatherAccount(users, provider);
  await owner.confirm(); await owner.weekly(); await other.confirm(); await other.weekly();
  const input = await owner.plan(), otherInput = await other.plan();
  const forecast = async () => (await owner.agent.get("/api/workspace/service-forecast").query({ from: weatherDate, to: weatherDate }).expect(200)).body;
  const beforeForecast = await forecast();
  const beforeStock = await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } });
  const weather = await owner.weather();
  const validation = { ...input, weatherContextRef: weather.contextRef };
  const decision = (await owner.agent.post("/api/workspace/services/sheet").send(validation).expect(200)).body;
  expect(decision.weatherContext).toEqual({ status: "saved", weather });
  expect(decision.planned).toEqual(input.planned);
  expect(await forecast()).toEqual(beforeForecast);
  expect(await prisma.stockMovement.count({ where: { restaurantId: owner.restaurantId } })).toBe(beforeStock);
  expect(await prisma.production.count({ where: { restaurantId: owner.restaurantId } })).toBe(0);
  expect(await prisma.dailySale.count({ where: { restaurantId: owner.restaurantId } })).toBe(0);
  await other.weather();
  const refusedContext = (await other.agent.post("/api/workspace/services/sheet").send({ ...otherInput, weatherContextRef: weather.contextRef }).expect(200)).body;
  expect(refusedContext).toMatchObject({ state: "validated", weatherContext: { status: "not_saved", reason: "no_longer_available" } });
  const calls = provider.forecast.mock.calls.length;
  expect(await weatherContextForDecision(prisma, owner.restaurantId, weatherDate, "dinner", weather.contextRef!)).toMatchObject({ status: "not_saved" });
  expect(await weatherContextForDecision(prisma, owner.restaurantId, weatherDate, "lunch", "f".repeat(64))).toMatchObject({ status: "not_saved" });
  expect(await weatherContextForDecision(prisma, owner.restaurantId, weatherDate, "lunch")).toEqual({ status: "not_saved", reason: "not_consulted" });
  await owner.weekly(1, "15:00");
  expect(await weatherContextForDecision(prisma, owner.restaurantId, weatherDate, "lunch", weather.contextRef!)).toMatchObject({ status: "not_saved" });
  expect(provider.forecast).toHaveBeenCalledTimes(calls);
  vi.setSystemTime(new Date(`${weatherDate}T09:01:00Z`)); await owner.weather();
  expect((await owner.agent.post("/api/workspace/services/sheet").send(validation).expect(200)).body).toEqual(decision);
  const saved = (await owner.agent.post("/api/workspace/services/sheet").send({ ...input, operationId: randomUUID(), expectedRevision: 1, action: "save" }).expect(200)).body;
  expect(saved.weatherContext).toEqual(decision.weatherContext);
  expect((await owner.agent.get("/api/workspace/services/sheet").query({ date: weatherDate, slot: "lunch" }).expect(200)).body.weatherContext).toEqual(decision.weatherContext);
});

it("reports source success only for live provenance, and degrades unavailable or partial weather", async () => {
  // Mocked live provider tests status policy only, not an actual network connection.
  const provider = weatherProvider("live"), owner = await weatherAccount(users, provider);
  const sources = async () => (await owner.agent.get("/api/workspace/sources").expect(200)).body.sources as { kind: string; state: string; lastSuccessAt: string | null }[];
  expect((await sources()).find(source => source.kind === "weather")).toMatchObject({ state: "not_connected", lastSuccessAt: null });
  await owner.confirm(); await owner.weekly(); await owner.weather();
  expect((await sources()).find(source => source.kind === "weather")).toMatchObject({ state: "ready", lastSuccessAt: `${weatherDate}T08:00:00.000Z` });
  vi.setSystemTime(new Date(`${weatherDate}T09:00:00Z`));
  expect((await sources()).find(source => source.kind === "weather")?.state).toBe("degraded");
  provider.configured = false;
  expect((await owner.weather()).status).toBe("not_configured");
  expect((await sources()).find(source => source.kind === "weather")?.state).toBe("not_connected");
  provider.configured = true;
  await owner.confirm();
  const partial = weatherForecast(); partial.hours[12].temperature = null;
  provider.forecast.mockResolvedValueOnce(partial); await owner.weather();
  expect((await sources()).find(source => source.kind === "weather")?.state).toBe("degraded");
  provider.provenance = "fixture"; await owner.confirm(); await owner.weather();
  expect((await sources()).filter(source => ["weather", "geocoding"].includes(source.kind)).every(source => source.state === "not_connected")).toBe(true);
});

it("never stores a new unseen forecast or an in-flight response for a replaced location", async () => {
  const provider = weatherProvider(), owner = await weatherAccount(users, provider);
  await owner.confirm(); await owner.weekly();
  const input = await owner.plan(), consulted = await owner.weather();
  vi.setSystemTime(new Date(`${weatherDate}T09:01:00Z`));
  const refreshed = await owner.weather(); expect(refreshed.contextRef).not.toBe(consulted.contextRef);
  const decision = (await owner.agent.post("/api/workspace/services/sheet").send({ ...input, weatherContextRef: consulted.contextRef }).expect(200)).body;
  expect(decision).toMatchObject({ state: "validated", weatherContext: { status: "not_saved", reason: "no_longer_available" } });
  vi.setSystemTime(new Date(`${weatherDate}T10:02:00Z`));
  let finish!: (value: ReturnType<typeof weatherForecast>) => void;
  let started!: () => void;
  const fetching = new Promise<void>(resolve => { started = resolve; });
  provider.forecast.mockImplementationOnce(() => { started(); return new Promise(resolve => { finish = resolve; }); });
  const pending = owner.weather(); await fetching;
  await owner.confirm(); finish(weatherForecast());
  expect(await pending).toMatchObject({ status: "not_configured", position: null, contextRef: null });
  expect(await readWeatherCache(prisma, owner.restaurantId)).toBeNull();
});
