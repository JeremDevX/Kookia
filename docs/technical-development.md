# Référentiel technique et développement

## Objet et statut

Ce document consolide les contraintes techniques et de développement du
[cadrage des Jalons](references/cadrage-jalons.md) avec l'état observable du dépôt. Il est la référence
pour le cadrage technique : **une cible planifiée ne décrit pas une
fonctionnalité déjà disponible**.

| Sujet | État actuel vérifié | Cible Jalon 2 / préproduction |
| --- | --- | --- |
| Application web | React 19, TypeScript, Vite ; données métier persistées via API | Réduire les gestes du parcours quotidien et vérifier l'usage mobile/clavier |
| Qualité | ESLint, TypeScript, Vitest et CI GitHub Actions ; scripts `lint`, `build`, `test` | CI exécutable sans manipulation ; smoke test sur URL dédiée avant recette |
| Hébergement | Configuration frontend Vercel (`vercel.json`) | Préproduction puis recette avant lancement commercial |
| Backend et persistance | API Express/TypeScript et PostgreSQL/Prisma actifs pour comptes et espaces métier isolés | Renforcer les contrats d'ingestion, la provenance et l'évaluation des calculs |
| Intégrations | POS/OCR/météo absents ; connexions affichées de façon statique ; saisie manuelle et revue/réception simulée explicite des pièces source déjà importées dans l'espace (si présentes), saisie ventes et import CSV Kookia | Contrats et adaptateurs fournisseur, ingestion contrôlée, correction et repli manuel |
| Prévision | Prévisions de démonstration persistées ; baseline expérimentale distincte, calculée sur ventes enregistrées | Météo locale et calendrier événementiel ; moteur IA hors périmètre full-stack initial |

Les versions et dépendances actives font foi dans [`package.json`](../package.json).
La [cartographie détaillée des écarts](ecarts-techniques.md) confronte cette cible au code actuel, brique par brique.

## Invariants produit et données

- KOOK.IA **suggère** : le chef relit, peut modifier et valide explicitement une
  recommandation. L'automatisation opaque de commande est hors périmètre.
- La persistance journalise la validation des commandes et menus par le chef ;
  une importation POS ou OCR ne vaut jamais validation.
- Les recommandations doivent rendre lisibles les données et incertitudes qui
  influencent matériellement une décision.
- Pour le flux Ticket Z envisagé, une lecture OCR sous 90 % de confiance appelle
  une correction manuelle assistée. C'est une règle cible, non une capacité
  observée du frontend actuel.
- Données POS, images Ticket Z et identifiants de fournisseurs sont des entrées
  externes non fiables : validation, contrôle d'accès, minimisation de stockage
  et absence de secrets côté client sont requis lorsque ces flux existent.

## Modèle cible et frontières

Le modèle persistant actuel comprend notamment `Restaurant`, `Product`,
`StockMovement`, `SaleItem`, `ServiceDay`, `DailySale`, `SaleImport`, `SaleContribution`,
`SaleContributionEvent`, `Prediction`,
`PurchaseOrder` et `RecommendationDecision`. Les
[contrats proposés pour les sources externes](integrations.md), non implémentés,
devront rester distincts de ces modèles et des payloads bruts des fournisseurs.

```text
UI React → hooks/features → client API → API Express → domaine → PostgreSQL
                                  ↘ futurs ports POS / OCR / position / météo / événements
```

La persistance active couvre `User`, `Session`, `Restaurant`, `Supplier`,
`Product`, `Recipe`, `RecipeIngredient`, `StockMovement`, `StockCount`,
`RecipeVersion`, `RecipeVersionIngredient`, `InvoiceDraftRevision`, `Production`, `Prediction`, `SaleItem`, `DailySale`,
`SaleImport`, `SaleContribution`, `SaleContributionEvent`, `ServiceDay`,
`PurchaseOrder`, `PurchaseOrderLine`, `RecommendationDecision`
et `WorkspaceDocument`. Ce dernier conserve les documents structurés (analytics,
préférences, panier, notifications, pièces source, factures et menus), validés aux frontières.
Les mutations critiques sont transactionnelles. Les liens internes sont différés
pour permettre la suppression en cascade d’un compte sans casser ses références.
La fiche `Product` porte une révision pour détecter les modifications concurrentes ;
la mise à jour ne change pas l'unité. Les lignes validées de `PurchaseOrderLine`
gardent leur nom, fournisseur, unité et prix snapshotés lors de la commande.
`StockCount` conserve séparément quantité comptée, quantité théorique observée,
écart, unité, date et acteur ; un écart accepté ajoute un `StockMovement` lié.
La révision de stock évolue avec chaque entrée/sortie et permet d'étiqueter un
comptage comme « à vérifier » après tout mouvement ultérieur.
`ServiceDay` conserve le statut ouvert/fermé, la couverture des ventes
complète/partielle/manquante, une révision et l'acteur, par date civile. Une
vente manuelle ou CSV ouvre un service partiel ; seul un jour explicitement
complet qualifie les absences de lignes comme zéro observé. La migration classe
les dates historiques avec ventes comme ouvertes/partielles, sans inventer une
complétude rétrospective.
`Recipe` expose un rendement et une révision optimiste. Chaque création ou
édition ajoute un instantané `RecipeVersion` daté et attribué, avec ses
ingrédients, quantités, noms et unités ; les anciennes productions restent
liées à leur version et leurs déductions ne sont pas recalculées après édition.
Le backfill attribue une version 1 aux recettes préexistantes avec date d'effet
inconnue et laisse les productions historiques sans lien de version lorsqu'il
est impossible de reconstruire cette information.

Le seed ne recrée pas les données à chaque chargement : `npm run db:seed` initialise
les comptes existants sans écrasement ; les nouveaux espaces sont initialisés au
premier accès. Les dates des prévisions de démonstration sont figées. Aucun calcul
IA, connecteur POS/OCR ou envoi fournisseur réel n’est impliqué par la persistance.
Les ventes du restaurant sont saisies, importées ou issues de la simulation locale
`demo_simulation` ; elles ne sont pas les prévisions de démonstration du seed.
`SaleContribution` conserve chaque snapshot source et son état de revue avant
projection vers l'unique `DailySale` du restaurant/date/article ;
`SaleContributionEvent` journalise les décisions, corrections, annulations et
remboursements signalés sans écraser l'audit. Les [indicateurs et la baseline
expérimentale](sales.md) exposent la provenance. Dans une fenêtre mixte, le
backtest exclut les lignes simulées du calcul enregistré ; un résultat composé
uniquement de simulation reste étiqueté démonstration et ne mesure pas la
précision terrain. Il n'y a ni météo, ni confiance calibrée, ni commande dérivée
de cette baseline. `SaleItemRecipeMapping` conserve l'association confirmée,
son facteur de portions par article, sa date d'effet, son auteur, son nom de
recette snapshoté et ses révisions. Le backtest matière résout la correspondance
et la `RecipeVersion` à la date de chaque service ; les versions à date inconnue
ou futures ne sont pas utilisées. La projection ne modifie pas les mouvements
de stock. POS et Ticket Z restent non connectés.
Le [plan de migration](plans/database-migration.md) contient la cartographie et les
preuves de validation et les limites explicites de cette migration.

Le branchement d'une source externe et sa persistance restent à concevoir,
comme décrit dans [Sources de données](integrations.md). Le
[plan de prévision](plans/forecast-engine.md) distingue données observées,
baseline et proposition d'achat. La route `/predictions` et les graphiques
de démonstration sont encore visibles depuis le parcours actuel ; leur retrait
de la navigation opérationnelle est une **cible UX**, pas une modification
réalisée dans ce travail documentaire.

## Backlog et séquence de référence

| Séquence | Résultat attendu |
| --- | --- |
| S0 — cadrage | Backlog, conventions, README et CI ; environnement installable |
| S1 — socle API | API Express/TypeScript, santé et tests |
| S2 — données métier | PostgreSQL/Prisma ; restaurant, produit et stock minimum |
| S3 — recommandations contrôlées | Prévision évaluée, modification, validation chef et journal de décision |
| S4 — ingestion | Adaptateur POS, Ticket Z, OCR relu et fallback démontrable |
| S5 — robustesse | KPI, export, accessibilité, états vides et scénarios critiques |
| S6 — préproduction | Déploiement, smoke tests, documentation, démonstration et recette |

Cette séquence est le cadrage historique du Jalon 2, pas un état d'avancement.
Le [plan de réalisation actualisé](plans/roadmap-produit.md) part des capacités
déjà livrées et pose les critères de sortie. Les estimations du Jalon 2 ne
valent pas engagement de capacité pour la suite.

## Validation attendue

### Valeurs CSS centralisées

[`src/styles/index.css`](../src/styles/index.css) est le catalogue unique des
valeurs visuelles : palette partagée, typographie (base `1rem`, soit 16 px par
défaut), dimensions, espacements, rayons et durées. Les variantes de thème encore
nécessaires au Dashboard restent dans ce fichier, avec leur sélecteur d'origine.
Les anciennes redéfinitions identiques des workspaces ont été supprimées.
Les règles globales sont
réparties dans `Base.css`, `Utilities.css`, `Components.css` et `CommonPage.css`,
importés par le catalogue ; les règles des composants restent près du composant.

Avant d'ajouter une valeur, réutiliser l'échelle existante, notamment pour les
teintes voisines, les tailles de texte, les espacements et les rayons. Éviter les
tokens propres à un seul sélecteur : composer les variables communes dans les
feuilles locales, par exemple `border: var(--size-1) solid var(--color-border)`.
Les canaux `--rgb-*` servent aux transparences via `rgba()` sans multiplier les
couleurs pour chaque opacité. Ajouter une variable dans `:root` de `index.css`
uniquement si les réglages existants ne conviennent pas. Ne pas redéfinir de
variable dans une feuille locale, ni ajouter de fallback visuel littéral dans
`var()`.

Les mots-clés structurels restent en CSS natif : `display: flex`, `width: auto`,
`border-style: solid`, etc. Le contrôleur les autorise via une liste explicite
dans [`scripts/css-keywords.mjs`](../scripts/css-keywords.mjs), ainsi que les
noms d'animations déclarées dans les propriétés d'animation. Les couleurs nommées
(`red`, `white`…), dimensions, nombres et chaînes restent contrôlés : une valeur
arbitraire n'est pas acceptée simplement parce que c'est un identifiant CSS.

Les conditions responsive et de mouvement réduit sont des `@custom-media`
définis dans `index.css`. Utiliser par exemple `@media (--media-mobile)` dans
les feuilles locales. Le plugin de [`postcss.config.mjs`](../postcss.config.mjs)
remplace chaque alias par sa condition lors du développement et du build,
sans déplacer les règles. Il prend en charge un alias unique par `@media`,
sans alias imbriqué ; les modifications du catalogue sont suivies par Vite.
Les variables CSS natives ne fonctionnent pas dans les conditions `@media`.

Exceptions de syntaxe, pas de valeurs de design : les mots-clés CSS globaux
`inherit`, `initial`, `unset`, `revert`, `revert-layer` restent sur la déclaration
(les stocker dans une variable changerait leur sens). Les sélecteurs, noms et
étapes de `@keyframes`, chemins `@import` et noms de fonctions restent natifs.

```bash
npm run check:css
npm run test:css
```

[`scripts/check-css.mjs`](../scripts/check-css.mjs) parcourt tous les fichiers
`.css` du dépôt, y compris dans les nouveaux dossiers, hors dépendances,
artefacts générés (`dist`, `coverage`) et dossiers d'outillage (`.git`, `.agents`,
`.codex`). Il signale **fichier:ligne:colonne** et sort avec le code 1 pour les
valeurs en dur, variables inconnues/locales, cycles, doublons globaux, médias
non centralisés et syntaxes non prises en charge. Il vérifie aussi les règles
ordinaires placées dans `index.css` : seuls les tokens globaux peuvent contenir
des valeurs visuelles littérales. Ce contrôle porte sur les feuilles CSS, pas sur les
styles inline TSX ou les attributs SVG.

Le contrôle est intégré à `npm run lint`, donc à la CI existante ; ses tests
de régression sont intégrés à `npm test`.

### Contrôles applicatifs

La CI exécute `lint`, `build` et `test`. Les contrôles locaux complémentaires
`build:api` et `test:integration` existent, mais ne sont pas encore dans la CI ;
ce dernier doit être exécuté sur une [base isolée](setup-auth.md#base-isolée-pour-les-tests-dintégration).

```bash
npm run lint
npm run build
npm run build:api
npm run test
npm run test:integration
```

Pour la cible préproduction, compléter progressivement avec des tests unitaires
des règles métier (stocks, recommandations, validation, données incomplètes),
des tests d'intégration des erreurs/fallbacks (POS, OCR, persistance) et un
parcours utilisateur Aujourd'hui → Stocks → Achats → Validation, clavier et
états vides compris. L'objectif de 70 % concerne les services critiques à partir
de S3 ; il ne mesure pas la couverture actuelle sans rapport généré.

## Éléments hors périmètre ou différés

- Production du modèle prédictif et de l'OCR : services externes/stubs pendant
  le périmètre full-stack initial.
- Rapports de gaspillage AGEC et suggestions de menus sur surstocks : cible
  *Should have* à T+9 mois. Ne pas revendiquer une conformité réglementaire sans
  vérification dédiée.
- EDI fournisseurs et enregistrement HACCP : cible *Could have* à T+12 mois.
- Infrastructure dédiée et machine IA : option de montée en charge vers 100
  clients, chiffrée comme enveloppe haute à confirmer par devis ; le scénario de
  départ reste le cloud loué.

## Décisions à trancher avant planification

Le cadrage produit classe la connexion native Lightspeed et l'ingestion OCR
Ticket Z comme *Must have*, alors que le backlog de développement place
l'adaptateur POS et les stories OCR en *Could/Should*. Cette divergence doit être
arbitrée avant un engagement externe. Il faut également préciser le fournisseur
POS, les conditions d'accès aux données et la politique de conservation des
images Ticket Z avant toute activation. Voir les
[écarts vérifiés](ecarts-techniques.md) pour le reste des dépendances.
