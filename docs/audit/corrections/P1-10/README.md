# P1-10 - Code mort / non utilise

## Traceabilite
- Source audit: [registre-problemes.md:L155](../../registre-problemes.md#L155)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
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
