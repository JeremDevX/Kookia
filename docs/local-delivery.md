# Préparation locale de livraison (R0)

## Statut

La recette locale automatisée est vérifiée avec des données synthétiques.
**Aucun environnement de préproduction ou de production n'est défini ou activé.**
Les réglages locaux, le dump témoin et le health check ne constituent pas une
preuve de disponibilité, de sauvegarde ou de restauration pour des données
restaurant réelles.

## Topologie observée

```text
Navigateur → Vite :5173 -- /api proxy (développement seulement) → Express :3001 → PostgreSQL :5432
                              vercel.json : routes SPA seulement
```

- Le client appelle les chemins relatifs `/api` avec `credentials: "include"`.
  En développement, `vite.config.ts` les proxifie vers `http://localhost:3001`.
- Express écoute `PORT` (3001 par défaut), expose `/api/*` et utilise Prisma via
  `DATABASE_URL`. `compose.yaml` fournit PostgreSQL 16 local sur `127.0.0.1:5432`
  avec un volume nommé persistant. `npm run db:down` arrête Compose sans supprimer
  ce volume.
- `vercel.json` réécrit les routes vers `index.html` pour le frontend SPA ; il
  ne fournit ni fonction API ni proxy PostgreSQL. Le frontend ne peut donc pas
  être considéré connecté à l'API par cette seule configuration.
- L'API n'active pas `trust proxy` et aucun CORS de production n'est configuré.
  Les requêtes mutatrices avec un en-tête `Origin` n'acceptent actuellement que
  `http://localhost:5173` et `http://127.0.0.1:5173`. Un déploiement à autre
  origine nécessitera un routage/authentification/CSRF adapté, sans élargir cette
  liste à l'aveugle.

## Sessions et secrets

- Le cookie `kookia_session` est `HttpOnly`, `SameSite=Strict`, `Path=/`, avec
  expiration serveur ; il devient `Secure` quand `NODE_ENV=production`.
- Le navigateur transmet les identifiants par cookie, jamais par stockage
  accessible au JavaScript. Le jeton est aléatoire, opaque et stocké sous forme
  SHA-256 en base ; les mots de passe sont hachés via Argon2id. Il n'existe pas
  de secret de signature JWT à configurer.
- Les variables actives sont `DATABASE_URL`, `PORT`, `SESSION_TTL_DAYS` et
  `NODE_ENV`. `.env.example` contient des valeurs de développement ; `.env` est
  ignoré par Git. Aucun gestionnaire de secrets ni secret de production n'est
  configuré dans le dépôt.
- La protection d'origine reste locale, et la configuration cookies/cross-origin
  n'a pas été qualifiée derrière un proxy TLS. Ces points bloquent toute
  activation externe tant que le domaine et l'hébergeur ne sont pas choisis.

## Migrations et sauvegarde/restauration

- `npm run db:migrate` exécute `prisma migrate deploy`. La recette R0 applique
  toutes les migrations sur une base fraîche avant les tests. La CI suit aussi
  cette séquence sur son service PostgreSQL propre au job.
- `npm run test:integration` exige une base `kookia_test` sur loopback ; cette
  garde de nom/hôte évite de viser par erreur la base de développement, mais ne
  rend pas elle-même les données jetables. Pour une recette sûre et répétable,
  utiliser `npm run verify:local-delivery`.
- Cette commande démarre un conteneur PostgreSQL 16 au nom aléatoire, publie un
  port éphémère uniquement sur `127.0.0.1`, monte les données PostgreSQL sur un
  tmpfs de 2 Gio et le répertoire temporaire sur un tmpfs de 512 Mio, sans volume
  Docker. Elle utilise un mot de passe généré pour cette exécution, applique les
  migrations, lance `lint`, les builds web/API, les tests unitaires et toute
  l'intégration, puis supprime le conteneur même en cas d'échec ou d'interruption.
- La fin de recette crée un témoin synthétique, produit un dump PostgreSQL au
  format custom dans le tmpfs, le restaure dans une seconde base temporaire et
  vérifie le témoin et l'état des migrations. Aucun dump n'est exporté ni gardé
  sur le poste ; toutes les données de la recette sont supprimées avec le
  conteneur.
- Il n'existe pas de stratégie d'exploitation pour des données persistantes :
  fournisseur de sauvegarde, chiffrement, accès, fréquence/rétention, RPO/RTO,
  supervision et exercice de restauration restent à définir avant R1. La preuve
  locale ne remplace pas un backup/restore d'environnement autorisé.

## Santé et observabilité

`GET /api/health` répond `{ "status": "ok" }` et son contrat est testé. C'est
un **liveness check seulement** : il ne vérifie pas PostgreSQL, les migrations,
ni la capacité d'une requête métier. Le démarrage écrit une ligne console ; les
erreurs non gérées sont réduites à un message générique. Il n'y a pas de journal
structuré avec corrélation, métriques, traces, alertes ou dashboard d'exploitation
configurés. Ne pas utiliser ce endpoint seul comme readiness ou SLO.

## Vérification locale

Prérequis : Node.js et Docker Desktop démarré (Docker peut tirer l'image
`postgres:16-alpine` si elle n'est pas en cache). Depuis la racine du dépôt :

```bash
npm run verify:local-delivery
```

La recette n'appelle aucun connecteur externe de données métier, n'utilise ni
compte de restaurant ni volume Compose existant et ne fait aucun déploiement.
`vercel.json` reste un hébergement frontend SPA uniquement. La publication,
l'API distante et l'accès à un espace pilote sont hors de R0 ; voir [le plan
d'exécution](plans/plan-execution.md).
