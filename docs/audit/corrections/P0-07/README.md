# P0-07 - Validation numerique permissive dans les formulaires

## Traceabilite
- Source audit: [registre-problemes.md](../../registre-problemes.md)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
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

## Cadrage strict
- Objectif testable: rejeter les saisies numeriques partielles dans les validateurs critiques (`12abc`, `5abc`, `10xyz`) tout en conservant les bornes metier existantes.
- Fichiers autorises a modification:
  - `src/utils/formValidation.ts`
  - `src/utils/formValidation.test.ts`
  - `src/components/stocks/AddProductModal.tsx`
  - `src/components/recipes/RecordProductionModal.tsx`
  - `src/components/recipes/ProductionConfirmModal.tsx`
  - `docs/audit/corrections/P0-07/README.md`
  - `docs/audit/corrections/README.md`
- Checklist de validation:
  - `npm run test -- src/utils/formValidation.test.ts`
  - `npm run lint`
  - `npm run build`

## Cause racine
- Les fonctions `parseInt` et `parseFloat` utilisaient un parsing tolerant qui accepte des chaines partielles (`12abc` -> `12`), ce qui permettait de valider des entrees invalides.
- La soumission d'ajout produit contenait encore un `parseInt` permissif pour `minThreshold`.

## Plan d'implementation execute
1. Introduire un parsing strict par regex pour nombres decimaux et entiers dans `formValidation.ts`.
2. Conserver les regles metier existantes (bornes/messages) en remplacant uniquement la conversion.
3. Supprimer l'usage de `parseInt` permissif dans `AddProductModal` au moment de la soumission.
4. Ajouter des tests de non-regression pour les cas partiellement numeriques.
5. Executer les gates techniques du ticket.

## Fichiers modifies
- `src/utils/formValidation.ts`
- `src/utils/formValidation.test.ts`
- `src/components/stocks/AddProductModal.tsx`
- `docs/audit/corrections/P0-07/README.md`
- `docs/audit/corrections/README.md`

## Commandes executees
- `npm run test -- src/utils/formValidation.test.ts`
- `npm run lint`
- `npm run build`

## Resultats de validation
- Validation technique:
  - tests: OK (`src/utils/formValidation.test.ts`, 10 tests passes)
  - lint: OK
  - build: OK
- Validation fonctionnelle:
  - `validateAddProductForm` rejette `12abc`, `5abc`, `10xyz`: OK (tests unitaires)
  - `validateRecordProductionForm` rejette `12abc` et `10xyz`: OK (tests unitaires)
  - `validateProductionQuantity` rejette `5abc` et conserve un fallback borne: OK (tests unitaires)
  - Boutons submit restent bloques sur valeurs invalides via `isValid=false` deja branche dans les 3 modales: OK (verification de branchement + tests validateurs)

## Risques residuels
- Les formats avec virgule (`10,5`) restent rejetes; un besoin de localisation numerique imposera une normalisation explicite.
- Validation front uniquement; une validation serveur restera necessaire en environnement connecte.

## Statut final
- `done`
