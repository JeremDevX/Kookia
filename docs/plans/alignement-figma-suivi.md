# Alignement Figma : suivi initial

État au 2 novembre 2026. Cet inventaire est provisoire : les parcours protégés
et la plupart des états n'ont pas encore été comparés ou testés. La présence
d'une page dans le code ne prouve pas sa conformité.

## Routes

Le routeur est défini dans `src/app/router/AppRouter.tsx`. Les correspondances
entre les routes et les frames restent à vérifier. Pour chaque ligne, la fidélité
et le fonctionnement complet restent à vérifier ; aucune ligne n'est validée.

| Écran | Route | Implémentation | Couverture constatée | Priorité | Validation |
| --- | --- | --- | --- | --- | --- |
| Connexion | `/login` | `src/features/auth/pages/Login.tsx` | Page présente | P0 | Rendu local observé ; parcours à tester |
| Inscription | `/register` | `src/features/auth/pages/Register.tsx` | Page présente | P0 | Rendu local observé ; parcours à tester |
| Aujourd'hui | `/` | `src/pages/Dashboard.tsx` | Page présente ; démarrage et panneaux conditionnels | P0 | À faire |
| Stocks | `/stocks` | `src/pages/Stocks.tsx` | Liste, ruptures, revue et comptage dans le code | P0 | À faire |
| Prévisions | `/predictions` | `src/pages/Predictions.tsx` | Page présente | P1 | À faire |
| Recettes | `/recipes` | `src/pages/Recipes.tsx` | Catalogue, anti-gaspillage, fiches et historique dans le code | P1 | À faire |
| Commandes et réceptions | `/orders` | `src/pages/Orders.tsx` | Préparation, commandes, factures et réceptions dans le code | P0 | À faire |
| Paramètres | `/settings` | `src/pages/Settings.tsx` | Restaurant, compte, fournisseurs et connexions dans le code | P1 | À faire |
| Bilan | `/analytics` | `src/pages/Analytics.tsx` | Bilan, ventes et estimations dans le code | P1 | À faire |
| Ventes | `/sales` | `src/pages/Sales.tsx` | Import, saisie, calendrier et rapprochement dans le code | P0 | À faire |
| Services | `/services` | `src/pages/Services.tsx` | Carte, prévision, fiche et incidents dans le code | P1 | À faire |
| Plus | `/more` | `src/pages/More.tsx` | Page présente | P2 | À faire |
| Historique | `/history` | `src/pages/Timeline.tsx` | Page présente | P1 | À faire |
| Ancien lien historique | `/history/replay/:id` | `src/app/router/AppRouter.tsx` | Redirection vers `/history`, query conservée | P2 | À faire |
| Route inconnue | `*` | `src/app/router/AppRouter.tsx` | Redirection vers `/` dans le code | P2 | À faire |

Les routes privées passent par `RequireAuth` ; les pages publiques par
`PublicOnly`. Les sous-vues et états de chaque page restent à inventorier et
valider individuellement. La matrice des composants utilisés reste à compléter.

## Références Figma

La source A a été consultée en lecture seule dans le navigateur, sans MCP. La
page « Interface » présente les ensembles « KOOK.IA v2 — Écrans desktop » et
« KOOK.IA v2 — Composants ». Les écrans visibles couvrent notamment connexion,
tableau de bord, commandes, réceptions, stocks, recettes, fiches techniques,
analytics et paramètres. La vue d'ensemble du tableau de bord indique
1440 × 1507 px. Une session connectée dans Arc permet désormais de consulter
les propriétés visibles sans utiliser le MCP pour A. Les valeurs fines et les
correspondances de nœuds restent à vérifier. Les nœuds
suivants ont été identifiés dans l'arborescence ; ils ne constituent pas encore
une validation de correspondance avec le rendu applicatif.

Une nouvelle consultation anonyme confirme aussi des groupes consacrés aux
notifications, au rapport AGEC, aux fiches techniques et à l'import CSV. Les
libellés de groupes ne constituent pas un inventaire exhaustif des écrans.

| Maquette A | Nœud |
| --- | --- |
| Ensemble des écrans desktop | `673:43388` |
| Connexion et inscription (1440 × 1024) | `673:43390` |
| Tableau de bord — Vue d'ensemble | `673:43621` |
| Commandes — Recommandations | `673:43938` |
| Réceptions — Semaine | `673:44142` |
| Stocks — Liste des produits | `673:44425` |
| Mes recettes — Toutes les recettes | `673:45740` |
| Analytics — Vue d'ensemble | `673:46262` |
| Analytics — Prévisions | `673:46361` |

Le nœud `673:43938`, sélectionné dans Arc le 2 novembre 2026, est intitulé
« Commandes — Recommandations » : largeur fixe 1440 px, hauteur 1024 px,
fond `bg/app` `#F7F9FB`. Il montre un tableau de recommandations, des filtres,
des quantités modifiables et un accès au panier. Ces propriétés constituent
une référence, pas une comparaison avec le rendu de l'application.
Le nœud `673:44425` « Stocks — Liste des produits » mesure 1440 × 1374 px
et utilise le même fond `bg/app` `#F7F9FB`.

La source B (`zEnZ9HLwjcw2D5PUw9Phk0`), consultée via MCP sans modification,
contient une page « Dev Jerem Manquant » (`0:1`) et les écrans suivants :

| Écran | Nœud | Dimensions |
| --- | --- | --- |
| Ventes | `8:2` | 1440 × 2500 |
| Services et carte | `16:2` | 1440 × 2000 |
| Historique vide | `18:2` | 1440 × 1250 |
| Historique avec événements | `21:2` | 1440 × 1450 |
| Plus | `22:2` | 1440 × 1250 |
| Fournisseurs | `25:2` | 1440 × 1100 |
| Nouveau fournisseur | `25:77` | 1440 × 1450 |
| Connexions | `26:2` | 1440 × 1450 |
| Tableau de bord première utilisation | `29:2` | 1440 × 1500 |
| Revue Ticket Z fictif | `35:143` | 1440 × 1600 |
| Réception partielle fictive | `36:2` | 1440 × 1500 |

Ces écrans emploient des frames et textes locaux ; aucun composant, instance,
style local ou collection de variables n'a été relevé dans B. Les liens de
prototype et la fidélité à A restent à vérifier. Aucun écran n'a été créé pendant
cet audit.

Sur l'écran Ventes (`8:2`), l'inspection relève notamment une navigation de
240 px, une barre supérieure de 61 px, un fond `#F7F9FB`, du texte principal
`#111111`, la police Poppins et des cartes blanches de rayon 8 px. Ces valeurs
proviennent de B et ne remplacent pas une vérification de la référence A ni une
comparaison avec l'application.

## Socle existant et premiers constats

- Tokens actifs : `src/styles/index.css` ; contrôle des valeurs CSS par
  `npm run check:css`. Les styles des pages sont principalement des fichiers CSS
  locaux, pas des CSS Modules.
- Primitives présentes : `src/components/common/Button.tsx`, `Input.tsx`,
  `Card.tsx`, `Badge.tsx` et `Modal.tsx`. Leur couverture, leurs variantes et
  leurs usages doivent être confrontés aux références.
- Navigation et structure : `src/components/layout/Layout.tsx`, `Sidebar.tsx`
  et `TopNav.tsx`. Le code ne déplace pas explicitement le focus vers le contenu
  après changement de route ; vérifier au clavier et avec lecteur d'écran avant
  de qualifier l'incident et sa correction.
- `Input` remplace la valeur `aria-describedby` fournie par l'appelant. Aucun
  usage affecté n'a été confirmé lors du premier audit ; vérifier les appels et
  les besoins avant correction.

## Sous-vues et parcours identifiés dans le code

Inventaire statique, sans validation du rendu ni des interactions. Les états
conditionnels et composants indiqués restent à confronter aux maquettes.

| Écran | Sous-vues, actions et états | Implémentation principale |
| --- | --- | --- |
| Commandes | Préparer, suivi, pièces fournisseurs et calendrier des réceptions ; suggestions, sélection, quantités et validation ; recherche, filtres, date prévue et rapprochement | `src/pages/Orders.tsx`, `src/components/orders/` |
| Stocks | Tous, ruptures et à traiter ; recherche, filtres, ajout, détail, sélection pour commande et comptage ; ajustement et déclaration de perte | `src/pages/Stocks.tsx`, `src/components/stocks/` |
| Recettes | Catalogue, recettes réalisables, fiches techniques et productions ; recherche et tri ; édition, versions, production, refus et propositions issues de pièces | `src/pages/Recipes.tsx`, `src/components/recipes/` |
| Ventes | Services, saisie et correction ; import CSV, transcription Ticket Z, rapprochement, association article-recette et calendrier | `src/pages/Sales.tsx`, `src/components/sales/` |
| Services | Sélection du service, carte, prévisions, fiche et incidents ; plan, substitutions, validation et clôture | `src/pages/Services.tsx`, `src/components/services/` |
| Prévisions | Sorties estimées et prévisions de ventes ; filtres, détails, pagination, hypothèses et états sans données | `src/pages/Predictions.tsx`, `src/components/analytics/EstimatedOutflows.tsx`, `src/components/sales/SalesBaseline.tsx` |
| Bilan | Vue d'ensemble, ventes, sorties estimées et prévisions ; périodes, détails et export | `src/pages/Analytics.tsx`, `src/components/analytics/` |

### Cohérence fonctionnelle à examiner

- Le calendrier des réceptions et le suivi des commandes présentent des vues
  différentes des mêmes commandes ; le calendrier renvoie au suivi pour agir.
  Cette réutilisation contextualisée ne démontre pas un doublon à supprimer.
- La réception directe d'une facture et le rapprochement d'une commande avec
  facture peuvent tous deux alimenter le stock. Le rapprochement enregistre en
  plus les lignes de réception et l'état de commande. Le serveur vérifie les
  réceptions existantes et les quantités ; vérifier les parcours et leur
  présentation avant toute consolidation.
- Le détail produit permet un ajustement négatif motivé par une perte ; la
  déclaration de perte structurée recueille davantage de contexte et utilise
  un autre service. Les effets et besoins diffèrent : comparer les parcours
  avant de décider s'ils doivent converger.
- Certaines modales appellent `onClose` par Échap, la croix ou le fond même
  lorsque leur bouton de fermeture est désactivé pendant une opération. Le
  risque est identifié notamment pour les factures et les exports ; vérifier
  les appels et le comportement rendu avant correction. Les modales de
  production protègent déjà leur fermeture pendant l'enregistrement.

## Recette et dépendances

- Sur l'arbre local incluant les modifications préexistantes, la recette
  `npm run verify:local-delivery` a réussi le 2 novembre 2026 avec une base
  PostgreSQL temporaire : lint, builds web et API, 20 migrations, parité du
  schéma, 35 tests de scripts, 358 tests Vitest et 61 tests d'intégration.
  La sauvegarde et la restauration d'une donnée synthétique ont aussi réussi.
- Nouvelle exécution de `npm test` le 2 novembre 2026 : 35 tests de scripts
  réussis et 357 tests Vitest réussis sur 358. Un test de l'atelier documentaire
  a dépassé son délai de 5 secondes sous charge ; relancé seul, le fichier a
  réussi ses 6 tests. La suite complète n'est donc pas validée par cette exécution.
- La CI `.github/workflows/ci.yml` est déclenchée uniquement manuellement :
  aucun contrôle automatique sur push ou pull request n'est configuré dans ce
  fichier. Elle comprend notamment une base PostgreSQL isolée et les tests
  d'intégration. Son exécution sur le commit livré reste à vérifier.
- Vitest utilise un environnement Node ; les tests de composants par rendu HTML
  statique ne valident pas les interactions réelles, le focus ou le clavier.
- Le 2 novembre 2026, `npm run lint`, `npm run build` et `npm test` ont réussi
  sur l'arbre local contenant des modifications préexistantes. La première
  exécution simultanée des contrôles a dépassé le délai d'un test de l'atelier
  documentaire ; la suite complète relancée seule a réussi (358 tests Vitest
  et 35 tests de scripts).
- Le navigateur local a affiché les pages de connexion et d'inscription et le
  lien de l'une vers l'autre. L'authentification, les parcours privés, le clavier,
  le responsive et le lecteur d'écran ne sont pas encore validés.
- Les tests d'intégration PostgreSQL et la démo isolée exigent Docker ; le
  daemon était inaccessible sans permissions supplémentaires lors du premier
  audit. La recette ci-dessus a été exécutée avec cet accès.
- Après autorisation explicite de lecture MCP sur A, un essai le 2 novembre
  2026 a échoué : limite d'appels du siège View atteinte. A reste consultable
  dans Arc. B a été inventoriée via MCP. Aucune comparaison visuelle ni création
  Figma n'a encore été validée. A ne doit jamais être modifiée.
- Le dépôt local contient des changements préexistants sur le comptage des
  stocks. Les préserver et ne pas les inclure dans un lot sans vérification de
  leur provenance et de leur état.

## Ordre de travail

1. Compléter l'inventaire des frames et la matrice des composants et états ;
   relever les valeurs de référence accessibles sans modifier A.
2. Vérifier les parcours et l'accessibilité avec des données isolées, puis
   traiter les fondations et composants transverses selon les écarts prouvés.
3. Comparer chaque vue à sa référence, corriger et documenter les écarts ;
   créer dans B seulement les éléments manquants justifiés.
4. Exécuter les recettes, intégrer chaque lot validé et vérifier le résultat
   distant et la CI.
