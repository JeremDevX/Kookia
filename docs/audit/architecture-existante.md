# Architecture existante

## 1) Stack et socle technique
- Build tool: Vite (`vite@7.x`)
- UI: React 19 + TypeScript strict
- Routing: `react-router-dom@7`
- Graphiques: `recharts`
- Icônes: `lucide-react`
- Déploiement visé: Vercel (`vercel.json` avec rewrite SPA)

Fichiers clés:
- `package.json`
- `vite.config.ts`
- `eslint.config.js`
- `tsconfig.app.json`
- `vercel.json`

## 2) Arborescence applicative
- `src/main.tsx`: bootstrap React + CSS global
- `src/App.tsx`: composition globale (providers + router + routes)
- `src/pages/*`: pages métiers (Dashboard, Stocks, Predictions, Recipes, Analytics, Settings)
- `src/components/*`: composants par domaine
- `src/context/*`: état global (toasts, panier)
- `src/types/*`: modèles TypeScript
- `src/services/*`: couche data abstraite (mock simulé)
- `src/hooks/*`: hooks data (loading/error/refetch)
- `src/utils/mockData.ts`: source principale des données mock
- `src/styles/index.css`: design tokens + utilitaires globaux

## 3) Runtime actuel (réel)
### Composition racine
`main.tsx` -> `App.tsx` -> `ToastProvider` -> `CartProvider` -> `Router` -> `Layout` -> `Outlet(page)`

### Routing
- `/` -> `Dashboard`
- `/stocks` -> `Stocks`
- `/predictions` -> `Predictions`
- `/recipes` -> `Recipes`
- `/settings` -> `Settings`
- `/analytics` -> `Analytics`

### État global
- `ToastContext`: système de notifications toast.
- `CartContext`: panier partagé entre Notifications et Dashboard/OrderGenerator.

### Source de vérité des données
Principalement: `src/utils/mockData.ts`

Observation importante:
- Les pages principales importent directement `MOCK_*` et non les hooks/services.
- La couche `services/` + `hooks/` existe mais n'est presque pas branchée au runtime page.

## 4) Architecture prévue (mais peu utilisée)
Architecture théorique visible dans le code/documentation:
- `services/*` -> abstraction fetch/mock
- `hooks/*` -> états chargement/erreur
- `pages/*` -> consommation hooks

État réel:
- `services/*` et `hooks/*` sont peu ou pas utilisés par les pages.
- Seules quelques fonctions utilitaires de `recipeService` sont effectivement utilisées dans `Recipes.tsx`.

## 5) Couplage inter-modules
## Couplage fort observé
- Composants/pages importent des types depuis `utils/mockData.ts` (qui ré-exporte `types`), ce qui couple le domaine au mock.
- `OrderGenerator`, `PredictionDetailModal`, `ProductionConfirmModal`, `Dashboard`, `Predictions`, etc. consomment directement des structures `MOCK_*`.

## Couplage transversal UI
- Usage massif de classes utilitaires type Tailwind dans JSX (`bg-gray-50`, `rounded-lg`, `grid-cols-2`, etc.) sans Tailwind dans les dépendances.
- Mélange de:
  - CSS global (`styles/index.css`),
  - CSS fichier (`*.css` par page/composant),
  - styles inline volumineux (notamment `Notifications`, `OrderGenerator`, `IntegrationModal`),
  - `<style>` embarqué dans `Input.tsx`.

## 6) Flux métiers principaux
### Flux commande
- Source recommandations: prédictions mock + notifications panier
- Sélection dashboard (`selectedPredictionIds`) + panier context (`cartItems`)
- Génération commande via `OrderGenerator`

### Flux stock
- Liste stocks locale (state `products` dans `Stocks.tsx`)
- Ajustements +/− locaux
- Détail produit via drawer (`ProductDetail`) mais sans mutation remontée vers parent

### Flux recettes
- Historique + suggestions anti-gaspi calculées via `MOCK_RECIPES` + `recipeService`

### Flux analytics
- Graphiques alimentés par `MOCK_ANALYTICS`
- Modales export/personnalisation purement UI (pas de persistance réelle)

## 7) Observabilité, tests, qualité
- Lint configuré, mais actuellement en erreur.
- Pas de tests automatisés (`test/spec` absents).
- Pas de monitoring/logging structuré.

## 8) Performance
- Bundle principal unique volumineux (>500 kB warning), pas de lazy loading par route.
- Animation splash bloquante au démarrage (4.1s).

## 9) Dette technique structurelle
La dette principale n'est pas la complexité algorithmique, mais:
- le décalage architecture prévue vs exécutée,
- l'incohérence de stratégie CSS,
- la logique métier simulée (toast/UI) sans persistance ni API,
- l'absence de garde-fous qualité (tests).
