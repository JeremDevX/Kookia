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
| Configuration du restaurant | `673:43437` |
| Configuration — Équipe | `673:43467` |
| Configuration — Fournisseurs | `673:43514` |
| Configuration — Finalisation | `673:43559` |
| Tableau de bord — Vue d'ensemble | `673:43621` |
| Tableau de bord — Planning du jour | `673:43793` |
| Commandes — Recommandations | `673:43938` |
| Commandes — Panier | `673:44035` |
| Commandes — Commande confirmée | `673:44115` |
| Réceptions — Semaine | `673:44142` |
| Réceptions — Mois | `673:44242` |
| Stocks — Liste des produits | `673:44425` |
| Stocks — Inventaire mensuel | `673:44584` |
| Import — Validation des données extraites | `673:44664` |
| Import — Analyse en cours | `673:44732` |
| Commandes — Prévision et recommandations | `673:44765` |
| Commandes — Contrôle de réception | `673:44919` |
| Mes recettes — Toutes les recettes | `673:45740` |
| Fiches techniques — Liste | `673:45044` |
| Fiches techniques — Choix de création | `673:45095` |
| Fiches techniques — Saisie manuelle | `673:45172` |
| Fiches techniques — Import CSV | `673:45326` |
| Fiches techniques — Association CSV | `673:45368` |
| Fiches techniques — Validation CSV | `673:45427` |
| Fiches techniques — Brouillon enregistré | `673:45582` |
| Analytics — Vue d'ensemble | `673:46262` |
| Analytics — Prévisions | `673:46361` |
| Paramètres | `673:46642` |
| Notifications et alertes | `673:46700` |
| Paramètres — Compte | `673:46754` |
| Paramètres — Équipe | `673:46843` |
| Tableau de bord — Notifications ouvertes | `673:46996` |
| Overlay — Notifications | `673:47169` |

Le nœud `673:43938`, sélectionné dans Arc le 2 novembre 2026, est intitulé
« Commandes — Recommandations » : largeur fixe 1440 px, hauteur 1024 px,
fond `bg/app` `#F7F9FB`. Il montre un tableau de recommandations, des filtres,
des quantités modifiables et un accès au panier. Ces propriétés constituent
une référence, pas une comparaison avec le rendu de l'application.
Le nœud `673:44425` « Stocks — Liste des produits » mesure 1440 × 1374 px
et utilise le même fond `bg/app` `#F7F9FB`.
Le nœud `673:45326` « Fiches techniques — Import CSV » mesure 1440 × 1024 px.
Il présente trois étapes : dépôt, association des colonnes, puis vérification
et enregistrement. Les colonnes affichées sont article, fournisseur, unité,
prix unitaire HT et quantité. L'association, la validation et le brouillon
mesurent respectivement 1440 × 1326, 1440 × 2125 et 1440 × 2010 px. L'audit
du code n'a pas trouvé de parcours d'import CSV de fiches : l'import existant
concerne les ventes et son contrat diffère. Le modèle de recette référence des
produits et quantités ; fournisseur et prix proviennent du catalogue. Définir
une correspondance fiable et une revue avant d'enregistrer des données.

L'arborescence de la section desktop affiche les groupes suivants. Les nombres
sont les libellés Figma, non un décompte indépendant des variantes :

| Groupe A | Écrans annoncés | Contenu repéré |
| --- | ---: | --- |
| Connexion et onboarding | 5 | Connexion et quatre étapes de configuration du restaurant |
| Tableau de bord | 2 | Vue d'ensemble et planning du jour |
| Commandes et réceptions | 5 | Recommandations, panier, confirmation, calendriers semaine et mois |
| Stocks et import des ventes | 4 | Liste, inventaire mensuel, analyse et validation de l'import |
| Achats et contrôle des réceptions | 2 | Prévision et recommandations, contrôle de réception |
| Fiches techniques | 7 | Liste, choix, saisie manuelle, import, association et validation CSV, brouillon |
| Recettes et anti-gaspillage | 6 | Deux listes et quatre fiches de recette |
| Analytics et AGEC | 4 | Vue d'ensemble, prévisions, historique des prédictions, rapport AGEC |
| Paramètres et notifications | 4 | Paramètres, compte, équipe et notifications ; un overlay et un tableau de bord avec notifications apparaissent aussi dans l'arborescence |

Les identifiants, états, dimensions et correspondances des éléments non listés
dans le tableau des nœuds ci-dessus restent à relever. Les fonctions figurant
sur une maquette ne prouvent pas leur disponibilité technique.

Sur la frame Stocks, la zone Ticket Z affirme que les ventes mettent les stocks à
jour automatiquement et propose une lecture OCR. Le parcours actuel demande
une transcription puis une revue humaine (`SalesTicketImport.tsx` et
`ticketZService.ts`) ; aucun OCR n'est connecté. La maquette ne suffit pas à
justifier l'invention d'un fournisseur OCR ou d'une déduction automatique de
stock. Conserver une formulation et un parcours conformes aux capacités réelles
et aux invariants, puis documenter l'écart dans la recette de cette vue.

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

### Composants transversaux utilisés

Inventaire des composants `common` et `layout`, établi par recherche d'imports
de production. Leurs correspondances Figma et états rendus restent à vérifier.

| Composant | Responsabilité et états repérés | Tests directs repérés dans `src` |
| --- | --- | --- |
| `Button` | Variantes, tailles, icône et états natifs | Aucun |
| `Input` | Libellé, icône et erreur | Aucun |
| `Card`, `Badge` | Conteneur et statut | Aucun |
| `Modal` | Ouverture, quatre largeurs, focus, Échap et défilement | Aucun |
| `SplashScreen` | Chargement et disparition après durée minimale | Aucun |
| `Layout`, `Sidebar`, `TopNav` | Structure, navigation, recherche et menu mobile | Aucun |
| `SidebarSubnav` | Sous-navigation et état actif | `SidebarSubnav.test.ts` |
| `RouteErrorBoundary` | Affichage d'erreur et rechargement | Aucun |
| `WeatherNavButton`, `WeatherSettingsModal`, `WeatherSettingsContent` | Météo et réglages | `WeatherNavButton.test.ts` couvre aussi le contenu |

Ces recherches n'excluent pas une couverture indirecte par d'autres tests.
`Toast.css` est utilisé par `ToastContext`.

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
| Tableau de bord | Indicateurs, action prioritaire, mise en route, prévision d'achat et idées de menu ; chargement, erreurs et données absentes | `src/pages/Dashboard.tsx`, `src/components/dashboard/` |
| Paramètres | Restaurant et horaires, compte, fournisseurs, connexions ; météo partagée dans une modale | `src/pages/Settings.tsx`, `src/components/settings/`, `src/features/account/` |

Les écrans de notifications existent dans A. Aucun client ni panneau de
notifications n'a été repéré dans `src/` ; le serveur expose une lecture et un
marquage comme lu, alimentés initialement par des alertes statiques. Vérifier
leur provenance et leur actualité avant de les présenter comme des alertes
opérationnelles. Les messages temporaires `ToastContext` ont un autre rôle.
La frame A `673:46700` prévoit des filtres Stocks, Recommandations et Livraisons
et une action « Tout marquer comme lu ». Le contrat actuel classe les alertes
en `warning`, `alert` et `info`, sans catégorie métier équivalente ; le marquage
accepte une liste d'identifiants. Un alignement nécessite donc d'établir des
sources et catégories fiables, sans transformer les alertes seedées en faits.

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
- `SalesMetrics` est utilisé dans Ventes et dans Bilan : même composant et
  service, donc pas de règle dupliquée. Examiner si ces accès répondent à des
  besoins distincts avant de modifier la navigation. Les totaux du bilan et
  des métriques ne sont pas systématiquement interchangeables : ils distinguent
  différemment les données simulées et leur provenance.
- La prévision de ventes par article et la prévision d'un service utilisent
  des contextes et hypothèses distincts. La fiche de service conserve un
  instantané de la prévision validée. Les sorties estimées à partir des
  réceptions ne sont pas des ventes ; ne pas les fusionner par ressemblance.
- Après accès à une route protégée, la redirection après authentification a été
  corrigée localement pour préserver chemin, paramètres et fragment, y compris
  lors du passage entre connexion et inscription. Tests ciblés et TypeScript
  réussis ; en navigateur avec une API factice isolée, le passage connexion →
  inscription → connexion puis la connexion conservent l'URL complète. Une
  inscription soumise à la même API factice conserve aussi l'URL complète ;
  une session réelle reste à tester. Une correction locale distingue désormais
  session absente et erreur de vérification, avec réessai. Avec une API factice,
  le navigateur affiche l'erreur sur une route protégée puis ouvre la connexion
  après réessai et réponse 401. Tests ciblés réussis ; session réelle à vérifier.
- `Layout.tsx` cherche les ancres au changement d'URL alors que les pages sont
  chargées à la demande. Vérifier au chargement à froid si une cible absente au
  premier rendu empêche le défilement ; ce risque n'est pas encore confirmé.
- L'inscription ne propose pas les étapes de configuration représentées dans
  A : le premier accès crée un espace initial prérempli, puis les réglages du
  restaurant et des fournisseurs se font dans Paramètres. Le modèle actuel lie
  un restaurant à son propriétaire ; aucun modèle de membres ou d'invitations
  n'a été trouvé. Un écran d'équipe ne doit pas suggérer un accès partagé qui
  n'existe pas. Examiner les effets sur les espaces existants avant toute
  évolution du démarrage ou des permissions.
- Risque P0 à vérifier sur un compte isolé : `ensureWorkspace.ts` crée pour
  tout nouveau propriétaire un restaurant nommé « La Pizzeria de Camille » et
  un catalogue prérempli. Le mode par défaut du restaurant est opérationnel ;
  les modèles de produit et fournisseur n'indiquent pas la provenance de cet
  amorçage. Il faut éviter de présenter ces données comme celles du restaurant
  réel. Toute correction doit préserver les espaces déjà créés et distinguer
  explicitement données d'exemple et données confirmées. Les stocks initiaux
  sont injectés sans mouvement initial ; les tests les distinguent d'un
  comptage et d'une réception démontrés.

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
