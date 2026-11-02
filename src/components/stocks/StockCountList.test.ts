import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Product } from "../../types";
import StockCountList from "./StockCountList";

it("présente la quantité théorique et une action de comptage par produit", () => {
  const product = { id: "p1", name: "Tomates", category: "Légumes", currentStock: 12, unit: "kg" } as Product;
  const html = renderToStaticMarkup(createElement(StockCountList, { products: [product], onCount: () => {} }));
  expect(html).toContain("12 kg");
  expect(html).toContain("Aucun comptage enregistré");
  expect(html).toContain('aria-label="Compter Tomates"');
});

it("distingue le dernier comptage du stock théorique actuel", () => {
  const product = { id: "p1", name: "Tomates", category: "Légumes", currentStock: 12, unit: "kg",
    latestCount: { countDate: "2026-09-24", countedQuantity: 10.5, unit: "kg" } } as Product;
  const html = renderToStaticMarkup(createElement(StockCountList, { products: [product], onCount: () => {} }));
  expect(html).toContain("Dernier comptage le 24/09/2026 : 10,5 kg");
  expect(html).toContain("12 kg");
});
