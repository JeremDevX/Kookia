import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

const state = vi.hoisted(() => ({ productsLoading: false, productsError: null as string | null }));
vi.mock("../hooks", () => ({ useProducts: () => ({ products: [], loading: state.productsLoading, error: state.productsError, refetch: vi.fn() }) }));
vi.mock("../context/useCart", () => ({ useCart: () => ({ cartItems: [], loading: false, loadError: null, refreshCart: vi.fn() }) }));
vi.mock("../context/ToastContext", () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock("../components/dashboard/TodayPurchaseForecast", () => ({ default: () => null }));

const render = () => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Dashboard)));
beforeEach(() => { state.productsLoading = false; state.productsError = null; });

it("indique l’absence de produits dans la carte et les indicateurs", () => {
  const html = render();
  expect(html).toContain("Aucun produit enregistré. Ajoutez vos produits pour suivre vos stocks.");
  expect(html).toContain('<strong>—</strong><small>Aucun produit enregistré</small>');
  expect(html).toContain('href="/stocks"');
  expect(html).not.toContain("Aucun produit sous le seuil théorique");
});

it("conserve les états de chargement et d’erreur du stock", () => {
  state.productsLoading = true;
  expect(render()).toContain('role="status">Chargement du stock');
  state.productsLoading = false;
  state.productsError = "Erreur";
  const html = render();
  expect(html).toContain('role="alert"><p>Stock indisponible.');
  expect(html).not.toContain("Aucun produit enregistré");
});

it("distingue les prévisions indisponibles des données réelles", () => {
  const html = render();
  expect(html).toContain("Couverts prévus</span><strong>—</strong><small>Prévision indisponible");
  expect(html).toContain("Chiffre d’affaires estimé</span><strong>—</strong><small>Estimation indisponible");
  expect(html).toContain("Produits suggérés</span><strong>—</strong><small>Chargement");
  expect(html).toContain('href="/orders?view=prepare#purchase-suggestions-title"');
});
