# P1-14 - Priorisation predictions sensible au fuseau client

## Traceabilite
- Source audit: [registre-problemes.md](../../registre-problemes.md)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
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

## Cadrage applique
- Objectif testable: "Pour une prediction donnee, la priorite et la visibilite Dashboard sont calculees uniquement sur le jour metier `Europe/Paris`, independamment du fuseau client."
- Fichiers autorises modifies:
  - `src/utils/date.ts`
  - `src/services/predictionService.ts`
  - `src/pages/Dashboard.tsx`
  - `src/services/predictionService.test.ts`
- Checklist de validation:
  - Cas minuit restaurant: prediction J-1 => priorite `normal`.
  - Meme instant, offsets clients differents => priorite identique.
  - Filtre Dashboard aligne sur le meme utilitaire de jour metier.
  - `npm run lint` vert.
  - `npm run build` vert.
  - `npm run test -- src/services/predictionService.test.ts` vert.

## Cause racine
La logique de comparaison des dates faisait des `Date` locales (`setHours(0,0,0,0)` + parsing local `YYYY-MM-DD`) dans `predictionService` et `Dashboard`, ce qui rendait le calcul sensible au fuseau navigateur au lieu du fuseau metier restaurant.

## Plan d'implementation execute (8 actions)
1. Verifier la dependance `P1-04` dans l'index corrections.
2. Passer le ticket en `in_progress`.
3. Introduire des helpers de jour metier dans `src/utils/date.ts`.
4. Brancher `getPredictionPriority` sur le diff de jours metier unifie.
5. Aligner le filtre des actions Dashboard sur le meme helper.
6. Ajouter des tests timezone (minuit + offsets clients differents + filtre actionable).
7. Executer `npm run lint`, `npm run build`, puis le test cible ticket.
8. Mettre a jour la fiche ticket et la roadmap.

## Implementation realisee
- Ajout de `getBusinessDaysUntilDate` et `isOnOrAfterRestaurantToday` dans `src/utils/date.ts`, bases sur `Intl.DateTimeFormat(..., { timeZone: "Europe/Paris" })`.
- `getPredictionPriority` utilise maintenant ce calcul de jours metier (avec `referenceDate` injectable pour tests deterministes).
- `Dashboard` supprime le parsing local de date et utilise directement `isOnOrAfterRestaurantToday` pour les recommandations actionnables.
- `predictionService.test.ts` couvre:
  - frontiere minuit restaurant,
  - invariance de priorite pour un meme instant vu depuis deux fuseaux clients,
  - alignement du filtre actionable sur la frontiere metier.

## Fichiers modifies
- [src/utils/date.ts](../../../../src/utils/date.ts)
- [src/services/predictionService.ts](../../../../src/services/predictionService.ts)
- [src/pages/Dashboard.tsx](../../../../src/pages/Dashboard.tsx)
- [src/services/predictionService.test.ts](../../../../src/services/predictionService.test.ts)
- [docs/audit/corrections/P1-14/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Commandes executees
- `npm run lint`
- `npm run build`
- `npm run test -- src/services/predictionService.test.ts`

## Validation technique
- lint: OK
- build: OK
- tests: OK (`src/services/predictionService.test.ts`: 5/5)

## Validation fonctionnelle
- Priorisation date passee au regard du jour restaurant: OK (test "previous business day around restaurant midnight").
- Priorisation stable pour un meme instant represente avec offsets clients differents: OK (test "different client timezones").
- Perimetre des actions Dashboard aligne sur la meme frontiere de jour metier: OK (test `isOnOrAfterRestaurantToday`).
- Verification regression adjacente: logique de scoring `buy/reduce/confidence` inchangee, seul le calcul de `daysUntil` est remplace.

## Risques residuels
- Le fuseau restaurant reste une constante (`Europe/Paris`); un besoin multi-sites necessitera une abstraction de configuration runtime.

## Statut final
- `done`
