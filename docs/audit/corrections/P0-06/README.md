# P0-06 - Variables CSS referencees mais non definies

## Traceabilite
- Source audit: [registre-problemes.md:L65](../../registre-problemes.md#L65)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P0`
- Depend de: [P0-05](../P0-05/README.md)

## Objectif
Eliminer toute variable CSS non resolue pour stabiliser le rendu et eviter les proprietes ignorees.

## Fichiers concernes
- [src/styles/index.css#L1](../../../../src/styles/index.css#L1)
- [src/components/common/Modal.css#L19](../../../../src/components/common/Modal.css#L19)
- [src/components/stocks/ProductDetail.css#L22](../../../../src/components/stocks/ProductDetail.css#L22)
- [src/pages/Dashboard.css#L372](../../../../src/pages/Dashboard.css#L372)
- [src/pages/Predictions.css#L752](../../../../src/pages/Predictions.css#L752)

## Plan d'action detaille
1. Diagnostic
- Confirmer liste: `--shadow-xl`, `--font-size-md`.

2. Correction
- Ajouter tokens manquants dans `:root` (valeurs coherentes avec echelle existante):
  - `--shadow-xl`
  - `--font-size-md`
- Ou remplacer usages par tokens deja existants (`--shadow-lg`, `--font-size-base`).

3. Validation
- Verifier rendu modal/drawer/typos impactes.
- Re-executer script de detection variables undefined.

## Criteres d'acceptation
- Zero variable CSS non definie referencee.
- Rendu visuel stable sur composants concernes.

## Risques
- Changement de hierarchie visuelle si token mal calibre.

## Rollback
- Revenir aux anciens styles sur les composants impactes.

## Estimation
- Effort: 0.25 jour.
- Complexite: faible.

## Execution
- Objectif testable: toutes les references `var(--...)` utilisees dans les styles resolves vers un token defini dans `:root`.
- Cause racine: les tokens `--shadow-xl` et `--font-size-md` etaient utilises dans plusieurs feuilles CSS sans definition centrale dans `src/styles/index.css`.

## Fichiers modifies
- [src/styles/index.css](../../../../src/styles/index.css)
- [docs/audit/corrections/P0-06/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Commandes executees
- `rg -n -- '--shadow-xl|--font-size-md' src`
- `npm run lint`
- `npm run build`

## Resultats de validation
- Validation technique:
  - `npm run lint`: OK
  - `npm run build`: OK
- Validation fonctionnelle:
  - Verification des feuilles cibles (`Modal`, `ProductDetail`, `Dashboard`, `Predictions`) avec tokens resolves: OK
  - Verification de coherence references/definitions CSS (`var(--...)` vs `:root`): OK, aucun token non defini restant.

## Risques residuels
- Le nouveau `--shadow-xl` peut legerement renforcer la profondeur visuelle sur modal/drawer; risque faible et coherent avec l'echelle `--shadow-lg`.
