import { describe, expect, it } from "vitest";
import { isScenarioProduction, productionNoteForDisplay } from "./productionPresentation";

describe("production journal presentation", () => {
  it("recognizes isolated scenario records and keeps their technical notes out of the restaurant journal", () => {
    const record = { operationId: "restaurant-simulation-v1:production:2026-09-23", notes: "vente liée: internal-operation-id" };
    expect(isScenarioProduction(record.operationId)).toBe(true);
    expect(productionNoteForDisplay(record)).toBeNull();
  });

  it("preserves restaurant-entered notes and rejects unrelated operation prefixes", () => {
    const record = { operationId: "owner-entry-123", notes: "Préparée pour le service du soir." };
    expect(isScenarioProduction(record.operationId)).toBe(false);
    expect(productionNoteForDisplay(record)).toBe(record.notes);
  });
});
