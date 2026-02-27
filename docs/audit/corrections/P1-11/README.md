# P1-11 - Absence de tests automatises

## Traceabilite
- Source audit: [registre-problemes.md:L168](../../registre-problemes.md#L168)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P1`
- Depend de: [P0-01](../P0-01/README.md)

## Objectif
Mettre en place un socle minimal de tests pour prevenir les regressions critiques.

## Fichiers concernes (a creer/mettre a jour)
- `package.json` (scripts test)
- `vitest.config.ts` (si retenu)
- `src/services/*.test.ts`
- `src/context/*.test.tsx`
- `src/pages/*.test.tsx` (cas critiques)

## Plan d'action detaille
1. Setup outillage
- Installer framework test (Vitest + Testing Library).
- Ajouter scripts `test`, `test:watch`, `test:coverage`.

2. Couverture prioritaire
- Tests unitaires:
  - logique recette (`calculateMaxYield`, cout),
  - panier (`add/remove/clear`),
  - priorite prediction.
- Tests integration UI:
  - flux commande dashboard,
  - ajustement stock.

3. CI
- Ajouter execution tests dans pipeline.

## Criteres d'acceptation
- Suite test execute localement et en CI.
- Couverture initiale sur modules critiques definis.

## Risques
- Temps de mise en place initial non negligeable.

## Rollback
- Garder tests unitaires only si integration trop couteuse a court terme.

## Estimation
- Effort: 2 a 3 jours (socle initial).
