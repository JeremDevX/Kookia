# P0-02 - Architecture data non branchee au runtime

## Traceabilite
- Source audit: [registre-problemes.md:L19](../../registre-problemes.md#L19)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P0`
- Depend de: [P0-01](../P0-01/README.md)

## Objectif
Faire converger l'application vers l'architecture cible `pages -> hooks -> services -> source data`, en supprimant les imports directs `MOCK_*` dans les pages cibles.

## Cadrage strict
### Objectif testable
- `src/pages/*` ne contient plus d'import `MOCK_*` direct.
- Les pages cibles lisent la data via les hooks (`usePredictions`, `useProductsWithMutations`, `useRecipes`, `useAnalytics`).
- `npm run lint` et `npm run build` passent.

### Fichiers autorises
- [src/pages/Dashboard.tsx](../../../../src/pages/Dashboard.tsx)
- [src/pages/Stocks.tsx](../../../../src/pages/Stocks.tsx)
- [src/pages/Predictions.tsx](../../../../src/pages/Predictions.tsx)
- [src/pages/Recipes.tsx](../../../../src/pages/Recipes.tsx)
- [src/pages/Analytics.tsx](../../../../src/pages/Analytics.tsx)
- [docs/audit/corrections/P0-02/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Reproduction / diagnostic
### Reproduction
Constat initial: imports directs des mocks dans les pages:
- `src/pages/Dashboard.tsx`: `MOCK_PREDICTIONS`, `MOCK_PRODUCTS`
- `src/pages/Stocks.tsx`: `MOCK_PRODUCTS`
- `src/pages/Predictions.tsx`: `MOCK_PREDICTIONS`
- `src/pages/Recipes.tsx`: `MOCK_RECIPES`
- `src/pages/Analytics.tsx`: `MOCK_ANALYTICS`

### Cause racine
Le flux data cible `pages -> hooks -> services` existait deja, mais les pages continuaient a consommer `utils/mockData` directement, court-circuitant les couches hooks/services.

## Plan d'implementation (execute)
1. Basculer `Dashboard` vers `usePredictions` et `useProducts`.
2. Basculer `Stocks` vers `useProductsWithMutations`.
3. Basculer `Predictions` vers `usePredictions`.
4. Basculer `Recipes` vers `useRecipes` + helpers exposes par le hook.
5. Basculer `Analytics` vers `useAnalytics` avec garde de chargement.
6. Verifier l'absence d'imports `MOCK_*` dans `src/pages`.
7. Executer gates qualite (`lint`, `build`).

## Fichiers modifies
- [src/pages/Dashboard.tsx](../../../../src/pages/Dashboard.tsx)
- [src/pages/Stocks.tsx](../../../../src/pages/Stocks.tsx)
- [src/pages/Predictions.tsx](../../../../src/pages/Predictions.tsx)
- [src/pages/Recipes.tsx](../../../../src/pages/Recipes.tsx)
- [src/pages/Analytics.tsx](../../../../src/pages/Analytics.tsx)

## Commandes executees
```bash
rg -n "MOCK_|mock" src
rg -n "MOCK_" src/pages
rg -n "from \"../utils/mockData\"" src/pages
npm run lint
npm run build
```

## Validation technique
- `npm run lint`: OK
- `npm run build`: OK
- verification ciblage pages (`rg`): OK (aucun `MOCK_` dans `src/pages`)

## Validation fonctionnelle
Checklist fonctionnelle executee (verification structurelle et comportement conserve):
- Dashboard alimente via hooks + generation de commandes: OK
- Stocks alimente via hook mutations (ajout produit + ajustement stock): OK
- Predictions liste + calendrier relies a `usePredictions`: OK
- Recipes history/anti-waste relies a `useRecipes`: OK
- Analytics graphiques relies a `useAnalytics` + etat chargement: OK

## Risques residuels
- Validation UI manuelle navigateur non executee (CLI uniquement).
- Composants non-pages peuvent encore consommer des mocks directement (hors scope de ce ticket).

## Rollback
- Restaurer les imports `utils/mockData` page par page si une regression critique UI apparait.

## Compte-rendu obligatoire
- Ticket: `P0-02`
- Objectif: debrancher les pages des imports directs `MOCK_*` vers l'architecture hooks/services.
- Cause racine: court-circuit des couches data par imports directs dans les pages.
- Fichiers modifies: voir section dediee.
- Validation technique:
  - lint: OK
  - build: OK
  - tests: N/A (pas de suite automatisee ticket-specifique)
- Validation fonctionnelle: checklist de verification des 5 pages ciblees OK.
- Risques residuels: verification UI manuelle restante et composants hors scope non migres.
- Statut final: `done`
