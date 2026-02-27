# P1-09 - Styles injectes a chaque instance Input

## Traceabilite
- Source audit: [registre-problemes.md:L147](../../registre-problemes.md#L147)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P1`
- Depend de: [P0-05](../P0-05/README.md)

## Objectif
Supprimer le bloc `<style>` embarque dans `Input` et centraliser les styles pour maintenance/perf.

## Fichiers concernes
- [src/components/common/Input.tsx#L33](../../../../src/components/common/Input.tsx#L33)
- [src/styles/index.css#L294](../../../../src/styles/index.css#L294)

## Plan d'action detaille
1. Extraction CSS
- Deplacer toutes classes `.input-*` vers un fichier CSS dedie (`Input.css`) ou global.

2. Refactor composant
- Garder composant purement JSX + props.
- Importer le CSS extrait.

3. Validation
- Verifier les usages de Input sur Stocks, Settings, modales.

## Criteres d'acceptation
- Plus aucun `<style>` inline dans `Input.tsx`.
- Rendu inchange visuellement.

## Risques
- Priorite CSS modifiee par ordre d'import.

## Rollback
- Reintroduire temporairement style embed si regression critique.

## Estimation
- Effort: 0.25 jour.

## Execution (2026-02-27)
### Cadrage strict
- Objectif testable: `Input.tsx` ne contient plus de balise `<style>` et les classes `.input-*` sont definies dans `src/styles/index.css` avec rendu equivalent.
- Fichiers modifies autorises:
  - `src/components/common/Input.tsx`
  - `src/styles/index.css`
  - `docs/audit/corrections/P1-09/README.md`
  - `docs/audit/corrections/README.md`
- Checklist validation:
  - lint global OK
  - build production OK
  - verification des usages `Input` sur Stocks, Settings et modales

### Cause racine
- Le composant `Input` injectait un bloc `<style>` a chaque instance, ce qui duplique les regles CSS et complique la maintenance/precedence.

### Plan d'implementation execute
1. Passer le ticket en `in_progress`.
2. Retirer le bloc `<style>` inline de `Input.tsx`.
3. Deplacer les classes `.input-*` vers `src/styles/index.css`.
4. Verifier l'absence de `<style>` dans `Input.tsx`.
5. Verifier les points d'usage de `Input` (pages + modales).
6. Executer `npm run lint`.
7. Executer `npm run build`.
8. Mettre a jour la fiche ticket et la roadmap.

### Fichiers modifies
- `src/components/common/Input.tsx`
- `src/styles/index.css`
- `docs/audit/corrections/P1-09/README.md`
- `docs/audit/corrections/README.md`

### Commandes executees
- `rg -n "<Input|from .*Input" src/pages src/components | head -n 80`
- `rg -n "<style>" src/components/common/Input.tsx`
- `npm run lint`
- `npm run build`

### Validation technique
- `npm run lint`: OK
- `npm run build`: OK (warning bundle size pre-existant, non lie au ticket)
- Tests automatises: non applicables (aucun script de tests dans `package.json`)

### Validation fonctionnelle
- Verification des usages `Input` identifies dans:
  - `src/pages/Stocks.tsx`
  - `src/pages/Settings.tsx`
  - `src/components/settings/IntegrationModal.tsx`
  - `src/components/recipes/RecordProductionModal.tsx`
  - `src/components/stocks/AddProductModal.tsx`
- Le composant conserve la meme API/JSX; seul le mode de declaration CSS change.
- Critere "plus aucun `<style>` inline dans Input.tsx": OK (`rg` sans resultat).

### Risques residuels
- Faible risque de priorite CSS si un autre selector global plus specifique est ajoute ulterieurement.

### Rollback
- Restaurer le bloc CSS inline dans `Input.tsx` en cas de regression visuelle critique immediate.
