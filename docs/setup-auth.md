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
Le liveness check est disponible sur <http://localhost:3001/api/health> ; la
disponibilité PostgreSQL sur <http://localhost:3001/api/ready>.

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

La CI lance `lint`, les builds web/API, les tests unitaires et les tests
d'intégration sur un service PostgreSQL éphémère.

## Base isolée pour les tests d'intégration

Pour vérifier le dépôt sur des données jetables, utiliser de préférence la
recette complète, qui crée son propre PostgreSQL 16 sur tmpfs, applique
les migrations, lance les contrôles CI locaux et vérifie un dump/restauration :

```bash
npm run verify:local-delivery
```

Le runner d'intégration seul refuse toute URL autre que PostgreSQL sur un hôte
loopback avec une base nommée `kookia_test`. Cette garde ne rend pas la base
jetable : une URL autorisée peut viser le `kookia_test` persistant du volume
Compose. Pour un diagnostic manuel seulement, la base dédiée est créée dans ce
volume et peut contenir des comptes/tests synthétiques après leur exécution.
L'URL locale de `compose.yaml` et son mot de passe d'exemple ne doivent pas être
réutilisés hors développement. Chaque exécution CI utilise son propre service
PostgreSQL éphémère.

## Arrêt de PostgreSQL

```bash
npm run db:down
```

Le volume Docker est conservé. Pour inspecter la base localement :

```bash
npm run db:studio
```
