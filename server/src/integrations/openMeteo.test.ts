import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenMeteo } from "./openMeteo.js";
import { parseForecast, parsePlace, parsePlaces } from "./openMeteoSchemas.js";

const place = { id: 2988507, name: "Paris", admin1: "Île-de-France", country: "France", latitude: 48.85, longitude: 2.35, timezone: "Europe/Paris" };
const rawForecast = () => ({ timezone: "Europe/Paris", generationtime_ms: 12,
  hourly_units: { time: "unixtime", temperature_2m: "°C", precipitation: "mm", precipitation_probability: "%", wind_speed_10m: "km/h" },
  hourly: { time: [1790589600, 1790593200], temperature_2m: [18, null], precipitation: [0, null],
    precipitation_probability: [10, null], wind_speed_10m: [12, null] } });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe("Open-Meteo boundary", () => {
  it("preserves unknown values, validates units/coordinates and does not invent emission time", () => {
    const result = parseForecast(rawForecast(), "2026-09-28T08:00:00.000Z");
    expect(result).toMatchObject({ issuedAt: null, fetchedAt: "2026-09-28T08:00:00.000Z" });
    expect(result.hours[1]).toMatchObject({ temperature: null, precipitation: null, precipitationProbability: null });
    expect(parsePlaces({})).toEqual([]);
    expect(() => parsePlace({ ...place, latitude: 91 })).toThrow();
    expect(() => parseForecast({ ...rawForecast(), hourly_units: { ...rawForecast().hourly_units, temperature_2m: "°F" } }, result.fetchedAt)).toThrow();
    const mismatch = rawForecast(); mismatch.hourly.temperature_2m.pop();
    expect(() => parseForecast(mismatch, result.fetchedAt)).toThrow();
    const duplicate = rawForecast(); duplicate.hourly.time[1] = duplicate.hourly.time[0];
    expect(() => parseForecast(duplicate, result.fetchedAt)).toThrow();
  });
  it("uses fixed endpoints, bounded hourly requests and commercial credentials only server-side", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ results: [place] }))
      .mockResolvedValueOnce(Response.json(place)).mockResolvedValueOnce(Response.json(rawForecast()));
    const provider = createOpenMeteo({ mode: "commercial", apiKey: "isolated-test-key" }, transport);
    expect(await provider.search("Paris")).toEqual([parsePlace(place)]);
    await provider.resolve(place.id);
    await provider.forecast(parsePlace(place));
    const urls = transport.mock.calls.map(([url]) => new URL(String(url)));
    expect(urls.map(url => url.hostname)).toEqual(["customer-geocoding-api.open-meteo.com", "customer-geocoding-api.open-meteo.com", "customer-api.open-meteo.com"]);
    expect(urls[2].searchParams.get("forecast_days")).toBe("7");
    expect(urls[2].searchParams.get("timeformat")).toBe("unixtime");
    expect(urls[2].searchParams.get("apikey")).toBe("isolated-test-key");
    expect(transport.mock.calls[0][1]).toMatchObject({ redirect: "error" });
  });
  it("respects Retry-After without an automatic retry", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-28T08:00:00Z"));
    const transport = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": "120" } }))
      .mockResolvedValueOnce(Response.json({ results: [] }));
    const provider = createOpenMeteo({ mode: "evaluation" }, transport);
    await expect(provider.search("Paris")).rejects.toMatchObject({ code: "rate_limited", retryAt: "2026-09-28T08:02:00.000Z" });
    await expect(provider.search("Paris")).rejects.toMatchObject({ code: "rate_limited" });
    expect(transport).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(120_000);
    expect(await provider.search("Paris")).toEqual([]);
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("keeps configuration disabled and sanitizes provider failures including URLs with keys", async () => {
    const transport = vi.fn<typeof fetch>().mockRejectedValue(new Error("https://provider/?apikey=secret-test-key"));
    await expect(createOpenMeteo({ mode: "disabled" }, transport).search("Paris")).rejects.toMatchObject({ code: "not_configured" });
    expect(transport).not.toHaveBeenCalled();
    await expect(createOpenMeteo({ mode: "commercial", apiKey: "secret-test-key" }, transport).search("Paris"))
      .rejects.toMatchObject({ code: "unavailable", message: "Le service météo est indisponible. Vous pouvez continuer sans météo." });
  });
  it("rejects an unrelated resolved place, malformed JSON and HTTP failures", async () => {
    for (const response of [Response.json({ ...place, id: 1 }), new Response("invalid"), new Response(null, { status: 503 })]) {
      const provider = createOpenMeteo({ mode: "evaluation" }, vi.fn<typeof fetch>().mockResolvedValue(response));
      await expect(provider.resolve(place.id)).rejects.toThrow();
    }
  });
  it("bounds requests to five seconds and reports timeout as a nonblocking provider error", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(AbortSignal.abort(new DOMException("Timeout", "TimeoutError")));
    const transport = vi.fn<typeof fetch>(async (_url, init) => { init?.signal?.throwIfAborted(); return Response.json({}); });
    await expect(createOpenMeteo({ mode: "evaluation" }, transport).search("Paris")).rejects.toMatchObject({ code: "unavailable" });
    expect(timeout).toHaveBeenCalledWith(5000); expect(transport).toHaveBeenCalledTimes(1);
  });
});
