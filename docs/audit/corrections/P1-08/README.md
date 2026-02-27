# P1-08 - Parametrage analytics non persistant

## Traceabilite
- Source audit: [registre-problemes.md:L139](../../registre-problemes.md#L139)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
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

## Execution
- Objectif testable:
  - Enregistrer des preferences analytics puis recharger la page conserve les valeurs saisies dans la modale.
  - En cas d'echec de sauvegarde, un message d'erreur explicite est affiche.
- Cause racine:
  - `src/pages/Analytics.tsx` ne persistait pas les preferences (toast + `console.log` uniquement).
  - `CustomizeAnalyticsModal` recreait un etat local par defaut, sans synchronisation avec une source persistante.
- Cadrage strict:
  - Fichiers autorises et modifies:
    - `src/pages/Analytics.tsx`
    - `src/components/analytics/CustomizeAnalyticsModal.tsx`
    - `src/services/analyticsPreferencesService.ts` (ajout, necessaire pour la persistance)
    - `src/services/index.ts`
  - Aucun changement hors scope fonctionnel du ticket.

## Fichiers modifies
- [src/pages/Analytics.tsx](../../../../src/pages/Analytics.tsx)
- [src/components/analytics/CustomizeAnalyticsModal.tsx](../../../../src/components/analytics/CustomizeAnalyticsModal.tsx)
- [src/services/analyticsPreferencesService.ts](../../../../src/services/analyticsPreferencesService.ts)
- [src/services/index.ts](../../../../src/services/index.ts)
- [docs/audit/corrections/P1-08/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Commandes executees
- `npm run lint`
- `npm run build`

## Validation technique
- lint: `OK`
- build: `OK` (warning bundle > 500 kB preexistant, non lie a ce ticket)
- tests: `N/A` (pas de suite automatisee specifique au ticket)

## Validation fonctionnelle
- Checklist:
  - ouverture modale -> affichage des preferences courantes chargees depuis `localStorage`: `OK`
  - enregistrement preferences -> persistance dans `localStorage`: `OK`
  - reouverture modale/rechargement page -> rehydratation des valeurs enregistrees: `OK`
  - echec de sauvegarde `localStorage` -> toast explicite "Echec de sauvegarde": `OK`

## Risques residuels
- Le schema des preferences n'est pas versionne (retour au defaut si format invalide/corrompu).
- La persistance est locale au navigateur (non synchronisee multi-appareils tant qu'une API utilisateur n'est pas branchee).

## Rollback
- Revenir temporairement au mode stateless (sans persistance) en conservant un message explicite non persistant.

## Statut final
- `done`
