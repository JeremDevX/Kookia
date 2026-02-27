# Inventaire fonctionnel existant

## 1) Expérience globale
- Splash screen animé au lancement (`SplashScreen`) avant affichage app.
- Layout fixe: sidebar + topbar + zone centrale.
- Navigation SPA entre 6 pages.
- Toasts globaux pour feedback utilisateur.

## 2) Dashboard (`src/pages/Dashboard.tsx`)
Fonctionnalités visibles:
- Message d'accueil + date locale + météo fixe (hardcodée).
- KPIs visuels (`DashboardKPIs`).
- Section actions prioritaires (`RecommendationsSection`) avec sélection d'articles.
- Actions rapides:
  - ouvrir modal facture (`InvoiceModal`),
  - ouvrir modal menu (`MenuIdeasModal`),
  - générer commandes (`OrderGenerator`).
- Fusion de 2 sources pour commandes:
  - sélection dashboard locale,
  - panier global venant des notifications.

Comportement réel:
- données issues de `MOCK_PREDICTIONS` / `MOCK_PRODUCTS`.
- pas d'écriture serveur, pas de persistance.

## 3) Stocks (`src/pages/Stocks.tsx`)
Fonctionnalités:
- recherche produit par nom,
- filtre catégorie,
- filtres avancés via modal (`FiltersModal`),
- ajout produit (`AddProductModal`),
- ajustement rapide ±1 en tableau,
- ouverture drawer détail produit (`ProductDetail`).

Comportement réel:
- état local `products` initialisé depuis `MOCK_PRODUCTS`.
- mutations uniquement locales en mémoire.
- commandes/fournisseur simulés via toasts.

## 4) Predictions (`src/pages/Predictions.tsx`)
Fonctionnalités:
- double vue `Liste` / `Calendrier` (`CalendarView`),
- segmentation urgentes/modérées,
- auto-commande,
- envoi email fournisseur (simulé),
- modal détail prédiction (`PredictionDetailModal`).

Comportement réel:
- données `MOCK_PREDICTIONS`.
- statut "commandé" stocké localement dans la page (non persistant).

## 5) Recipes (`src/pages/Recipes.tsx`)
Fonctionnalités:
- onglet "Semaine en cours" (historique),
- onglet "Suggestions anti-gaspi" (maxYield calculé),
- calcul coûts ingrédients / marge estimée,
- modal d'enregistrement production,
- modal de confirmation production.

Comportement réel:
- source `MOCK_RECIPES` + fonctions utilitaires `recipeService`.
- production et signalement refus: feedback toast seulement.

## 6) Analytics (`src/pages/Analytics.tsx`)
Fonctionnalités:
- visualisations gaspillage (`WasteChart`),
- performance IA (`AITrendChart`),
- économies/ROI (`SavingsChart`, `ROISimulator`),
- modal export rapport AGEC,
- modal personnalisation dashboard.

Comportement réel:
- données `MOCK_ANALYTICS`.
- export/personnalisation sans implémentation métier réelle.

## 7) Settings (`src/pages/Settings.tsx`)
Fonctionnalités:
- onglets Restaurant / Produits / Fournisseurs / Intégrations,
- formulaire infos restaurant,
- liste intégrations mock,
- modal configuration intégration (`IntegrationModal`).

Comportement réel:
- interactions majoritairement statiques/mock.
- bouton "Enregistrer" global sans logique métier branchée.

## 8) Notifications (`src/components/layout/Notifications.tsx`)
Fonctionnalités:
- modal notifications,
- marquage lu,
- ajout unitaire ou en masse au panier global,
- ouverture du générateur de commandes depuis le panier,
- toasts de confirmation.

Comportement réel:
- notifications mock locales,
- panier en mémoire via `CartContext`.

## 9) Contextes globaux
- `ToastContext`: création/suppression auto des toasts.
- `CartContext`: gestion liste d'items commandables.

## 10) Services/Hooks présents mais peu exploités
Services existants:
- `productService`, `predictionService`, `recipeService`, `analyticsService`.
Hooks existants:
- `useProducts`, `usePredictions`, `useRecipes`, `useAnalytics`, etc.

Constat:
- ces couches sont prêtes sur le papier, mais les pages principales ne les consomment pas (hors helpers recette).
