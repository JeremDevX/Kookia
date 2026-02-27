# P0-02 - Architecture data non branchee au runtime

## Traceabilite
- Source audit: [registre-problemes.md:L19](../../registre-problemes.md#L19)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P0`
- Depend de: [P0-01](../P0-01/README.md)

## Objectif
Faire converger l'application vers l'architecture cible `pages -> hooks -> services -> source data`.

## Fichiers concernes (principaux)
- [src/pages/Dashboard.tsx#L12](../../../../src/pages/Dashboard.tsx#L12)
- [src/pages/Stocks.tsx#L10](../../../../src/pages/Stocks.tsx#L10)
- [src/pages/Predictions.tsx#L15](../../../../src/pages/Predictions.tsx#L15)
- [src/pages/Recipes.tsx#L8](../../../../src/pages/Recipes.tsx#L8)
- [src/pages/Analytics.tsx#L9](../../../../src/pages/Analytics.tsx#L9)
- [src/hooks/index.ts#L1](../../../../src/hooks/index.ts#L1)
- [src/services/index.ts#L1](../../../../src/services/index.ts#L1)

## Plan d'action detaille
1. Diagnostic
- Cartographier page par page les imports directs de `MOCK_*`.
- Lister les hooks disponibles et manquants.

2. Design de migration
- Migration en 2 passes:
  - Pass A: brancher sur hooks existants, conserver comportement UI.
  - Pass B: deplacer logique locale vers services/hooks (selon besoin).

3. Implementation pass A
- Dashboard: utiliser `usePredictions` + derivees locales.
- Stocks: utiliser `useProductsWithMutations`.
- Predictions: utiliser `usePredictions`.
- Recipes: utiliser `useRecipes` + helpers deja presents.
- Analytics: utiliser `useAnalytics`.

4. Implementation pass B
- Enlever imports directs `MOCK_*` depuis pages.
- Garder les mocks uniquement dans `services/*` pendant transition.

5. Validation
- `npm run lint`
- `npm run build`
- Tests manuels sur 6 routes (chargement, interactions, modales).

## Criteres d'acceptation
- Aucune page ne lit `MOCK_*` directement.
- Les hooks/services sont la seule entree data.
- Le comportement fonctionnel reste equivalent.

## Risques
- Regression de logique locale (filtre, tri, selection).
- Etats loading/error non geres uniformement.

## Rollback
- Revenir page par page sur imports mocks directs en cas de blocage critique.

## Estimation
- Effort: 2 a 4 jours.
- Complexite: moyenne.
