# FoodAI MVP - Documentation Complète

> Application de gestion intelligente des stocks alimentaires avec prédictions IA pour restaurants

---

## 🚀 Démarrage Rapide

```bash
# Installation des dépendances
npm install

# Lancer en développement
npm run dev

# Build pour production
npm run build

# Vérifier le code
npm run lint
```

L'application sera disponible sur `http://localhost:5173`

---

## 📁 Structure du Projet

```
src/
├── components/          # Composants React réutilisables
│   ├── common/          # Button, Card, Badge, Modal, Input
│   ├── layout/          # Layout, TopNav
│   ├── analytics/       # Composants page Analytics
│   ├── dashboard/       # Composants page Dashboard
│   ├── predictions/     # Composants page Predictions
│   ├── recipes/         # Composants page Recipes
│   └── stocks/          # Composants page Stocks
├── pages/               # Pages principales de l'application
│   ├── Dashboard.tsx    # Vue d'ensemble
│   ├── Stocks.tsx       # Gestion inventaire
│   ├── Predictions.tsx  # Prédictions IA
│   ├── Recipes.tsx      # Carnet de recettes
│   └── Analytics.tsx    # Tableaux de bord analytiques
├── types/               # ✨ Définitions TypeScript centralisées
│   ├── index.ts         # Types principaux (Product, Prediction, etc.)
│   └── callbacks.ts     # Types pour callbacks et formulaires
├── services/            # ✨ Couche d'abstraction des données
│   ├── index.ts         # Export centralisé
│   ├── productService.ts
│   ├── predictionService.ts
│   ├── recipeService.ts
│   └── analyticsService.ts
├── hooks/               # ✨ Hooks React personnalisés
│   ├── index.ts         # Export centralisé
│   ├── useProducts.ts
│   ├── usePredictions.ts
│   ├── useRecipes.ts
│   └── useAnalytics.ts
├── utils/               # Utilitaires et données mock
│   └── mockData.ts      # Données de démonstration
├── context/             # Contextes React (Toast notifications)
└── styles/              # CSS global
```

---

## 📊 Types de Données Principaux

### Product (Produit)

```typescript
interface Product {
  id: string; // Identifiant unique
  name: string; // Nom du produit
  category: string; // Catégorie (Légumes, Fromages, etc.)
  currentStock: number; // Stock actuel
  unit: Unit; // Unité: "kg" | "L" | "dz" | "pcs"
  minThreshold: number; // Seuil minimum d'alerte
  supplierId: string; // ID du fournisseur
  pricePerUnit: number; // Prix unitaire en €
  lastDelivery?: string; // Date dernière livraison (ISO)
}
```

### Prediction (Prédiction IA)

```typescript
interface Prediction {
  id: string;
  productId: string; // Lien vers Product
  productName: string; // Nom pour affichage
  predictedDate: string; // Date prévue (ISO)
  predictedConsumption: number; // Consommation prévue
  confidence: number; // Indice de confiance (0-1)
  recommendation?: {
    action: "buy" | "wait" | "reduce";
    quantity: number;
    reason: string;
  };
}
```

### Recipe (Recette)

```typescript
interface Recipe {
  id: string;
  name: string;
  category: "Plat" | "Dessert" | "Entrée";
  prepTime: number; // minutes
  ingredients: {
    productId: string;
    quantity: number;
  }[];
  lastMade?: string; // Date dernière production (ISO)
}
```

### AnalyticsData

```typescript
interface AnalyticsData {
  wasteStats: { totalWasteKg, wastePerMealGram, ... };
  aiReliability: { correctPredictions, monthlyTrend };
  wasteEvolution: { name, waste, target }[];
  savingsEvolution: { month, amount }[];
  criticalProducts: { name, accuracy, avoidedStockout }[];
}
```

---

## 🔌 Comment Ajouter des Données Réelles (API)

### Étape 1 : Modifier les Services

Chaque service dans `/src/services/` contient des fonctions qui retournent actuellement des données mock. Pour connecter votre API :

**Exemple : productService.ts**

```typescript
// AVANT (données mock)
export const getProducts = async (): Promise<Product[]> => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return MOCK_PRODUCTS;
};

// APRÈS (avec votre API)
export const getProducts = async (): Promise<Product[]> => {
  const response = await fetch("/api/products", {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  return response.json();
};
```

### Étape 2 : Les Hooks Gèrent Automatiquement

Les hooks comme `useProducts()` gèrent déjà :

- ✅ État de chargement (`loading`)
- ✅ Gestion d'erreurs (`error`)
- ✅ Rafraîchissement (`refetch`)

```typescript
// Dans votre composant
const { products, loading, error, refetch } = useProducts();

if (loading) return <Spinner />;
if (error) return <ErrorMessage message={error.message} />;

return <ProductList products={products} />;
```

### Étape 3 : Mapping des Types

Assurez-vous que votre API retourne des données compatibles avec les types définis dans `/src/types/`. Si les noms de champs diffèrent, créez une fonction de mapping :

```typescript
// Dans productService.ts
const mapApiToProduct = (apiProduct: ApiProductResponse): Product => ({
  id: apiProduct._id, // MongoDB _id → id
  name: apiProduct.product_name, // snake_case → camelCase
  currentStock: apiProduct.stock_qty,
  // ... autres mappings
});

export const getProducts = async (): Promise<Product[]> => {
  const response = await fetch("/api/products");
  const data: ApiProductResponse[] = await response.json();
  return data.map(mapApiToProduct);
};
```

---

## 🔧 Fichiers de Configuration API

### Créer un fichier de config (recommandé)

**src/config/api.ts**

```typescript
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:3001",
  timeout: 10000,
};

// Helper pour les requêtes
export const apiRequest = async <T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
};
```

### Variables d'environnement

**.env.local**

```env
VITE_API_URL=http://localhost:3001/api
```

---

## 📱 Pages de l'Application

| Page        | Route          | Description                                          |
| ----------- | -------------- | ---------------------------------------------------- |
| Dashboard   | `/`            | Vue d'ensemble avec KPIs et graphiques               |
| Stocks      | `/stocks`      | Gestion de l'inventaire, ajout/modification produits |
| Predictions | `/predictions` | Prédictions IA de consommation et recommandations    |
| Recipes     | `/recipes`     | Carnet de recettes et suggestions anti-gaspi         |
| Analytics   | `/analytics`   | Tableaux de bord, évolution gaspillage, ROI          |

---

## 🧩 Composants Réutilisables

| Composant | Chemin                     | Props principales                           |
| --------- | -------------------------- | ------------------------------------------- |
| `Button`  | `components/common/Button` | `variant`, `size`, `icon`, `onClick`        |
| `Card`    | `components/common/Card`   | `title`, `action`, `className`              |
| `Badge`   | `components/common/Badge`  | `label`, `status` (optimal/moderate/urgent) |
| `Modal`   | `components/common/Modal`  | `isOpen`, `onClose`, `title`, `width`       |
| `Input`   | `components/common/Input`  | `icon`, `placeholder`, `value`, `onChange`  |

---

## 🎨 Variables CSS

Les couleurs et espacements sont définis dans `/src/styles/index.css` :

```css
/* Couleurs */
--color-primary: #218083; /* Teal */
--color-urgent: #c0152f; /* Rouge alerte */
--color-moderate: #a84b2f; /* Orange */
--color-optimal: #228b5b; /* Vert */

/* Espacement */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;

/* Border Radius */
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 16px;
```

---

## 🔄 Workflow de Développement

1. **Ajouter un nouveau type de données**

   - Définir l'interface dans `types/index.ts`
   - Créer le service dans `services/`
   - Créer le hook dans `hooks/`

2. **Ajouter une nouvelle page**

   - Créer le composant dans `pages/`
   - Ajouter la route dans `App.tsx`
   - Créer le fichier CSS correspondant

3. **Modifier les données mock**
   - Éditer `utils/mockData.ts`
   - Les types sont importés de `types/index.ts`

---

## ✅ Checklist Intégration API

- [ ] Créer le fichier `src/config/api.ts`
- [ ] Ajouter les variables d'environnement
- [ ] Modifier `productService.ts` pour appeler l'API produits
- [ ] Modifier `predictionService.ts` pour l'API prédictions
- [ ] Modifier `recipeService.ts` pour l'API recettes
- [ ] Modifier `analyticsService.ts` pour l'API analytics
- [ ] Tester chaque page avec les vraies données
- [ ] Ajouter la gestion des erreurs réseau

---

## 📞 Support

Pour toute question sur l'intégration ou le développement :

- Consulter les fichiers de types dans `/src/types/`
- Vérifier les exemples de données dans `/src/utils/mockData.ts`
