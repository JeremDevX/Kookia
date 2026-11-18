import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";
import type { WorkshopForecast } from "../../shared/workshopForecast";

const state = vi.hoisted(() => ({ productsLoading: false, productsError: null as string | null, forecast: null as WorkshopForecast | null }));
vi.mock("../features/inventory/useInventoryCatalog", () => ({ useInventoryCatalog: () => ({ products: [], loading: state.productsLoading, error: state.productsError, refetch: vi.fn() }) }));
vi.mock("../features/dashboard/useWorkshopForecast", () => ({ useWorkshopForecast: () => state.forecast }));
vi.mock("../context/useCart", () => ({ useCart: () => ({ cartItems: [], loading: false, loadError: null, refreshCart: vi.fn() }) }));
vi.mock("../context/ToastContext", () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock("../components/dashboard/TodayPurchaseForecast", () => ({ default: () => "Prévisions d’achat opérationnelles" }));
vi.mock("../components/dashboard/TodayContext", () => ({ default: () => null }));

const render = () => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Dashboard)));
beforeEach(() => { state.productsLoading = false; state.productsError = null; state.forecast = null; });

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
  expect(html).toContain("Prévisions d’achat opérationnelles");
});

it("montre couverts, chiffre d’affaires et quantités simulées sans lien de commande", () => {
  const product = { name: "Carottes", supplier: "Maraîcher de test", unit: "kg" as const, quantityMilli: 1500, deliveryDate: "2026-11-20" };
  state.forecast = { provenance: "demo_simulation", date: "2026-11-18", basedOnDate: "2026-11-17", covers: 42, revenueCents: 123456,
    hours: [{ hour: 13, covers: 28 }, { hour: 12, covers: 14 }], products: [product, { ...product, deliveryDate: "2026-11-22" }] };
  const html = render();
  expect(html).toContain("Couverts prévus</span><strong>42</strong><small>Simulation");
  expect(html).toContain(new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(1234.56));
  expect(html).toContain('aria-label="Couverts estimés par heure"');
  expect(html).toContain('<time dateTime="12:00">12 h</time><meter min="0" max="28" value="14" aria-hidden="true"></meter><strong>14 couverts</strong>');
  expect(html.indexOf('dateTime="12:00"')).toBeLessThan(html.indexOf('dateTime="13:00"'));
  expect(html).toContain("Produits suggérés</span><strong>1</strong><small>Simulation");
  expect(html).toContain('href="#today-workshop-purchases-title"');
  expect(html).toContain("Carottes</strong><strong>1,5 kg");
  expect(html).toContain("Maraîcher de test · Livraison estimée le 20/11/2026");
  expect(html).not.toContain("Prévisions d’achat opérationnelles");
  expect(html).not.toContain('href="/orders?view=prepare#purchase-suggestions-title"');
});

it("affiche une journée simulée à zéro et une liste de produits vide", () => {
  state.forecast = { provenance: "demo_simulation", date: "2026-11-18", basedOnDate: "2026-11-17", covers: 0,
    revenueCents: 0, hours: [], products: [] };
  const html = render();
  expect(html).toContain("Couverts prévus</span><strong>0</strong><small>Simulation");
  expect(html).toContain("Aucun couvert prévu ce jour dans le scénario.");
  expect(html).toContain("Aucun produit à prévoir dans le scénario du jour.");
});

it("ouvre le planning demandé et permet de revenir au tableau de bord", () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ["/?view=planning"] }, createElement(Dashboard)));
  expect(html).toContain("Planning du jour");
  expect(html).toContain('href="/"');
  expect(html).toContain("Chargement des horaires");
  expect(html).toContain("Chargement des réceptions");
  expect(html).not.toContain("Ajouter des ventes");
});
