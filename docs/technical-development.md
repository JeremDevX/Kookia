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
| Hébergement | `vercel.json` sert une SPA frontend ; aucun runtime API ni réécriture `/api` | Définir et vérifier séparément l'API, le réseau, les sessions et la persistance avant préproduction |
| Réseau local | Vite proxifie `/api` vers `http://127.0.0.1:3001` par défaut (cible overrideable pour la démo) ; l'API écoute loopback par défaut, `HOST` configure l'écoute et `APP_ORIGIN` l'origine mutatrice locale ; la recette R0 et la démo utilisent PostgreSQL jetable sur loopback | Configurer explicitement l'écoute externe, un routage `/api` de même origine, une origine mutatrice autorisée et TLS selon l'hébergeur choisi |
| Backend et persistance | API Express/TypeScript et PostgreSQL/Prisma actifs pour comptes et espaces métier isolés | Renforcer les contrats d'ingestion, la provenance et l'évaluation des calculs |
| Intégrations | Aucun fournisseur POS/OCR/météo actif ; `Plus → Connexions` lit les statuts serveur `not_connected`. POS reste une fixture revue manuellement ; Ticket Z a une transcription manuelle sans OCR ni conservation du fichier ; Achats expose une unique fixture PDF synthétique via upload local en `demo:local`, sans OCR général ni conservation de l'original ; les autres fichiers gardent le repli manuel. | Contrats et adaptateurs fournisseur, extraction contrôlée, correction et repli manuel |
| Prévision | Prévisions de démonstration persistées ; baseline F1 expérimentale distincte avec provenance ventes enregistrées/simulées ; l'API baseline expose F2 comme non connecté et ne retient F1 que si ses entrées sont qualifiées, sans ajustement contextuel | Position confirmée, fournisseurs météo/événements et historique d'émissions après cadrage des droits/rétention ; mesurer un éventuel gain seulement sur données terrain qualifiées ; moteur IA hors périmètre full-stack initial |

Les versions et dépendances actives font foi dans [`package.json`](../package.json).
La [cartographie détaillée des écarts](ecarts-techniques.md) confronte cette cible au code actuel, brique par brique.
La [préparation locale de livraison](local-delivery.md) décrit aussi les cookies,
les secrets d'environnement, la disponibilité observée et les limites de reprise.

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
`SaleContributionEvent`, `TicketZBatch`, `PosSalesBatch`, `Prediction`,
`PurchaseOrder`, `PurchaseReceipt`, `PurchaseReceiptLine` et
`RecommendationDecision`. Les contrats futurs pour les sources externes
([détails](integrations.md)) et leur ingestion devront rester distincts des
payloads bruts des fournisseurs. Le parcours manuel Ticket Z persiste uniquement
des métadonnées, candidats transcrits et décisions.

```text
UI React → hooks/features → client API → API Express → domaine → PostgreSQL
                                  ↘ futurs ports POS / OCR / position / météo / événements
```

La persistance active couvre `User`, `Session`, `Restaurant`, `Supplier`,
`Product`, `Recipe`, `RecipeIngredient`, `StockMovement`, `StockCount`,
`RecipeVersion`, `RecipeVersionIngredient`, `InvoiceDraftRevision`, `Production`, `Prediction`, `SaleItem`, `DailySale`,
`SaleImport`, `SaleContribution`, `SaleContributionEvent`, `TicketZBatch`,
`PosSalesBatch`, `ServiceDay`,
`PurchaseOrder`, `PurchaseOrderLine`, `PurchaseReceipt`, `PurchaseReceiptLine`, `RecommendationDecision`
et `WorkspaceDocument`. Ce dernier conserve les documents structurés (analytics,
préférences, panier, notifications, pièces source, factures et menus), validés aux frontières.
Les mutations critiques sont transactionnelles. Les liens internes sont différés
pour permettre la suppression en cascade d’un compte sans casser ses références.
La fiche `Product` porte une révision pour détecter les modifications concurrentes ;
la mise à jour ne change pas l'unité. Les lignes validées de `PurchaseOrderLine`
gardent leur nom, fournisseur, unité et prix snapshotés lors de la commande.
L'historique ne propose une fiche imprimable que pour une commande opérationnelle
au statut `validated` ; les lignes sont regroupées par identifiant fournisseur
depuis ces snapshots. Chaque impression reste locale, ne modifie aucun statut et
n'appelle aucun service d'envoi ; les taxes et frais ne sont pas calculés.
`StockCount` conserve séparément quantité comptée, quantité théorique observée,
écart, unité, date et acteur ; un écart accepté ajoute un `StockMovement` lié.
`PurchaseReceipt` et `PurchaseReceiptLine` rapprochent une commande, un brouillon
de facture, une référence/date de livraison et les quantités réellement reçues.
Le lien tenant-scopé vers la ligne de commande et le produit, les noms/unités,
quantités et prix de commande/facture sont snapshotés. Une réception partielle
est conservée sans marquer la facture complète ; seule la quantité déclarée
livrée ajoute du stock, dans la même transaction que son mouvement de provenance.
Les répétitions d'opération sont idempotentes, les doublons facture/livraison
sont refusés et un écart de prix exige une explication. En espace démo, réception
et commande restent simulées et ne changent pas le stock.
Les nouveaux `StockMovement` gardent aussi des snapshots facultatifs du nom,
de l'unité et du fournisseur au moment du mouvement. Les anciennes lignes restent
sans snapshot plutôt que d'hériter d'un libellé actuel.
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
Les fiches candidates sont réservées aux espaces `demo`, stockées comme
documents de travail révisés et accompagnées d'une `RecommendationDecision`.
Chaque ingrédient référence une pièce source du même espace et sa ligne ; hash,
révision et unité doivent toujours correspondre, sans conversion implicite.
Une pièce modifiée rend la candidate périmée. Le chef peut corriger, confirmer
ou écarter l'hypothèse ; confirmer crée une `Recipe` versionnée mais aucun
mouvement de stock ni production. `demo:local` sélectionne maintenant deux
hypothèses depuis les 431 transcriptions Markdown locales en exigeant une
correspondance catalogue directe d'unité pour chaque ligne ; dates d'origine et
de démonstration sont séparées dans leur preuve. Les quantités et rendements
restent des hypothèses. Le runner charge les sources uniquement dans sa base
tmpfs ; les tests et captures utilisent toujours des lignes synthétiques.

Le seed ne recrée pas les données à chaque chargement : `npm run db:seed` initialise
les comptes existants sans écrasement ; les nouveaux espaces sont initialisés au
premier accès. Les dates des prévisions de démonstration sont figées. Aucun calcul
IA, connecteur POS/OCR réel ou envoi fournisseur n’est impliqué par la persistance.
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
et la `RecipeVersion` à la date de chaque service, mais seulement si leur
enregistrement était connu à cette date ; une association ou version saisie
après coup ne fuit pas vers les jours précédents, même avec une date d'effet
rétrodatée. Les versions à date inconnue ou future ne sont pas utilisées. La
projection ne modifie pas les mouvements de stock. Les suggestions d'achat
réutilisent cette projection pour un seul service à venir, retranchent un stock
compté encore courant et n'intègrent ni délai fournisseur ni commande non reçue ;
le prix affiché est indicatif. Le chef peut écarter, modifier et valider une
suggestion, avec une décision immuable côté serveur. Une origine
`demo_simulation` ne crée jamais une commande réelle ; le tenant démo persiste
des commandes/réceptions explicitement simulées. POS et OCR restent non
connectés ; le Ticket Z manuel produit des candidats relus, jamais des ventes
automatiques. Le contrôle de fichier, l'absence de stockage brut et la
conservation du hash sont décrits dans [Sources de données](integrations.md).

L'aide **Voir le menu d'exemple** est limitée au tenant démo. Elle propose des
recettes depuis un comptage positif dont la révision est encore actuelle, après
que le responsable a explicitement désigné une quantité comme surstock. Elle
n'utilise aucun seuil haut global. Le calcul retient la dernière version datée
applicable de chaque recette ; une quantité d'ingrédient inconnue ou une unité
incompatible bloque la faisabilité. Les portions maximales sont indicatives et
les dates de péremption sont toujours inconnues. Les idées calculées sont
persistées comme décision `menu_ideas_generated` avec provenance
`demo_simulation`. Appliquer une idée ne modifie que le brouillon du menu ; sa
sauvegarde/validation reste une action distincte, sans mouvement de stock ni
production. Les recettes sont évaluées séparément avec toute la quantité
d'étiquette ; leurs portions maximales ne sont pas additives. Aucun schéma ou
modèle de péremption n'est introduit par ce parcours.

La page **Bilan** appelle `GET /api/workspace/impact` pour comparer la période
choisie à la précédente de même durée calendaire. Les ventes sont datées par
service, les pertes explicites par enregistrement UTC et les achats par date de
livraison ; les quantités restent séparées par produit/unité. Le coût d'une perte
est calculé uniquement depuis un prix snapshoté au mouvement, et les dépenses
uniquement depuis des quantités de réception confirmées et leur prix de facture.
Les simulations sont séparées des totaux enregistrés ; les mouvements sans
unité cohérente sont exclus des totaux et exposés à vérifier. Ruptures et invendus
ne sont pas saisis dans un ledger dédié, donc restent « non mesurés » ; aucune
économie réalisée n'est calculée. L'export opérationnel comporte une section
**Pertes déclarées** fondée uniquement sur les mouvements négatifs explicitement
étiquetés `loss`, avec quantité absolue, date UTC et identifiant d'opération
source. Il compte les coûts non valorisés et les incompatibilités d'unité,
signale les métriques non mesurées et exclut les simulations. Il ne constitue
pas une attestation AGEC.

La page **Plus → Histoire sur quatre années** (`/history`) appelle la route
tenant-scopée de lecture seule `GET /api/workspace/timeline`, sur une période
de 31 jours au maximum et une coupe `asOf`. Chaque événement sépare date
d'effet, date à laquelle son état est connu et date d'enregistrement ; les
provenances affichées sont archive source, saisie, simulation, hypothèse ou
inconnue. Les pièces sont réduites côté SQL à des métadonnées (aucun texte de
transcription ni ligne brute), et les prix actuels ne sont pas injectés dans
l'historique. Les lignes `WorkspaceDocument` n'ayant pas de journal de versions,
leur date disponible est la dernière mise à jour ; les états antérieurs restent
inconnus et les entrées modifiées après `asOf` sont masquées. Les mouvements
legacy sans snapshots gardent un libellé historique inconnu. Les liens ouvrent
les vues actuelles (un mouvement peut ouvrir la fiche produit) sans rejouer
l'opération ni modifier le solde.

La chronologie inclut aussi la création des commandes internes, les décisions
de suggestion et les réceptions rapprochées. Une commande n'est pas présentée
comme envoyée et son état mutable n'est pas rejoué rétroactivement ; une
réception distingue sa date de livraison de sa date d'enregistrement. Les
commandes/réceptions et décisions du tenant démo portent la provenance
simulation ; une pièce source liée est ouvrable depuis Achats. Pour les crédits
de stock synthétiques historiques, l'identifiant source est repris de
l'opération idempotente et reste explicitement qualifié de simulation, jamais
de preuve de livraison. Ces projections exposent des snapshots bornés, pas le
contenu des pièces ni leurs lignes OCR brutes.

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
- Rapport de gaspillage AGEC : cible *Should have* à T+9 mois. Ne pas revendiquer
  une conformité réglementaire sans vérification dédiée. Les idées de menus
  issues d'un surstock explicite sont préparées localement dans le tenant démo
  uniquement ; leur extension à des espaces opérationnels, des seuils globaux ou
  une gestion des péremptions attend une validation pilote et un modèle de
  données adapté.
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
