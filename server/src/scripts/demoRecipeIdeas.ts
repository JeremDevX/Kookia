import type { SourceInvoice } from "./sourceInvoices.js";
import { convertSourceLine } from "./restaurantSimulationCatalog.js";

interface RecipeIdeaIngredientDefinition {
  productKey: string;
  quantity: number;
}

interface RecipeIdeaDefinition {
  key: string;
  name: string;
  prepTime: number;
  yieldPortions: number;
  ingredients: RecipeIdeaIngredientDefinition[];
}

export interface DemoRecipeIdea extends Omit<RecipeIdeaDefinition, "ingredients"> {
  ingredients: Array<RecipeIdeaIngredientDefinition & { sourceDocumentId: string; sourceLineNumber: number }>;
}

export interface DemoRecipeIdeaSeed {
  sources: SourceInvoice[];
  ideas: DemoRecipeIdea[];
}

const definitions: RecipeIdeaDefinition[] = [
  { key: "ham-mushroom-pizza", name: "Hypothèse — pizza jambon et champignons", prepTime: 30, yieldPortions: 4,
    ingredients: [
      { productKey: "flour", quantity: 0.2 },
      { productKey: "tomatoes", quantity: 0.08 },
      { productKey: "mozzarella", quantity: 0.1 },
      { productKey: "ham", quantity: 0.06 },
      { productKey: "mushrooms", quantity: 0.05 },
      { productKey: "olive-oil", quantity: 0.02 },
    ] },
  { key: "ham-mushroom-omelette", name: "Hypothèse — omelette aux champignons et jambon", prepTime: 15,
    yieldPortions: 4, ingredients: [
      { productKey: "eggs", quantity: 4 },
      { productKey: "mushrooms", quantity: 0.08 },
      { productKey: "ham", quantity: 0.05 },
    ] },
];

export function buildDemoRecipeIdeas(invoices: readonly SourceInvoice[]): DemoRecipeIdeaSeed {
  const orderedInvoices = [...invoices].sort((left, right) => (left.date ?? "9999-12-31").localeCompare(right.date ?? "9999-12-31") ||
    left.id.localeCompare(right.id));
  const lineByProduct = new Map<string, { invoice: SourceInvoice; sourceLineNumber: number }>();
  for (const invoice of orderedInvoices) {
    if (invoice.type !== "invoice") continue;
    for (const line of invoice.stockLines) {
      const mapped = convertSourceLine(line, invoice.supplier);
      if (mapped.status !== "mapped" || mapped.conversion.basis !== "direct" || mapped.conversion.product.unit !== line.unit)
        continue;
      if (!lineByProduct.has(mapped.conversion.product.key))
        lineByProduct.set(mapped.conversion.product.key, { invoice, sourceLineNumber: line.sourceLineNumber });
    }
  }

  const neededProducts = new Set(definitions.flatMap((idea) => idea.ingredients.map(({ productKey }) => productKey)));
  if ([...neededProducts].some((productKey) => !lineByProduct.has(productKey)))
    throw new Error("Le corpus local ne contient pas de lignes directement compatibles pour les candidates de démonstration.");

  const sourceById = new Map<string, SourceInvoice>();
  const ideas = definitions.map((idea) => ({ ...idea, ingredients: idea.ingredients.map((ingredient) => {
    const evidence = lineByProduct.get(ingredient.productKey)!;
    const existing = sourceById.get(evidence.invoice.id);
    if (existing && existing.contentHash !== evidence.invoice.contentHash)
      throw new Error("Une référence de pièce source est ambiguë pour les candidates de démonstration.");
    sourceById.set(evidence.invoice.id, evidence.invoice);
    return { ...ingredient, sourceDocumentId: evidence.invoice.id, sourceLineNumber: evidence.sourceLineNumber };
  }) }));

  return { sources: [...sourceById.values()], ideas };
}
