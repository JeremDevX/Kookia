# P1-06 - Top bar non contextuelle

## Traceabilite
- Source audit: [registre-problemes.md:L123](../../registre-problemes.md#L123)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P1`

## Objectif
Afficher le titre de page courant dans la top bar au lieu d'un libelle fixe.

## Fichiers concernes
- [src/components/layout/TopNav.tsx#L23](../../../../src/components/layout/TopNav.tsx#L23)
- [src/App.tsx#L24](../../../../src/App.tsx#L24)

## Plan d'action detaille
1. Design
- Introduire mapping route -> label.

2. Implementation
- Utiliser `useLocation()` dans `TopNav`.
- Deriver `currentPage` depuis pathname.

3. Validation
- Naviguer sur les 6 routes et verifier label.

## Criteres d'acceptation
- Le titre top bar est coherent avec la route active.

## Risques
- Routes futures sans mapping.

## Rollback
- Fallback sur label `Dashboard` si route inconnue.

## Estimation
- Effort: 0.25 jour.
