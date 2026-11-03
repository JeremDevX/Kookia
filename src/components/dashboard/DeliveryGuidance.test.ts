import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { PurchaseSuggestion, PurchaseSuggestions } from "../../services/orderService";
import PurchaseSuggestionCard from "./PurchaseSuggestionCard";
import TodayPurchaseForecast from "./TodayPurchaseForecast";

vi.mock("../../context/useCart", () => ({ useCart: () => ({ cartItems: [], loading: false, loadError: "" }) }));

const render = (element: React.ReactElement) => renderToStaticMarkup(createElement(MemoryRouter, null, element));

describe("delivery guidance", () => {
  it("shows missing opening days on the dashboard without suggestions or sales data", () => {
    const data = { status: "no_data", forecastDate: "2026-09-26", deliveryWarnings: [{ code: "opening_days_unknown", message: "Jours d’ouverture inconnus" }],
      suggestions: [], blockers: [] } as unknown as PurchaseSuggestions;
    const html = render(createElement(TodayPurchaseForecast, { data, loading: false, error: "", retry: () => {} }));
    expect(html).toContain("Jours d’ouverture inconnus");
    expect(html).toContain('/settings?section=restaurant');
  });

  it("shows actionable and incomplete products alongside service blockers", () => {
    const base = { supplierName: "Primeur", unit: "kg", forecastNeed: 5, countedStock: 2, usableStock: 2,
      deliveryHorizon: { status: "unknown", code: "supplier_constraints_missing", reason: "À vérifier" },
      expectedQuantity: 0, orderStep: 1, estimatedQuantity: 3, estimatedCost: 12, canAdd: true, status: "ready", decision: null };
    const data = { status: "ready", forecastDate: "2026-09-26", asOfDate: "2026-09-25", deliveryWarnings: [],
      blockers: ["Service incomplet"], suggestions: [
        { ...base, productId: "tomate", productName: "Tomate" },
        { ...base, productId: "carotte", productName: "Carotte", canAdd: false, reason: "Prévision incomplète" },
      ] } as unknown as PurchaseSuggestions;
    const html = render(createElement(TodayPurchaseForecast, { data, loading: false, error: "", retry: () => {} }));
    expect(html).toContain("Service incomplet");
    expect(html).toContain("Tomate");
    expect(html).toContain("Carotte — Prévision incomplète");
    expect(html).toContain("Préparer ma commande");
  });

  it("keeps the forecast limitation for products without a quantity to order", () => {
    const data = { status: "ready", forecastDate: "2026-09-26", asOfDate: "2026-09-25", deliveryWarnings: [],
      blockers: ["Service incomplet"], suggestions: [{ productId: "riz", productName: "Riz", supplierName: "Primeur",
        status: "covered", canAdd: false, decision: null, reason: "Prévision incomplète pour cet horizon." }] } as unknown as PurchaseSuggestions;
    const html = render(createElement(TodayPurchaseForecast, { data, loading: false, error: "", retry: () => {} }));
    expect(html).toContain("Produits sans quantité à commander");
    expect(html).toContain("Riz : Prévision incomplète pour cet horizon.");
    expect(html).not.toContain("Le besoin estimé est couvert");
  });

  it("explains incompatible days and limits settings links for members", () => {
    const item = { productId: "tomate", productName: "Tomate", supplierName: "Primeur", unit: "kg",
      status: "supplier_constraints_missing", canAdd: false, forecastNeed: 2, countedStock: null,
      deliveryHorizon: { status: "unknown", code: "opening_days_incompatible", reason: "Aucun jour commun" },
      expectedQuantity: 0, estimatedQuantity: null, orderStep: 1, decision: null } as PurchaseSuggestion;
    const card = (limited: boolean) => render(createElement("table", null, createElement("tbody", null, createElement(PurchaseSuggestionCard, { item, value: "", inCart: false,
      busy: false, saving: false, limited, onChange: () => {}, onDecide: () => {} }))));
    expect(card(false)).toContain("Aucun jour commun");
    expect(card(false)).toContain('/settings?section=restaurant');
    expect(card(false)).toContain('/settings?section=suppliers');
    expect(card(true)).toContain("Demandez au propriétaire");
    expect(card(true)).not.toContain('/settings?');
  });
});
