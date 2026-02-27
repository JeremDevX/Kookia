# P1-14 - Priorisation predictions sensible au fuseau client

## Traceabilite
- Source audit: [registre-problemes.md](../../registre-problemes.md)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P1`
- Depend de: [P1-04](../P1-04/README.md)

## Objectif
Rendre les decisions de priorisation et de filtrage date deterministes dans le fuseau metier du restaurant, quel que soit le fuseau du navigateur utilisateur.

## Fichiers concernes
- [src/services/predictionService.ts](../../../../src/services/predictionService.ts)
- [src/pages/Dashboard.tsx](../../../../src/pages/Dashboard.tsx)
- [src/utils/date.ts](../../../../src/utils/date.ts)
- [src/services/predictionService.test.ts](../../../../src/services/predictionService.test.ts)

## Plan d'action detaille
1. Centraliser une fonction de comparaison jour metier (timezone restaurant) dans `src/utils/date.ts`.
2. Utiliser cette fonction dans `getPredictionPriority` pour calculer `daysUntil`.
3. Aligner le filtre des actions Dashboard sur la meme logique de jour metier.
4. Ajouter des tests couvrant des scenarios autour de minuit et differents fuseaux client.
5. Verifier l'absence de regression sur tri urgent/normal et actions visibles.
6. Executer `lint`, `build`, `test`.

## Criteres d'acceptation
- A prediction identique, la priorite calculee ne change plus selon le fuseau navigateur.
- Le Dashboard affiche le meme perimetre d'actions sur differents fuseaux client.
- Les tests automatises couvrent explicitement le cas multi-timezone.

## Risques
- Risque de divergence si d'autres composants continuent a comparer des dates avec logique locale navigateur.
- Risque de confusion si le fuseau restaurant doit devenir dynamique (multi-sites) sans abstraction supplementaire.

## Rollback
- Revenir temporairement au calcul local actuel avec banniere d'avertissement interne, puis reappliquer avec utilitaire unifie.

## Estimation
- Effort: 0.5 a 1 jour.
- Complexite: moyenne.
