# P2-03 - Mutation directe de style DOM dans React

## Traceabilite
- Source audit: [registre-problemes.md:L215](../../registre-problemes.md#L215)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
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
