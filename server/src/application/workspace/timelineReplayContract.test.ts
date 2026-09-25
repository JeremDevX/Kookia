import { expect, it } from "vitest";
import { buildTimelineReplay } from "./timelineReplayContract.js";

const id = "849cb419-d2fd-4f8e-9835-686d11ebdf0c";
const createdAt = new Date("2026-09-24T10:00:00.000Z");
const key = "a".repeat(64);
const snapshot = {
  suggestionKey: key, productId: "p1", quantity: 2,
  provenance: "demo_simulation", workspaceMode: "demo", model: "baseline-v1",
  asOfDate: "2026-09-23", forecastDate: "2026-09-25",
  suggestion: {
    suggestionKey: key, productId: "p1", productName: "Farine T55", unit: "kg",
    status: "ready", canAdd: true,
    forecastNeed: 4, countedStock: 0, countDate: "2026-09-23", estimatedQuantity: 2,
    currentUnitPrice: 3.25, estimatedCost: 6.5, reason: "Besoin du prochain service.",
  },
};

it("replays a recorded added decision as an isolated draft line from its snapshot", () => {
  expect(buildTimelineReplay({ id, decisionId: id, decision: "purchase_suggestion_added", createdAt, snapshot }))
    .toMatchObject({ id, sourceDecisionId: id, provenance: "demo_simulation", workspaceMode: "demo",
      suggestion: { productName: "Farine T55", countedStock: 0 },
      sandboxOutcome: { kind: "draft_line", quantity: 2, currentUnitPrice: 3.25, estimatedCost: 6.5 } });
});

it("replays an excluded decision without a sandbox order line", () => {
  const excluded = { ...snapshot, quantity: null };
  expect(buildTimelineReplay({ id, decisionId: id, decision: "purchase_suggestion_excluded", createdAt, snapshot: excluded }))
    .toMatchObject({ sandboxOutcome: { kind: "excluded", quantity: null, estimatedCost: null } });
});

it("refuses unsupported, mismatched, or malformed decisions", () => {
  expect(buildTimelineReplay({ id, decisionId: id, decision: "menu_validated", createdAt, snapshot })).toBeNull();
  expect(buildTimelineReplay({ id, decisionId: id, decision: "purchase_suggestion_added", createdAt,
    snapshot: { ...snapshot, productId: "other" } })).toBeNull();
  expect(buildTimelineReplay({ id, decisionId: id, decision: "purchase_suggestion_added", createdAt,
    snapshot: { ...snapshot, quantity: null } })).toBeNull();
  expect(buildTimelineReplay({ id, decisionId: id, decision: "purchase_suggestion_added", createdAt,
    snapshot: { ...snapshot, suggestion: { ...snapshot.suggestion, canAdd: false } } })).toBeNull();
});
