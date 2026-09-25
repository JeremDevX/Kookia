# Démonstration locale jetable

`npm run demo:local` démarre une session complète de démonstration sans utiliser
la base Compose ni un espace existant :

- PostgreSQL 16 neuf, publié sur une adresse loopback et stocké sur tmpfs, sans
  volume ;
- migrations fraîches, un compte local de démonstration et le catalogue seedé ;
- récit 2023–2026 construit depuis les 431 transcriptions Markdown suivies dans
  le dépôt ; la base temporaire reçoit ces fiches, tandis que réceptions, stocks,
  recettes candidates, productions et ventes restent étiquetés démonstration ;
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

Le runner lit les transcriptions Markdown locales avec le parseur existant,
sans lire les PDF ou images originaux, puis les charge seulement dans le
PostgreSQL tmpfs. Deux candidates éditables sont reliées à six pièces et à des
lignes de catalogue d'unité directement compatible ; seules les hypothèses de
plat, de quantité et de rendement sont proposées. Chaque date d'origine et date
de démonstration est distinguée. Une transcription n'est pas vérifiée sur son
original, et une réception de scénario n'est pas une livraison constatée. Les
tests/CI gardent des sources entièrement synthétiques ; le runner ne copie pas
les transcriptions ni leurs extraits dans le code, les captures ou les logs.
Cette limite reste suivie dans le [journal du Goal](plans/goal-kookia-progress.md).

Cette commande est un outil de démonstration locale, pas un seed de production.
Elle lit les transcriptions suivies par le dépôt, mais ne modifie ni l'archive
ni une base conservée/Camille ; le compte, les documents importés et opérations
temporaires sont supprimés à l'arrêt. Elle n'envoie rien à un fournisseur.
Ne pas la remplacer par `npm run simulate:restaurant -- --write`, qui est un
script distinct et protégé pour un workspace conservé.
