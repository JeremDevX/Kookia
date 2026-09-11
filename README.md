# Kookia

Application React/TypeScript de suivi des achats, stocks, recettes et recommandations
pour la restauration, avec API Express et PostgreSQL/Prisma.

## Démarrage local

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Ouvrir `http://localhost:5173/register`. Vite proxifie `/api` vers Express sur
le port 3001. Le seed reprend les comptes existants ; un nouveau compte reçoit
son espace au premier accès métier. La reprise est idempotente et ne remplace pas
les données déjà modifiées. Ne pas utiliser `prisma migrate reset` sur une base
contenant des données à conserver.

## Fonctionnement actuel

Les données métier sont persistées dans un espace isolé par compte : restaurant,
fournisseurs, produits, mouvements, recettes, productions/refus, prévisions,
commandes, décisions, panier, notifications, factures, menus et analytics.
Les données initiales de démonstration restent **des exemples**, même en base.

- Stocks : créations, ajustements et pertes historisés.
- Productions : déduction atomique des ingrédients d’une recette liée ; une
  déclaration libre conserve l’historique sans inventer d’ingrédients.
- Commandes : quantités revues, validation tracée, statut « à transmettre ».
- Factures : saisie manuelle et réception atomique, sans double crédit de stock.
- Menus : modification, validation et impression séparées.
- Rapports : CSV, XML Excel et PDF via impression ; opérations filtrées par dates
  UTC. Les anciens graphiques sans dates sont un instantané de démonstration.

Aucun POS, OCR, service météo, moteur IA ou envoi fournisseur externe n’est
connecté. Les exports ne constituent pas une attestation de conformité.

## Architecture

```text
React → pages/components → hooks/features → services HTTP → API Express
                                                        → PostgreSQL/Prisma
```

Les règles frontend pures résident dans `src/domain`. Les mutations critiques,
la validation des entrées et l’isolation sont appliquées côté serveur. Les données
de seed sont sous `server/src/infrastructure/database/seed` ; aucun mock métier
n’est utilisé comme fallback du frontend. Les sessions utilisent des cookies
HttpOnly et des jetons opaques ; mots de passe Argon2id, jetons hashés en base.

## Vérifications

```bash
npm run lint
npm run build
npm run build:api
npm test
npm run test:integration
```

Les tests d’intégration nécessitent PostgreSQL local et créent des comptes dédiés.
Les tests métier nettoient uniquement leurs comptes temporaires. Le test historique
d’auth utilise des emails de test fixes : réserver la base locale aux essais.

## Documentation

- [Cartographie et suivi de migration](docs/plans/database-migration.md)
- [Référence technique actuelle et cible](docs/technical-development.md)
- [Setup authentification](docs/setup-auth.md)
- [Guidance du dépôt](AGENTS.md)
- [Développement agentique](docs/agentic-development.md)
