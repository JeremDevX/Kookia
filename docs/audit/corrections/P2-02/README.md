# P2-02 - Validation formulaires limitee

## Traceabilite
- Source audit: [registre-problemes.md:L205](../../registre-problemes.md#L205)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P2`
- Depend de: [P0-02](../P0-02/README.md)

## Objectif
Fiabiliser les saisies utilisateurs pour eviter les etats invalides dans stocks/recettes/modales.

## Fichiers concernes
- [src/components/stocks/AddProductModal.tsx#L114](../../../../src/components/stocks/AddProductModal.tsx#L114)
- [src/components/recipes/RecordProductionModal.tsx#L69](../../../../src/components/recipes/RecordProductionModal.tsx#L69)
- [src/components/recipes/ProductionConfirmModal.tsx#L70](../../../../src/components/recipes/ProductionConfirmModal.tsx#L70)

## Plan d'action detaille
1. Definir schema de validation (ex: zod) pour chaque formulaire.
2. Introduire validation synchrone + messages d'erreur user-friendly.
3. Bloquer submit si donnees invalides.
4. Ajouter tests unitaires des schemas.

## Criteres d'acceptation
- Aucun formulaire critique n'accepte valeur hors bornes.
- Messages d'erreur explicites par champ.

## Risques
- Friction UX si validation trop stricte.

## Rollback
- Revenir validation minimale sur champs non critiques.

## Estimation
- Effort: 1 jour.

## Cadrage strict
- Objectif testable: les formulaires critiques de stock/production refusent les valeurs invalides (hors bornes, formats incorrects, champs requis manquants) et affichent des messages explicites par champ.
- Fichiers autorises a modification:
  - `src/components/stocks/AddProductModal.tsx`
  - `src/components/recipes/RecordProductionModal.tsx`
  - `src/components/recipes/ProductionConfirmModal.tsx`
  - `src/utils/formValidation.ts`
  - `src/utils/formValidation.test.ts`
  - `docs/audit/corrections/P2-02/README.md`
  - `docs/audit/corrections/README.md`
- Checklist de validation:
  - `npm run lint`
  - `npm run build`
  - `npx vitest run src/utils/formValidation.test.ts`
  - verification fonctionnelle des 3 formulaires (blocage submit + message d'erreur)

## Cause racine
- Les modales validaient principalement la presence de quelques champs (`if` minimal), sans schema centralise ni bornes metier.
- Les conversions numeriques acceptaient implicitement des valeurs invalides et ne retournaient aucun feedback utilisateur contextualise.

## Plan d'implementation execute
1. Creer un module de validation centralise `src/utils/formValidation.ts`.
2. Definir des regles synchrones pour ajout produit (champs requis, categorie/unite autorisees, bornes stock/prix/seuil).
3. Definir des regles synchrones pour enregistrement production (nom, portions, temps, longueur des notes).
4. Definir la validation de quantite pour confirmation production (entier dans `[1, maxYield]`).
5. Brancher les validateurs dans `AddProductModal` et afficher les erreurs par champ.
6. Brancher les validateurs dans `RecordProductionModal` et afficher les erreurs `Input` + `textarea`.
7. Brancher la validation dans `ProductionConfirmModal` avec message d'erreur de quantite.
8. Ajouter tests unitaires sur les validateurs.
9. Executer les gates techniques.

## Fichiers modifies
- `src/utils/formValidation.ts`
- `src/utils/formValidation.test.ts`
- `src/components/stocks/AddProductModal.tsx`
- `src/components/recipes/RecordProductionModal.tsx`
- `src/components/recipes/ProductionConfirmModal.tsx`
- `docs/audit/corrections/P2-02/README.md`
- `docs/audit/corrections/README.md`

## Commandes executees
- `npm run lint`
- `npm run build`
- `npx vitest run src/utils/formValidation.test.ts`

## Resultats de validation
- Validation technique:
  - lint: OK
  - build: OK
  - tests: OK (1 fichier, 7 tests)
- Validation fonctionnelle:
  - AddProductModal: submit bloque tant que les champs requis/valeurs bornees sont invalides, erreurs affichees par champ.
  - RecordProductionModal: portions et temps invalides bloques, erreurs explicites affichees.
  - ProductionConfirmModal: quantite hors intervalle `[1, maxYield]` refusee avec message d'erreur et submit bloque.
  - Flux adjacent: les submissions valides restent fonctionnelles (payloads nettoyes/normalises): OK.

## Risques residuels
- Les bornes numeriques sont statiques (hardcodees) et pourront necessiter un alignement metier futur selon contexte (ex: seuils max par etablissement).
- La validation est front-only; une validation serveur restera necessaire en environnement connecte.

## Statut final
- `done`
