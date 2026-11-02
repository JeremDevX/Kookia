import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Product } from "../../types";
import StockCountList from "./StockCountList";

it("présente la quantité théorique et une action de comptage par produit", () => {
  const product = { id: "p1", name: "Tomates", category: "Légumes", currentStock: 12, unit: "kg" } as Product;
  const html = renderToStaticMarkup(createElement(StockCountList, { products: [product], onCount: () => {} }));
  expect(html).toContain("12 kg");
  expect(html).toContain('aria-label="Compter Tomates"');
});
