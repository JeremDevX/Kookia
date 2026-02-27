# P0-04 - Ajustement stock drawer incoherent

## Traceabilite
- Source audit: [registre-problemes.md:L41](../../registre-problemes.md#L41)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P0`
- Depend de: [P0-01](../P0-01/README.md)

## Objectif
Rendre l'ajustement de stock fiable: calcul numerique correct + mise a jour effective de la source de donnees UI.

## Fichiers concernes
- [src/components/stocks/ProductDetail.tsx#L59](../../../../src/components/stocks/ProductDetail.tsx#L59)
- [src/pages/Stocks.tsx#L63](../../../../src/pages/Stocks.tsx#L63)

## Plan d'action detaille
1. Reproduction
- Ajuster stock depuis drawer, constater toast positif sans impact tableau.

2. Correction de logique
- Remplacer comparaison string (`adjustAmount > "0"`) par logique numerique stricte.
- Parser et valider entree: entier/signe autorise, NaN refuse.

3. Correction de flux de donnees
- Exposer un callback parent `onAdjustStock(productId, delta)` a `ProductDetail`.
- Appliquer mutation dans `Stocks.tsx` (source de verite locale actuelle).

4. Validation
- Tests manuels:
  - `+10`, `-5`, `0`, `abc`, vide,
  - non-negativite du stock.
- `npm run lint` + `npm run build`.

## Criteres d'acceptation
- Le stock affiche dans tableau est coherent avec l'ajustement.
- Les entrees invalides sont refusees proprement.

## Risques
- Double mutation si actions +/-1 et drawer pas harmonises.

## Rollback
- Desactiver temporairement ajustement drawer si bug persistant.

## Estimation
- Effort: 0.5 jour.
- Complexite: faible a moyenne.
