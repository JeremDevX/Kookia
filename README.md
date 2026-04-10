# FoodAI MVP

Application React + TypeScript de gestion de stocks, prédictions et suivi opérationnel pour restauration.

## Etat du projet (2026-04-10)

- Statut global: MVP fonctionnel sur données mock locales.
- Architecture runtime active: `app -> pages/components -> hooks/features -> services/domain -> data/mock`.
- Migration API backend: non active à ce stade (pas de client API branché).
- Revue architecture locale: `ARCHITECTURE_REVIEW.md`.

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
├── app/                 # Providers et router applicatif
├── components/          # UI existante et sections métier legacy en cours de convergence
├── context/             # Contextes globaux UI (toast, panier)
├── data/mock/           # Source mock consommée par les services
├── domain/              # Types métier et policies pures
├── features/            # Hooks et helpers d'orchestration par feature
├── hooks/               # Façades UI/data existantes
├── pages/               # Entrées d'écran
├── services/            # Accès données + façade applicative
├── shared/              # Types et primitives UI transverses
├── types/               # Barrel de compatibilité sur les types du domaine/shared
├── config/domain/       # Paramètres métier front
└── styles/              # Styles globaux + tokens CSS
```

Flux observé dans le code:
- Les pages consomment les hooks et helpers de feature.
- Les hooks appellent les services.
- Les services s'appuient sur le domaine pur et les données mock dédiées sous `src/data/mock`.
- Le dossier `src/components` reste partiellement horizontal et doit continuer à converger feature par feature.

## Ce qui est en place

- Domaine isolé sous `src/domain`.
- Types exposés via le barrel `src/types`.
- Pages et composants UI débarrassés des imports directs vers `utils/mockData` et `services`.
- Priorisation prédictions et règles métier front centralisées hors JSX.
- Couverture de tests unitaires ciblée (services, utilitaires, état panier).

## Limites connues

- Persistance serveur absente: les données ne survivent pas à un vrai cycle backend.
- Pas de couche `src/config/api.ts` active dans ce dépôt aujourd'hui.
- Les services simulent des latences et retournent des mocks.
- Une partie du rendu reste encore portée par des composants volumineux dans `src/components`.

## Plan de migration recommandé (architecture cible)

1. Ajouter un client API commun (base URL, timeout, gestion d'erreurs).
2. Introduire des DTO/API mappers dans les services sans casser les types domaine.
3. Basculer service par service (`products`, `predictions`, `recipes`, `analytics`) vers des appels backend réels.
4. Conserver les hooks comme façade pour ne pas impacter les pages.
5. Étendre les tests sur mapping, erreurs réseau et flux critiques UI.

## Documentation de référence

- Workflow agent: `AGENTS.md`
- Revue architecture et plan de correction: `ARCHITECTURE_REVIEW.md`

## Validation locale minimale avant PR

```bash
npm run lint
npm run build
npm run test
```
