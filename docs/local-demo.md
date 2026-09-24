# Démonstration locale jetable

`npm run demo:local` démarre une session complète de démonstration sans utiliser
la base Compose ni un espace existant :

- PostgreSQL 16 neuf, publié sur une adresse loopback et stocké sur tmpfs, sans
  volume ;
- migrations fraîches, un compte local de démonstration et le catalogue seedé ;
- récit synthétique 2023–2026, pièces d'archive de fixture, stocks, recettes,
  productions et ventes portant la provenance de démonstration ;
- API et Vite accessibles seulement sur `127.0.0.1`.

Prérequis : Docker avec l'image `postgres:16-alpine` disponible et dépendances
Node installées. La commande choisit deux ports loopback libres pour l'API et le
web. Lancer depuis le dépôt, ouvrir l'URL `/login` affichée, puis utiliser
`demo@kookia.local` et le
mot de passe du fichier privé dont le chemin est affiché par la commande. Le
fichier est créé sous le répertoire temporaire de l'OS avec permissions `0600`
(répertoire `0700`) ; son contenu n'est pas affiché dans les logs.

Ctrl-C arrête les deux serveurs, supprime le conteneur sans volume et efface le
fichier temporaire d'identifiants. Si l'arrêt ou Docker échoue, la commande
signale le nom du conteneur pour permettre de vérifier son nettoyage. Aucun
`DATABASE_URL` du shell ou de `.env` n'est utilisé pour les migrations, le seed
ou l'API : la session génère son URL vers la base `kookia_demo` du conteneur.
Les ports choisis sont publiés seulement sur loopback. L'origine mutatrice
autorisée par l'API est limitée à celle de Vite pour cette session.

Le récit s'appuie exclusivement sur `createAnonymizedSourceInvoices`, une
fixture synthétique adaptée au parcours chronologique et aux reçus simulés.
Elle ne contient que des lignes de tomates ; elle n'étaye pas deux recettes
candidates dérivées des pièces. Les six recettes du scénario sont des
hypothèses de démonstration, et aucune recette n'est présentée comme un plat
réellement cuisiné. Cette limite reste suivie dans le
[journal du Goal](plans/goal-kookia-progress.md).

Cette commande est un outil de démonstration locale, pas un seed de production.
Elle ne lit aucune pièce privée, ne vise pas Camille, n'envoie rien à un
fournisseur et ne conserve ni compte ni opération après la fin de la session.
Ne pas la remplacer par `npm run simulate:restaurant -- --write`, qui est un
script distinct et protégé pour un workspace conservé.
