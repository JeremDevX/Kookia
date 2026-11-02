import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BilanNavigation from "./BilanNavigation";

describe("navigation du bilan", () => {
  it("conserve la période et identifie la vue active", () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(BilanNavigation, {
      active: "predictions", from: "2026-01-01", to: "2026-06-30",
    })));
    expect(html).toContain('href="/analytics?from=2026-01-01&amp;to=2026-06-30&amp;view=overview"');
    expect(html).toContain('href="/predictions?from=2026-01-01&amp;to=2026-06-30"');
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*>Prévisions<\/a>/);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });
});
