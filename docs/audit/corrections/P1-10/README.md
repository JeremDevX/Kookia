# P1-10 - Code mort / non utilise

## Traceabilite
- Source audit: [registre-problemes.md:L155](../../registre-problemes.md#L155)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P1`
- Depend de: [P0-02](../P0-02/README.md)

## Objectif
Reduire le code mort et clarifier l'architecture active pour diminuer la dette technique.

## Fichiers concernes
- [src/components/dashboard/ActivityChart.tsx](../../../../src/components/dashboard/ActivityChart.tsx)
- [src/hooks/index.ts](../../../../src/hooks/index.ts)
- [src/services/index.ts](../../../../src/services/index.ts)

## Plan d'action detaille
1. Audit usage
- Verifier imports/references de chaque module suspect.

2. Decision par module
- Integrer effectivement (si utile court terme) OU supprimer.
- Documenter la decision dans cette fiche.

3. Implementation
- Supprimer exports inutiles.
- Nettoyer imports morts.

4. Validation
- `npm run lint` pour detecter imports inutiles restants.
- `npm run build`.

## Criteres d'acceptation
- Pas de composant/fonction majeur orphelin sans justification.

## Risques
- Suppression prematuree d'un module prevu a court terme.

## Rollback
- Restaurer module supprime via git si besoin produit.

## Estimation
- Effort: 0.5 jour.

## Execution (2026-02-27)
### Cadrage strict
- Objectif testable:
  - le composant `ActivityChart` n'existe plus dans le code source si non monte;
  - les barrels `hooks` et `services` n'exposent plus d'exports non consommes par l'application.
- Fichiers modifies autorises:
  - `src/components/dashboard/ActivityChart.tsx`
  - `src/hooks/index.ts`
  - `src/services/index.ts`
  - `docs/audit/corrections/P1-10/README.md`
  - `docs/audit/corrections/README.md`
- Checklist validation:
  - verification des references `ActivityChart` et hooks/services concernes
  - `npm run lint`
  - `npm run build`

### Cause racine
- `ActivityChart` etait conserve dans le repository sans etre monte dans `Dashboard`.
- Les fichiers barrels `src/hooks/index.ts` et `src/services/index.ts` exposaient des symboles non utilises par les pages actuelles, entretenant une API interne plus large que le runtime reel.

### Plan d'implementation execute
1. Passer le ticket en `in_progress`.
2. Auditer les references des modules cibles via `rg`.
3. Supprimer `ActivityChart` (composant orphelin non utilise).
4. Reduire `src/hooks/index.ts` aux hooks effectivement importes par les pages.
5. Reduire `src/services/index.ts` aux services effectivement importes via le barrel.
6. Re-verifier l'absence de references aux symboles supprimes.
7. Executer `npm run lint`.
8. Executer `npm run build`.
9. Mettre a jour la fiche ticket + roadmap.

### Fichiers modifies
- `src/components/dashboard/ActivityChart.tsx` (supprime)
- `src/hooks/index.ts`
- `src/services/index.ts`
- `docs/audit/corrections/P1-10/README.md`
- `docs/audit/corrections/README.md`

### Commandes executees
- `rg -n "ActivityChart|from ['\\\"]\\./hooks['\\\"]|from ['\\\"]src/hooks['\\\"]|from ['\\\"]\\./services['\\\"]|from ['\\\"]src/services['\\\"]|from ['\\\"].*/hooks/index['\\\"]|from ['\\\"].*/services/index['\\\"]" src`
- `rg -n "from ['\\\"][^'\\\"]*hooks['\\\"]|from ['\\\"][^'\\\"]*services['\\\"]" src`
- `rg -n "\\buseProductsWithMutations\\b|\\buseProducts\\b|\\busePredictions\\b|\\buseActionablePredictions\\b|\\busePredictionsWithState\\b|\\buseRecipes\\b|\\buseAnalytics\\b|\\buseDashboardActivity\\b" src`
- `rg -n "useActionablePredictions|usePredictionsWithState|useDashboardActivity|ActivityChart" src docs`
- `npm run lint`
- `npm run build`

### Validation technique
- lint: `OK`
- build: `OK` (warning bundle > 500 kB preexistant, non lie a ce ticket)
- tests: `N/A` (pas de suite automatisee dediee a ce ticket)

### Validation fonctionnelle
- Verification des points d'integration:
  - `Dashboard` n'importait/deja n'affichait pas `ActivityChart`: pas de regression d'UI attendue sur la page.
  - Les pages (`Dashboard`, `Stocks`, `Predictions`, `Recipes`, `Analytics`) continuent d'importer uniquement les hooks exposes par `src/hooks/index.ts`.
  - `Analytics` continue d'importer les services necessaires via `src/services/index.ts`.
- Build production complet valide le wiring runtime des imports de pages: `OK`.

### Risques residuels
- `useActionablePredictions`, `usePredictionsWithState` et `useDashboardActivity` existent encore dans leurs fichiers source mais ne sont plus exposes via barrel; ils pourront etre retires completement dans un ticket dedie si confirmes hors usage futur.

### Rollback
- Restaurer `ActivityChart.tsx` et les exports barrel supprimes si un besoin produit immediat reapparait.

### Statut final
- `done`
