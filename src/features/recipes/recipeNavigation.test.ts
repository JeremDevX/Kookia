import { describe, expect, it } from "vitest";
import { getRecipeView, recipeViewHref } from "./recipeNavigation";

describe("navigation des recettes", () => {
  it("ouvre les recettes réalisables pour un produit et préserve la réception source", () => {
    const params = new URLSearchParams("product=p1&incomingReceiptLineId=r1");
    expect(getRecipeView(params)).toBe("anti-waste");
    expect(recipeViewHref(params, "sheets")).toBe("/recipes?incomingReceiptLineId=r1&view=sheets");
    expect(params.get("product")).toBe("p1");
  });
  it("revient au catalogue sans perdre le contexte restant", () => {
    const params = new URLSearchParams("view=sheets&incomingReceiptLineId=r1");
    expect(getRecipeView(params)).toBe("sheets");
    expect(recipeViewHref(params, "catalog")).toBe("/recipes?incomingReceiptLineId=r1");
    expect(getRecipeView(new URLSearchParams("view=inconnu"))).toBe("catalog");
  });
});
