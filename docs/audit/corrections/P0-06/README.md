# P0-06 - Variables CSS referencees mais non definies

## Traceabilite
- Source audit: [registre-problemes.md:L65](../../registre-problemes.md#L65)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
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
