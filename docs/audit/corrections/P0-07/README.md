# P0-07 - Validation numerique permissive dans les formulaires

## Traceabilite
- Source audit: [registre-problemes.md](../../registre-problemes.md)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P0`
- Depend de: [P2-02](../P2-02/README.md)

## Objectif
Garantir qu'aucune saisie numerique partielle ou invalide (`12abc`, `5abc`, `10xyz`) ne puisse etre acceptee comme valeur valide dans les formulaires critiques.

## Fichiers concernes
- [src/utils/formValidation.ts](../../../../src/utils/formValidation.ts)
- [src/utils/formValidation.test.ts](../../../../src/utils/formValidation.test.ts)
- [src/components/stocks/AddProductModal.tsx](../../../../src/components/stocks/AddProductModal.tsx)
- [src/components/recipes/RecordProductionModal.tsx](../../../../src/components/recipes/RecordProductionModal.tsx)
- [src/components/recipes/ProductionConfirmModal.tsx](../../../../src/components/recipes/ProductionConfirmModal.tsx)

## Plan d'action detaille
1. Introduire un parsing strict pour entiers et decimaux (format complet uniquement).
2. Remplacer les usages de `parseInt`/`parseFloat` permissifs dans les validateurs critiques.
3. Conserver les bornes metier existantes et les messages d'erreur utilisateur.
4. Ajouter des tests de non-regression sur formats invalides partiels:
   - `12abc` sur champs entiers.
   - `5abc` sur quantite de production.
   - `10xyz` sur temps de preparation.
5. Verifier que les boutons submit restent correctement bloques en cas d'erreur.
6. Executer les gates techniques (`lint`, `build`, `test`).

## Criteres d'acceptation
- Les validateurs rejettent toute valeur numerique partielle ou non canonique.
- Les formulaires n'acceptent plus de donnees incoherentes via parsing tolerant.
- Les tests unitaires couvrent explicitement les cas invalides identifies.

## Risques
- Risque de durcissement excessif si certains formats utilisateur jusque-la tolerees etaient utilises.
- Risque de faux negatifs si la normalisation (espaces, virgule/point) n'est pas definie explicitement.

## Rollback
- Revenir temporairement aux parseurs precedents en limitant le rollback aux champs non critiques si un blocage UX est detecte.

## Estimation
- Effort: 0.5 a 1 jour.
- Complexite: faible a moyenne.
