import { describe, expect, it } from "vitest";
import type { IngredientOutflowEstimateReport } from "../../services/ingredientOutflowEstimateService";
import { currentEstimateRequest } from "./estimatedOutflowsState";

const report = { from: "2026-01-01", to: "2026-01-31", assumptions: { estimatedSalesShare: 0.9, estimatedLossShare: 0.1 },
  estimates: [], unestimatedReceipts: [] } satisfies IngredientOutflowEstimateReport;

describe("currentEstimateRequest", () => {
  it("hides a prior period's successful report while the requested period loads", () => {
    const previous = { requestKey: "2026-01-01:2026-01-31:0", result: { status: "success" as const, report } };
    expect(currentEstimateRequest(previous, "2026-02-01:2026-02-28:0")).toEqual({ status: "loading" });
  });

  it("hides a prior error after period change or retry and reveals only a matching result", () => {
    const previousError = { requestKey: "2026-01-01:2026-01-31:0", result: { status: "error" as const, message: "hors ligne" } };
    expect(currentEstimateRequest(previousError, "2026-01-01:2026-01-31:1")).toEqual({ status: "loading" });
    expect(currentEstimateRequest(previousError, previousError.requestKey)).toEqual({ status: "error", message: "hors ligne" });
    const previousSuccess = { requestKey: "current", result: { status: "success" as const, report } };
    expect(currentEstimateRequest(previousSuccess, "current")).toEqual({ status: "success", report });
  });
});
