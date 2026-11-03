import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Timeline from "./Timeline";

const render = (path = "/history") => renderToStaticMarkup(
  createElement(MemoryRouter, { initialEntries: [path] }, createElement(Timeline)),
);

afterEach(() => vi.useRealTimers());

describe("dates de l’historique", () => {
  it("calcule les limites à chaque ouverture selon la date à Paris", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-12-31T22:59:59Z"));
    expect(render()).toContain('max="2026-12-31" value="2026-01-01"');
    vi.setSystemTime(new Date("2026-12-31T23:00:00Z"));
    const html = render();
    expect(html).toContain('max="2027-01-01" value="2027-01-01"');
  });

  it("conserve les dates choisies dans l’adresse", () => {
    vi.useFakeTimers().setSystemTime(new Date("2027-01-01T12:00:00Z"));
    const html = render("/history?from=2025-02-01&to=2025-03-01&asOf=2025-04-01");
    expect(html).toContain('max="2027-01-01" value="2025-02-01"');
    expect(html).toContain('max="2027-01-01" value="2025-03-01"');
    expect(html).toContain('max="2027-01-01" value="2025-04-01"');
  });
});
