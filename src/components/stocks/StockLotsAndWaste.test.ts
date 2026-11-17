import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import StockLotsAndWaste from "./StockLotsAndWaste";

afterEach(() => vi.useRealTimers());

it("préremplit la date de la perte selon le jour à Paris", () => {
  vi.setSystemTime(new Date("2026-11-16T23:30:00Z"));

  const html = renderToStaticMarkup(createElement(StockLotsAndWaste, { products: [], catalogAvailable: true, onSaved: vi.fn() }));

  expect(html).toMatch(/<input[^>]*type="date"[^>]*value="2026-11-17"/);
});
