# P2-02 - Validation formulaires limitee

## Traceabilite
- Source audit: [registre-problemes.md:L205](../../registre-problemes.md#L205)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
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
