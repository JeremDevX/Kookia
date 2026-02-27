# P2-04 - Couplage type domaine vers fichier mock

## Traceabilite
- Source audit: [registre-problemes.md:L224](../../registre-problemes.md#L224)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P2`
- Depend de: [P0-02](../P0-02/README.md)

## Objectif
Decoupler le domaine (`src/types`) du module mock (`src/utils/mockData.ts`).

## Fichiers concernes
- [src/components/common/Badge.tsx#L3](../../../../src/components/common/Badge.tsx#L3)
- [src/pages/Dashboard.tsx#L13](../../../../src/pages/Dashboard.tsx#L13)
- [src/components/predictions/PredictionDetailModal.tsx#L6](../../../../src/components/predictions/PredictionDetailModal.tsx#L6)
- [src/components/recipes/ProductionConfirmModal.tsx#L12](../../../../src/components/recipes/ProductionConfirmModal.tsx#L12)
- [src/types/index.ts](../../../../src/types/index.ts)

## Plan d'action detaille
1. Remplacer imports `type ... from utils/mockData` par imports depuis `src/types`.
2. Garder `mockData.ts` uniquement pour les constantes de data mock.
3. Valider que le barrel `types` expose bien les contrats necessaires.

## Criteres d'acceptation
- Aucun type domaine importe depuis `mockData.ts`.

## Risques
- Erreurs de build si re-export types incomplets.

## Rollback
- Restaurer temporairement imports legacy sur modules bloques.

## Estimation
- Effort: 0.5 jour.
