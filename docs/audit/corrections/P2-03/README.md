# P2-03 - Mutation directe de style DOM dans React

## Traceabilite
- Source audit: [registre-problemes.md:L215](../../registre-problemes.md#L215)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P2`
- Depend de: [P0-05](../P0-05/README.md)

## Objectif
Remplacer les mutations style inline imperative par des classes CSS declaratives.

## Fichiers concernes
- [src/components/layout/Notifications.tsx#L326](../../../../src/components/layout/Notifications.tsx#L326)
- [src/components/layout/Notifications.tsx#L452](../../../../src/components/layout/Notifications.tsx#L452)

## Plan d'action detaille
1. Identifier tous les handlers qui modifient `e.currentTarget.style`.
2. Creer classes CSS `:hover`, `:active`, `is-processing`, etc.
3. Brancher logique React sur toggles de classes et non sur DOM imperative.
4. Verifier coherence desktop/mobile.

## Criteres d'acceptation
- Plus de mutation directe `style` dans les handlers hover UI.

## Risques
- Perte subtile d'animation/transitions.

## Rollback
- Reintroduire localement style imperative pour un composant le temps d'isoler la regression.

## Estimation
- Effort: 0.5 jour.

## Cadrage strict
- Objectif testable: le composant `Notifications` ne doit plus utiliser de mutation directe `e.currentTarget.style` pour les interactions hover.
- Fichiers autorises a modification:
  - `src/components/layout/Notifications.tsx`
  - `src/components/layout/Notifications.css`
  - `docs/audit/corrections/P2-03/README.md`
  - `docs/audit/corrections/README.md`
- Checklist de validation:
  - `npm run lint`
  - `npm run build`
  - verification fonctionnelle ciblee: aucune mutation `currentTarget.style` dans `Notifications.tsx`, effets hover preserves via classes CSS declaratives.

## Cause racine
- Les interactions hover de cartes et boutons reposaient sur des handlers `onMouseEnter/onMouseLeave` qui mutaient directement le DOM (`e.currentTarget.style`), anti-pattern en React et fragile en maintenance.

## Plan d'implementation execute
1. Ajouter une feuille de style locale `Notifications.css` pour les etats `:hover` et `:focus-visible`.
2. Importer `Notifications.css` dans `Notifications.tsx`.
3. Remplacer les mutations style des cartes de notifications par une classe `notification-item`.
4. Remplacer les mutations style du bouton "Commander ..." par une classe `notification-action-button`.
5. Remplacer les mutations style du bouton "Generer la commande" par une classe `notification-generate-button`.
6. Executer les gates techniques et verifier l'absence de mutation directe.

## Fichiers modifies
- `src/components/layout/Notifications.tsx`
- `src/components/layout/Notifications.css`
- `docs/audit/corrections/P2-03/README.md`
- `docs/audit/corrections/README.md`

## Commandes executees
- `rg -n "currentTarget\\.style" src/components/layout/Notifications.tsx`
- `npm run lint`
- `npm run build`

## Resultats de validation
- Validation technique:
  - lint: OK
  - build: OK
  - tests: N/A (pas de tests automatises specifiques a ce ticket)
- Validation fonctionnelle:
  - Critere "Plus de mutation directe `style` dans les handlers hover UI": OK (aucune occurrence `currentTarget.style` dans `Notifications.tsx`).
  - Effets hover remplaces par classes declaratives (`notification-item`, `notification-action-button`, `notification-generate-button`): OK.
  - Verification visuelle desktop/mobile: non executee dans cette passe (risque residuel ci-dessous).

## Risques residuels
- Rendu hover non verifie visuellement dans un navigateur (desktop/mobile) sur cette passe; un controle UI manuel reste recommande.

## Statut final
- `done`
