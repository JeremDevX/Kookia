# P1-09 - Styles injectes a chaque instance Input

## Traceabilite
- Source audit: [registre-problemes.md:L147](../../registre-problemes.md#L147)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
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
