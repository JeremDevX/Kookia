# Kookia

Application React + TypeScript d'aide aux achats, aux stocks, aux prédictions et
au suivi opérationnel pour la restauration.

## État du projet (2026-09-11)

- Statut global: MVP fonctionnel sur données mock locales.
- Architecture runtime active: `app -> pages/components -> hooks/features -> services/domain -> data/mock`.
- La migration API/backend est planifiée, pas disponible dans le runtime.

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

## Trajectoire technique

Le cadrage Jalon 2, les choix déjà actifs, les limites et la cible de
préproduction sont regroupés dans le
[référentiel technique et développement](docs/technical-development.md). Ce
document distingue explicitement ce qui existe de ce qui reste à construire.

## Documentation de référence

- Workflow agent : [AGENTS.md](AGENTS.md)
- Méthode Codex, sources et validation du cadrage : [Développement agentique](docs/agentic-development.md)
- Référence technique : [Technique et développement](docs/technical-development.md)

## Validation locale minimale avant PR

```bash
npm run lint
npm run build
npm run test
```
