# Migration complète des données métier vers PostgreSQL

## Objectif et état initial — 11 septembre 2026

Conserver les parcours et les données de démonstration existants, mais rendre les
lectures et mutations métier persistantes, isolées par espace et vérifiables.
Ce document pilote l’implémentation ; les cases ne sont cochées qu’après validation.

État observé : Express, Prisma et PostgreSQL existent déjà pour `User` et `Session`.
Les services métier utilisent encore des tableaux locaux. Les descriptions de
stack « prévue » dans certaines compétences sont donc dépassées pour l’auth.
Aucune migration métier n’est encore appliquée à cette étape.

## Cartographie des données et des faux effets

| Domaine | Sources / consommateurs actuels | Cible et changements nécessaires |
| --- | --- | --- |
| Fournisseurs | `src/utils/mockData.ts`, réexport `src/data/mock/inventory.ts`, `productService`, catalogue, commandes, détail stock | Fournisseurs rattachés à un restaurant, API de lecture et gestion ; conserver les liens produits |
| Produits / stocks | Historique fictif également dans `ProductDetail` ; même fichier ; `useProductsWithMutations`, `Stocks`, `AddProductModal`, `ProductDetail` | Produits typés, quantités/prix décimaux, mouvements horodatés ; création et ajustement serveur atomiques, contrôle du fournisseur et absence de stock négatif |
| Recettes / ingrédients | `mockData.ts`, `data/mock/recipes.ts`, `recipeService`, `useRecipes` | Recettes et ingrédients liés aux produits ; supprimer les calculs synchrones adossés au mock, calculer sur le catalogue chargé |
| Productions / refus | `Recipes`, `RecordProductionModal`, `ProductionConfirmModal` | Historique de production et demandes refusées persistants ; consommation des ingrédients transactionnelle à confirmation ; pas de succès sans écriture |
| Prévisions / recommandations | `mockData.ts`, `data/mock/predictions.ts`, `predictionService`, hooks, calendrier et détail | Prévisions datées, confiance et suggestion conservées ; données initiales explicitement démonstratives, pas de moteur IA fictif |
| Décisions du chef | `Predictions.orderedPredictions`, sélection locale du dashboard | Journal immuable : auteur, date, suggestion, quantité revue, décision ; distinguer sélection, validation et envoi |
| Panier | `CartContext`, `cartState`, sélection séparée dans `Dashboard`, notifications | Panier persistant de l’espace, identifiants produits cohérents ; ne pas vider à la simple fermeture de la revue |
| Commandes | `OrderGenerator` temporise puis affiche un succès ; `ProductDetail` affiche un toast d’envoi | Commandes et lignes figées, validation explicite et idempotence ; aucun email réellement envoyé dans cette migration, statut enregistré / à transmettre fidèle à la réalité |
| Notifications | `notificationPresentation.MOCK_NOTIFICATIONS`, état local de `Notifications` | Notifications et état lu persistants ; références produits vérifiées ; libellés temporels calculés depuis une date, pas « il y a 10 min » éternel |
| Analytics | `mockData.ts`, `data/mock/analytics.ts`, `analyticsService`, graphiques | Instantanés datés et sourcés pour gaspillage, économies, fiabilité, produits critiques et activité ; données de démonstration conservées en seed |
| KPI dashboard | `DashboardKPIs.indicators` | Valeurs métier et périodes persistées, icônes/couleurs restent dans la présentation |
| Préférences analytics | `analyticsPreferencesService`, clé locale `foodai:analytics-preferences` | Préférences du compte en base ; reprise explicite des anciennes valeurs locales sans écraser des préférences serveur existantes |
| Restaurant | `Settings` champs defaultValue ; `domainBusinessConfig.establishmentDisplay`, dashboard/navigation | Profil établissement persistant et formulaire fonctionnel ; salutation issue du compte, localisation de l’établissement |
| Météo | `domainBusinessConfig.establishmentDisplay.weatherLabel` | Observation de démonstration datée et identifiée comme telle ; aucune météo réelle inventée |
| Menu suggéré / validé | `domainBusinessConfig.menuSuggestion`, `MenuIdeasModal`, toast du dashboard | Suggestion persistée et validation horodatée ; ne pas annoncer une impression ou production absente ; proposer une vraie impression navigateur |
| Facture / réception | `InvoiceModal.scannedItems`, référence fixe 2024, toast du dashboard | Facture brouillon et lignes liées aux produits, validation humaine puis réception atomique une seule fois ; pas de prétendu OCR, saisie/correction manuelle disponible |
| Intégrations | `Settings.INTEGRATIONS`, `IntegrationModal.getMockData` | Catalogue de fournisseurs peut rester statique ; état de connexion serveur réel « non configuré », supprimer fausses clés et synchronisations ; aucun secret fictif à persister |
| Exports | `ExportReportModal`, callback dans `Analytics` | Export des données API réellement téléchargé ; formats proposés effectivement pris en charge, période réellement filtrée ; retirer l’assurance de conformité AGEC non démontrée |
| Simulateur ROI | `domainBusinessConfig.roiSimulator`, `ROISimulator` | Hypothèses explicites, pas des résultats observés ; valeurs par défaut métier persistées si propres à l’établissement, bornes de contrôle et formules restent du code |

### Données qui restent légitimement dans le frontend

Textes UI, routes, icônes, couleurs, catégories de présentation, unités autorisées,
règles déterministes, état des modales, recherche, pagination et filtres temporaires.
Les délais du splash et des toasts ne sont pas des mocks métier.
Les fixtures de tests restent possibles, mais aucun fallback mock dans le runtime.

## Frontières et modèle

- Restaurant détenu par un compte authentifié dans le modèle initial : pas de
  partage implicite entre comptes, pas de système de rôles inventé sans parcours.
- Toutes les requêtes métier déterminent le restaurant via la session serveur.
  Un identifiant envoyé par le navigateur ne donne jamais accès à un autre espace.
- Tables relationnelles pour produits, fournisseurs, recettes, ingrédients,
  mouvements, productions, commandes et décisions. JSON seulement pour les
  instantanés analytiques et documents structurés validés, pas un unique blob global.
- Dates persistées une fois : les prévisions ne se régénèrent plus au rechargement.
- Seed versionné et idempotent issu des données actuelles, préservant les relations.
  Ne jamais réinitialiser les données d’un espace déjà modifié.
- DTO compatibles avec les hooks existants ; validation Zod des entrées, erreurs
  structurées, états chargement/échec et succès après confirmation serveur.
- Les données de démonstration stockées en base restent des données de
  démonstration : persistance ne signifie ni vérité opérationnelle ni IA réelle.

## Plan d’implémentation et commits

- [x] 1. Inspecter le runtime et consigner cette cartographie et les incohérences.
- [ ] 2. Ajouter modèle métier, migration additive et seed idempotent ; vérifier sur PostgreSQL local sans toucher aux comptes existants.
- [ ] 3. Brancher catalogue, création produit, ajustements et historique de stock ; tester isolation et concurrence.
- [ ] 4. Brancher recettes, productions et refus ; transaction de déduction, absence de double consommation et relecture après actualisation.
- [ ] 5. Brancher prévisions, panier, décisions et commandes ; revue explicite, quantités validées, journal et statut d’envoi honnête.
- [ ] 6. Brancher notifications, factures/réceptions et menus ; empêcher une double réception, préserver correction/validation humaine.
- [ ] 7. Brancher restaurant, analytics, KPI, préférences et hypothèses ; corriger intégrations et exports fictifs.
- [ ] 8. Retirer les imports mocks du runtime, actualiser documentation technique/setup, audit de parité et tests finaux.

Faire un commit par lot cohérent, avec vérifications dans le message ou le suivi
ci-dessous. Pas de commit de secrets, fichiers .env ou dumps contenant des comptes.

## Validation / critères de fin

- Migration et seed exécutables ; second seed sans duplication ni écrasement.
- Lectures équivalentes aux jeux de données initiaux (produits, fournisseurs,
  recettes/ingrédients, prévisions, graphiques et données annexes).
- Mutations relues après nouvelle requête / rechargement et reconnexion.
- Deux comptes isolés, accès anonyme refusé, références étrangères refusées.
- Ajustements/production/réception atomiques ; échec sans écritures partielles,
  répétition de validation sans doubler les effets.
- Aucun toast annonçant un envoi, appel, OCR, synchronisation ou conformité fictifs.
- Tests unitaires des règles, tests HTTP avec vraie base dédiée/localement isolée,
  `npm run lint`, `npm run build`, `npm run build:api`, `npm test`,
  `npm run test:integration`, `git diff --check`.
- Vérification navigateur des parcours stock, production, commande, réception,
  préférences et rechargement ; contrôler chargement, échec et navigation clavier.
- Recherche finale des mocks/imports, constantes métier, mutations uniquement
  locales ; chaque élément de la cartographie doit avoir une preuve de traitement.

## Sécurité de migration / rollback

Migration additive uniquement. Ne pas utiliser `prisma migrate reset`, ni vider
une table existante. Avant une opération destructive éventuelle : accord explicite
et sauvegarde/rollback vérifié. Les tests créent leurs propres comptes et ne
suppriment que leurs données. Pour revenir sur le code, garder les nouvelles tables
inutilisées est préférable à supprimer des données. Aucune intégration tierce,
notification externe ou commande fournisseur n’est envoyée par l’agent.

## Suivi

- Cartographie initiale : inspection des services, hooks, fixtures, modèles Prisma,
  composants métiers et handlers de confirmation. Auth déjà en base confirmée.
- Implémentation et validation des lots suivants : à renseigner au fil des commits.
- Socle relationnel ajouté et migrations additives appliquées sur PostgreSQL local.
  Seed catalogue/analytics figé au 11 septembre 2026 (dates non recalculées).
  Test PostgreSQL passé : volumes et ingrédients conservés, initialisations
  concurrentes, non-écrasement d’un stock modifié, isolation de deux comptes,
  suppression complète des comptes temporaires. Contraintes croisées différées
  pour permettre la suppression de compte existante. Documents annexes du seed
  et raccordement runtime restent à faire : le lot 2 reste volontairement ouvert.

- Catalogue frontend raccordé à `/api/workspace/catalog`. Ajout de produit avec
  sélection fournisseur ; ajustement décimal et perte enregistrés après réponse
  serveur ; historique réel. Appel fournisseur remplacé par un lien téléphone,
  commande directe remplacée par une sélection à revoir (panier encore local).
  Tests HTTP PostgreSQL passés : accès anonyme, fournisseur invalide, isolation,
  relecture, répétition de requête et deux débits concurrents (un seul accepté).
  Lint, builds frontend/API, 31 tests unitaires et diff check passent.
  Vérification navigateur encore à faire. Recettes/prévisions restent mockées
  à cette étape ; leur raccordement est le prochain lot pour rétablir la cohérence
  des calculs avec le stock désormais persistant.
- Recettes désormais lues en base ; rendement et coût utilisent le catalogue
  chargé (suppression du prix fictif de 2,50 €/portion dans la confirmation).
  Productions, déclarations libres et refus persistés et affichés dans un journal.
  Déduction transactionnelle des ingrédients seulement pour une recette liée
  explicitement lancée ; déclaration libre sans déduction inventée.
  Tests PostgreSQL : relecture, idempotence, conflit, quantités d’ingrédients,
  rollback sans modification partielle et déclaration sans déduction passent.
  Les vérifications navigateur et la parité historique des données initiales
  restent à auditer ; les cases des lots demeurent ouvertes jusque-là.
- Prévisions, analytics et activité sont désormais servis depuis PostgreSQL.
  Test HTTP de parité exacte avec chaque prévision et les instantanés initiaux
  passé ; aucun import mock dans ces services frontend.
- Préférences analytics en base avec reprise des valeurs locales valides au
  premier accès seulement, sans écraser des préférences serveur existantes.
  Validation serveur des valeurs, séparation des comptes et relecture testées.
  Échecs de lecture/sauvegarde visibles ; la modale reste ouverte sur échec.
  Builds frontend/API, lint, 31 tests unitaires et 3 scénarios HTTP métier passent.
  Restent KPI et hypothèses annexes, commandes/panier/décisions, notifications,
  réception/menu, paramètres/intégrations/exports, audit et contrôle navigateur.
- Commandes et lignes désormais persistées avec prix/fournisseur figés côté
  serveur, validation humaine et journal immuable de la suggestion initiale et
  de la quantité revue. Revue de quantités disponible depuis les prévisions,
  le dashboard et les notifications. Historique relisible sur le dashboard.
  Suppression des annonces d’emails envoyés ; statut « à transmettre » explicite.
  Fermer/annuler la revue ne vide plus la sélection ; validation seulement.
  Tests PostgreSQL : répétition concurrente sans doublon, conflit de quantités,
  références invalides, journal initial et absence d’effet stock passent.
  Le panier demeure local : son raccordement reste la prochaine étape du lot 5.
- Panier désormais persistant, y compris les sélections de prévisions du
  dashboard. Ajouts concurrents sérialisés serveur, noms/unités issus du catalogue,
  état frontend recréé lors d’un changement de compte. Validation de commande et
  retrait des seuls articles concernés dans une transaction ; panier périmé refusé.
  Tests HTTP d’ajouts concurrents, relecture, isolation, répétition et conservation
  des articles non commandés passent.
- Notifications initiales déplacées dans le seed serveur, dates fixes et état
  lu/non lu persistés. Relecture, idempotence, parité initiale et isolation testées.
  Le panier n’annonce un ajout réussi qu’après la réponse serveur ; suppression
  de la temporisation simulée des ajouts multiples. Vérification navigateur à faire.
- Factures/réceptions raccordées : facture initiale conservée (date 2024 explicite),
  création manuelle, correction des produits/quantités/prix et sauvegarde brouillon.
  Réception humaine atomique avec mouvements et date de livraison ; facture
  réceptionnée immuable. Aucun OCR ni scan fictif annoncé.
  Tests PostgreSQL passés : parité des quantités initiales, relecture brouillon,
  correction et conflit de révision, isolation, double réception concurrente sans
  double crédit, historique et rollback complet si une ligne est invalide.
  Builds frontend/API et lint passent ; validation navigateur reste à effectuer.
- Paramètres restaurant persistants et formulaire fonctionnel ; dashboard alimenté
  par la ville enregistrée et le nom du compte authentifié, plus de Camille fixe.
  Gestion fournisseurs ajoutée (création/modification), utilisée par le catalogue.
  Tests PostgreSQL de relecture, validation, isolation, fournisseur créé associé
  à un nouveau produit passent. Builds et lint passés.
- Intégrations : suppression des fausses clés API, compteurs et connexions actives.
  Les fournisseurs proposés restent un catalogue UI statique ; aucun connecteur
  implémenté, donc aucun état de connexion réel à migrer. Statut indisponible
  explicite, parcours manuel conservé. Ancienne météo fictive inutilisée supprimée.
