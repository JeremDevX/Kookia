import type { evaluateSalesBaseline } from "./salesBaseline.js";

type Baseline = ReturnType<typeof evaluateSalesBaseline>;

export interface DatedForecastContextSource {
  source: "fixture";
  capturedAt: string;
  validFrom: string;
  validThrough: string;
}

export interface ForecastContextFixture {
  position: {
    kind: "fixture_position";
    label: string;
    latitude: number;
    longitude: number;
    verifiedAt: string;
  };
  weather: DatedForecastContextSource | null;
  events: DatedForecastContextSource | null;
  historicalEmissions: DatedForecastContextSource | null;
}

export interface SalesForecastContextStatus {
  status: "not_connected" | "unavailable" | "stale" | "fixture_ready";
  position: "unverified" | "fixture_position";
  weather: "not_connected" | "unavailable" | "stale" | "fresh";
  events: "not_connected" | "unavailable" | "stale" | "fresh";
  historicalEmissions: "not_connected" | "unavailable" | "stale" | "fresh";
  forecastSource: "f1" | "none";
  contextualAdjustmentApplied: false;
}

type SourceStatus = SalesForecastContextStatus["weather"];

const validTimestamp = (value: string, noLaterThan: number) => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= noLaterThan;
};

function sourceStatus(source: DatedForecastContextSource | null, from: string, through: string,
  evaluatedAt: number): SourceStatus {
  if (!source) return "not_connected";
  if (!validTimestamp(source.capturedAt, evaluatedAt)) return "unavailable";
  return source.validFrom <= from && source.validThrough >= through ? "fresh" : "stale";
}

function validFixturePosition(position: ForecastContextFixture["position"], evaluatedAt: number) {
  return position.kind === "fixture_position" && position.label.trim().length > 0 &&
    Number.isFinite(position.latitude) && position.latitude >= -90 && position.latitude <= 90 &&
    Number.isFinite(position.longitude) && position.longitude >= -180 && position.longitude <= 180 &&
    validTimestamp(position.verifiedAt, evaluatedAt);
}

export function evaluateSalesForecastContext(baseline: Pick<Baseline, "status" | "items" | "asOfDate" | "forecastDate">,
  fixture: ForecastContextFixture | null, evaluatedAt: Date): SalesForecastContextStatus {
  const canUseF1 = baseline.status === "experimental" && baseline.items.length > 0;
  const forecastSource = canUseF1 ? "f1" : "none";
  const unavailable = (status: SalesForecastContextStatus["status"]): SalesForecastContextStatus => ({
    status, position: "unverified", weather: "not_connected", events: "not_connected",
    historicalEmissions: "not_connected", forecastSource, contextualAdjustmentApplied: false,
  });
  if (!fixture) return unavailable("not_connected");

  const evaluatedAtTime = evaluatedAt.getTime();
  if (!Number.isFinite(evaluatedAtTime) || !validFixturePosition(fixture.position, evaluatedAtTime))
    return unavailable("unavailable");

  const backtestFrom = baseline.items[0]?.backtest.from ??
    new Date(Date.parse(baseline.asOfDate) - 6 * 86_400_000).toISOString().slice(0, 10);
  const backtestThrough = baseline.items[0]?.backtest.to ?? baseline.asOfDate;
  const weather = sourceStatus(fixture.weather, baseline.forecastDate, baseline.forecastDate, evaluatedAtTime);
  const events = sourceStatus(fixture.events, baseline.forecastDate, baseline.forecastDate, evaluatedAtTime);
  const historicalEmissions = sourceStatus(fixture.historicalEmissions, backtestFrom, backtestThrough, evaluatedAtTime);
  const statuses = [weather, events, historicalEmissions];
  const status = statuses.includes("unavailable") || statuses.includes("not_connected") ? "unavailable"
    : statuses.includes("stale") ? "stale" : "fixture_ready";

  return {
    status,
    position: "fixture_position",
    weather,
    events,
    historicalEmissions,
    forecastSource,
    contextualAdjustmentApplied: false,
  };
}
