# Plan de rectification priorisé

## Objectif
Passer d'un MVP de démonstration à une base fiable, extensible et prête pour intégration backend réelle.

## P0 - Stabilisation immédiate (1 à 3 jours)
### 1) Réparer la qualité bloquante
- Corriger l'erreur lint `CartContext`.
- Ajouter une règle CI minimale (`npm run lint && npm run build`).

Fichiers:
- `src/context/CartContext.tsx`
- `package.json`

### 2) Corriger les bugs fonctionnels critiques
- `ProductionConfirmModal`: synchroniser `quantity` avec `maxYield` à l'ouverture.
- `ProductDetail`: propager réellement l'ajustement de stock au parent (`Stocks`) + corriger comparaison string/number.

Fichiers:
- `src/components/recipes/ProductionConfirmModal.tsx`
- `src/components/stocks/ProductDetail.tsx`
- `src/pages/Stocks.tsx`

### 3) Corriger la base CSS
- Ajouter les variables manquantes (`--shadow-xl`, `--font-size-md`) ou remplacer usages.
- Décider et appliquer UNE stratégie utilitaire:
  - soit Tailwind complet,
  - soit suppression des classes utilitaires non supportées.

Fichiers:
- `src/styles/index.css`
- `src/components/common/Modal.css`
- `src/components/stocks/ProductDetail.css`
- `src/pages/Dashboard.css`
- `src/pages/Predictions.css`
- composants/pages contenant classes utilitaires non supportées

## P1 - Alignement architecture et logique métier (3 à 7 jours)
### 4) Rebrancher les pages sur hooks/services
- Remplacer imports directs `MOCK_*` par hooks (`useProducts`, `usePredictions`, `useRecipes`, `useAnalytics`).
- Garder `mockData` uniquement derrière `services/*` en phase transitoire.

Fichiers:
- `src/pages/Dashboard.tsx`
- `src/pages/Stocks.tsx`
- `src/pages/Predictions.tsx`
- `src/pages/Recipes.tsx`
- `src/pages/Analytics.tsx`
- `src/hooks/*`
- `src/services/*`

### 5) Corriger la logique métier commande/prédiction
- Filtrer les prédictions passées hors actions opérationnelles.
- Définir une vraie règle de priorité (pas uniquement `confidence`).
- Clarifier cycle de vie des éléments commandés (reset/archivage).

Fichiers:
- `src/pages/Dashboard.tsx`
- `src/pages/Predictions.tsx`
- `src/utils/mockData.ts` (phase mock)

### 6) Normaliser les dates
- Remplacer `toISOString().split("T")[0]` pour les dates métiers locales.

Fichiers:
- `src/utils/mockData.ts`
- `src/pages/Dashboard.tsx`
- `src/components/layout/Notifications.tsx`

### 7) Accessibilité/UX structurelle
- Modal: rôle ARIA, focus trap, restauration focus.
- `TopNav`: titre dynamique selon route.
- Sidebar support: lien réel.

Fichiers:
- `src/components/common/Modal.tsx`
- `src/components/layout/TopNav.tsx`
- `src/components/layout/Sidebar.tsx`

## P2 - Industrialisation (1 à 2 semaines)
### 8) Performance frontend
- Lazy loading des routes (React lazy + suspense).
- Optimiser chargement chart/icons.

Fichiers:
- `src/App.tsx`
- pages/composants lourds

### 9) Tests
- Tests unitaires:
  - `recipeService`, logique priorité prédiction, panier.
- Tests d'intégration UI:
  - flux commande, ajustement stock, modales critiques.

Fichiers:
- `src/services/*`
- `src/context/*`
- `src/pages/*`
- `src/components/*`

### 10) Hygiène codebase
- Supprimer/activer le code mort (`ActivityChart`, hooks/services non utilisés).
- Déplacer les types importés depuis `mockData` vers `src/types`.
- Mettre à jour README selon architecture réelle.

Fichiers:
- `src/components/dashboard/ActivityChart.tsx`
- `src/components/common/Badge.tsx`
- `src/components/predictions/PredictionDetailModal.tsx`
- `src/components/recipes/ProductionConfirmModal.tsx`
- `README.md`

## Plan recommandé d'exécution
1. P0 complet avant toute feature.
2. P1 en 2 sous-lots: (a) data architecture, (b) logique métier + accessibilité.
3. P2 en continu avec jalons performance/tests.

## Critères de sortie minimaux
- `lint` vert + `build` vert sans warning critique CSS.
- Aucune action métier simulée mensongère (stock/commande).
- Pages branchées sur hooks/services.
- Tests de non-régression sur flux critiques.
