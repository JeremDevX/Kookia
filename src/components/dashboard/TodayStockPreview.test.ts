import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import type { Product } from "../../domain/inventory/product.types";
import TodayStockPreview from "./TodayStockPreview";

const product = (id: string, currentStock: number, counted: boolean): Product => ({
  id, name: id, category: "Épicerie", currentStock, unit: "kg", minThreshold: 5,
  supplierId: "s", pricePerUnit: 1, revision: 1, stockRevision: 1,
  latestCount: counted ? { id, productId: id, countedQuantity: currentStock, theoreticalQuantity: currentStock,
    delta: 0, unit: "kg", stockRevisionBefore: 0, stockRevisionAfter: 1, operationId: id,
    actorId: "a", countDate: "2026-09-28", countedAt: "2026-09-28T12:00:00Z" } : null,
});
const render = (products: Product[]) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(TodayStockPreview, { products })));

it("présente au plus trois produits en distinguant rupture, seuil et stock non vérifié", () => {
  const html = render([product("Z non vérifié", 0, false), product("B seuil", 2, true),
    product("A rupture", 0, true), product("Autre", 0, false)]);
  expect(html.indexOf("A rupture")).toBeLessThan(html.indexOf("B seuil"));
  expect(html.indexOf("B seuil")).toBeLessThan(html.indexOf("Autre"));
  expect(html).not.toContain("Z non vérifié");
  expect(html).toContain("Rupture confirmée");
  expect(html).toContain("À surveiller");
  expect(html).toContain("À vérifier");
  expect(html).toContain("Stock théorique : 2 kg · seuil : 5 kg");
  expect(html).toContain('data-status="urgent"');
  expect(html).toContain('data-status="moderate"');
  expect(html).toContain('data-status="neutral"');
  expect(html).toContain('href="/stocks?product=A%20rupture"');
});
it("ne trace pas de jauge lorsque le seuil est nul", () => {
  const html = render([{ ...product("Sans seuil", 0, true), minThreshold: 0 }]);
  expect(html).not.toContain("<meter");
  expect(render([])).toBe("");
});
