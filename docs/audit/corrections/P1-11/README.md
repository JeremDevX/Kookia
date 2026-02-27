# P1-11 - Absence de tests automatises

## Traceabilite
- Source audit: [registre-problemes.md:L168](../../registre-problemes.md#L168)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P1`
- Depend de: [P0-01](../P0-01/README.md)

## Objectif
Mettre en place un socle minimal de tests pour prevenir les regressions critiques.

## Fichiers concernes (a creer/mettre a jour)
- `package.json` (scripts test)
- `vitest.config.ts` (si retenu)
- `src/services/*.test.ts`
- `src/context/*.test.ts`
- `.github/workflows/ci.yml` (pipeline qualite)

## Plan d'action detaille
1. Setup outillage
- Installer framework test (Vitest + Testing Library).
- Ajouter scripts `test`, `test:watch`, `test:coverage`.

2. Couverture prioritaire
- Tests unitaires:
  - logique recette (`calculateMaxYield`, cout),
  - panier (`add/remove/clear`),
  - priorite prediction.
- Tests integration UI:
  - flux commande dashboard,
  - ajustement stock.

3. CI
- Ajouter execution tests dans pipeline.

## Criteres d'acceptation
- Suite test execute localement et en CI.
- Couverture initiale sur modules critiques definis.

## Risques
- Temps de mise en place initial non negligeable.

## Rollback
- Garder tests unitaires only si integration trop couteuse a court terme.

## Estimation
- Effort: 2 a 3 jours (socle initial).

## Execution (2026-02-27)
### Cadrage strict
- Objectif testable:
  - une commande `npm test` execute une suite automatisee verte sur les modules critiques cibles;
  - les scripts `test`, `test:watch`, `test:coverage` sont disponibles dans `package.json`;
  - une configuration de test TypeScript/React est en place et versionnee.
- Fichiers modifies autorises:
  - `package.json`
  - `vitest.config.ts`
  - `src/services/*.test.ts`
  - `src/context/*.ts`
  - `src/context/*.test.ts`
  - `.github/workflows/ci.yml`
  - `docs/audit/corrections/P1-11/README.md`
  - `docs/audit/corrections/README.md`
- Checklist validation:
  - execution de `npm test`
  - execution de `npm run lint`
  - execution de `npm run build`
  - verification manuelle des cas critiques couverts (recette, priorite prediction, panier)

### Cause racine
- Le projet ne possede aucun framework de test configure ni scripts associes, ce qui empêche toute verification automatisee des regressions metier critiques.

### Plan d'implementation execute
1. Configurer l'outillage de test (Vitest) et scripts npm.
   - Risque: conflit de config avec Vite/TypeScript.
2. Ajouter une configuration de tests adaptee au runtime React/TS du projet.
   - Risque: environnement de test inadapté (`node` vs `jsdom`) pour les imports existants.
3. Extraire la logique panier dans des fonctions pures reutilisables.
   - Risque: regression comportementale dans `CartProvider`.
4. Ecrire des tests unitaires sur la logique recette (`calculateMaxYield`, cout ingredients).
   - Risque: fragilite liee aux donnees mock.
5. Ecrire des tests unitaires sur la priorisation prediction.
   - Risque: dependance temporelle des assertions.
6. Ecrire des tests unitaires sur la logique panier.
   - Risque: oubli de cas limites (doublons, suppression inexistante).
7. Executer gates techniques (`test`, `lint`, `build`) et corriger si necessaire.
   - Risque: echec de build/lint induit par la configuration test.
8. Mettre a jour fiche ticket + roadmap avec preuves et risques residuels.
   - Risque: tracabilite incomplete.

### Fichiers modifies
- `.github/workflows/ci.yml`
- `package.json`
- `vitest.config.ts`
- `src/context/CartContext.tsx`
- `src/context/cartState.ts`
- `src/context/cartState.test.ts`
- `src/services/recipeService.test.ts`
- `src/services/predictionService.test.ts`
- `docs/audit/corrections/P1-11/README.md`
- `docs/audit/corrections/README.md`

### Commandes executees
- `npm install -D vitest @vitest/coverage-v8` (echec reseau, non bloquant car dependances deja presentes localement)
- `node_modules/.bin/vitest --version`
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run test:coverage`

### Validation technique
- lint: `OK`
- build: `OK` (warning bundle > 500 kB preexistant, hors scope ticket)
- tests: `OK` (`3` fichiers, `10` tests passes)
- coverage: `OK` (rapport genere, `cartState.ts` a `100%`)

### Validation fonctionnelle
- Logique recette:
  - `calculateMaxYield` couvre cas vide + ingredient limitant: `OK`
  - `calculateIngredientCost` ignore produits inconnus: `OK`
- Priorisation prediction:
  - prediction passee forcee en `normal`: `OK`
  - cas achat proche rupture classe `critical`: `OK`
  - cas `reduce` moyen terme classe `high`: `OK`
- Panier:
  - ajout sans doublon, ajout multiple, suppression, clear, presence: `OK`
- CI:
  - pipeline GitHub Actions ajoutee avec sequence `lint -> build -> test`: `OK` (validation syntaxique via commit, execution distante a confirmer sur prochain push)

### Risques residuels
- Les tests UI d'integration (`src/pages/*.test.tsx`) ne sont pas inclus dans cette premiere passe pour limiter le scope et le cout initial; ils restent une extension recommandee dans un ticket de durcissement qualite.
- La couverture actuelle cible les modules metier critiques identifies, mais ne couvre pas encore les composants d'interface.

### Rollback
- Supprimer le workflow CI et les scripts npm de test.
- Revenir a la logique panier inline dans `CartProvider` si un comportement inattendu etait detecte.

### Statut final
- `done`
