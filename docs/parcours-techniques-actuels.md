# Parcours techniques existants — lire, reproduire et tester

Ce document décrit **le code actuel**, sans ajouter de capacité. Il sert de
carte de reprise : pour chaque geste du restaurateur, suivre UI → requête →
contrôle serveur → persistance → preuve. Le
[guide restaurateur](guide-restaurateur.md) décrit les mêmes gestes sans
vocabulaire technique ; les [écarts](ecarts-techniques.md) séparent leur état
actuel de la cible.

## Frontière commune à tous les parcours

```text
Page React → service HTTP → /api/workspace/* → session et restaurant serveur
                                      → service métier → transaction Prisma
```

1. Le navigateur garde un cookie de session HttpOnly. La
   [route de session](../server/src/http/app.ts) et le
   [contexte d'authentification](../src/features/auth/components/RequireAuth.tsx)
   protègent les écrans et appels métier.
2. Avant toute route `/api/workspace/*`,
   [`workspaceRoutes`](../server/src/http/workspaceRoutes.ts) retrouve l'utilisateur,
   initialise si nécessaire son restaurant et place `restaurantId`/`actorId`
   dans `res.locals.workspace`. Le client n'envoie pas le tenant à écrire.
3. Les routes valident les entrées avec Zod ou un contrat métier ; les
   services appliquent les invariants et requêtent avec `restaurantId`.
4. Plusieurs mutations portent un `operationId` ou une révision pour le rejeu
   et les conflits. Une erreur de conflit demande de recharger ou de vérifier
   la décision, pas de renvoyer aveuglément un autre identifiant.
5. Le seed initialise les données de démonstration de façon idempotente ; leur
   persistance ne transforme ni prévisions ni prix initiaux en observations.

## 1. Compte, restaurant et fournisseur

**Pour reproduire :** ouvrir l'application, créer un compte ou se connecter,
aller dans **Plus → Restaurant**, puis vérifier le profil et les fournisseurs.
Les [routes d'authentification](../server/src/http/app.ts) couvrent inscription,
connexion, session, déconnexion, profil, changement d'adresse e-mail et de mot de passe,
et suppression du compte. Le
[service de restaurant](../server/src/http/restaurantRoutes.ts) lit/modifie les
coordonnées et lit/édite les fournisseurs pour l'espace courant.

**À vérifier :** une reconnexion conserve le restaurant ; l'autre compte ne
peut ni lire ni modifier ses fournisseurs ; changer l'adresse ne crée pas de
position géographique vérifiée. La suppression du compte est destructive : ne
pas la tester sur Camille ou un compte à conserver. Utiliser un compte éphémère
et une base isolée pour une recette de suppression.

## 2. Ventes manuelles et articles vendus

**Pour reproduire :** dans **Ventes**, ajouter un article vendu distinct d'un
produit en stock, puis saisir article/date de service/quantité. Retrouver la
ligne dans l'historique ; la corriger depuis cet historique.

- La [page Ventes](../src/pages/Sales.tsx) appelle le
  [client HTTP](../src/services/salesService.ts).
- Les [routes ventes](../server/src/http/salesRoutes.ts) contrôlent date,
  quantité, article, `operationId` et révision ; le
  [service ventes](../server/src/application/workspace/salesService.ts)
  persiste `SaleItem` et `DailySale` dans le restaurant.
- Une correction conserve la provenance de l'import et incrémente sa révision.
  Une vente est une observation d'article vendu ; elle ne déduit pas
  automatiquement les ingrédients d'une recette.
- Le panneau **Articles vendus et recettes** propose seulement les noms
  normalisés identiques ; un humain choisit puis valide une correspondance
  datée et un facteur de portions. Le serveur conserve chaque révision et
  l'instantané du nom de recette. La baseline résout correspondance et version
  de recette selon le jour de service ; une version `effectiveFrom = NULL`
  reste inconnue pour les projections historiques. Les quantités matière
  affichées sont expérimentales et ne créent aucun mouvement de stock.

**À vérifier :** quantité positive, date valide, article du bon restaurant,
rejeu identique sans doublon, correction avec révision périmée refusée,
historique et dernier service cohérents. Voir
[ventes et baseline](sales.md) pour les formules des indicateurs.

## 3. Import CSV avec revue

1. Déposer un fichier conforme au [format publié](sales-csv.md) dans
   **Ventes → Importer**. Le client limite la taille, puis envoie le contenu à
   `POST /api/workspace/sales/imports/preview`.
2. [`previewSalesImport`](../server/src/application/workspace/salesImportService.ts)
   analyse le CSV, résout les noms d'articles dans l'espace, repère dates/
   quantités invalides, doublons du fichier et ventes déjà enregistrées.
3. Associer ou créer les articles manquants ; revoir les lignes « prêtes » et
   rejetées. La prévisualisation ne crée aucune vente.
4. Confirmer avec le hash de l'aperçu via
   `POST /api/workspace/sales/imports`. Le serveur recalcule l'aperçu, refuse
   un fichier changé, puis crée lot et lignes prêtes dans une transaction.
5. Rejouer le même fichier : le hash propre au restaurant renvoie « déjà
   importé » sans deuxième vente. Une vente préexistante n'est pas remplacée
   silencieusement.

**À vérifier :** import mixte accepté/rejeté, mauvais mapping, fichier modifié
entre aperçu et confirmation, import répété et isolation de deux restaurants.
Les [tests d'import](../server/src/http/salesImport.integration.test.ts)
documentent ces bords ; ils demandent une base de test, pas celle de Camille.

## 4. Produit, stock et pertes

**Pour reproduire :** dans **Stocks**, créer un produit avec fournisseur,
unité, prix et seuil bas ; lire les mouvements ; ajuster le stock ou déclarer
une perte avec motif. Ajouter un article au panier seulement après vérification.

Le [catalogue métier](../server/src/application/workspace/catalogService.ts)
crée le produit et son mouvement initial dans une transaction. Un ajustement
verrouille le produit, vérifie le non-négatif pour une sortie et enregistre un
`StockMovement` avec acteur et `operationId`. Le
[panier](../server/src/http/cartRoutes.ts) est un document persistant par
restaurant, séparé d'une commande validée. Les badges de seuil sont une
[règle déterministe](../src/domain/inventory/product.policies.ts), non une
prévision issue des ventes.

**À vérifier :** même opération rejouée une fois ; mêmes identifiants avec
valeurs différentes refusés ; sortie supérieure au stock refusée ; autre
restaurant incapable de modifier le produit. Il n'existe pas encore d'édition
de fiche produit ni de seuil haut : le guide demande de ne pas commander sur
un prix ou seuil initial incorrect.

## 5. Recette et production

**Pour reproduire :** dans **Plus → Recettes réalisables**, lire les
ingrédients, choisir des portions, puis valider une production. Lire ensuite
le journal et les mouvements des ingrédients.

Le [service recette](../server/src/application/workspace/recipeService.ts)
charge `RecipeVersion` et son instantané d'ingrédients applicable à la date de
production. Les recettes peuvent être créées ou éditées dans le panneau de
maintenance : rendement du lot, ingrédients liés à des produits du même espace,
date d'effet, auteur et révision sont contrôlés côté serveur. Une nouvelle
version ne modifie pas les instantanés existants. La production multiplie la
quantité de lot par les portions demandées puis la divise par le rendement ; le
serveur redéduit chaque ingrédient et écrit ses mouvements dans **une
transaction**. Un stock insuffisant annule tout. Une déclaration libre de
préparation reste un journal, sans inventer de déduction d'ingrédients ; un
refus est également historisé. Les recettes initiales sont versionnées au seed.
Pour l'historique antérieur à cette migration, la version de base porte une date
d'effet inconnue et les productions ne sont pas liées artificiellement à une
version.

**Contrôles vérifiés sur PostgreSQL isolé :** disponibilité selon portions et
rendement (y compris pièces entières), absence de mouvement partiel, rejeu du
même `operationId`, refus et préparation libre sans crédit/débit fictif,
production antérieure conservée sur sa version et autre restaurant isolé. Le
rendu et le parcours clavier restent à contrôler dans un navigateur accessible.

## 6. Revue et validation de commande

1. Depuis **Stocks**, choisir un produit et l'ajouter au panier. La quantité
   de départ dépend du stock/seuil enregistré, pas de la baseline de ventes.
2. Dans **Achats**, écarter une ligne ou ouvrir **Revoir les quantités** ;
   consulter fournisseur, unité, prix et montant avant le geste final.
3. `POST /api/workspace/orders` appelle
   [`validateOrder`](../server/src/application/workspace/orderService.ts).
   Le serveur recontrôle le panier et chaque produit dans le restaurant, refuse
   une ligne issue d'une prévision de démonstration, fige prix/quantités et
   écrit commande + `RecommendationDecision` dans une transaction.
4. Retrouver la décision et la commande dans **À transmettre**. La validation
   n'envoie aucun email et ne modifie pas le stock. Une transmission et une
   réception sont des étapes séparées.

**À vérifier :** quantité modifiée dans la commande finale, double soumission
identique sans doublon, même `operationId` avec contenu différent refusé,
panier changé entre revue et confirmation refusé, scénario démo bloqué.

## 7. Facture, réception et bilan

**Pour reproduire :** depuis **Aujourd'hui → Saisir une facture**, préparer
référence/date/lignes, enregistrer un brouillon puis confirmer la réception.
Le [service facture](../server/src/application/workspace/invoiceService.ts)
contrôle la révision et les produits du restaurant. La réception crédite chaque
quantité et écrit les mouvements atomiquement ; rejouer la même réception
n'ajoute pas du stock une seconde fois. Une facture manuelle n'est ni un Ticket
Z ni un OCR connecté. L'archive de pièces source est une lecture distincte.

Dans **Plus → Bilan**, choisir une période. Les
[routes de rapport](../server/src/http/reportRoutes.ts) et
[indicateurs de ventes](../server/src/application/workspace/salesMetrics.ts)
assemblent les opérations et ventes enregistrées. Les graphiques de
démonstration repliés ne doivent pas être lus comme résultats du restaurant.
La réconciliation mensuelle se parcourt par pages de 12 mois dans les deux
directions ; cette pagination ne limite pas la période consultable.

**À vérifier :** conflit de révision, facture déjà reçue, stock et mouvements
cohérents, dates/unité/source dans le rapport, période vide, export qui ne
transforme pas une simulation en économie mesurée ou attestation réglementaire.

## Historique consultable sans limite de période

Dans **Plus → Historique**, choisir une période et une date « Connu au ». La
vue en lecture seule rassemble les événements disponibles : pièces d'archive,
mouvements, pertes enregistrées, versions de recettes, productions, ventes,
jours de service, correspondances article-recette et décisions. Les liens
ouvrent les objets actuels ; ils ne rejouent aucune opération historique.

La chronologie n'a pas de borne produit de quatre ans. Chaque requête reste
limitée à 31 jours afin de borner la réponse, mais toute date valide peut être
consultée. Chaque ligne sépare date d'effet, connaissance et enregistrement,
puis porte une origine visible : archive source, enregistrée, simulation,
hypothèse ou inconnue. Les dates de travail des pièces sont utilisées dans
l'interface ; les dates d'origine ne sont pas exposées. Une transcription
d'archive ne prouve pas une livraison. Une journée partielle ou manquante n'est
jamais assimilée à un service complet ni à zéro vente.

Dans le **Bilan → Sorties estimées par recette**, les quantités de sortie sont
calculées à part depuis les réceptions positives enregistrées, non simulées, et
les recettes datées compatibles à la date de livraison. Le calcul retient le
même produit et la même unité, puis expose les portions possibles et l'hypothèse
90/10 (ventes/pertes estimées). Il n'écrit aucune opération. Une entrée sans
recette datée compatible apparaît séparément. Le lien vers **Recettes** ouvre
une proposition datée et préremplie depuis le produit entrant et le catalogue
de l'espace ; relisez et ajustez ses ingrédients, quantités et rendement.
L'enregistrer ajoute une recette versionnée, sans créer de vente, perte,
production ou mouvement ; depuis cette proposition, la ligne de réception
source et sa référence restent consultables dans la décision de recette. Chaque
référence de livraison du Bilan ouvre aussi sa réception exacte dans Achats ;
la commande correspondante s'ouvre et le focus est placé sur l'en-tête de cette
réception. Le lien de retour au Bilan conserve la période consultée et remet le
focus sur les estimations. Une réception retirée de l'historique est annoncée
avec un retour disponible, sans créer ni rejouer une opération.
Dans **Impact opérationnel mesuré**, chaque réception source est également
ouvrable depuis son indicateur et le retour restaure le même tableau/période.
Tant que vous ne la créez pas, aucune sortie n'est imputée. Les recettes
alternatives ne s'additionnent pas ; les autres ingrédients et le stock déjà
présent ne sont pas vérifiés. Voir le [référentiel technique](technical-development.md)
pour le contrat et ses limites.

Les pièces source ne renvoient que des métadonnées et un nombre de lignes, sans
contenu brut via la chronologie. Les noms, unités et fournisseurs des mouvements
récents sont snapshotés ; pour les mouvements antérieurs sans snapshot, le
libellé historique reste inconnu au lieu d'être repris du catalogue actuel.
Les documents mutables n'ont pas de journal de versions : leur date
d'enregistrement disponible est la dernière mise à jour, et les états
antérieurs ne sont pas reconstruits. La consultation n'écrit ni stock, ni
vente, ni production ; une sortie sans source n'est pas transformée en vente ou
perte observée. Le Bilan expose désormais une estimation séparée lorsque la
réception enregistrée et une recette datée compatible sont disponibles, et
signale les entrées sans recette pour garder cette couverture visible.

## Vérification locale minimale et reprise

Pour une modification future, choisir d'abord le test du service/contrat
touché ; ajouter le parcours d'intégration sur **base isolée** si la
persistance ou l'autorisation change. La CI utilise `npm run lint`,
`npm run build` et `npm test` ; le serveur a aussi `npm run build:api` et des
tests d'intégration dédiés. Ne lancer aucune recette destructive sur l'espace
Camille. Documenter avant écriture de données réelles le point de sauvegarde,
l'identifiant de lot/opération et la façon de revenir à l'état précédent.

Pour les briques **non développées** — caisse, Ticket Z/OCR, position, météo,
événements et moteur prédictif — suivre la
[spécification d'intégration](integrations.md), le
[plan de prévision](plans/forecast-engine.md) et les portes de sortie de la
[plan d'exécution](plans/plan-execution.md), sans confondre ces documents avec du code
disponible.

## Recette de lecture seule — espace Camille, 24 septembre 2026

Sur l'application locale, authentification par l'endpoint de session dans un
navigateur Chrome headless temporaire, puis ouverture des routes `/`, `/sales`,
`/stocks`, `/orders`,
`/more` et `/settings?section=connections`. Les titres **Aujourd'hui**,
**Ventes**, **Stocks**, **Achats**, **Plus** et **Réglages** ont été rendus ;
la page Achats montrait les sections **Commande en préparation** et
**À transmettre**. Aucune alerte `role=alert` n'est apparue. Il n'y a eu ni
validation, ni import, ni modification ou suppression de données métier.
Le formulaire de connexion n'a pas été testé par ce script. Ce smoke test de
lecture ne prouve pas le clavier, le responsive, les actions
mutatives, l'absence d'erreur dans chaque donnée ni un service externe connecté.
