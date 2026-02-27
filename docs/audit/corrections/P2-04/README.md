# P2-04 - Couplage type domaine vers fichier mock

## Traceabilite
- Source audit: [registre-problemes.md:L224](../../registre-problemes.md#L224)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P2`
- Depend de: [P0-02](../P0-02/README.md)

## Objectif
Decoupler le domaine (`src/types`) du module mock (`src/utils/mockData.ts`).

Objectif testable:
- aucun type domaine (`Product`, `ProductStatus`, `Prediction`, `Recipe`, `Supplier`) n'est importe depuis `mockData.ts` dans les composants/pages.

## Fichiers concernes
- [src/components/common/Badge.tsx#L3](../../../../src/components/common/Badge.tsx#L3)
- [src/pages/Dashboard.tsx#L13](../../../../src/pages/Dashboard.tsx#L13)
- [src/components/predictions/PredictionDetailModal.tsx#L6](../../../../src/components/predictions/PredictionDetailModal.tsx#L6)
- [src/components/recipes/ProductionConfirmModal.tsx#L12](../../../../src/components/recipes/ProductionConfirmModal.tsx#L12)
- [src/components/stocks/ProductDetail.tsx#L13](../../../../src/components/stocks/ProductDetail.tsx#L13)
- [src/components/layout/Notifications.tsx#L18](../../../../src/components/layout/Notifications.tsx#L18)
- [src/components/dashboard/OrderGenerator.tsx#L10](../../../../src/components/dashboard/OrderGenerator.tsx#L10)
- [src/types/index.ts](../../../../src/types/index.ts)

## Plan d'action detaille
1. Remplacer imports `type ... from utils/mockData` par imports depuis `src/types`.
2. Garder `mockData.ts` uniquement pour les constantes de data mock.
3. Valider que le barrel `types` expose bien les contrats necessaires.

## Cause racine
- Des composants conservaient des imports de types via `src/utils/mockData.ts` (module de donnees mock), ce qui entretenait un couplage domaine -> source mock.
- Ce couplage persistait apres la migration cible vers le barrel `src/types`.

## Implementation realisee
- Separation des imports de types et des imports de donnees mock dans les composants concernes.
- Les types sont desormais importes uniquement depuis `src/types`.
- Les imports depuis `mockData.ts` sont conserves uniquement pour les constantes/hard data (`MOCK_*`) et helper legacy (`getStatus`) encore utilises par l'UI.

## Criteres d'acceptation
- Aucun type domaine importe depuis `mockData.ts`.

Statut:
- OK via verification `rg` (aucun match sur imports de type depuis `mockData`).

## Risques
- Erreurs de build si re-export types incomplets.

## Rollback
- Restaurer temporairement imports legacy sur modules bloques.

## Estimation
- Effort: 0.5 jour.

## Fichiers modifies
- [src/components/common/Badge.tsx](../../../../src/components/common/Badge.tsx)
- [src/components/recipes/ProductionConfirmModal.tsx](../../../../src/components/recipes/ProductionConfirmModal.tsx)
- [src/components/stocks/ProductDetail.tsx](../../../../src/components/stocks/ProductDetail.tsx)
- [src/components/layout/Notifications.tsx](../../../../src/components/layout/Notifications.tsx)
- [src/components/dashboard/OrderGenerator.tsx](../../../../src/components/dashboard/OrderGenerator.tsx)
- [docs/audit/corrections/P2-04/README.md](./README.md)

## Commandes executees
- `rg -n "type\\s+\\{[^}]+\\}\\s+from\\s+['\\\"].*mockData['\\\"]|\\{[^}]*type\\s+[A-Za-z0-9_]+[^}]*\\}\\s+from\\s+['\\\"].*mockData['\\\"]" src`
- `rg -n "from ['\\\"].*mockData['\\\"]" src/components src/pages`
- `npm run lint`
- `npm run build`

## Validation technique
- lint: OK
- build: OK
- tests: N/A (pas de suite specifique ticket)

## Validation fonctionnelle
- Verification fonctionnelle ciblee: OK (changement d'import uniquement, zero changement de logique runtime).
- Verification anti-regression adjacente: build production complete OK.

## Risques residuels
- `mockData.ts` continue d'exporter des aliases de types pour backward compatibility; si de nouveaux composants utilisent ces aliases, le couplage pourrait revenir sans garde CI.
- Mitigation recommandee: ajouter une regle lint/interdiction d'import type depuis `utils/mockData` (hors scope de ce ticket).
