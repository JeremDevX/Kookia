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

Pour parcourir le récit 2023–2026 sans utiliser une base conservée, lancer
`npm run demo:local` : la commande crée une base PostgreSQL temporaire sur tmpfs,
un compte et un scénario d’opérations simulées à partir des 431 transcriptions
locales du dépôt, puis démarre l’application sur loopback. Les identifiants sont
écrits dans un fichier privé temporaire ; Ctrl-C arrête les serveurs et supprime
la base et le fichier. Voir
[la démo locale jetable](docs/local-demo.md) pour les limites et prérequis.

## Fonctionnement actuel

Un [atelier documentaire indépendant](docs/document-workshop.md) permet de
préparer les pièces Maison Sureau (achats, livraisons, Tickets Z, ventes CSV,
recettes, productions, pertes et inventaires) à reprendre dans Kookia :
`npm run documents:dev`, puis <http://127.0.0.1:5180>. Aucune base nécessaire.

Les données métier sont persistées dans un espace isolé par compte : restaurant,
fournisseurs, produits, mouvements, recettes, productions/refus, prévisions,
ventes, commandes, décisions, panier, notifications, factures, menus et analytics.
Les données initiales de démonstration restent **des exemples**, même en base.

- Stocks : créations, ajustements et pertes historisés.
- Productions : déduction atomique des ingrédients d’une recette liée ; une
  déclaration libre conserve l’historique sans inventer d’ingrédients.
- Commandes : quantités revues, validation tracée, statut « à transmettre ».
- Factures : saisie manuelle et réception atomique, sans double crédit de stock.
- Menus : modification, validation et impression séparées.
- Ventes : articles vendus distincts des ingrédients, saisie/correction manuelle,
  import CSV contrôlé et indicateurs par période. Une baseline expérimentale
  sur ventes enregistrées est séparée des prévisions de démonstration.
- Rapports : CSV, XML Excel et PDF via impression ; opérations filtrées par dates
  UTC. Les graphiques sans dates sont des instantanés de démonstration.

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
npm run verify:local-delivery
```

La recette `verify:local-delivery` utilise un PostgreSQL temporaire sur tmpfs,
des données synthétiques, puis vérifie un dump/restore avant suppression du
conteneur. Pour le détail réseau, migrations, sessions, sauvegardes et limites
de livraison, voir [la préparation locale](docs/local-delivery.md).

## Documentation

- [Index de la documentation](docs/README.md) et [guide restaurateur](docs/guide-restaurateur.md)
- [Parcours produit cible](docs/product-parcours.md) et [règles d'interface](docs/design-system.md)
- [Écarts vérifiés](docs/ecarts-techniques.md), [roadmap](docs/plans/roadmap-produit.md) et [plan d'exécution](docs/plans/plan-execution.md)
- [Prompt de développement long `/goal`](docs/plans/goal-kookia-prompt.md) et [référentiel de la chaîne restaurateur](docs/plans/goal-kookia-reference.md)
- [Sources de données](docs/integrations.md) et [plan du moteur de prévision](docs/plans/forecast-engine.md)
- [Cartographie et suivi de migration](docs/plans/database-migration.md)
- [Référence technique actuelle et cible](docs/technical-development.md)
- [Préparation locale de livraison](docs/local-delivery.md)
- [Format CSV des ventes](docs/sales-csv.md)
- [Ventes, indicateurs, baseline et recette manuelle](docs/sales.md)
- [Setup authentification](docs/setup-auth.md)
- [Guidance du dépôt](AGENTS.md)
- [Développement agentique](docs/agentic-development.md)
