import { expect, it } from "vitest";
import { createAnonymizedSourceInvoices } from "./anonymizedSourceInvoices.js";
import { createDemoRecipeIdeaSourceInvoices } from "./demoRecipeIdeaSourceInvoices.js";

it("provides deterministic, clearly fictitious invoice lines from two ingredient families", () => {
  const sources = createDemoRecipeIdeaSourceInvoices();
  const lines = sources.map((source) => source.stockLines[0]);

  expect(sources).toEqual(createDemoRecipeIdeaSourceInvoices());
  expect(lines.map((line) => [line?.name, line?.unit])).toEqual([["Champignons", "kg"], ["Crème Fraîche", "L"]]);
  expect(sources.every((source) => source.type === "invoice" && source.title.startsWith("EXEMPLE FICTIF") &&
    source.status.includes("fictif") && source.content.includes("Aucune pièce fournisseur réelle"))).toBe(true);
  expect(sources.map((source) => source.supplier)).toEqual([
    "Fournisseur fictif — légumes", "Fournisseur fictif — produits laitiers",
  ]);
  expect(new Set([...createAnonymizedSourceInvoices(), ...sources].map((source) => source.id)).size)
    .toBe(createAnonymizedSourceInvoices().length + sources.length);
});
