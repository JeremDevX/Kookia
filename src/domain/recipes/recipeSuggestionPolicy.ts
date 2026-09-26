import type { Product } from "../inventory/product.types";
import type { Recipe } from "./recipe.types";

type IngredientInput = Pick<Product, "id" | "name" | "category" | "unit">;
export interface RecipeSuggestionReceipt {
  receiptLineId: string;
  reference: string;
  receivedQuantity: number;
  unit: string;
}

export interface RecipeSuggestion {
  sourceProductId: string;
  sourceProductName: string;
  sourceReceipt?: RecipeSuggestionReceipt;
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

const supportingIngredientPattern = /huile|sel|poivre|epice|vinaigre|basilic|persil|coriandre|origan|thym|romarin|laurier|piment|paprika|cumin/;
const eggPattern = /\boeufs?\b/;
const pastaPattern = /pates|tagliatelle|penne|spaghetti/;
const mainIngredientPattern = /tomates?|pomme|poire|peche|abricot|prune|courgette|carotte|champignon|poulet|boeuf|porc|saumon|poisson|pates|tagliatelle|penne|spaghetti|riz|\boeufs?\b|mozzarella|fromage/;

function seasoningQuantity(product: IngredientInput): number | null {
  const name = normalize(product.name);
  const oil = /huile/.test(name);
  const vinegar = /vinaigre/.test(name);
  const spice = /sel|poivre|epice|piment|paprika|cumin/.test(name);
  if (product.unit === "kg") return oil ? 0.04 : vinegar ? 0.02 : spice ? 0.008 : 0.012;
  if (product.unit === "L") return oil ? 0.04 : vinegar ? 0.02 : spice ? null : 0.02;
  return null;
}

function dishIngredientQuantity(product: IngredientInput): number | null {
  const category = normalize(product.category);
  const name = normalize(product.name);
  if (!/legume|fruit|fromage|viande|poisson|volaille|charcuterie|feculent/.test(category) &&
      !mainIngredientPattern.test(name)) return null;
  const largerPortion = /fruit/.test(category) || /pomme|poire|peche|abricot|prune/.test(name);
  if (product.unit === "kg") return largerPortion ? 0.8 : 0.6;
  if (product.unit === "pcs") return 4;
  if (product.unit === "dz") return 0.333;
  return null;
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
  } else if ((/\briz\b/.test(name) || /feculent/.test(category)) && !pastaPattern.test(name)) {
    if (incoming.unit !== "kg") return null;
    const protein = available.find((product) => product.unit === "kg" &&
      (/viande|poisson|volaille|charcuterie/.test(normalize(product.category)) ||
        /poulet|boeuf|porc|saumon|poisson/.test(normalize(product.name))));
    const vegetables = available.find((product) => product.unit === "kg" && /legume/.test(normalize(product.category)) &&
      !/pomme[s]? de terre|patate/.test(normalize(product.name)));
    main(0.4);
    add(protein, 0.5);
    add(vegetables, 0.4);
    oil();
    const starchName = /\briz\b/.test(name) ? "Riz" : titleFor(incoming);
    const accompaniment = vegetables ? " et aux légumes" : "";
    recipeName = protein ? `${starchName} au ${titleFor(protein).toLocaleLowerCase("fr-FR")}${accompaniment}`
      : vegetables ? `${starchName} aux légumes` : `${starchName} nature`;
    prepTime = 30;
  } else if (/champignon/.test(name) || /pates?\b/.test(category) || pastaPattern.test(name) || /creme/.test(name)) {
    const mushrooms = /champignon/.test(name) ? incoming : productNamed(available, /champignon/, "kg");
    const pasta = pastaPattern.test(name) ? incoming : productNamed(available, pastaPattern, "kg");
    const cream = /creme/.test(name) ? incoming : productNamed(available, /creme/, "L");
    if (mushrooms && pasta) {
      add(mushrooms, mushrooms.unit === "pcs" ? 4 : 0.4);
      add(pasta, pasta.unit === "pcs" ? 4 : 0.4);
      add(cream, 0.2);
      recipeName = "Pâtes aux champignons";
      prepTime = 25;
    } else if (mushrooms && cream) {
      add(mushrooms, mushrooms.unit === "pcs" ? 4 : 0.4);
      add(cream, 0.2);
      recipeName = "Champignons à la crème";
      recipeCategory = "Entrée";
      prepTime = 20;
    } else if (pasta && cream) {
      add(pasta, pasta.unit === "pcs" ? 4 : 0.4);
      add(cream, 0.2);
      recipeName = "Pâtes à la crème";
      prepTime = 20;
    } else if (/creme/.test(name)) {
      const potatoes = productNamed(available, /pomme[s]? de terre|patate/, "kg");
      if (potatoes) {
        add(potatoes, 0.8);
        main(0.2);
      recipeName = "Gratin de pommes de terre à la crème";
        prepTime = 40;
      } else {
        main(0.2);
        recipeName = "Sauce à la crème en accompagnement";
        prepTime = 15;
      }
    } else if (pasta) {
      add(pasta, pasta.unit === "pcs" ? 4 : 0.4);
      oil();
      recipeName = "Pâtes nature";
      prepTime = 20;
    } else if (mushrooms) {
      add(mushrooms, mushrooms.unit === "pcs" ? 4 : 0.4);
      oil();
      recipeName = "Champignons poêlés";
      recipeCategory = "Entrée";
      prepTime = 20;
    }
  } else if (eggPattern.test(name)) {
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
    const eggs = productNamed(available, eggPattern, "pcs");
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
    const eggs = productNamed(available, eggPattern, "pcs");
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
  } else if (supportingIngredientPattern.test(name)) {
    const dishIngredient = available.find((product) => dishIngredientQuantity(product) !== null);
    const sourceQuantity = seasoningQuantity(incoming);
    const dishQuantity = dishIngredient ? dishIngredientQuantity(dishIngredient) : null;
    if (!dishIngredient || sourceQuantity === null || dishQuantity === null) return null;
    add(dishIngredient, dishQuantity);
    main(sourceQuantity);
    const dishName = normalize(dishIngredient.name);
    recipeName = /\btomates?\b/.test(dishName) ? "Salade de tomates assaisonnée"
      : `Préparation de ${titleFor(dishIngredient).toLocaleLowerCase("fr-FR")} avec ${titleFor(incoming).toLocaleLowerCase("fr-FR")}`;
    const dishCategory = normalize(dishIngredient.category);
    recipeCategory = /\btomates?\b/.test(dishName) ? "Entrée" : /fruit/.test(dishCategory) ? "Dessert" : "Plat";
    prepTime = /poulet|boeuf|porc|saumon|poisson/.test(dishName) ? 35 : 20;
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
