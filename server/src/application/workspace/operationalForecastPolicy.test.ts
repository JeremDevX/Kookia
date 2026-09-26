import { describe, expect, it } from "vitest";
import type { MenuEntry } from "../../../../shared/serviceOperations.js";
import { forecastMenuEntry, projectMenuIngredients, type ServiceObservation } from "./operationalForecastPolicy.js";

const component = { recipeId: "dish", recipeName: "Plat", recipeVersionId: "version", recipeVersion: 2,
  category: "Plat", portions: 1, yieldPortions: 10, ingredients: [{ productId: "carrot", productName: "Carotte", unit: "kg", quantity: 2 }] };
const entry: MenuEntry = { id: "menu", name: "Plat", category: "Plat", saleItemId: "sale", available: true, priceCents: 1500, components: [component] };
const observation = (date: string, quantity: number): ServiceObservation => ({ date, slot: "lunch", saleItemId: "sale", quantity });
describe("qualified service forecast", () => {
  it("does not infer demand without enough evidence or a sale mapping", () => {
    expect(forecastMenuEntry(entry, "2026-09-29", "lunch", [observation("2026-09-22", 8)])).toMatchObject({ quantity: null, model: "insufficient" });
    expect(forecastMenuEntry({ ...entry, saleItemId: null }, "2026-09-29", "lunch", [])).toMatchObject({ quantity: null });
  });
  it("uses comparable weekdays, keeps services separate and excludes future observations", () => {
    const rows = [observation("2026-09-01", 10), observation("2026-09-08", 14), observation("2026-09-15", 6), observation("2026-09-22", 10),
      observation("2026-09-29", 999), { ...observation("2026-09-22", 999), slot: "dinner" as const }];
    expect(forecastMenuEntry(entry, "2026-09-29", "lunch", rows)).toMatchObject({ quantity: 10, observations: 4, model: "weekday", observedMin: 6, observedMax: 14 });
  });
  it("uses service fallback and exposes variability rather than confidence", () => {
    const rows = Array.from({ length: 8 }, (_, i) => observation(`2026-09-${String(i + 1).padStart(2, "0")}`, 4 + i));
    const result = forecastMenuEntry(entry, "2026-09-29", "lunch", rows);
    expect(result).toMatchObject({ quantity: 7.5, model: "service", observations: 8 });
    expect(result.deviation).toBeGreaterThan(0); expect(result).not.toHaveProperty("confidence");
  });
  it("enables seasonality only with comparable evidence across multiple years", () => {
    const dates = ["2024-09-03", "2024-09-10", "2024-09-17", "2024-09-24", "2025-09-02", "2025-09-09", "2025-09-16", "2025-09-23"];
    expect(forecastMenuEntry(entry, "2026-09-29", "lunch", dates.map(d => observation(d, 12)))).toMatchObject({ model: "seasonal", quantity: 12 });
    expect(forecastMenuEntry(entry, "2026-09-29", "lunch", dates.slice(0, 4).map(d => observation(d, 12))).model).toBe("weekday");
  });
  it("decomposes a meal deal exactly once and combines shared ingredients with explicit units", () => {
    const meal: MenuEntry = { ...entry, category: "Formule", components: [component,
      { ...component, recipeId: "starter", recipeName: "Entrée", ingredients: [{ ...component.ingredients[0], quantity: 1 }] }] };
    const item = { ...forecastMenuEntry(entry, "2026-09-29", "lunch", []), quantity: 10 };
    const result = projectMenuIngredients([meal], [item]);
    expect(result.ingredients).toMatchObject([{ productId: "carrot", quantity: 3, sources: [{ quantity: 2 }, { quantity: 1 }] }]);
    expect(projectMenuIngredients([{ ...meal, available: false }], [item]).ingredients).toEqual([]);
    expect(projectMenuIngredients([{ ...meal, components: [component, { ...component, recipeId: "other", ingredients: [{ ...component.ingredients[0], unit: "pcs" }] }] }], [item]).blockers).toHaveLength(1);
  });
});
