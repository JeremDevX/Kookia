export const CATALOG_VERSION = 2;
export const identity = {
  name: "Maison Sureau", type: "Bistrot de saison", address: "18, passage des Tilleuls",
  city: "44000 Nantes", email: "bonjour@maison-sureau.example", chef: "Camille Morel",
};
export const suppliers = [
  { id: "MARA", name: "Les Jardins du Levant", email: "commandes@jardins-levant.example", address: "7, allée des Vergers · Nantes", deliveryDays: [2, 4, 6], style: "market" },
  { id: "FRAIS", name: "La Ferme des Aulnes", email: "commandes@ferme-aulnes.example", address: "12, chemin des Prés · Nantes", deliveryDays: [2, 5], style: "farm" },
  { id: "EPIC", name: "Le Comptoir des Grains", email: "commandes@comptoir-grains.example", address: "4, cour des Moulins · Nantes", deliveryDays: [3], style: "wholesale" },
] as const;
export interface Ingredient {
  id: string; name: string; unit: "kg" | "L" | "pcs"; category: string; supplier: string;
  price: number; threshold: number; shelfLife: number; yield: number;
  nonEdibleShare: number; sensitivity: number; packSize: number;
}
// Working assumptions, not verified supplier packaging or food-safety instructions.
// Prices: integer cents. Recipe dosages: net raw material for ten portions.
export const ingredients: Ingredient[] = [
  { id: "tomate", name: "Tomates", unit: "kg", category: "Légumes", supplier: "MARA", price: 380, threshold: 1, shelfLife: 4, yield: .95, nonEdibleShare: .6, sensitivity: 1, packSize: 1 },
  { id: "courgette", name: "Courgettes", unit: "kg", category: "Légumes", supplier: "MARA", price: 290, threshold: 1, shelfLife: 5, yield: .94, nonEdibleShare: .65, sensitivity: .8, packSize: 1 },
  { id: "carotte", name: "Carottes", unit: "kg", category: "Légumes", supplier: "MARA", price: 220, threshold: 1, shelfLife: 9, yield: .88, nonEdibleShare: .7, sensitivity: .8, packSize: 1 },
  { id: "poireau", name: "Poireaux", unit: "kg", category: "Légumes", supplier: "MARA", price: 340, threshold: 1, shelfLife: 6, yield: .78, nonEdibleShare: .8, sensitivity: 1, packSize: 1 },
  { id: "pomme", name: "Pommes", unit: "kg", category: "Fruits", supplier: "MARA", price: 320, threshold: 1, shelfLife: 10, yield: .86, nonEdibleShare: .75, sensitivity: .7, packSize: 1 },
  { id: "poulet", name: "Filet de poulet", unit: "kg", category: "Viandes", supplier: "FRAIS", price: 1250, threshold: .5, shelfLife: 3, yield: .97, nonEdibleShare: .5, sensitivity: .4, packSize: .5 },
  { id: "beurre", name: "Beurre doux", unit: "kg", category: "Crèmerie", supplier: "FRAIS", price: 960, threshold: .25, shelfLife: 15, yield: 1, nonEdibleShare: 0, sensitivity: .05, packSize: .25 },
  { id: "riz", name: "Riz long", unit: "kg", category: "Épicerie", supplier: "EPIC", price: 310, threshold: 1, shelfLife: 90, yield: 1, nonEdibleShare: 0, sensitivity: .04, packSize: 5 },
  { id: "lentille", name: "Lentilles vertes", unit: "kg", category: "Épicerie", supplier: "EPIC", price: 480, threshold: 1, shelfLife: 90, yield: 1, nonEdibleShare: 0, sensitivity: .06, packSize: 1 },
  { id: "huile", name: "Huile d'olive", unit: "L", category: "Épicerie", supplier: "EPIC", price: 890, threshold: .5, shelfLife: 60, yield: 1, nonEdibleShare: 0, sensitivity: .02, packSize: 1 },
  { id: "farine", name: "Farine de blé", unit: "kg", category: "Épicerie", supplier: "EPIC", price: 160, threshold: 1, shelfLife: 60, yield: 1, nonEdibleShare: 0, sensitivity: .08, packSize: 1 },
  { id: "sucre", name: "Sucre blond", unit: "kg", category: "Épicerie", supplier: "EPIC", price: 240, threshold: .5, shelfLife: 90, yield: 1, nonEdibleShare: 0, sensitivity: .02, packSize: 1 },
  { id: "cafe", name: "Café en grains", unit: "kg", category: "Épicerie", supplier: "EPIC", price: 1850, threshold: .25, shelfLife: 30, yield: 1, nonEdibleShare: 0, sensitivity: .03, packSize: 1 },
];
export interface Recipe {
  id: string; name: string; category: "Entrée" | "Plat" | "Dessert" | "Boisson";
  prepTime: number; price: number; months?: number[]; batch: number;
  ingredients: Record<string, number>;
}
export const recipes: Recipe[] = [
  { id: "tomates", name: "Tomates à l'huile d'olive", category: "Entrée", prepTime: 15, price: 650, months: [5, 6, 7, 8, 9], batch: 2, ingredients: { tomate: 1.8, huile: .08 } },
  { id: "carottes", name: "Carottes râpées", category: "Entrée", prepTime: 20, price: 600, batch: 2, ingredients: { carotte: 1.5, huile: .06 } },
  { id: "veloute", name: "Velouté de poireaux", category: "Entrée", prepTime: 35, price: 650, months: [1, 2, 3, 4, 10, 11, 12], batch: 4, ingredients: { poireau: 1.4, beurre: .1 } },
  { id: "poulet_ete", name: "Poulet, riz et courgettes", category: "Plat", prepTime: 40, price: 1850, months: [5, 6, 7, 8, 9], batch: 2, ingredients: { poulet: 1.6, riz: .8, courgette: 1.5, huile: .08 } },
  { id: "poulet_hiver", name: "Poulet, riz et carottes", category: "Plat", prepTime: 40, price: 1850, months: [1, 2, 3, 4, 10, 11, 12], batch: 2, ingredients: { poulet: 1.6, riz: .8, carotte: 1.5, huile: .08 } },
  { id: "lentilles", name: "Lentilles et légumes rôtis", category: "Plat", prepTime: 30, price: 1600, batch: 2, ingredients: { lentille: .9, carotte: 1.2, huile: .08 } },
  { id: "riz_legumes", name: "Riz fondant aux poireaux", category: "Plat", prepTime: 25, price: 1550, months: [1, 2, 3, 4, 10, 11, 12], batch: 2, ingredients: { riz: .9, poireau: 1.3, beurre: .12 } },
  { id: "riz_ete", name: "Riz aux légumes d'été", category: "Plat", prepTime: 25, price: 1550, months: [5, 6, 7, 8, 9], batch: 2, ingredients: { riz: .9, courgette: 1.2, tomate: .5, huile: .08 } },
  { id: "crumble", name: "Crumble aux pommes", category: "Dessert", prepTime: 35, price: 750, batch: 4, ingredients: { pomme: 1.5, farine: .3, beurre: .2, sucre: .2 } },
  { id: "pommes_roties", name: "Pommes rôties au beurre", category: "Dessert", prepTime: 25, price: 650, batch: 2, ingredients: { pomme: 1.8, beurre: .12, sucre: .12 } },
  { id: "expresso", name: "Café expresso", category: "Boisson", prepTime: 2, price: 220, batch: 1, ingredients: { cafe: .07 } },
];
export const ingredientById = (id: string) => ingredients.find(p => p.id === id)!;
export const recipeById = (id: string) => recipes.find(r => r.id === id)!;
export const quantity = (value: number) => Math.round(value * 1000) / 1000;
export const number = (value: number) => value.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
export const money = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} EUR`;
