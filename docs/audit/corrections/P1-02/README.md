# P1-02 - Predictions passees encore proposees dans le Dashboard

## Traceabilite
- Source audit: [registre-problemes.md:L87](../../registre-problemes.md#L87)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P1`
- Depend de: [P0-02](../P0-02/README.md), [P1-01](../P1-01/README.md)

## Objectif
Exclure les recommandations deja passees/livrees des actions prioritaires de commande.

## Fichiers concernes
- [src/pages/Dashboard.tsx#L97](../../../../src/pages/Dashboard.tsx#L97)
- [src/utils/mockData.ts#L260](../../../../src/utils/mockData.ts#L260)

## Plan d'action detaille
1. Regle de filtrage
- Inclure seulement predictions:
  - date >= aujourd'hui,
  - action utile pour commande (`buy`).

2. Implementation
- Ajouter filtre date/action avant affichage `RecommendationsSection`.
- Conserver les donnees passees pour historique uniquement (si besoin section dediee).

3. Validation
- Verifier qu'aucun item "Livre" ne remonte en prioritaire.
- Verifier compteur panier et generation commande.

## Criteres d'acceptation
- Dashboard n'affiche que des actions actionnables.

## Risques
- Baisse soudaine du volume affiche si dataset mock contient beaucoup de passe.

## Rollback
- Revenir a filtre precedent et afficher une alerte temporaire "historique inclus".

## Estimation
- Effort: 0.25 jour.
