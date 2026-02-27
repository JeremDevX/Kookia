# P2-01 - Valeurs metier hardcodees

## Traceabilite
- Source audit: [registre-problemes.md:L195](../../registre-problemes.md#L195)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P2`
- Depend de: [P0-02](../P0-02/README.md)

## Objectif
Externaliser les valeurs metier hardcodees pour preparer un fonctionnement multi-etablissement et configurable.

## Fichiers concernes (exemples)
- [src/pages/Dashboard.tsx#L131](../../../../src/pages/Dashboard.tsx#L131)
- [src/components/dashboard/MenuIdeasModal.tsx#L15](../../../../src/components/dashboard/MenuIdeasModal.tsx#L15)
- [src/components/analytics/ROISimulator.tsx#L12](../../../../src/components/analytics/ROISimulator.tsx#L12)
- [src/config/domain/businessConfig.ts](../../../../src/config/domain/businessConfig.ts)

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

## Cadrage strict
- Objectif testable: les composants Dashboard, Menu Ideas et ROI Simulator ne contiennent plus de valeurs metier critiques en dur et lisent une source de configuration centralisee.
- Fichiers autorises a modification:
  - `src/config/domain/businessConfig.ts`
  - `src/pages/Dashboard.tsx`
  - `src/components/dashboard/MenuIdeasModal.tsx`
  - `src/components/analytics/ROISimulator.tsx`
  - `docs/audit/corrections/P2-01/README.md`
  - `docs/audit/corrections/README.md`
- Checklist validation:
  - lint vert
  - build vert
  - tests projet verts
  - verification fonctionnelle: affichage dashboard/menu/ROI derives de la config

## Cause racine
- Des valeurs metier (identite etablissement, contenu menu, hypotheses ROI, bornes de sliders) etaient encodees directement dans les composants UI sans couche de configuration.

## Fichiers modifies
- `src/config/domain/businessConfig.ts`
- `src/pages/Dashboard.tsx`
- `src/components/dashboard/MenuIdeasModal.tsx`
- `src/components/analytics/ROISimulator.tsx`
- `docs/audit/corrections/P2-01/README.md`
- `docs/audit/corrections/README.md`

## Commandes executees
- `npm run lint`
- `npm run build`
- `npm test`

## Resultats de validation
- Validation technique:
  - lint: OK
  - build: OK
  - tests: OK (3 fichiers, 10 tests)
- Validation fonctionnelle:
  - Dashboard: nom manager, ville et meteo fournis par `domainBusinessConfig.establishmentDisplay`.
  - MenuIdeasModal: suggestion menu + message optimisation stock issus de `domainBusinessConfig.menuSuggestion`.
  - ROISimulator: hypothese metier et bornes sliders issues de `domainBusinessConfig.roiSimulator`.
  - Statut: OK

## Risques residuels
- La source reste statique (fichier local). Le multi-etablissement necessitera une source runtime (API/env/tenant settings) et une strategie de fallback par tenant.
