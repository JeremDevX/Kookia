# P1-06 - Top bar non contextuelle

## Traceabilite
- Source audit: [registre-problemes.md:L123](../../registre-problemes.md#L123)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
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

## Cadrage applique
- Objectif testable: "La top bar affiche le titre correspondant a la route active (`/`, `/stocks`, `/predictions`, `/recipes`, `/settings`, `/analytics`) avec fallback `Dashboard`."
- Fichiers autorises modifies:
  - `src/components/layout/TopNav.tsx`
- Checklist de validation:
  - Route `/` -> `Dashboard`
  - Route `/stocks` -> `Stocks`
  - Route `/predictions` -> `Predictions`
  - Route `/recipes` -> `Recipes`
  - Route `/settings` -> `Settings`
  - Route `/analytics` -> `Analytics`
  - Route inconnue -> fallback `Dashboard`

## Cause racine
La top bar utilisait un libelle statique (`Dashboard`) sans lien avec le `pathname` courant du routeur.

## Implementation realisee
1. Ajout de `useLocation()` dans `TopNav`.
2. Ajout d'un mapping `pathname -> label`.
3. Calcul du titre courant avec fallback `Dashboard` pour route inconnue.
4. Remplacement du texte statique par le titre derive.

## Fichiers modifies
- [src/components/layout/TopNav.tsx](../../../../src/components/layout/TopNav.tsx)
- [docs/audit/corrections/P1-06/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Commandes executees
- `npm run lint`
- `npm run build`

## Validation technique
- lint: OK
- build: OK (warning bundle > 500 kB preexistant, hors scope du ticket)
- tests: N/A (pas de tests automatisees cibles sur ce flux)

## Validation fonctionnelle
- Verification du mapping route -> titre dans `TopNav`:
  - `/` -> `Dashboard`: OK
  - `/stocks` -> `Stocks`: OK
  - `/predictions` -> `Predictions`: OK
  - `/recipes` -> `Recipes`: OK
  - `/settings` -> `Settings`: OK
  - `/analytics` -> `Analytics`: OK
  - route inconnue -> `Dashboard`: OK

## Risques residuels
- Les futures routes devront etre ajoutees au mapping pour afficher un titre specifique (fallback deja en place).

## Statut final
- `done`
