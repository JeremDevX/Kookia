import { describe, expect, it } from "vitest";
import { getOrderStep, isOrderQuantity, roundOrderQuantity } from "../../../shared/orderQuantity.js";
import { isValidOrderQuantity } from "./orderQuantity.js";

describe("purchase units", () => {
  it.each([
    [{ unit: "L", name: "Huile d’olive" }, 0.019, 0.5],
    [{ unit: "L" }, 0.19, 0.5],
    [{ unit: "L" }, 0.519, 1],
    [{ unit: "kg", category: "Légumes", name: "Courgettes" }, 3.893, 4],
    [{ unit: "kg", category: "Fruits" }, 1.536, 2],
    [{ unit: "kg", category: "Épicerie" }, 2.143, 3],
    [{ unit: "kg", category: "Viandes" }, 4.286, 4.5],
    [{ unit: "kg", category: "Fromages" }, 0.3, 0.5],
    [{ unit: "kg", name: "Persil frais", category: "Légumes" }, 0.019, 0.05],
    [{ unit: "kg", name: "Paprika", category: "Épicerie" }, 0.008, 0.05],
    [{ unit: "kg", name: "Beurre doux", category: "Frais" }, 0.1, 0.25],
    [{ unit: "pcs" }, 1.2, 2],
    [{ unit: "dz" }, 0.4, 1],
  ])("rounds a net need up to a useful purchase for %j", (product, need, expected) => {
    const step = getOrderStep(product);
    expect(roundOrderQuantity(need, step)).toBe(expected);
    expect(isOrderQuantity(expected, step)).toBe(true);
  });

  it("preserves zero and exact multiples without floating point extra packs", () => {
    expect(roundOrderQuantity(0, 0.5)).toBe(0);
    expect(roundOrderQuantity(-1, 1)).toBe(0);
    expect(roundOrderQuantity(0.1 + 0.2, 0.05)).toBe(0.3);
    expect(roundOrderQuantity(0.501, 0.5)).toBe(1);
  });

  it("rejects non-commandable edits, non-finite quantities and excessive values", () => {
    for (const value of [0, -1, 0.19, NaN, Infinity, 1000000.5]) expect(isOrderQuantity(value, 0.5)).toBe(false);
    expect(isValidOrderQuantity("0.19", 0.5)).toBe(false);
    expect(isValidOrderQuantity("0.5", 0.5)).toBe(true);
    expect(isValidOrderQuantity("1.001", 1)).toBe(false);
  });
});
