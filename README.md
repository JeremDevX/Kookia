# FoodAI MVP

Application React + TypeScript de gestion de stocks, prédictions et suivi opérationnel pour restauration.

## Etat du projet (2026-02-27)

- Statut global: MVP fonctionnel sur données mock locales.
- Architecture runtime active: `pages -> hooks -> services -> utils/mockData`.
- Migration API backend: non active à ce stade (pas de client API branché).
- Référence suivi qualité/corrections: `docs/audit/corrections/*`.

## Démarrage

```bash
npm install
npm run dev
```

Application disponible sur `http://localhost:5173`.

## Scripts utiles

```bash
npm run lint
npm run build
npm run test
```

## Architecture actuelle

```text
src/
├── pages/               # Ecrans (Dashboard, Stocks, Predictions, Recipes, Analytics, Settings)
├── hooks/               # Orchestration UI/data (useProducts, usePredictions, ...)
├── services/            # Logique data + règles métier (source mock actuelle)
├── utils/mockData.ts    # Source de données de démonstration
├── components/          # UI réutilisable et sections métier
├── context/             # Contextes globaux (toast, panier)
├── types/               # Types domaine TypeScript centralisés
├── config/domain/       # Paramètres métier front
└── styles/              # Styles globaux + tokens CSS
```

Flux observé dans le code:
- `Dashboard.tsx`, `Stocks.tsx`, `Predictions.tsx` consomment les hooks (`usePredictions`, `useProducts`, ...).
- Les hooks appellent les services (`productService`, `predictionService`, `recipeService`, `analyticsService`).
- Les services utilisent des données mock depuis `src/utils/mockData.ts`.

## Ce qui est en place

- Types centralisés dans `src/types`.
- Pages branchées sur hooks/services (pas d'import `MOCK_*` direct dans les pages principales).
- Priorisation prédictions et règles métier front dans les services.
- Couverture de tests unitaires ciblée (services, utilitaires, état panier).

## Limites connues

- Persistance serveur absente: les données ne survivent pas à un vrai cycle backend.
- Pas de couche `src/config/api.ts` active dans ce dépôt aujourd'hui.
- Les services simulent des latences et retournent des mocks.

## Plan de migration recommandé (architecture cible)

1. Ajouter un client API commun (base URL, timeout, gestion d'erreurs).
2. Introduire des DTO/API mappers dans les services sans casser les types domaine.
3. Basculer service par service (`products`, `predictions`, `recipes`, `analytics`) vers des appels backend réels.
4. Conserver les hooks comme façade pour ne pas impacter les pages.
5. Étendre les tests sur mapping, erreurs réseau et flux critiques UI.

## Documentation de référence

- Point d'entrée agent: [docs/AI_ENTRYPOINT.md](docs/AI_ENTRYPOINT.md)
- Index corrections: [docs/audit/corrections/README.md](docs/audit/corrections/README.md)
- Workflow obligatoire: [docs/audit/corrections/WORKFLOW_IMPERATIF_AGENT.md](docs/audit/corrections/WORKFLOW_IMPERATIF_AGENT.md)
- Bonnes pratiques agent: [docs/audit/corrections/BEST_PRACTICES_AGENT.md](docs/audit/corrections/BEST_PRACTICES_AGENT.md)
- Process standard: [docs/audit/corrections/PROCESS_STANDARD.md](docs/audit/corrections/PROCESS_STANDARD.md)
- Registre audit source: [docs/audit/registre-problemes.md](docs/audit/registre-problemes.md)

## Validation locale minimale avant PR

```bash
npm run lint
npm run build
npm run test
```
