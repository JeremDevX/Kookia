# P2-01 - Valeurs metier hardcodees

## Traceabilite
- Source audit: [registre-problemes.md:L195](../../registre-problemes.md#L195)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P2`
- Depend de: [P0-02](../P0-02/README.md)

## Objectif
Externaliser les valeurs metier hardcodees pour preparer un fonctionnement multi-etablissement et configurable.

## Fichiers concernes (exemples)
- [src/pages/Dashboard.tsx#L131](../../../../src/pages/Dashboard.tsx#L131)
- [src/components/dashboard/MenuIdeasModal.tsx#L15](../../../../src/components/dashboard/MenuIdeasModal.tsx#L15)
- [src/components/analytics/ROISimulator.tsx#L12](../../../../src/components/analytics/ROISimulator.tsx#L12)

## Plan d'action detaille
1. Inventaire des constantes metier hardcodees.
2. Creer couche `config/domain` + interfaces typage.
3. Injecter config dans composants au lieu de litteraux.
4. Prevoir source future (API / env / tenant settings).

## Criteres d'acceptation
- Les donnees metier critiques ne sont plus en dur dans les composants.

## Risques
- Sur-abstraction precoce.

## Rollback
- Conserver fallback local si config absente.

## Estimation
- Effort: 1 a 2 jours.
