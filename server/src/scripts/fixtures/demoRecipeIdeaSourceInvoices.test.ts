import { expect, it } from "vitest";
import { createAnonymizedSourceInvoices } from "./anonymizedSourceInvoices.js";
import { createDemoRecipeIdeaSourceInvoices } from "./demoRecipeIdeaSourceInvoices.js";
import { buildDemoRecipeIdeas } from "../demoRecipeIdeas.js";
import { convertSourceLine } from "../restaurantSimulationCatalog.js";

it("builds deterministic hypotheses only from directly compatible synthetic source lines", () => {
  const sources = createDemoRecipeIdeaSourceInvoices();
  const seed = buildDemoRecipeIdeas(sources);

  expect(sources).toEqual(createDemoRecipeIdeaSourceInvoices());
  expect(seed).toEqual(buildDemoRecipeIdeas(sources));
  expect(seed.sources.map((source) => source.stockLines[0]?.name)).toEqual([
    "Farine T55", "Tomates", "Mozzarella", "Jambon cru", "Champignons", "Oeufs",
  ]);
  expect(sources.every((source) => source.type === "invoice" && source.title.startsWith("EXEMPLE FICTIF") &&
    source.status.includes("fictif") && source.content.includes("Aucune facture, réception"))).toBe(true);
  expect(sources.every((source) => source.supplier.startsWith("Fournisseur fictif"))).toBe(true);
  expect(new Set([...createAnonymizedSourceInvoices(), ...sources].map((source) => source.id)).size)
    .toBe(createAnonymizedSourceInvoices().length + sources.length);

  expect(seed.ideas.map(({ name, yieldPortions, ingredients }) => [name, yieldPortions, ingredients.length])).toEqual([
    ["Hypothèse — pizza jambon et champignons", 4, 5],
    ["Hypothèse — omelette aux champignons et jambon", 4, 3],
  ]);
  for (const idea of seed.ideas) {
    for (const ingredient of idea.ingredients) {
      const source = seed.sources.find((invoice) => invoice.id === ingredient.sourceDocumentId);
      const line = source?.stockLines.find((stockLine) => stockLine.sourceLineNumber === ingredient.sourceLineNumber);
      if (!source || !line) throw new Error("La fixture fictive ne contient pas la ligne candidate référencée.");
      const mapping = convertSourceLine(line, source.supplier);
      expect(mapping).toMatchObject({ status: "mapped", conversion: { basis: "direct", product: { key: ingredient.productKey } } });
      expect(mapping.status === "mapped" ? mapping.conversion.product.unit : null).toBe(line.unit);
    }
  }
});

it("fails closed when the corpus lacks a direct unit match instead of assuming a conversion", () => {
  const sources = createDemoRecipeIdeaSourceInvoices();
  const withoutMushrooms = sources.filter((source) => source.stockLines[0]?.name !== "Champignons");
  expect(() => buildDemoRecipeIdeas(withoutMushrooms)).toThrow(
    "Le corpus local ne contient pas de lignes directement compatibles pour les candidates de démonstration.");
});
