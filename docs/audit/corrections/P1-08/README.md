# P1-08 - Parametrage analytics non persistant

## Traceabilite
- Source audit: [registre-problemes.md:L139](../../registre-problemes.md#L139)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P1`
- Depend de: [P0-02](../P0-02/README.md)

## Objectif
Rendre la sauvegarde des preferences analytics effective (pas seulement un toast + console.log).

## Fichiers concernes
- [src/pages/Analytics.tsx#L28](../../../../src/pages/Analytics.tsx#L28)
- [src/components/analytics/CustomizeAnalyticsModal.tsx#L18](../../../../src/components/analytics/CustomizeAnalyticsModal.tsx#L18)
- [src/types/callbacks.ts#L10](../../../../src/types/callbacks.ts#L10)

## Plan d'action detaille
1. Strategie de persistance
- Phase 1: `localStorage` (rapide).
- Phase 2: service API utilisateur.

2. Implementation
- Creer service `analyticsPreferencesService`.
- Charger preferences au mount de la page.
- Sauvegarder depuis modal + gerer erreurs.

3. Validation
- Modifier preferences -> refresh page -> verifier persistence.

## Criteres d'acceptation
- Les preferences survivent au rechargement.
- En cas d'echec sauvegarde, message d'erreur explicite.

## Risques
- Schema de settings evolutif non versionne.

## Rollback
- Retour temporaire au mode stateless avec message explicite "non persistant".

## Estimation
- Effort: 0.5 a 1 jour.
