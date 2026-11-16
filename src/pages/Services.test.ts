import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { getRecipes } from "../services/recipeService";
import Services from "./Services";

const { panel } = vi.hoisted(() => ({
  panel: vi.fn<(props: { loadRecipes: typeof getRecipes }) => null>(() => null),
}));

vi.mock("react-router-dom", async (original) => ({
  ...await original<typeof import("react-router-dom")>(),
  useBlocker: () => ({ state: "unblocked" }),
}));
vi.mock("../features/services/weather.context", () => ({
  useSharedServiceWeather: () => ({ service: { date: "2026-10-01", slot: "lunch" }, state: {} }),
}));
vi.mock("../services/recipeService", () => ({ getRecipes: vi.fn() }));
vi.mock("../components/services/ServiceMenuEditor", () => ({ default: panel }));
vi.mock("../components/services/ServiceSheetPanel", () => ({ default: panel }));
vi.mock("../components/services/OperationalIncidents", () => ({ default: panel }));
vi.mock("../components/services/ServiceForecastPanel", () => ({ default: () => null }));

it("partage la requête recettes entre les trois panneaux et permet de réessayer", async () => {
  const catalogUnavailable = new Error("Catalogue indisponible");
  vi.mocked(getRecipes).mockRejectedValueOnce(catalogUnavailable).mockResolvedValueOnce([]);

  renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Services)));
  const requests = panel.mock.calls.map(([props]) => props.loadRecipes());

  expect(requests).toHaveLength(3);
  expect(await Promise.allSettled(requests)).toEqual(Array.from({ length: 3 }, () => ({
    status: "rejected", reason: catalogUnavailable,
  })));
  expect(getRecipes).toHaveBeenCalledTimes(1);

  await expect(panel.mock.calls[0][0].loadRecipes()).resolves.toEqual([]);
  expect(getRecipes).toHaveBeenCalledTimes(2);
});
