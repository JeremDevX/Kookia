# P1-02 - Predictions passees encore proposees dans le Dashboard

## Traceabilite
- Source audit: [registre-problemes.md:L87](../../registre-problemes.md#L87)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
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

## Execution
- Ticket: `P1-02`
- Objectif testable: le Dashboard n'affiche dans "Actions Prioritaires" que les predictions actionnables (`action = buy`) dont la date est aujourd'hui ou future.
- Cause racine: `Dashboard.tsx` passait toutes les predictions non selectionnees a `RecommendationsSection`, sans filtrage metier sur la date ni sur l'action recommandee.

## Fichiers modifies
- [src/pages/Dashboard.tsx](../../../../src/pages/Dashboard.tsx)
- [docs/audit/corrections/P1-02/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Commandes executees
- `npm run lint`
- `npm run build`

## Resultats de validation
- Validation technique:
  - `npm run lint`: OK
  - `npm run build`: OK
- Validation fonctionnelle:
  - Les predictions passees (ex. motifs contenant "Livre ✓") ne peuvent plus apparaitre en "Actions Prioritaires" car filtre `predictedDate >= today`: OK
  - Les actions non commande (`wait`, `reduce`) ne sont plus proposees dans la liste prioritaire car filtre `action === "buy"`: OK
  - Le compteur panier et la generation de commande restent fonctionnels, la selection se fait sur le sous-ensemble actionnable visible: OK

## Risques residuels
- Le filtrage date repose sur un format `YYYY-MM-DD`; toute evolution de format devra etre normalisee au meme endroit pour eviter des faux positifs/negatifs.

## Statut final
- `done`
