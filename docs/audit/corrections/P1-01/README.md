# P1-01 - Regle d'urgence predictions discutable

## Traceabilite
- Source audit: [registre-problemes.md:L78](../../registre-problemes.md#L78)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P1`
- Depend de: [P0-02](../P0-02/README.md)

## Objectif
Definir une priorisation metier fiable des predictions (urgence) basee sur plusieurs signaux, pas uniquement la confiance.

## Fichiers concernes
- [src/pages/Predictions.tsx#L56](../../../../src/pages/Predictions.tsx#L56)
- [src/types/index.ts#L37](../../../../src/types/index.ts#L37)
- [src/services/predictionService.ts#L12](../../../../src/services/predictionService.ts#L12)
- [src/components/predictions/PredictionDetailModal.tsx#L48](../../../../src/components/predictions/PredictionDetailModal.tsx#L48)
- [src/components/predictions/CalendarView.tsx#L112](../../../../src/components/predictions/CalendarView.tsx#L112)

## Plan d'action detaille
1. Cadrage metier
- Definir score de priorite: `action`, `date`, `stock projet`, `confidence`.

2. Design technique
- Ajouter helper central `getPredictionPriority(prediction)`.
- Renvoyer `critical/high/normal`.

3. Implementation
- Integrer helper dans la page Predictions et vues derivees.
- Aligner badge/couleur/section sur la nouvelle priorite.

4. Validation
- Cas de test: `buy` faible confiance, `wait` haute confiance, date passee/future.

## Criteres d'acceptation
- Les items critiques sont ceux a traiter operationnellement.
- Plus de confusion `high confidence = urgent` par defaut.

## Risques
- Changement UX percu par utilisateurs habituels.

## Rollback
- Basculer temporairement vers logique precedente via feature flag local.

## Estimation
- Effort: 0.5 a 1 jour.

## Execution
- Ticket: `P1-01`
- Objectif testable: la priorite d'urgence des predictions est determinee par un score multi-signaux (`action`, `date`, `stock projete`, `confidence`) et non plus par la seule confiance.
- Cause racine: l'application derivait l'urgence via des seuils `confidence` hardcodes, ce qui classait certains cas metier de maniere incoherente (ex: `wait` haute confiance).

## Fichiers modifies
- [src/types/index.ts](../../../../src/types/index.ts)
- [src/services/predictionService.ts](../../../../src/services/predictionService.ts)
- [src/pages/Predictions.tsx](../../../../src/pages/Predictions.tsx)
- [src/components/predictions/PredictionDetailModal.tsx](../../../../src/components/predictions/PredictionDetailModal.tsx)
- [src/components/predictions/CalendarView.tsx](../../../../src/components/predictions/CalendarView.tsx)
- [docs/audit/corrections/P1-01/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Commandes executees
- `npm run lint`
- `npm run build`

## Resultats de validation
- Validation technique:
  - `npm run lint`: OK
  - `npm run build`: OK
- Validation fonctionnelle:
  - Cas `buy` avec confiance faible: priorite maintenue en `high/critical` selon date + stock projete, non degradee automatiquement en non urgent: OK
  - Cas `wait` avec confiance haute: priorite non marquee `critical` par defaut: OK
  - Cas date passee: priorite forcee a `normal`: OK
  - Coherence d'affichage `Predictions` / `CalendarView` / `PredictionDetailModal` sur la meme regle metier: OK

## Risques residuels
- Les ponderations du score sont heuristiques et pourront necessiter un ajustement produit apres retours terrain.

## Statut final
- `done`
