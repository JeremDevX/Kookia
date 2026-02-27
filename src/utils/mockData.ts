// ============================================
// Re-export types from the central types module
// This maintains backward compatibility with existing imports
// ============================================
import type {
  ProductStatus as _ProductStatus,
  Unit as _Unit,
  Supplier as _Supplier,
  Product as _Product,
  Prediction as _Prediction,
  Recipe as _Recipe,
  AnalyticsData as _AnalyticsData,
  DashboardActivity as _DashboardActivity,
} from "../types";

// Re-export types for backward compatibility
export type ProductStatus = _ProductStatus;
export type Unit = _Unit;
export type Supplier = _Supplier;
export type Product = _Product;
export type Prediction = _Prediction;
export type Recipe = _Recipe;
export type AnalyticsData = _AnalyticsData;
export type DashboardActivity = _DashboardActivity;

// Re-export utility functions
export { getStatusColor, getProductStatus as getStatus } from "../types";

// ============================================
// MOCK DATA
// ============================================

// MOCK DATA

export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: "sup1",
    name: "Franck Légumes",
    email: "franck@legumes.fr",
    phone: "+33 6 12 34 56 78",
  },
  {
    id: "sup2",
    name: "Fromages Dupont",
    email: "contact@dupont.fr",
    phone: "+33 1 98 76 54 32",
  },
  {
    id: "sup3",
    name: "Avicole MM",
    email: "oeufs@martin.fr",
    phone: "+33 6 00 11 22 33",
  },
  {
    id: "sup4",
    name: "Viandes de Rungis",
    email: "commandes@viandes-rungis.fr",
    phone: "+33 1 45 67 89 00",
  },
  {
    id: "sup5",
    name: "Bio Local IDF",
    email: "contact@biolocal.fr",
    phone: "+33 6 99 88 77 66",
  },
  {
    id: "sup6",
    name: "Boulangerie Artisanale",
    email: "pain@artisan.fr",
    phone: "+33 1 23 45 67 89",
  },
  {
    id: "sup7",
    name: "Boissons Service",
    email: "logistique@boissons-service.fr",
    phone: "+33 1 55 44 33 22",
  },
  {
    id: "sup8",
    name: "Marée Fraîche",
    email: "poisson@maree.fr",
    phone: "+33 2 98 76 54 32",
  },
  {
    id: "sup9",
    name: "Emballages Eco",
    email: "contact@eco-pack.fr",
    phone: "+33 1 66 77 88 99",
  },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Tomates",
    category: "Légumes",
    currentStock: 12,
    unit: "kg",
    minThreshold: 20,
    supplierId: "sup1",
    pricePerUnit: 2.4,
  },
  {
    id: "p2",
    name: "Mozzarella",
    category: "Fromages",
    currentStock: 8,
    unit: "kg",
    minThreshold: 10,
    supplierId: "sup2",
    pricePerUnit: 8.5,
  },
  {
    id: "p3",
    name: "Oeufs",
    category: "Frais",
    currentStock: 8,
    unit: "dz",
    minThreshold: 10,
    supplierId: "sup3",
    pricePerUnit: 3.2,
  },
  {
    id: "p4",
    name: "Huile d'olive",
    category: "Epicerie",
    currentStock: 35,
    unit: "L",
    minThreshold: 20,
    supplierId: "sup1",
    pricePerUnit: 12.0,
  },
  {
    id: "p5",
    name: "Farine T55",
    category: "Epicerie",
    currentStock: 50,
    unit: "kg",
    minThreshold: 25,
    supplierId: "sup1",
    pricePerUnit: 0.9,
  },
  {
    id: "p6",
    name: "Viande Hachée",
    category: "Viandes",
    currentStock: 5,
    unit: "kg",
    minThreshold: 15,
    supplierId: "sup4",
    pricePerUnit: 11.5,
  },
  {
    id: "p7",
    name: "Poulet Fermier",
    category: "Viandes",
    currentStock: 12,
    unit: "kg",
    minThreshold: 10,
    supplierId: "sup4",
    pricePerUnit: 9.8,
  },
  {
    id: "p8",
    name: "Salade Laitue",
    category: "Légumes",
    currentStock: 24,
    unit: "pcs",
    minThreshold: 30,
    supplierId: "sup1",
    pricePerUnit: 0.8,
  },
  {
    id: "p9",
    name: "Oignons Jaunes",
    category: "Légumes",
    currentStock: 40,
    unit: "kg",
    minThreshold: 20,
    supplierId: "sup1",
    pricePerUnit: 1.2,
  },
  {
    id: "p10",
    name: "Pommes de Terre",
    category: "Légumes",
    currentStock: 150,
    unit: "kg",
    minThreshold: 80,
    supplierId: "sup5",
    pricePerUnit: 0.6,
  },
  {
    id: "p11",
    name: "Crème Fraîche",
    category: "Frais",
    currentStock: 15,
    unit: "L",
    minThreshold: 10,
    supplierId: "sup2",
    pricePerUnit: 4.5,
  },
  {
    id: "p12",
    name: "Parmesan",
    category: "Fromages",
    currentStock: 4,
    unit: "kg",
    minThreshold: 2,
    supplierId: "sup2",
    pricePerUnit: 18.0,
  },
  {
    id: "p13",
    name: "Jambon de Parme",
    category: "Charcuterie",
    currentStock: 3,
    unit: "kg",
    minThreshold: 2,
    supplierId: "sup4",
    pricePerUnit: 24.0,
  },
  {
    id: "p14",
    name: "Champignons",
    category: "Légumes",
    currentStock: 2,
    unit: "kg",
    minThreshold: 5,
    supplierId: "sup1",
    pricePerUnit: 3.5,
  },
  {
    id: "p15",
    name: "Basilic Frais",
    category: "Frais",
    currentStock: 10,
    unit: "pcs",
    minThreshold: 5,
    supplierId: "sup1",
    pricePerUnit: 1.5,
  },
];

// Helper to generate dynamic dates
const getDate = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
};

const getDateTime = (daysOffset: number, hours: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};

export const MOCK_PREDICTIONS: Prediction[] = [
  // === PAST DAYS (already delivered) ===
  {
    id: "pred-past1",
    productId: "p1",
    productName: "Tomates",
    predictedDate: getDate(-3), // 3 days ago
    predictedConsumption: 10,
    confidence: 0.94,
    recommendation: {
      action: "wait",
      quantity: 30,
      reason: "Stock critique - Livré ✓",
    },
  },
  {
    id: "pred-past2",
    productId: "p2",
    productName: "Mozzarella",
    predictedDate: getDate(-3),
    predictedConsumption: 6,
    confidence: 0.88,
    recommendation: {
      action: "buy",
      quantity: 15,
      reason: "Réappro hebdo - Livré ✓",
    },
  },
  {
    id: "pred-past3",
    productId: "p6",
    productName: "Viande Hachée",
    predictedDate: getDate(-2), // 2 days ago
    predictedConsumption: 8,
    confidence: 0.91,
    recommendation: {
      action: "wait",
      quantity: 20,
      reason: "Weekend chargé - Livré ✓",
    },
  },
  {
    id: "pred-past4",
    productId: "p7",
    productName: "Poulet Fermier",
    predictedDate: getDate(-2),
    predictedConsumption: 5,
    confidence: 0.85,
    recommendation: {
      action: "buy",
      quantity: 12,
      reason: "Promo fournisseur - Livré ✓",
    },
  },
  {
    id: "pred-past5",
    productId: "p10",
    productName: "Pommes de Terre",
    predictedDate: getDate(-2),
    predictedConsumption: 30,
    confidence: 0.92,
    recommendation: {
      action: "wait",
      quantity: 60,
      reason: "Stock bas - Livré ✓",
    },
  },
  {
    id: "pred-past6",
    productId: "p3",
    productName: "Oeufs",
    predictedDate: getDate(-1), // Yesterday
    predictedConsumption: 4,
    confidence: 0.86,
    recommendation: {
      action: "buy",
      quantity: 18,
      reason: "Brunch du dimanche - Livré ✓",
    },
  },
  {
    id: "pred-past7",
    productId: "p11",
    productName: "Crème Fraîche",
    predictedDate: getDate(-1),
    predictedConsumption: 3,
    confidence: 0.79,
    recommendation: {
      action: "wait",
      quantity: 8,
      reason: "Carbonara populaire - Livré ✓",
    },
  },
  {
    id: "pred-past8",
    productId: "p14",
    productName: "Champignons",
    predictedDate: getDate(-1),
    predictedConsumption: 2,
    confidence: 0.82,
    recommendation: {
      action: "buy",
      quantity: 4,
      reason: "Pizza Reine - Livré ✓",
    },
  },
  // === TODAY ===
  {
    id: "pred-today1",
    productId: "p5",
    productName: "Farine T55",
    predictedDate: getDate(0), // Today
    predictedConsumption: 15,
    confidence: 0.93,
    recommendation: {
      action: "wait",
      quantity: 40,
      reason: "Stock critique aujourd'hui",
    },
  },
  {
    id: "pred-today2",
    productId: "p4",
    productName: "Huile d'olive",
    predictedDate: getDate(0),
    predictedConsumption: 5,
    confidence: 0.76,
    recommendation: {
      action: "wait",
      quantity: 0,
      reason: "Stock OK pour 5 jours",
    },
  },
  // === FUTURE DAYS ===
  {
    id: "pred1",
    productId: "p1",
    productName: "Tomates",
    predictedDate: getDate(1), // Tomorrow
    predictedConsumption: 8.5,
    confidence: 0.92,
    recommendation: {
      action: "buy",
      quantity: 25,
      reason: "Rupture imminente (demain)",
    },
  },
  {
    id: "pred2",
    productId: "p2",
    productName: "Mozzarella",
    predictedDate: getDate(2), // +2 days
    predictedConsumption: 5.2,
    confidence: 0.87,
    recommendation: {
      action: "buy",
      quantity: 20,
      reason: "Seuil atteint jeudi",
    },
  },
  {
    id: "pred3",
    productId: "p3",
    productName: "Oeufs",
    predictedDate: getDate(2),
    predictedConsumption: 6,
    confidence: 0.84,
    recommendation: {
      action: "wait",
      quantity: 24,
      reason: "Seuil atteint samedi",
    },
  },
  {
    id: "pred4",
    productId: "p6",
    productName: "Viande Hachée",
    predictedDate: getDate(1),
    predictedConsumption: 12.0,
    confidence: 0.95,
    recommendation: {
      action: "buy",
      quantity: 30,
      reason: "Gros volume attendu ce weekend",
    },
  },
  {
    id: "pred5",
    productId: "p8",
    productName: "Salade Laitue",
    predictedDate: getDate(1),
    predictedConsumption: 10,
    confidence: 0.78,
    recommendation: {
      action: "wait",
      quantity: 0,
      reason: "Stock suffisant pour 3 jours",
    },
  },
  {
    id: "pred6",
    productId: "p14",
    productName: "Champignons",
    predictedDate: getDate(1),
    predictedConsumption: 3.5,
    confidence: 0.88,
    recommendation: {
      action: "wait",
      quantity: 5,
      reason: "Stock critique < seuil",
    },
  },
  {
    id: "pred7",
    productId: "p11",
    productName: "Crème Fraîche",
    predictedDate: getDate(3),
    predictedConsumption: 2.0,
    confidence: 0.65,
    recommendation: {
      action: "wait",
      quantity: 0,
      reason: "Tendance stable",
    },
  },
  {
    id: "pred8",
    productId: "p7",
    productName: "Poulet Fermier",
    predictedDate: getDate(2),
    predictedConsumption: 8.0,
    confidence: 0.91,
    recommendation: {
      action: "wait",
      quantity: 15,
      reason: "Promo fournisseur fin de semaine",
    },
  },
  {
    id: "pred9",
    productId: "p15",
    productName: "Basilic Frais",
    predictedDate: getDate(1),
    predictedConsumption: 5,
    confidence: 0.82,
    recommendation: {
      action: "reduce",
      quantity: 0,
      reason: "Risque de perte (Date courte)",
    },
  },
  {
    id: "pred10",
    productId: "p10",
    productName: "Pommes de Terre",
    predictedDate: getDate(2),
    predictedConsumption: 25,
    confidence: 0.89,
    recommendation: {
      action: "buy",
      quantity: 50,
      reason: "Forte demande frites maison",
    },
  },
];

// ANALYTICS DATA
export const MOCK_ANALYTICS = {
  wasteStats: {
    totalWasteKg: 38.5, // 110g * 350 couverts (approx for Pizzeria)
    wastePerMealGram: 110, // Benchmark Pizzeria (vs 125g avg)
    targetWastePerMealGram: 80, // Objectif AGEC
    monthlyTrend: -12, // percentage
    savings: 265, // Euros saved this month
  },
  aiReliability: {
    correctPredictions: 89, // percentage
    monthlyTrend: [
      { name: "Sem 1", value: 82 },
      { name: "Sem 2", value: 85 },
      { name: "Sem 3", value: 88 },
      { name: "Sem 4", value: 92 },
    ],
  },
  wasteEvolution: [
    { name: "Lun", waste: 12, target: 10 },
    { name: "Mar", waste: 15, target: 12 },
    { name: "Mer", waste: 18, target: 15 },
    { name: "Jeu", waste: 10, target: 10 },
    { name: "Ven", waste: 25, target: 20 },
    { name: "Sam", waste: 22, target: 20 },
    { name: "Dim", waste: 18, target: 15 },
  ],
  savingsEvolution: [
    { month: "Sept", amount: 450 },
    { month: "Oct", amount: 980 },
    { month: "Nov", amount: 1200 },
    { month: "Dec", amount: 1680 },
  ],
  criticalProducts: [
    { name: "Tomates", accuracy: 94, avoidedStockout: 3 },
    { name: "Mozzarella", accuracy: 87, avoidedStockout: 2 },
    { name: "Salade", accuracy: 91, avoidedStockout: 2 },
  ],
};

export const MOCK_DASHBOARD_ACTIVITY = [
  { name: "Lun", revenue: 4000, reservations: 120, consumption: 45 },
  { name: "Mar", revenue: 3000, reservations: 80, consumption: 32 },
  { name: "Mer", revenue: 5500, reservations: 160, consumption: 68 },
  { name: "Jeu", revenue: 4500, reservations: 110, consumption: 51 },
  { name: "Ven", revenue: 8000, reservations: 210, consumption: 85 },
  { name: "Sam", revenue: 9500, reservations: 240, consumption: 105 },
  { name: "Dim", revenue: 7000, reservations: 190, consumption: 78 },
];

// RECIPES DATA (Anti-Waste)
export const MOCK_RECIPES: Recipe[] = [
  {
    id: "r1",
    name: "Pizza Margherita",
    category: "Plat",
    prepTime: 15,
    ingredients: [
      { productId: "p5", quantity: 0.2 }, // 200g Farine
      { productId: "p1", quantity: 0.1 }, // 100g Tomates
      { productId: "p2", quantity: 0.12 }, // 120g Mozza
      { productId: "p4", quantity: 0.02 }, // 20ml Huile
    ],
    lastMade: getDateTime(0, 12), // Today 12h
  },
  {
    id: "r2",
    name: "Salade Caprese",
    category: "Entrée",
    prepTime: 10,
    ingredients: [
      { productId: "p1", quantity: 0.15 }, // 150g Tomates
      { productId: "p2", quantity: 0.125 }, // 125g Mozza
      { productId: "p4", quantity: 0.03 }, // 30ml Huile
      { productId: "p15", quantity: 1 }, // 1 feuille basilic
    ],
    lastMade: getDateTime(-1, 19), // Yesterday 19h
  },
  {
    id: "r3",
    name: "Pâtes Carbonara",
    category: "Plat",
    prepTime: 20,
    ingredients: [
      { productId: "p3", quantity: 0.16 }, // ~2 Oeufs (0.16 dz)
      { productId: "p12", quantity: 0.05 }, // 50g Parmesan
      { productId: "p11", quantity: 0.05 }, // 50ml Crème (optionnel mais courant)
    ],
    lastMade: getDateTime(-2, 13), // 2 days ago
  },
  {
    id: "r4",
    name: "Pizza Reine",
    category: "Plat",
    prepTime: 20,
    ingredients: [
      { productId: "p5", quantity: 0.2 }, // Pâte
      { productId: "p1", quantity: 0.1 }, // Tomates
      { productId: "p2", quantity: 0.1 }, // Mozza
      { productId: "p13", quantity: 0.08 }, // Jambon
      { productId: "p14", quantity: 0.05 }, // Champignons
    ],
    lastMade: getDateTime(0, 19), // Today 19h
  },
  {
    id: "r5",
    name: "Burger Maison",
    category: "Plat",
    prepTime: 25,
    ingredients: [
      { productId: "p6", quantity: 0.15 }, // 150g Viande Hachée
      { productId: "p8", quantity: 1 }, // 1 feuille Salade
      { productId: "p1", quantity: 0.05 }, // 50g Tomate
      { productId: "p9", quantity: 0.02 }, // Oignon
    ],
    lastMade: getDateTime(-3, 12), // 3 days ago
  },
  {
    id: "r6",
    name: "Salade César",
    category: "Plat",
    prepTime: 15,
    ingredients: [
      { productId: "p8", quantity: 4 }, // Salade
      { productId: "p7", quantity: 0.15 }, // 150g Poulet
      { productId: "p12", quantity: 0.03 }, // Parmesan
      { productId: "p3", quantity: 0.08 }, // 1 oeuf
    ],
    lastMade: getDateTime(-1, 12), // Yesterday 12h
  },
  {
    id: "r7",
    name: "Tiramisu",
    category: "Dessert",
    prepTime: 30,
    ingredients: [
      { productId: "p3", quantity: 0.25 }, // 3 oeufs
      { productId: "p11", quantity: 0.1 }, // Crème (simulée pour Mascarpone)
    ],
    lastMade: getDateTime(0, 14), // Today 14h
  },
  {
    id: "r8",
    name: "Poulet Rôti & Patates",
    category: "Plat",
    prepTime: 60,
    ingredients: [
      { productId: "p7", quantity: 0.4 }, // 400g Poulet
      { productId: "p10", quantity: 0.3 }, // 300g Patates
      { productId: "p4", quantity: 0.02 }, // Huile
    ],
    lastMade: getDateTime(-2, 18), // 2 days ago 18h
  },
  {
    id: "r9",
    name: "Omelette Champignons",
    category: "Plat",
    prepTime: 10,
    ingredients: [
      { productId: "p3", quantity: 0.25 }, // 3 oeufs
      { productId: "p14", quantity: 0.1 }, // Champignons
      { productId: "p11", quantity: 0.02 }, // Crème
    ],
    lastMade: getDateTime(-4, 11), // 4 days ago
  },
  {
    id: "r10",
    name: "Bruschetta Tomates",
    category: "Entrée",
    prepTime: 8,
    ingredients: [
      { productId: "p1", quantity: 0.12 }, // Tomates
      { productId: "p4", quantity: 0.02 }, // Huile olive
      { productId: "p15", quantity: 1 }, // Basilic
    ],
    lastMade: getDateTime(-1, 18), // Yesterday 18h
  },
  {
    id: "r11",
    name: "Gratin Dauphinois",
    category: "Plat",
    prepTime: 45,
    ingredients: [
      { productId: "p10", quantity: 0.4 }, // Pommes de terre
      { productId: "p11", quantity: 0.15 }, // Crème
    ],
    lastMade: getDateTime(-3, 17), // 3 days ago
  },
  {
    id: "r12",
    name: "Panna Cotta",
    category: "Dessert",
    prepTime: 20,
    ingredients: [
      { productId: "p11", quantity: 0.2 }, // Crème
    ],
    lastMade: getDateTime(0, 10), // Today 10h
  },
  {
    id: "r13",
    name: "Escalope Milanaise",
    category: "Plat",
    prepTime: 25,
    ingredients: [
      { productId: "p7", quantity: 0.2 }, // Poulet
      { productId: "p3", quantity: 0.08 }, // Oeuf
      { productId: "p5", quantity: 0.05 }, // Farine
    ],
    lastMade: getDateTime(-2, 19), // 2 days ago
  },
  {
    id: "r14",
    name: "Soupe à l'Oignon",
    category: "Entrée",
    prepTime: 35,
    ingredients: [
      { productId: "p9", quantity: 0.3 }, // Oignons
      { productId: "p2", quantity: 0.05 }, // Fromage gratiné
    ],
    lastMade: getDateTime(-5, 12), // 5 days ago
  },
  {
    id: "r15",
    name: "Frites Maison",
    category: "Plat",
    prepTime: 20,
    ingredients: [
      { productId: "p10", quantity: 0.35 }, // Pommes de terre
      { productId: "p4", quantity: 0.1 }, // Huile
    ],
    lastMade: getDateTime(0, 11), // Today
  },
];
