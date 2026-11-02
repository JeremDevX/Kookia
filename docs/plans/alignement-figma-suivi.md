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
1440 × 1507 px. L'inspection précise des styles demande une connexion : les
valeurs fines et les correspondances de nœuds restent à vérifier. Les nœuds
suivants ont été identifiés dans l'arborescence ; ils ne constituent pas encore
une validation de correspondance avec le rendu applicatif.

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

## Recette et dépendances

- Le 2 novembre 2026, `npm run lint`, `npm run build` et `npm test` ont réussi
  sur l'arbre local contenant des modifications préexistantes. La première
  exécution simultanée des contrôles a dépassé le délai d'un test de l'atelier
  documentaire ; la suite complète relancée seule a réussi (358 tests Vitest
  et 35 tests de scripts).
- Le navigateur local a affiché les pages de connexion et d'inscription et le
  lien de l'une vers l'autre. L'authentification, les parcours privés, le clavier,
  le responsive et le lecteur d'écran ne sont pas encore validés.
- Les tests d'intégration PostgreSQL et la démo isolée exigent Docker ; le
  daemon était indisponible lors du premier audit.
- Après autorisation explicite, A a été consultée en lecture seule et B a été
  inventoriée via MCP. Aucune comparaison visuelle ni création Figma n'a encore
  été validée. A ne doit jamais être modifiée ni consultée via MCP Figma.
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
