import { expect, it } from "vitest";
import { createAnonymizedSourceInvoices } from "./anonymizedSourceInvoices.js";
import { createDemoRecipeIdeaSourceInvoices } from "./demoRecipeIdeaSourceInvoices.js";

it("provides deterministic, clearly fictitious source lines in compatible catalog units", () => {
  const sources = createDemoRecipeIdeaSourceInvoices();
  const lines = sources.flatMap((source) => source.stockLines.map((line) => [line.name, line.unit]));

  expect(sources).toEqual(createDemoRecipeIdeaSourceInvoices());
  expect(lines).toEqual([
    ["Farine T55", "kg"], ["Oeufs", "pcs"], ["Poulet Fermier", "kg"],
    ["Crème Fraîche", "L"], ["Pâtes sèches", "kg"], ["Mozzarella", "kg"],
  ]);
  expect(sources.every((source) => source.type === "invoice" && source.title.startsWith("EXEMPLE FICTIF") &&
    source.status.includes("fictif") && source.content.includes("Aucune pièce fournisseur réelle"))).toBe(true);
  expect(sources.every((source) => source.supplier.startsWith("Fournisseur fictif"))).toBe(true);
  expect(new Set([...createAnonymizedSourceInvoices(), ...sources].map((source) => source.id)).size)
    .toBe(createAnonymizedSourceInvoices().length + sources.length);
});
