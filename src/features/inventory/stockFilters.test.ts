import { describe, expect, it } from "vitest";
import { readStockFilters, updateStockFilters } from "./stockFilters";

describe("filtres de stock dans l’URL", () => {
  it("reconnaît la vue des ruptures confirmées", () => {
    expect(readStockFilters(new URLSearchParams("stockView=out")).view).toBe("out");
    expect(readStockFilters(new URLSearchParams("stockView=count")).view).toBe("count");
  });
  it("ignore les états inconnus et conserve une recherche littérale", () => {
    expect(readStockFilters(new URLSearchParams("search=all&stockStatus=inconnu&stockLevel=inconnu&stockView=inconnu"))).toEqual({
      search: "all", category: "all", view: "all", advanced: { status: "all", supplier: "all", stockLevel: "all" },
    });
  });
  it("efface les filtres sans perdre le contexte d’un produit", () => {
    const initial = new URLSearchParams("product=p1&returnFrom=2026-01-01&search=tomate&category=L%C3%A9gumes&stockStatus=urgent");
    const next = updateStockFilters(initial, { search: "", category: "all", stockStatus: "all" });
    expect(next.toString()).toBe("product=p1&returnFrom=2026-01-01");
    expect(initial.get("search")).toBe("tomate");
  });
  it("redémarre sans filtre lors d’une recherche globale", () => {
    const previous = new URLSearchParams("stockView=review&category=L%C3%A9gumes&stockStatus=urgent");
    expect(readStockFilters(previous).view).toBe("review");
    expect(readStockFilters(new URLSearchParams({ search: "Farine" }))).toEqual({
      search: "Farine", category: "all", view: "all", advanced: { status: "all", supplier: "all", stockLevel: "all" },
    });
  });
});
