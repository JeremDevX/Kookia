import { describe, expect, it } from "vitest";
import { reconcileServiceSheet, serviceSheetClosureErrors, type SheetEvidence } from "./serviceSheetPolicy.js";
import type { MenuEntry, SheetInput } from "../../../../shared/serviceOperations.js";

const component = (recipeId: string, portions: number) => ({ recipeId, portions, recipeName: recipeId,
  recipeVersionId: `${recipeId}-v1`, recipeVersion: 1, category: "Plat", yieldPortions: 1, ingredients: [] });
const formula: MenuEntry = { id: "formula", name: "Formule", category: "Formule", available: true, priceCents: 2000,
  saleItemId: "item", components: [component("main", 1), component("dessert", 1)] };
const input: Pick<SheetInput, "planned" | "outcomes" | "substitutions"> = {
  planned: [{ recipeId: "main", portions: 10 }, { recipeId: "dessert", portions: 10 }], outcomes: [], substitutions: [],
};
const evidence: SheetEvidence = { menuEntries: [formula], menuRevision: 1,
  productions: [{ id: "p-main", recipeId: "main", recipeName: "Main", portions: 12 }, { id: "p-dessert", recipeId: "dessert", recipeName: "Dessert", portions: 10 }],
  sales: [{ id: "sale", saleItemId: "item", quantity: 8, revision: 0, allocationRevision: 1 }], wastes: [],
  recipeNames: { main: "Main", dessert: "Dessert" }, coverage: "complete", unallocatedSales: 0, unallocatedProductions: 0, staleAllocations: 0 };

describe("service sheet reconciliation", () => {
  it("decomposes a formula once and distinguishes complements and unknown fate from waste", () => {
    const facts = reconcileServiceSheet(input, evidence);
    expect(facts.lines.find(line => line.recipeId === "main")).toMatchObject({ prepared: 12, sold: 8, unsold: 4, additionalPrepared: 2,
      retained: 0, discarded: 0, recordedUnsoldWaste: 0, unexplained: 4 });
    expect(facts.lines.find(line => line.recipeId === "dessert")).toMatchObject({ sold: 8, unsold: 2 });
    expect(serviceSheetClosureErrors(facts).length).toBeGreaterThan(0);
  });
  it("accepts explicit conservation and already recorded discards without deducting ingredients again", () => {
    const facts = reconcileServiceSheet({ ...input, outcomes: [{ recipeId: "main", retained: 3, discarded: 1, note: "Conservé pour revue" },
      { recipeId: "dessert", retained: 2, discarded: 0, note: "" }] }, { ...evidence,
      wastes: [{ id: "w", productionId: "p-main", kind: "unsold", quantity: 1, unit: "portion" },
        { id: "trim", productionId: "p-main", kind: "preparation", quantity: .4, unit: "kg" },
        { id: "plate", productionId: "p-main", kind: "plate_return", quantity: 2, unit: "portion" }] });
    expect(facts.lines.find(line => line.recipeId === "main")).toMatchObject({ unsold: 4, unexplained: 0,
      preparationLosses: [{ quantity: .4, unit: "kg" }], plateReturns: 2 });
    expect(serviceSheetClosureErrors(facts)).toEqual([]);
  });
  it("never substitutes zero for missing service allocation or partial coverage", () => {
    for (const missing of [{ coverage: "partial" as const }, { unallocatedSales: 1 }, { unallocatedProductions: 1 }, { staleAllocations: 1 }]) {
      const facts = reconcileServiceSheet(input, { ...evidence, ...missing });
      expect(facts.lines.every(line => line.sold === null && line.unsold === null)).toBe(true);
      expect(serviceSheetClosureErrors(facts).length).toBeGreaterThan(0);
    }
  });
  it("requires both complete balance and an existing waste declaration before closure", () => {
    const facts = reconcileServiceSheet({ ...input, outcomes: [{ recipeId: "main", retained: 0, discarded: 4, note: "" },
      { recipeId: "dessert", retained: 2, discarded: 0, note: "" }] }, evidence);
    expect(serviceSheetClosureErrors(facts)).toContain("Main : déclarez ou rapprochez les pertes d’invendus avant clôture.");
  });
  it("records substitutions as a changed plan rather than production or stock movements", () => {
    const facts = reconcileServiceSheet({ ...input, substitutions: [{ fromRecipeId: "main", toRecipeId: "dessert", portions: 3, note: "Rupture" }] }, evidence);
    expect(facts.lines.find(line => line.recipeId === "main")).toMatchObject({ planned: 10, adjustedPlanned: 7, prepared: 12 });
    expect(facts.lines.find(line => line.recipeId === "dessert")).toMatchObject({ planned: 10, adjustedPlanned: 13, prepared: 10 });
  });
  it("keeps refused demand separate from prepared, sold and wasted portions", () => {
    const facts = reconcileServiceSheet(input, { ...evidence, refusals: [{ id: "refusal", recipeId: "main", recipeName: "Main", portions: 3 }], unallocatedRefusals: 2 });
    expect(facts.lines.find(line => line.recipeId === "main")).toMatchObject({ refused: 3, prepared: 12, sold: 8, unsold: 4 });
    expect(facts.unallocatedRefusals).toBe(2); expect(facts.refusalIds).toEqual(["refusal"]);
  });
  it("reconciles partial recipe portions without binary floating-point waste discrepancies", () => {
    const facts = reconcileServiceSheet({ planned: [{ recipeId: "main", portions: 2 }], substitutions: [],
      outcomes: [{ recipeId: "main", retained: 1.2, discarded: .3, note: "Portions partielles" }] }, { ...evidence,
      menuEntries: [{ ...formula, components: [component("main", .5)] }],
      productions: [{ id: "p-main", recipeId: "main", recipeName: "Main", portions: 2 }],
      sales: [{ ...evidence.sales[0], quantity: 1 }], wastes: [{ id: "w1", productionId: "p-main", kind: "unsold", quantity: .1, unit: "portion" },
        { id: "w2", productionId: "p-main", kind: "unsold", quantity: .2, unit: "portion" }] });
    expect(facts.lines[0]).toMatchObject({ sold: .5, unsold: 1.5, recordedUnsoldWaste: .3, unexplained: 0 });
    expect(serviceSheetClosureErrors(facts)).toEqual([]);
  });
  it("exposes overselling and unmapped sales as gaps instead of hiding negative balances", () => {
    const oversold = reconcileServiceSheet(input, { ...evidence, productions: evidence.productions.map(row => ({ ...row, portions: 2 })) });
    expect(oversold.lines.every(line => line.unsold === -6)).toBe(true);
    expect(serviceSheetClosureErrors(oversold).length).toBeGreaterThan(0);
    const unmapped = reconcileServiceSheet(input, { ...evidence, sales: [{ ...evidence.sales[0], saleItemId: "unknown" }] });
    expect(unmapped.unmappedSales).toBe(8); expect(unmapped.lines[0].sold).toBeNull();
  });
});
