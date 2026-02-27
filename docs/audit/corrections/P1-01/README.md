# P1-01 - Regle d'urgence predictions discutable

## Traceabilite
- Source audit: [registre-problemes.md:L78](../../registre-problemes.md#L78)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P1`
- Depend de: [P0-02](../P0-02/README.md)

## Objectif
Definir une priorisation metier fiable des predictions (urgence) basee sur plusieurs signaux, pas uniquement la confiance.

## Fichiers concernes
- [src/pages/Predictions.tsx#L56](../../../../src/pages/Predictions.tsx#L56)
- [src/types/index.ts#L37](../../../../src/types/index.ts#L37)
- [src/services/predictionService.ts#L12](../../../../src/services/predictionService.ts#L12)

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
