# P1-07 - Lien support non fonctionnel

## Traceabilite
- Source audit: [registre-problemes.md:L131](../../registre-problemes.md#L131)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P1`

## Objectif
Remplacer le lien support factice par une navigation valide et utile.

## Fichiers concernes
- [src/components/layout/Sidebar.tsx#L75](../../../../src/components/layout/Sidebar.tsx#L75)
- [src/App.tsx#L23](../../../../src/App.tsx#L23)

## Plan d'action detaille
1. Choix fonctionnel
- Option A: page `/support` interne.
- Option B: lien externe support (mail/helpdesk).

2. Implementation
- Remplacer `href="#"`.
- Si route interne: creer page minimale + route.

3. Validation
- Verifier clic support desktop/mobile.

## Criteres d'acceptation
- Le clic support mene a une destination valide.

## Risques
- Destination non disponible en environnement offline.

## Rollback
- Cacher temporairement l'entree support si backend help indisponible.

## Estimation
- Effort: 0.25 jour.
