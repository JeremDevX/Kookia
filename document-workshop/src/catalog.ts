export const identity = {
  name: "Maison Sureau", type: "Bistrot de saison", address: "18, passage des Tilleuls",
  city: "44000 Nantes", email: "bonjour@maison-sureau.example", phone: "", chef: "Camille Morel",
};
export const suppliers = [
  { id: "MARA", name: "Les Jardins du Levant", email: "commandes@jardins-levant.example", address: "7, allée des Vergers · Nantes" },
  { id: "FRAIS", name: "La Ferme des Aulnes", email: "commandes@ferme-aulnes.example", address: "12, chemin des Prés · Nantes" },
  { id: "EPIC", name: "Le Comptoir des Grains", email: "commandes@comptoir-grains.example", address: "4, cour des Moulins · Nantes" },
];
export interface Ingredient {
  id: string; name: string; unit: "kg" | "L" | "pcs"; category: string;
  supplier: string; price: number; threshold: number;
}
// Monetary values are integer cents; ingredient quantities are rounded to 0.001.
export const ingredients: Ingredient[] = [
  { id: "tomate", name: "Tomates", unit: "kg", category: "Légumes", supplier: "MARA", price: 380, threshold: 2 },
  { id: "courgette", name: "Courgettes", unit: "kg", category: "Légumes", supplier: "MARA", price: 290, threshold: 2 },
  { id: "pomme", name: "Pommes", unit: "kg", category: "Fruits", supplier: "MARA", price: 320, threshold: 2 },
  { id: "poulet", name: "Filet de poulet", unit: "kg", category: "Viandes", supplier: "FRAIS", price: 1250, threshold: 2 },
  { id: "beurre", name: "Beurre doux", unit: "kg", category: "Crèmerie", supplier: "FRAIS", price: 960, threshold: 0.5 },
  { id: "riz", name: "Riz long", unit: "kg", category: "Épicerie", supplier: "EPIC", price: 310, threshold: 1 },
  { id: "huile", name: "Huile d'olive", unit: "L", category: "Épicerie", supplier: "EPIC", price: 890, threshold: 0.5 },
  { id: "farine", name: "Farine de blé", unit: "kg", category: "Épicerie", supplier: "EPIC", price: 160, threshold: 1 },
  { id: "sucre", name: "Sucre blond", unit: "kg", category: "Épicerie", supplier: "EPIC", price: 240, threshold: 0.5 },
];
export const recipes = [
  { name: "Tomates à l'huile d'olive", category: "Entrée", prepTime: 15, price: 650,
    ingredients: { tomate: 1.8, huile: 0.08 } },
  { name: "Poulet, riz et courgettes", category: "Plat", prepTime: 40, price: 1850,
    ingredients: { poulet: 1.6, riz: 0.8, courgette: 1.5, huile: 0.08 } },
  { name: "Crumble aux pommes", category: "Dessert", prepTime: 35, price: 750,
    ingredients: { pomme: 1.5, farine: 0.3, beurre: 0.2, sucre: 0.2 } },
] as const;
export const quantity = (value: number) => Math.round(value * 1000) / 1000;
export const number = (value: number) => value.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
export const money = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} EUR`;
