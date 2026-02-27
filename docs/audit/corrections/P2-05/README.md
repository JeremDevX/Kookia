# P2-05 - README decale par rapport a l'implementation

## Traceabilite
- Source audit: [registre-problemes.md:L235](../../registre-problemes.md#L235)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P2`
- Depend de: [P0-02](../P0-02/README.md)

## Objectif
Realigner la documentation racine avec l'etat reel du code et le plan de migration.

## Fichiers concernes
- [README.md#L166](../../../../README.md#L166)
- [src/pages/Dashboard.tsx#L12](../../../../src/pages/Dashboard.tsx#L12)
- [src/pages/Stocks.tsx#L10](../../../../src/pages/Stocks.tsx#L10)
- [src/pages/Predictions.tsx#L15](../../../../src/pages/Predictions.tsx#L15)

## Plan d'action detaille
1. Revue ecarts doc/code.
2. Mettre a jour README:
- architecture reelle actuelle,
- limites connues,
- etapes de migration vers architecture cible.
3. Ajouter section "Etat du projet" datee.
4. Lier vers `docs/audit/*` pour le detail.

## Criteres d'acceptation
- README ne promet pas de mecanismes non actifs.
- Onboarding dev possible sans ambiguite majeure.

## Risques
- Obsolescence rapide si non maintenu.

## Rollback
- Conserver version precedente et publier addendum temporaire.

## Estimation
- Effort: 0.5 jour.
