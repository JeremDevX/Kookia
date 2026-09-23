import type { SourceLine } from "./sourceInvoices.js";

export type StockUnit = "kg" | "L" | "pcs";
export type ConversionBasis = "direct" | "explicit_package" | "documented_assumption";

export interface ScenarioProduct {
  key: string;
  id: string;
  name: string;
  category: string;
  unit: StockUnit;
  minThreshold: number;
  restockLevel: number;
  defaultPrice: number;
  seedUnit?: string;
  openingFactor?: number;
  openingAssumption?: string;
  active: boolean;
  supplierId?: string;
  supplierName?: string;
}

export interface RecipeIngredientSpec {
  productId: string;
  quantity: number;
}

export interface ScenarioRecipe {
  id: string;
  name: string;
  prepTime: number;
  baseDailyPortions: number;
  ingredients: Array<{ productKey: string; quantity: number }>;
  seasonalMonths?: number[];
}

export const scenarioProducts: ScenarioProduct[] = [
  { key: "tomatoes", id: "p1", name: "Tomates", category: "Légumes", unit: "kg", minThreshold: 8, restockLevel: 35, defaultPrice: 2.4, active: true },
  { key: "mozzarella", id: "p2", name: "Mozzarella", category: "Fromages", unit: "kg", minThreshold: 5, restockLevel: 38, defaultPrice: 8.5, active: true },
  { key: "eggs", id: "p3", name: "Oeufs", category: "Frais", unit: "pcs", minThreshold: 24, restockLevel: 180, defaultPrice: 3.2 / 12, seedUnit: "dz", openingFactor: 12, openingAssumption: "douzaine convertie en 12 œufs entiers", active: true },
  { key: "olive-oil", id: "p4", name: "Huile d'olive", category: "Epicerie", unit: "L", minThreshold: 3, restockLevel: 12, defaultPrice: 12, active: true },
  { key: "flour", id: "p5", name: "Farine T55", category: "Epicerie", unit: "kg", minThreshold: 8, restockLevel: 50, defaultPrice: 0.9, active: true },
  { key: "ground-beef", id: "p6", name: "Viande Hachée", category: "Viandes", unit: "kg", minThreshold: 15, restockLevel: 20, defaultPrice: 11.5, active: false },
  { key: "chicken", id: "p7", name: "Poulet Fermier", category: "Viandes", unit: "kg", minThreshold: 6, restockLevel: 50, defaultPrice: 9.8, active: true },
  { key: "lettuce", id: "p8", name: "Salade Laitue", category: "Légumes", unit: "kg", minThreshold: 1.2, restockLevel: 6, defaultPrice: 0.8 / 0.3, seedUnit: "pcs", openingFactor: 0.3, openingAssumption: "tête de laitue moyenne estimée à 300 g par pièce", active: true },
  { key: "onions", id: "p9", name: "Oignons Jaunes", category: "Légumes", unit: "kg", minThreshold: 20, restockLevel: 25, defaultPrice: 1.2, active: false },
  { key: "potatoes", id: "p10", name: "Pommes de Terre", category: "Légumes", unit: "kg", minThreshold: 12, restockLevel: 30, defaultPrice: 0.6, active: true },
  { key: "cream", id: "p11", name: "Crème Fraîche", category: "Frais", unit: "L", minThreshold: 2, restockLevel: 4, defaultPrice: 4.5, active: true },
  { key: "parmesan", id: "p12", name: "Parmesan", category: "Fromages", unit: "kg", minThreshold: 1.5, restockLevel: 6, defaultPrice: 18, active: true },
  { key: "ham", id: "p13", name: "Jambon cru", category: "Charcuterie", unit: "kg", minThreshold: 1.5, restockLevel: 8, defaultPrice: 24, active: true },
  { key: "mushrooms", id: "p14", name: "Champignons", category: "Légumes", unit: "kg", minThreshold: 1, restockLevel: 6, defaultPrice: 3.5, active: true },
  { key: "basil", id: "p15", name: "Basilic Frais", category: "Frais", unit: "kg", minThreshold: 0.15, restockLevel: 0.25, defaultPrice: 30, seedUnit: "pcs", openingFactor: 0.05, openingAssumption: "pot ou botte de basilic estimé à 50 g par pièce", active: true },
  { key: "pasta", id: "simulation-v1-product-pasta", name: "Pâtes sèches", category: "Epicerie", unit: "kg", minThreshold: 4, restockLevel: 14, defaultPrice: 1.5, supplierId: "simulation-v1-supplier", supplierName: "Approvisionnement synthétique (aucune commande)", active: true },
  { key: "lardons", id: "simulation-v1-product-lardons", name: "Lardons fumés", category: "Charcuterie", unit: "kg", minThreshold: 1.5, restockLevel: 5, defaultPrice: 5.5, supplierId: "simulation-v1-supplier", supplierName: "Approvisionnement synthétique (aucune commande)", active: true },
  { key: "parsley", id: "simulation-v1-product-parsley", name: "Persil frais", category: "Légumes", unit: "kg", minThreshold: 0.05, restockLevel: 0.25, defaultPrice: 21.8, supplierId: "simulation-v1-supplier", supplierName: "Approvisionnement synthétique (aucune commande)", active: true },
];

const productByKey = new Map(scenarioProducts.map((product) => [product.key, product]));
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");

export const scenarioRecipes: ScenarioRecipe[] = [
  { id: "r1", name: "Pizza Margherita", prepTime: 15, baseDailyPortions: 28, ingredients: [
    { productKey: "flour", quantity: 0.2 }, { productKey: "tomatoes", quantity: 0.1 },
    { productKey: "mozzarella", quantity: 0.12 }, { productKey: "olive-oil", quantity: 0.02 },
  ] },
  { id: "r4", name: "Pizza Reine", prepTime: 20, baseDailyPortions: 20, ingredients: [
    { productKey: "flour", quantity: 0.2 }, { productKey: "tomatoes", quantity: 0.1 },
    { productKey: "mozzarella", quantity: 0.1 }, { productKey: "ham", quantity: 0.08 },
    { productKey: "mushrooms", quantity: 0.05 },
  ] },
  { id: "r2", name: "Salade Caprese", prepTime: 10, baseDailyPortions: 12, seasonalMonths: [4, 5, 6, 7, 8, 9], ingredients: [
    { productKey: "tomatoes", quantity: 0.15 }, { productKey: "mozzarella", quantity: 0.125 },
    { productKey: "olive-oil", quantity: 0.03 }, { productKey: "basil", quantity: 0.003 },
  ] },
  { id: "r3", name: "Pâtes Carbonara", prepTime: 20, baseDailyPortions: 20, ingredients: [
    { productKey: "eggs", quantity: 1 }, { productKey: "parmesan", quantity: 0.03 },
    { productKey: "cream", quantity: 0.03 }, { productKey: "pasta", quantity: 0.1 },
    { productKey: "lardons", quantity: 0.04 }, { productKey: "parsley", quantity: 0.002 },
  ] },
  { id: "r6", name: "Salade César", prepTime: 15, baseDailyPortions: 13, seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10], ingredients: [
    { productKey: "lettuce", quantity: 0.08 }, { productKey: "chicken", quantity: 0.12 },
    { productKey: "parmesan", quantity: 0.03 }, { productKey: "eggs", quantity: 1 },
  ] },
  { id: "r8", name: "Poulet Rôti & Patates", prepTime: 60, baseDailyPortions: 19, ingredients: [
    { productKey: "chicken", quantity: 0.4 }, { productKey: "potatoes", quantity: 0.3 },
    { productKey: "olive-oil", quantity: 0.02 },
  ] },
];

export const recipeIngredientCorrections: Record<string, RecipeIngredientSpec[]> = {
  r2: [
    { productId: "p1", quantity: 0.15 }, { productId: "p2", quantity: 0.125 },
    { productId: "p4", quantity: 0.03 }, { productId: "p15", quantity: 0.003 },
  ],
  r3: [
    { productId: "p3", quantity: 1 }, { productId: "p12", quantity: 0.03 },
    { productId: "p11", quantity: 0.03 }, { productId: "simulation-v1-product-pasta", quantity: 0.1 },
    { productId: "simulation-v1-product-lardons", quantity: 0.04 },
    { productId: "simulation-v1-product-parsley", quantity: 0.002 },
  ],
  r5: [
    { productId: "p6", quantity: 0.15 }, { productId: "p8", quantity: 0.03 },
    { productId: "p1", quantity: 0.05 }, { productId: "p9", quantity: 0.02 },
  ],
  r6: [
    { productId: "p8", quantity: 0.08 }, { productId: "p7", quantity: 0.12 },
    { productId: "p12", quantity: 0.03 }, { productId: "p3", quantity: 1 },
  ],
  r7: [{ productId: "p3", quantity: 1 }, { productId: "p11", quantity: 0.08 }],
  r9: [
    { productId: "p3", quantity: 2 }, { productId: "p14", quantity: 0.1 },
    { productId: "p11", quantity: 0.02 },
  ],
  r10: [
    { productId: "p1", quantity: 0.12 }, { productId: "p4", quantity: 0.02 },
    { productId: "p15", quantity: 0.003 },
  ],
  r13: [
    { productId: "p7", quantity: 0.2 }, { productId: "p3", quantity: 1 },
    { productId: "p5", quantity: 0.05 },
  ],
};

interface MatchRule {
  key: string;
  matches: (name: string) => boolean;
  assumption?: string;
  assumedPackageQuantity?: number;
}

const rules: MatchRule[] = [
  { key: "eggs", matches: (name) => /\boeufs?\b|œuf/.test(name) && !/blanc|jaune|liquide/.test(name) },
  { key: "tomatoes", matches: (name) => /\btomates?\b/.test(name) && !/confite|concassee|pelee|conserve|sauce|concentre/.test(name) },
  { key: "mozzarella", matches: (name) => name.includes("mozzarella") && !/croq|sticks?/.test(name) },
  { key: "olive-oil", matches: (name) => /huile.*olive|olive.*huile/.test(name) && !/savon|entretien/.test(name) },
  { key: "flour", matches: (name) => /\bfarine\b/.test(name) && !/amaree|ambr[eé]e|brune|preparation/.test(name), assumption: "sac Minoterie Chabert estimé à 25 kg, faute de poids imprimé", assumedPackageQuantity: 25 },
  { key: "chicken", matches: (name) => /\bpoulet\b/.test(name) && !/salade|terrine|bouillon/.test(name) },
  { key: "lettuce", matches: (name) => /batavia|laitue|feuille de chene|salade verte/.test(name) && !/composee|calamar/.test(name), assumption: "tête de laitue estimée à 300 g par pièce", assumedPackageQuantity: 0.3 },
  { key: "potatoes", matches: (name) => /pomme[s]? de terre|\bpdt\b|patate/.test(name) && !/puree|chips|surgele|frites precuites/.test(name), assumption: "sac de pommes de terre estimé à 2,5 kg, conditionnement non imprimé", assumedPackageQuantity: 2.5 },
  { key: "cream", matches: (name) => /creme liquide|creme cuisson|creme fraiche|creme 35%|creme 18%/.test(name) && !/marron|glacee|fouettee|pression|chantilly/.test(name), assumption: "brique de crème UHT estimée à 1 L, volume non imprimé", assumedPackageQuantity: 1 },
  { key: "parmesan", matches: (name) => name.includes("parmesan") },
  { key: "ham", matches: (name) => /jambon cru|jambon de parme|jambon italien/.test(name) },
  { key: "mushrooms", matches: (name) => name.includes("champignon") && !/a la grecque|farci|choucroute/.test(name) },
  { key: "basil", matches: (name) => name.includes("basilic") && !/pizza plaque|ravioles|surgel/.test(name), assumption: "botte ou pot de basilic estimé à 50 g par pièce", assumedPackageQuantity: 0.05 },
  { key: "pasta", matches: (name) => /spaghetti|penne|coquillettes|tagliatelle|fusilli|macaroni|pates seches/.test(name) && !/ravioles|feuilletee|brisee/.test(name) },
  { key: "lardons", matches: (name) => /lardon|bacon/.test(name) && !/filet bacon/.test(name) },
  { key: "parsley", matches: (name) => /persil/.test(name), assumption: "botte de persil estimée à 50 g par pièce, format absent de la fiche", assumedPackageQuantity: 0.05 },
];

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;
const amount = (value: string) => Number(value.replace(",", "."));

function namedPackageFactor(name: string, unit: StockUnit): number | null {
  const normalized = normalize(name);
  if (unit === "pcs") {
    const count = normalized.match(/\b(?:plateau|boite|pack|paquet|carton|barquette|caisse)(?: de)?\s*(\d{1,3})\b/)
      ?? normalized.match(/\b(\d{1,3})\s+oeufs?\b/)
      ?? normalized.match(/\bx\s*(\d{1,3})\b/);
    return count ? Number(count[1]) : null;
  }
  const repeated = normalized.match(/\b(\d+(?:[,.]\d+)?)\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(kg|g|l|lt|cl|ml)\b/);
  const single = repeated ? null : normalized.match(/\b(\d+(?:[,.]\d+)?)\s*(kg|kgs|g|l|lt|litre|litres|cl|ml)\b/);
  const value = repeated ? amount(repeated[1]) * amount(repeated[2]) : single ? amount(single[1]) : null;
  const rawUnit = repeated?.[3] ?? single?.[2];
  if (value === null || !rawUnit) return null;
  if (unit === "kg") {
    if (rawUnit === "kg" || rawUnit === "kgs") return value;
    if (rawUnit === "g") return value / 1000;
  }
  if (unit === "L") {
    if (rawUnit === "l" || rawUnit === "lt" || rawUnit.startsWith("litre")) return value;
    if (rawUnit === "cl") return value / 100;
    if (rawUnit === "ml") return value / 1000;
  }
  return null;
}

export interface ConvertedSourceLine {
  product: ScenarioProduct;
  quantity: number;
  pricePerUnit: number;
  factor: number;
  basis: ConversionBasis;
  assumption?: string;
}

export type SourceLineDisposition =
  | { status: "mapped"; conversion: ConvertedSourceLine }
  | { status: "excluded"; reason: "outside_demo_menu" | "unresolved_packaging" | "unit_mismatch" };

export function convertSourceLine(line: SourceLine, supplierName: string): SourceLineDisposition {
  const name = normalize(line.name);
  const rule = rules.find((candidate) => candidate.matches(name));
  if (!rule) return { status: "excluded", reason: "outside_demo_menu" };
  const product = productByKey.get(rule.key)!;
  let factor: number | null = null;
  let basis: ConversionBasis = "direct";
  let assumption: string | undefined;

  if (line.unit === product.unit) {
    const packageCount = product.key === "eggs" ? namedPackageFactor(`${line.name} ${line.sourceQuantityText}`, product.unit) : null;
    const explicitlyCounted = /\d+(?:[,.]\d+)?\s*(?:pce|pcs|unit[eé]s?|pi[eè]ces?|oeufs?)\b/i.test(line.sourceQuantityText);
    if (packageCount !== null) {
      factor = packageCount;
      basis = "explicit_package";
    } else if (product.key !== "eggs" || explicitlyCounted) factor = 1;
  }
  else if (line.unit === "pcs") {
    factor = namedPackageFactor(`${line.name} ${line.sourceQuantityText}`, product.unit);
    if (factor !== null) basis = "explicit_package";
    else if (rule.assumedPackageQuantity !== undefined) {
      const supplier = normalize(supplierName);
      const isFlourSackEstimate = rule.key === "flour" && supplier.includes("minoterie chabert");
      const isGenericProduceEstimate = rule.key === "lettuce" || rule.key === "potatoes" || rule.key === "basil" || rule.key === "parsley";
      const isUhtCreamEstimate = rule.key === "cream" && /uht/.test(name);
      if (isFlourSackEstimate || isGenericProduceEstimate || isUhtCreamEstimate) {
        factor = rule.assumedPackageQuantity;
        basis = "documented_assumption";
        assumption = rule.assumption;
      }
    }
  }

  if (factor === null || factor <= 0) {
    return { status: "excluded", reason: factor === null ? "unresolved_packaging" : "unit_mismatch" };
  }
  return { status: "mapped", conversion: {
    product, quantity: round(line.quantity * factor, 3), pricePerUnit: round(line.unitPrice / factor, 4),
    factor, basis, ...(assumption ? { assumption } : {}),
  } };
}

export function initialInventory(product: ScenarioProduct, sourceUnit: string, stock: number) {
  if (product.seedUnit && sourceUnit !== product.seedUnit) throw new Error(`Unité seed inattendue pour ${product.id}.`);
  if (!product.seedUnit && sourceUnit !== product.unit) throw new Error(`Unité stock inattendue pour ${product.id}.`);
  const factor = product.openingFactor ?? 1;
  const quantity = round(stock * factor, 3);
  if (product.unit === "pcs" && !Number.isInteger(quantity)) throw new Error(`Stock initial fractionnaire en pièces : ${product.name}.`);
  return { quantity, unit: product.unit, factor, ...(product.openingAssumption ? { assumption: product.openingAssumption } : {}) };
}

export function recipeIngredientRows(recipe: ScenarioRecipe): RecipeIngredientSpec[] {
  return recipe.ingredients.map(({ productKey, quantity }) => {
    const product = productByKey.get(productKey);
    if (!product) throw new Error(`Produit de recette absent : ${productKey}.`);
    if (product.unit === "pcs" && !Number.isInteger(quantity)) throw new Error(`Recette fractionnaire en pièces : ${recipe.name}.`);
    return { productId: product.id, quantity };
  });
}
