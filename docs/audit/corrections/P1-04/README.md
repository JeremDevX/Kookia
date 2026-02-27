# P1-04 - Gestion de dates sensible timezone

## Traceabilite
- Source audit: [registre-problemes.md:L105](../../registre-problemes.md#L105)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P1`
- Depend de: [P0-02](../P0-02/README.md)

## Objectif
Supprimer les ambiguities de jour liees a `toISOString().split("T")[0]`.

## Fichiers concernes
- [src/utils/mockData.ts#L246](../../../../src/utils/mockData.ts#L246)
- [src/pages/Dashboard.tsx#L113](../../../../src/pages/Dashboard.tsx#L113)
- [src/components/layout/Notifications.tsx#L200](../../../../src/components/layout/Notifications.tsx#L200)

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
