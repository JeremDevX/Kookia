# P0-03 - Bug de state sur quantite de production

## Traceabilite
- Source audit: [registre-problemes.md:L33](../../registre-problemes.md#L33)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P0`
- Depend de: [P0-01](../P0-01/README.md)

## Objectif
Garantir que la quantite proposee dans la modale de production est toujours synchronisee avec la recette courante et son `maxYield`.

## Fichiers concernes
- [src/components/recipes/ProductionConfirmModal.tsx#L29](../../../../src/components/recipes/ProductionConfirmModal.tsx#L29)
- [src/pages/Recipes.tsx#L294](../../../../src/pages/Recipes.tsx#L294)

## Cadrage strict
- Objectif testable: a chaque ouverture de modale, la quantite initiale doit refleter le `maxYield` de la recette courante et la confirmation ne doit jamais depasser ce maximum.
- Fichiers autorises:
  - `src/components/recipes/ProductionConfirmModal.tsx`
  - `src/pages/Recipes.tsx`
  - `docs/audit/corrections/P0-03/README.md`
  - `docs/audit/corrections/README.md`

## Cause racine
- `quantity` etait initialisee une seule fois depuis `maxYield` lors du premier rendu du composant.
- Lors d'un changement de recette (ou d'une re-ouverture), l'etat local conservait potentiellement une valeur stale.

## Implementation
1. `ProductionConfirmModal`:
- ajout d'un bornage explicite `safeMaxYield = Math.max(1, maxYield)`;
- calcul d'une quantite clamped (`1..safeMaxYield`) utilisee pour le calcul eco et `onConfirm`.
2. `Recipes`:
- ajout d'une `key` React sur `ProductionConfirmModal` basee sur `recipe/maxYield/isOpen` pour forcer un remount a l'ouverture/changement recette et reinitialiser la quantite par defaut.
3. Decision technique:
- la synchro via `useEffect` initialement prevue a ete remplacee par remount controle, car la regle lint locale `react-hooks/set-state-in-effect` interdit `setState` synchrone dans un effet.

## Criteres d'acceptation
- A chaque ouverture, la valeur affichee correspond au `maxYield` courant.
- Impossible de confirmer une quantite > `maxYield`.

## Fichiers modifies
- [src/components/recipes/ProductionConfirmModal.tsx](../../../../src/components/recipes/ProductionConfirmModal.tsx)
- [src/pages/Recipes.tsx](../../../../src/pages/Recipes.tsx)
- [docs/audit/corrections/P0-03/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Commandes executees
- `npm run lint` (KO puis corrige)
- `npm run build` (OK)
- `npm run lint` (OK)
- `npm run build` (OK)

## Validation technique
- lint: OK
- build: OK (warning bundle > 500k deja connu hors scope ticket)
- tests: N/A (pas de test automatise cible pour ce ticket)

## Validation fonctionnelle
- Checklist ticket:
  - ouverture recette A puis recette B (maxYield differents): OK par remount controle (`key`) + init quantity depuis `safeMaxYield`;
  - re-ouverture de la meme recette: OK (la `key` varie aussi avec `isOpen`);
  - confirmation quantite > `maxYield`: OK (valeur confirmee toujours bornee via `clampedQuantity`);
  - borne min: OK (quantite confirmee >= 1).
- Flux adjacent verifie:
  - calcul cout/CA base sur quantite bornee, donc pas de derive en cas de saisie hors borne.

## Risques residuels
- Le champ peut afficher temporairement une valeur saisie hors borne avant confirmation; la garde appliquee a la confirmation garantit la coherences des actions.

## Rollback
- Retirer la `key` de remount dans `Recipes` et la logique de clamp dans `ProductionConfirmModal` (retour comportement precedent).

## Estimation
- Effort: 0.25 jour.
- Complexite: faible.
