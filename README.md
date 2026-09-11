# Kookia

Application React + TypeScript d'aide aux achats, aux stocks, aux prédictions et
au suivi opérationnel pour la restauration.

## État du projet (2026-09-11)

- Statut global: MVP fonctionnel sur données mock locales avec authentification locale.
- Les données métier restent mockées ; les utilisateurs et sessions sont persistés dans PostgreSQL local.

## Démarrage

```bash
npm install
npx prisma generate
cp .env.example .env
npm run db:up
npm run db:migrate
npm run dev
```

Puis ouvrir `http://localhost:5173/register`. Le frontend est servi sur le port
5173 et proxifie `/api` vers l'API Express sur le port 3001.

## Authentification locale

L'authentification est une première verticale backend locale : Express et
Prisma utilisent PostgreSQL démarré par Docker Compose. Les mots de passe sont
hachés avec Argon2id. Les sessions sont opaques, aléatoires et envoyées dans
un cookie `HttpOnly` ; seul leur hash SHA-256 est enregistré en base. Aucun
service cloud, OAuth, service email ou fournisseur d'authentification externe
n'est requis.

Routes principales : `POST /api/auth/register`, `POST /api/auth/login`,
`POST /api/auth/logout`, `GET /api/auth/me`, puis les routes de compte sous
`/api/account`. Les migrations Prisma créent uniquement `User` et `Session`.

Les pages stocks, recettes, prédictions et analytics ne sont pas encore
rattachées à l'utilisateur connecté.

## Scripts utiles

```bash
npm run lint
npm run build
npm run test
npm run test:integration # PostgreSQL local démarré requis
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
- Le client API dans `src/config/api.ts` est actif pour l'authentification ; les
  services métier continuent d'utiliser les mocks.
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
