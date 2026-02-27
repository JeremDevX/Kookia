# P0-05 - Strategie CSS incoherente (classes utilitaires non supportees)

## Traceabilite
- Source audit: [registre-problemes.md:L53](../../registre-problemes.md#L53)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P0`
- Depend de: [P0-01](../P0-01/README.md)

## Objectif
Unifier le systeme de styles pour supprimer les classes non appliquees et fiabiliser le rendu UI.

## Fichiers concernes (exemples)
- [package.json](../../../../package.json)
- [src/pages/Stocks.tsx#L157](../../../../src/pages/Stocks.tsx#L157)
- [src/components/dashboard/InvoiceModal.tsx#L30](../../../../src/components/dashboard/InvoiceModal.tsx#L30)
- [src/components/analytics/ExportReportModal.tsx#L33](../../../../src/components/analytics/ExportReportModal.tsx#L33)

## Plan d'action detaille
1. Decision d'architecture CSS
- Option A: adopter Tailwind officiellement.
- Option B (recommandee a court terme): rester 100% CSS projet et eliminer classes utilitaires non supportees.

2. Inventaire
- Generer liste des classes utilitaires utilisees non definies.
- Prioriser les ecrans visibles critiques (Dashboard, Stocks, Predictions).

3. Implementation
- Remplacer classes utilitaires par classes CSS explicites dans les fichiers `*.css` existants.
- Factoriser styles repetes si necessaire dans `src/styles/index.css`.

4. Validation
- Revue visuelle desktop/mobile par page.
- Verifier que chaque classe JSX utilisee a une definition resolue.

## Criteres d'acceptation
- Plus de classes utilitaires orphelines sur pages critiques.
- Rendu stable entre environnements.

## Risques
- Drift visuel pendant migration.
- Effets de bord sur composants partages.

## Rollback
- Restaurer blocs JSX/styling precedents pour ecran impacte.

## Estimation
- Effort: 1 a 2 jours.
- Complexite: moyenne.
