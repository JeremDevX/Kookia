import type { Product } from "../inventory/product.types";
import type { Recipe } from "./recipe.types";

type IngredientInput = Pick<Product, "id" | "name" | "category" | "unit">;

export interface RecipeSuggestion {
  sourceProductId: string;
  sourceProductName: string;
  sourceReceipt?: { receiptLineId: string; reference: string; receivedQuantity: number; unit: string };
  effectiveFrom: string;
  name: string;
  category: Recipe["category"];
  prepTime: number;
  yieldPortions: number;
  ingredients: Array<{ productId: string; productName: string; unit: string; quantity: number }>;
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("fr-FR").replace(/œ/g, "oe").replace(/æ/g, "ae");
const rounded = (value: number) => Math.round(value * 1000) / 1000;
const titleFor = (product: IngredientInput) => product.name.trim().slice(0, 80);

function productNamed(products: IngredientInput[], pattern: RegExp, unit?: string) {
  return products.find((product) => normalize(product.name).match(pattern) && (!unit || product.unit === unit));
}

function portionQuantity(product: IngredientInput, quantity: number) {
  if (product.unit === "pcs") return Math.max(1, Math.round(quantity));
  return rounded(quantity);
}

export function suggestRecipeFromIncomingProduct(
  incoming: IngredientInput,
  products: IngredientInput[],
  effectiveFrom: string,
  sourceReceipt?: RecipeSuggestion["sourceReceipt"],
): RecipeSuggestion | null {
  const available = products.filter((product) => product.id !== incoming.id);
  const name = normalize(incoming.name);
  const category = normalize(incoming.category);
  const ingredients = new Map<string, { product: IngredientInput; quantity: number }>();
  const add = (product: IngredientInput | undefined, quantity: number) => {
    if (product) ingredients.set(product.id, { product, quantity: portionQuantity(product, quantity) });
  };
  const main = (quantity: number, pieces = 4) => add(incoming, incoming.unit === "pcs" ? pieces : quantity);
  const oil = () => add(productNamed(available, /huile/, "L"), 0.04);
  let recipeName = "";
  let recipeCategory: Recipe["category"] = "Plat";
  let prepTime = 20;

  if (/\btomates?\b/.test(name)) {
    const mozzarella = productNamed(available, /mozzarella|fior di latte/, "kg");
    const basil = productNamed(available, /basilic/, "kg");
    main(0.6);
    add(mozzarella, mozzarella?.unit === "pcs" ? 4 : 0.5);
    oil();
    add(basil, 0.012);
    recipeName = mozzarella ? "Salade de tomates et mozzarella" : "Salade de tomates";
    recipeCategory = "Entrée";
    prepTime = 15;
  } else if (/\bmozzarella\b/.test(name)) {
    const tomatoes = productNamed(available, /\btomates?\b/, "kg");
    if (tomatoes) {
      add(tomatoes, 0.6);
      main(0.5);
      oil();
      add(productNamed(available, /basilic/, "kg"), 0.012);
      recipeName = "Salade de tomates et mozzarella";
      recipeCategory = "Entrée";
      prepTime = 15;
    }
  } else if (/\bpoulet\b|volaille/.test(name)) {
    const potatoes = productNamed(available, /pomme[s]? de terre|patate/, "kg");
    main(incoming.unit === "pcs" ? 4 : 0.6);
    add(potatoes, potatoes?.unit === "pcs" ? 4 : 0.8);
    oil();
    recipeName = potatoes ? "Poulet rôti et pommes de terre" : "Poulet rôti";
    prepTime = 55;
  } else if (/pomme[s]? de terre|patate/.test(name)) {
    const cream = productNamed(available, /creme/, "L");
    const cheese = productNamed(available, /fromage|emmental|comte|chevre|parmesan/, "kg");
    main(0.8);
    add(cream, 0.2);
    add(cheese, 0.2);
    oil();
    recipeName = cream || cheese ? "Gratin de pommes de terre" : "Pommes de terre sautées";
    prepTime = 35;
  } else if (/fromage|emmental|comte|chevre|parmesan/.test(name) || /fromage/.test(category)) {
    const potatoes = productNamed(available, /pomme[s]? de terre|patate/, "kg");
    const cream = productNamed(available, /creme/, "L");
    if (potatoes && (cream || incoming.unit === "kg")) {
      add(potatoes, 0.8);
      main(0.2);
      add(cream, 0.2);
      recipeName = "Gratin de pommes de terre au fromage";
      prepTime = 40;
    }
  } else if (/champignon/.test(name) || /pate|pates|feculent/.test(category) || /pates|tagliatelle|penne|spaghetti|creme/.test(name)) {
    const mushrooms = /champignon/.test(name) ? incoming : productNamed(available, /champignon/, "kg");
    const pasta = /pates|tagliatelle|penne|spaghetti/.test(name) ? incoming : productNamed(available, /pates|tagliatelle|penne|spaghetti/, "kg");
    const cream = /creme/.test(name) ? incoming : productNamed(available, /creme/, "L");
    if (mushrooms && pasta) {
      add(mushrooms, mushrooms.unit === "pcs" ? 4 : 0.4);
      add(pasta, pasta.unit === "pcs" ? 4 : 0.4);
      add(cream, 0.2);
      recipeName = "Pâtes aux champignons";
      prepTime = 25;
    }
  } else if (/\boeuf\b|\boeufs\b|oeuf/.test(name)) {
    const mushrooms = productNamed(available, /champignon/, "kg");
    const cheese = productNamed(available, /fromage|emmental|comte|chevre|parmesan/, "kg");
    const ham = productNamed(available, /jambon|lardon/, "kg");
    main(incoming.unit === "pcs" ? 4 : incoming.unit === "dz" ? 0.333 : 0.6);
    const filling = mushrooms ?? cheese ?? ham;
    add(filling, filling?.unit === "pcs" ? 4 : 0.12);
    add(productNamed(available, /creme/, "L"), 0.04);
    recipeName = filling ? `Omelette aux ${titleFor(filling).toLocaleLowerCase("fr-FR")}` : "Omelette nature";
    recipeCategory = "Plat";
    prepTime = 15;
  } else if (/farine/.test(name) || /epicerie/.test(category) && /farine/.test(name)) {
    const eggs = productNamed(available, /\boeufs?\b|oeuf/, "pcs");
    const milk = productNamed(available, /lait/, "L") ?? productNamed(available, /creme/, "L");
    if (eggs && milk) {
      main(0.3);
      add(eggs, 4);
      add(milk, 0.5);
      recipeName = "Crêpes";
      recipeCategory = "Dessert";
      prepTime = 25;
    }
  } else if (/sucre/.test(name)) {
    const flour = productNamed(available, /farine/, "kg");
    const eggs = productNamed(available, /\boeufs?\b|oeuf/, "pcs");
    const milk = productNamed(available, /lait/, "L");
    if (flour && eggs && milk) {
      main(0.08);
      add(flour, 0.3);
      add(eggs, 4);
      add(milk, 0.5);
      recipeName = "Crêpes";
      recipeCategory = "Dessert";
      prepTime = 25;
    }
  } else if (/fruit/.test(category) || /pomme|poire|peche|abricot|prune/.test(name)) {
    main(0.8);
    add(productNamed(available, /sucre/, "kg"), 0.05);
    recipeName = `Compote de ${titleFor(incoming).toLocaleLowerCase("fr-FR")}`;
    recipeCategory = "Dessert";
    prepTime = 30;
  } else if (/viande|poisson|volaille|charcuterie/.test(category) || /\bboeuf\b|\bporc\b|saumon|poisson/.test(name)) {
    const potatoes = productNamed(available, /pomme[s]? de terre|patate/, "kg");
    const rice = productNamed(available, /riz/, "kg");
    const side = potatoes ?? rice;
    main(incoming.unit === "pcs" ? 4 : 0.6);
    add(side, 0.8);
    oil();
    recipeName = side ? `${titleFor(incoming)} et ${titleFor(side).toLocaleLowerCase("fr-FR")}` : `Préparation de ${titleFor(incoming)}`;
    prepTime = 35;
  } else {
    const foodCategory = /legume|fruit|fromage|viande|poisson|volaille|charcuterie|feculent/.test(category);
    const nonDishIngredient = /huile|sel|poivre|epice|vinaigre|levure|gelatine|basilic|persil|coriandre|origan|thym|romarin|laurier|piment|paprika|cumin|emballage|entretien|nettoyant/.test(name);
    if (!foodCategory || nonDishIngredient) return null;
    main(incoming.unit === "pcs" ? 4 : incoming.unit === "dz" ? 0.333 : 0.6);
    oil();
    recipeName = `Poêlée de ${titleFor(incoming).toLocaleLowerCase("fr-FR")}`;
  }

  if (!recipeName || !ingredients.has(incoming.id)) return null;
  return { sourceProductId: incoming.id, sourceProductName: incoming.name,
    ...(sourceReceipt ? { sourceReceipt } : {}), effectiveFrom,
    name: recipeName, category: recipeCategory,
    prepTime, yieldPortions: 4,
    ingredients: [...ingredients.values()].map(({ product, quantity }) => ({ productId: product.id,
      productName: product.name, unit: product.unit, quantity })) };
}
