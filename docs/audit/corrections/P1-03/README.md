# P1-03 - Reset selection Dashboard incomplet

## Traceabilite
- Source audit: [registre-problemes.md:L96](../../registre-problemes.md#L96)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P1`
- Depend de: [P0-02](../P0-02/README.md)

## Objectif
Uniformiser le cycle de vie des selections de commande Dashboard et panier global.

## Fichiers concernes
- [src/pages/Dashboard.tsx#L85](../../../../src/pages/Dashboard.tsx#L85)
- [src/pages/Dashboard.tsx#L102](../../../../src/pages/Dashboard.tsx#L102)

## Plan d'action detaille
1. Decision UX
- Definir comportement cible apres envoi:
  - Option A: reset complet selection locale + panier global.
  - Option B: conserver historique commandee hors vue active.

2. Implementation (recommandee: reset complet)
- Au `handleCloseOrderGenerator`, vider aussi `selectedPredictionIds`.
- Optionnel: tracer les IDs commandes dans un etat `processedPredictionIds`.

3. Validation
- Scenario: selectionner -> generer -> fermer -> reouvrir.

## Criteres d'acceptation
- Aucun item "fantome" selectionne apres cloture du cycle.

## Risques
- Si historique voulu, reset complet peut etre juge trop agressif.

## Rollback
- Revenir comportement precedent en attendant decision produit finale.

## Estimation
- Effort: 0.25 jour.

## Execution
- Ticket: `P1-03`
- Objectif testable: apres fermeture du generateur de commandes, aucune prediction precedemment selectionnee dans le Dashboard ne reste en etat selectionne.
- Cause racine: `handleCloseOrderGenerator` vidait uniquement le panier global (`clearCart`) mais conservait `selectedPredictionIds`, ce qui laissait des selections locales "fantomes" au cycle suivant.

## Fichiers modifies
- [src/pages/Dashboard.tsx](../../../../src/pages/Dashboard.tsx)
- [docs/audit/corrections/P1-03/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Commandes executees
- `npm run lint`
- `npm run build`

## Resultats de validation
- Validation technique:
  - `npm run lint`: OK
  - `npm run build`: OK
- Validation fonctionnelle:
  - Scenario `selectionner -> generer -> fermer -> reouvrir`: la fermeture du modal reset maintenant la selection locale Dashboard et le panier global: OK
  - Le compteur `Generer Commandes` revient a `0` apres fermeture du cycle: OK
  - Les recommandations redeviennent visibles au cycle suivant (pas d'items caches par une selection stale): OK

## Risques residuels
- Le reset est volontairement agressif (conforme a l'option A du ticket). Si un besoin d'historisation post-envoi apparait, il faudra introduire un etat dedie plutot que conserver `selectedPredictionIds`.

## Statut final
- `done`
