import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { summarizeDeclaredWaste, type WasteReadRow } from "./declaredWasteRead.js";
const fixture = (id: string, kind: string, unit: string, serviceDate: string, actorId = "owner"): WasteReadRow => ({
  id, restaurantId: "fixture", operationId: id, actorId, serviceDate: new Date(serviceDate), serviceSlot: "lunch",
  kind, avoidability: "avoidable", productId: null, product: null, productionId: "production", production: { recipeName: "Dish", actorId },
  lotId: null, quantity: new Prisma.Decimal(1), unit, note: "", stockMovementId: null, stockMovement: null, createdAt: new Date("2026-09-01"),
});
describe("typed waste reporting", () => {
  it("keeps month, kind and unit distinct, and does not infer cooked costs", () => {
    const rows = [fixture("one", "unsold", "portion", "2026-01-31"), fixture("two", "preparation", "kg", "2026-01-31"), fixture("three", "plate_return", "portion", "2026-02-01")];
    const january = summarizeDeclaredWaste(rows, "2026-01-01", "2026-01-31", "operational");
    expect(january.records.map((row) => row.id)).toEqual(["one", "two"]);
    expect(january.totals).toEqual([{ kind: "unsold", avoidability: "avoidable", unit: "portion", quantity: 1, recordCount: 1 }, { kind: "preparation", avoidability: "avoidable", unit: "kg", quantity: 1, recordCount: 1 }]);
    expect(january.records.every((row) => row.knownCost === null)).toBe(true);
    expect(summarizeDeclaredWaste(rows, "2026-02-01", "2026-02-28", "operational").records).toHaveLength(1);
  });
  it("excludes simulation-linked preparations and demo workspace declarations", () => {
    const rows = [fixture("recorded", "unsold", "portion", "2026-01-01"), fixture("simulated", "unsold", "portion", "2026-01-01", "restaurant-simulation:v1")];
    expect(summarizeDeclaredWaste(rows, "2026-01-01", "2026-01-31", "operational")).toMatchObject({ excludedSimulationCount: 1, records: [{ id: "recorded" }] });
    expect(summarizeDeclaredWaste(rows, "2026-01-01", "2026-01-31", "demo")).toMatchObject({ records: [], totals: [], excludedSimulationCount: 2 });
  });
});
