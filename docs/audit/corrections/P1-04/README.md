# P1-04 - Gestion de dates sensible timezone

## Traceabilite
- Source audit: [registre-problemes.md:L105](../../registre-problemes.md#L105)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P1`
- Depend de: [P0-02](../P0-02/README.md)

## Objectif
Supprimer les ambiguities de jour liees a `toISOString().split("T")[0]`.

## Fichiers concernes
- [src/utils/date.ts#L1](../../../../src/utils/date.ts#L1)
- [src/utils/mockData.ts#L250](../../../../src/utils/mockData.ts#L250)
- [src/pages/Dashboard.tsx#L137](../../../../src/pages/Dashboard.tsx#L137)
- [src/components/layout/Notifications.tsx#L202](../../../../src/components/layout/Notifications.tsx#L202)

## Plan d'action detaille
1. Standard date projet
- Definir standard: date locale metier `yyyy-MM-dd` en timezone locale du restaurant.

2. Implementation
- Introduire helper date central (`formatLocalISODate(date)`).
- Remplacer les usages `toISOString().split("T")[0]`.

3. Validation
- Tester en changeant timezone systeme (ou simulation) et minuit local.

## Criteres d'acceptation
- Meme jour metier affiche/enregistre quel que soit fuseau utilisateur.

## Risques
- Incoherence transitoire si toutes les zones ne sont pas migrees.

## Rollback
- Revenir temporairement sur helper precedent dans modules non critiques.

## Estimation
- Effort: 0.5 jour.

## Execution
- Ticket: `P1-04`
- Objectif testable: la date metier `yyyy-MM-dd` utilisee pour predictions/actions reste alignee sur le jour du restaurant, sans decalage UTC.
- Cause racine: `toISOString().split("T")[0]` calcule la date en UTC, ce qui peut decremeter/incrementer le jour autour de minuit local.

## Fichiers modifies
- [src/utils/date.ts](../../../../src/utils/date.ts)
- [src/utils/mockData.ts](../../../../src/utils/mockData.ts)
- [src/pages/Dashboard.tsx](../../../../src/pages/Dashboard.tsx)
- [src/components/layout/Notifications.tsx](../../../../src/components/layout/Notifications.tsx)
- [docs/audit/corrections/P1-04/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Commandes executees
- `rg -n "toISOString\\(\\)\\.split\\(\"T\"\\)\\[0\\]" src`
- `npm run lint`
- `npm run build`
- `for tz in Pacific/Honolulu Europe/Paris Asia/Tokyo; do TZ="$tz" node -e '...'; done`

## Resultats de validation
- Validation technique:
  - `npm run lint`: OK
  - `npm run build`: OK
- Validation fonctionnelle:
  - Simulation timezone sur une date proche de minuit restaurant (`2026-02-27T00:30:00+01:00`):
    - ancien comportement (`toISOString().split("T")[0]`): `2026-02-26`
    - nouveau helper (`formatLocalISODate` en `Europe/Paris`): `2026-02-27`
  - Resultat observe identique quel que soit `TZ` (`Pacific/Honolulu`, `Europe/Paris`, `Asia/Tokyo`): OK

## Risques residuels
- Le fuseau restaurant est fixe a `Europe/Paris` dans le helper. Si l'application devient multi-sites/multi-fuseaux, il faudra rendre ce fuseau configurable.

## Statut final
- `done`
