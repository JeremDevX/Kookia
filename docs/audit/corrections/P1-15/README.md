# P1-15 - Classes utilitaires orphelines restantes

## Traceabilite
- Source audit: [registre-problemes.md](../../registre-problemes.md)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P1`
- Depend de: [P0-05](../P0-05/README.md)

## Objectif
Finaliser la strategie CSS projet en supprimant les classes utilitaires non resolues restantes pour obtenir un rendu stable et explicite.

## Fichiers concernes
- [src/styles/index.css](../../../../src/styles/index.css)
- [src/components/analytics/CustomizeAnalyticsModal.tsx](../../../../src/components/analytics/CustomizeAnalyticsModal.tsx)
- [src/components/predictions/PredictionDetailModal.tsx](../../../../src/components/predictions/PredictionDetailModal.tsx)
- [src/components/recipes/ProductionConfirmModal.tsx](../../../../src/components/recipes/ProductionConfirmModal.tsx)
- [src/components/dashboard/MenuIdeasModal.tsx](../../../../src/components/dashboard/MenuIdeasModal.tsx)
- [src/components/recipes/RecordProductionModal.tsx](../../../../src/components/recipes/RecordProductionModal.tsx)
- [src/components/stocks/AddProductModal.tsx](../../../../src/components/stocks/AddProductModal.tsx)

## Plan d'action detaille
1. Produire l'inventaire complet des classes JSX non definies dans les CSS du projet.
2. Prioriser les composants visibles en production (modales critiques, dashboard, predictions, recipes).
3. Remplacer les classes utilitaires orphelines par des classes CSS projet explicites (ou definir utilitaires internes limites et documentes).
4. Harmoniser naming et tokens design pour eviter la reintroduction de styles implicites.
5. Verifier rendu desktop/mobile sur ecrans impactes.
6. Executer `lint` et `build`, puis ajouter une verification automatisable d'orphelins CSS.

## Criteres d'acceptation
- Plus aucune classe utilitaire JSX non resolue sur le perimetre cible.
- Le rendu visuel reste coherent avec les ecrans actuels.
- Le process de verification evite la reintroduction du probleme.

## Risques
- Derive visuelle temporaire pendant migration des classes.
- Risque de toucher des composants nombreux si le scope n'est pas borne par lots.

## Rollback
- Restaurer les composants migrés lot par lot en cas de regression visuelle critique.

## Estimation
- Effort: 1 a 2 jours.
- Complexite: moyenne.
