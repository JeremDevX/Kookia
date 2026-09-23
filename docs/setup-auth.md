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
8. Tester la suppression **uniquement de ce compte jetable**, jamais d'un espace
   existant ou de l'espace Camille.

## Vérifications automatisées

```bash
npm run lint
npm run build
npm run build:api
npm test
```

La CI lance actuellement `lint`, `build` et `test` ; `build:api` et les tests
d'intégration sont des contrôles locaux complémentaires.

## Base isolée pour les tests d'intégration

Les tests créent des comptes aléatoires puis nettoient leurs identifiants, mais
**le runner n'interdit pas encore une connexion à la base de développement**.
Ne pas exécuter `npm run test:integration` sur la base `kookia` contenant un
espace à conserver. Avec le PostgreSQL Docker local, créer une base dédiée une
seule fois (une erreur « already exists » signifie seulement qu'elle existe) :

```bash
npm run db:up
docker compose exec -T postgres createdb -U kookia kookia_test
DATABASE_URL=postgresql://kookia:kookia_dev@localhost:5432/kookia_test npm run db:migrate
DATABASE_URL=postgresql://kookia:kookia_dev@localhost:5432/kookia_test npm run test:integration
```

Cette URL utilise **les identifiants de développement de `compose.yaml`**, pas
ceux d'un restaurant. Vérifier le nom `kookia_test` avant migration et test.
Le premier incrément du [plan d'exécution](plans/plan-execution.md) doit ajouter
un garde-fou automatique et la CI d'intégration sur base éphémère.

## Arrêt de PostgreSQL

```bash
npm run db:down
```

Le volume Docker est conservé. Pour inspecter la base localement :

```bash
npm run db:studio
```
