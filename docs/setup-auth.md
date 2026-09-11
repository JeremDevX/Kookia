# Setup rapide — authentification locale

## Prérequis

- Node.js 20 ou supérieur — Node.js 26 a été utilisé pour valider le projet.
- Docker Desktop installé et démarré.

## Installation

Depuis la racine du dépôt :

```bash
npm install
cp .env.example .env
npx prisma generate
npm run db:up
npm run db:migrate
```

## Démarrage

```bash
npm run dev
```

L’application est disponible sur <http://localhost:5173>.
L’API est disponible sur <http://localhost:3001>.
Le health check est disponible sur <http://localhost:3001/api/health>.

## Parcours de test

1. Ouvrir <http://localhost:5173/register>.
2. Créer un compte avec un mot de passe d’au moins 10 caractères.
3. Vérifier la redirection vers le dashboard.
4. Rafraîchir la page : la session doit rester active.
5. Ouvrir **Paramètres → Compte** et tester la modification du nom.
6. Tester le changement d’adresse email et de mot de passe.
7. Se déconnecter, puis se reconnecter avec le nouveau mot de passe.
8. Tester la suppression du compte.

## Vérifications automatisées

```bash
npm run lint
npm run build
npm run build:api
npm test
npm run test:integration
```

`npm run test:integration` nécessite PostgreSQL démarré avec Docker.

## Arrêt de PostgreSQL

```bash
npm run db:down
```

Le volume Docker est conservé. Pour inspecter la base localement :

```bash
npm run db:studio
```
