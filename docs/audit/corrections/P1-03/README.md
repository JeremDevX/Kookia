# P1-03 - Reset selection Dashboard incomplet

## Traceabilite
- Source audit: [registre-problemes.md:L96](../../registre-problemes.md#L96)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
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
