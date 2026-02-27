# P0-03 - Bug de state sur quantite de production

## Traceabilite
- Source audit: [registre-problemes.md:L33](../../registre-problemes.md#L33)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P0`
- Depend de: [P0-01](../P0-01/README.md)

## Objectif
Garantir que la quantite proposee dans la modale de production est toujours synchronisee avec la recette courante et son `maxYield`.

## Fichiers concernes
- [src/components/recipes/ProductionConfirmModal.tsx#L29](../../../../src/components/recipes/ProductionConfirmModal.tsx#L29)
- [src/pages/Recipes.tsx#L294](../../../../src/pages/Recipes.tsx#L294)

## Plan d'action detaille
1. Reproduction
- Ouvrir modale sur recette A.
- Fermer puis ouvrir sur recette B avec `maxYield` different.
- Verifier valeur initiale stale.

2. Correction
- Ajouter `useEffect` dans `ProductionConfirmModal` pour resynchroniser `quantity` quand `isOpen`, `recipe?.id` ou `maxYield` changent.
- Ajouter garde: clamp `quantity` entre `1` et `maxYield`.

3. Validation technique
- Verifier typage TS.
- `npm run build`.

4. Validation fonctionnelle
- Tester ouverture successive sur plusieurs recettes.
- Tester max/min et invalid values.

## Criteres d'acceptation
- A chaque ouverture, la valeur affichee correspond au `maxYield` courant.
- Impossible de confirmer une quantite > `maxYield`.

## Risques
- Effets de bord sur saisie utilisateur si re-render intempestif.

## Rollback
- Retirer `useEffect` de sync et revenir comportement precedent (temporaire).

## Estimation
- Effort: 0.25 jour.
- Complexite: faible.
