# Référentiel technique et développement

## Objet et statut

Ce document consolide les contraintes techniques et de développement du
[cadrage des Jalons](references/cadrage-jalons.md) avec l'état observable du dépôt. Il est la référence
pour le cadrage technique : **une cible planifiée ne décrit pas une
fonctionnalité déjà disponible**.

| Sujet | État actuel vérifié | Cible Jalon 2 / préproduction |
| --- | --- | --- |
| Application web | React 19, TypeScript, Vite ; données métier persistées via API | Réduire les gestes du parcours quotidien et vérifier l'usage mobile/clavier |
| Atelier documentaire | Application locale séparée, `npm run documents:dev` ; prévisions distinctes des demandes, calendrier et carte saisonnière, lots/FEFO avec reprise JSON, incidents causaux, transactions et pertes différenciées ; PDF fournisseurs/Ticket Z, CSV quotidiens et ZIP version 2, sans API ni écriture métier. Voir [usage et couverture](document-workshop.md). | Hypothèses non calibrées sur le terrain. Aucun import automatique des lots ou déchets du générateur ; les opérations Kookia sont saisies et confirmées séparément |
| Qualité | ESLint, TypeScript, Vitest et CI GitHub Actions ; scripts `lint`, `build`, `test` | CI exécutable sans manipulation ; smoke test sur URL dédiée avant recette |
| Hébergement | `vercel.json` sert une SPA frontend ; aucun runtime API ni réécriture `/api` | Définir et vérifier séparément l'API, le réseau, les sessions et la persistance avant préproduction |
| Réseau local | Vite proxifie `/api` vers `http://127.0.0.1:3001` par défaut (cible overrideable pour la démo) ; l'API écoute loopback par défaut, `HOST` configure l'écoute et `APP_ORIGIN` l'origine mutatrice locale ; la recette R0 et la démo utilisent PostgreSQL jetable sur loopback | Configurer explicitement l'écoute externe, un routage `/api` de même origine, une origine mutatrice autorisée et TLS selon l'hébergeur choisi |
| Backend et persistance | API Express/TypeScript et PostgreSQL/Prisma actifs pour comptes et espaces métier isolés | Renforcer les contrats d'ingestion, la provenance et l'évaluation des calculs |
| Intégrations | Open-Meteo implémenté côté serveur, désactivé par défaut : commune confirmée, cache horaire et contexte informatif du service. Connexions reflète les succès réels, jamais une fixture. Aucun fournisseur POS/OCR actif ; Ticket Z reste une transcription manuelle sans conservation du fichier ; Achats expose une fixture PDF synthétique locale, les autres fichiers gardent le repli manuel. | Activation météo adaptée à l'usage, recette interactive ; adaptateurs POS/OCR et correction contrôlée |
| Prévision | La page Prévisions sépare la baseline F1 des ventes (28 jours de calendrier complets requis) des estimations d'écoulement d'ingrédients. **Services et carte** ajoute des estimations par jour/service et carte versionnée, avec historique qualifié, dispersion et saisonnalité conditionnelle. Aucun calcul ne crée d'opération ; F2 météo reste non connecté | Mesurer les performances sur données terrain qualifiées ; fournisseurs météo/événements après cadrage des droits/rétention ; moteur IA hors périmètre full-stack initial |

Les versions et dépendances actives font foi dans [`package.json`](../package.json).
La [cartographie détaillée des écarts](ecarts-techniques.md) confronte cette cible au code actuel, brique par brique.
La [préparation locale de livraison](local-delivery.md) décrit aussi les cookies,
les secrets d'environnement, la disponibilité observée et les limites de reprise.
Le parcours [Services, carte et stocks opérationnels](operational-services.md)
détaille les nouveaux contrats et leurs limites ; le
[plan de vérification](plans/operational-realism.md) conserve les preuves sur base jetable.

Le [lot de continuité du service](plans/service-flow-continuity.md) est un plan
proposé, non implémenté : conserver le contexte entre écrans, guider les opérations
depuis Aujourd'hui et expliciter les blocages sans changer les règles de clôture.
Son [volet Open-Meteo informatif](plans/service-weather.md) est implémenté :
localisation confirmée, météo de la journée et contexte conservé lors de la décision,
sans ajustement automatique des ventes ou achats. Un bouton dans la barre du haut
affiche l'état du ciel (pluie, brouillard, éclaircies…), une icône adaptée et la plage
de température ; il ouvre une modale limitée à la commune, avec les prévisions détaillées
sur demande. Aucun horaire ni service à saisir pour la météo. Sur Services, il suit
la date de la fiche ; ailleurs, aujourd'hui. Le même contexte
alimente la validation du plan. Aucun départ de l'écran ni remontage de la fiche
pour régler la météo ; la continuité complète des brouillons S1 reste à livrer.
La configuration serveur reste désactivée par défaut ; le `.env` local de développement
active désormais l'endpoint public sans clé (`OPEN_METEO_MODE=evaluation`), pas l'usage commercial.
Les horaires restent dans Réglages, sans effet sur la fenêtre météo de journée. Les anciennes
traces météo par service restent lisibles. Un test réel de l'adaptateur
sur Paris a réussi, sans activer la connexion du restaurant. La recette navigateur
reste en attente, conformément à la restriction du plan.

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
`PurchaseOrder`, `PurchaseReceipt`, `PurchaseReceiptLine`, `StockLot`, `WasteRecord` et
`RecommendationDecision`. Les contrats futurs pour les sources externes
([détails](integrations.md)) et leur ingestion devront rester distincts des
payloads bruts des fournisseurs. Le parcours manuel Ticket Z persiste uniquement
des métadonnées, candidats transcrits et décisions.

```text
UI React → hooks/features → client API → API Express → domaine → PostgreSQL
API Express → adaptateur Open-Meteo (optionnel) → cache serveur / contexte de décision
            ↘ futurs fournisseurs POS / OCR / événements
```

La persistance active couvre `User`, `Session`, `Restaurant`, `Supplier`,
`Product`, `Recipe`, `RecipeIngredient`, `StockMovement`, `StockCount`,
`RecipeVersion`, `RecipeVersionIngredient`, `InvoiceDraftRevision`, `Production`, `Prediction`, `SaleItem`, `DailySale`,
`SaleImport`, `SaleContribution`, `SaleContributionEvent`, `TicketZBatch`,
`PosSalesBatch`, `ServiceDay`,
`PurchaseOrder`, `PurchaseOrderLine`, `PurchaseReceipt`, `PurchaseReceiptLine`, `RecommendationDecision`
et `WorkspaceDocument`. Ce dernier conserve les documents structurés (analytics,
préférences, panier, notifications, pièces source, factures et menus), validés aux frontières.
Les services opérationnels ajoutent `RestaurantServiceSchedule`,
`RestaurantServiceSession`, `SaleServiceAllocation`, `ServiceMenuVersion`,
`StockLot`, `StockLotAllocation`, `WasteRecord`, `OperationalIncident` et
`PurchaseCredit`. La fiche de service est un `WorkspaceDocument` révisé,
accompagné de décisions immuables et d'un constat figé à la clôture.
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
Les horaires hebdomadaires et exceptions midi/soir restent distincts de cette
couverture quotidienne. Les sessions conservent leur propre couverture ; une
ouverture planifiée ne vaut jamais vente complète. La ventilation midi/soir des
`DailySale` est explicite, conserve un reliquat non ventilé et devient obsolète
après correction de la vente source. Productions et pertes portent un service
facultatif, sans attribution arbitraire des anciennes opérations.
`Recipe` expose un rendement et une révision optimiste. Chaque création ou
édition ajoute un instantané `RecipeVersion` daté et attribué, avec ses
ingrédients, quantités, noms et unités ; les anciennes productions restent
liées à leur version et leurs déductions ne sont pas recalculées après édition.
Le backfill attribue une version 1 aux recettes préexistantes avec date d'effet
inconnue et laisse les productions historiques sans lien de version lorsqu'il
est impossible de reconstruire cette information. Les dosages bruts et nets
facultatifs sont versionnés ; une production déduit le brut une seule fois.
Les réceptions créent des lots datés et des allocations FEFO tracent les sorties.
Une échéance est renseignée, jamais calculée depuis une durée sanitaire supposée.
Les stocks historiques sans preuve restent sans âge connu. La faisabilité des
recettes exclut les lots échus, signale les échéances inconnues et bloque une
incohérence entre lots et stock ; elle ne remplace pas le stock physique affiché.
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
utilisent désormais les cartes et prévisions opérationnelles par service jusqu'à
la prochaine livraison, selon jours, délai et heure limite du fournisseur.
Elles simulent la disponibilité FEFO par besoin daté et les arrivées attendues,
sans créditer le stock avant réception. Une arrivée future ne couvre pas un manque
antérieur. Paramètres, conditionnements ou données manquants restent explicites ;
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
service, les pertes structurées par leur jour de service, les anciennes pertes
sans déclaration liée par enregistrement UTC et les achats par date de livraison.
Les quantités restent séparées par produit/unité et nature. Le coût d'une perte
brute structurée provient des allocations de lots connues ; les pertes historiques
utilisent le prix snapshoté au mouvement. Les dépenses utilisent uniquement les
réceptions confirmées et leur prix de facture. Les simulations sont séparées.
La section des pertes structurées du Bilan et des exports conserve causes,
évitabilité, produit/lot/préparation et unités déclarées. Parures, invendus et
retours ne déduisent pas une seconde fois les ingrédients déjà consommés, ne
s'ajoutent pas aux sorties brutes et n'ont pas de coût reconstitué arbitrairement.
Les déclarations d'invendus sont partielles, pas une mesure de tous les invendus :
`unavailableMetrics` expose `stockouts` et `complete_unsold_quantity`. Les coûts
inconnus restent indisponibles ; aucune économie réalisée n'est calculée.
L'export opérationnel conserve aussi les mouvements de pertes et leur provenance,
exclut les simulations et ne constitue pas une attestation AGEC.

Avec `monthly=true`, la même route renvoie une page de 12 mois et une
`monthlyPagination` (`page`, `pageCount`, `totalMonths`, `hasOlder`, `hasNewer`).
La première page montre les mois les plus récents de la période choisie ; les
pages plus anciennes restent accessibles sans borne totale de période.

Les panneaux distincts **Sorties estimées par recette** de **Bilan** et
**Prévisions** appellent
`GET /api/workspace/ingredient-outflow-estimates`. L'API ne lit que les lignes
positives de réceptions enregistrées et non simulées, tenant-scopées ; pour
chaque entrée, elle utilise la dernière version datée effective à la livraison
qui contient le même produit dans la même unité. Elle expose portions possibles
et quantités estimées en ventes/pertes selon l'hypothèse 90/10, sans écrire de
vente, perte, production, mouvement ni stock. Les recettes alternatives et les
lignes de plusieurs ingrédients d'une même recette ne s'additionnent pas ; les
autres ingrédients et le stock déjà présent ne sont pas vérifiés. La réponse
sépare aussi `unestimatedReceipts` : l'API identifie chaque entrée sans version
datée compatible et l'interface l'affiche à part. Son lien ouvre **Recettes**
avec une proposition datée construite depuis le produit reçu et les autres
produits du même catalogue. Le restaurateur peut corriger les ingrédients, les
quantités, le rendement et la date ; les autres stocks ne sont pas réputés
disponibles. Cette proposition n'est ni persistée ni prise en compte par les
estimations du Bilan avant sa création explicite ; son écran de revue peut
toutefois montrer un aperçu conditionnel calculé depuis la quantité reçue et
le dosage/rendement proposés, avec la même hypothèse de répartition 90/10. Cet
aperçu reste séparé des ventes mesurées et ne crée aucune écriture. Dans
**Prévisions**, la période de réception est sélectionnable et peut être élargie
à tout l'historique ; aucun plafond de quatre ans n'est appliqué. Une
association non reconnue conserve
le parcours de création manuelle. Lors de la création depuis une réception, le
serveur vérifie le tenant, la ligne enregistrée, l'unité, le produit inclus et
la date d'effet, puis conserve la provenance dans la décision consultable. La
création enregistre une recette versionnée, pas une vente, perte, production ou
sortie de stock. La fenêtre de requête reste choisie par l'utilisateur et ne
fixe pas de limite produit à l'historique.

### Quantités commandables

La politique partagée [`shared/orderQuantity.ts`](../shared/orderQuantity.ts)
s'applique aux propositions d'achat, aux sélections depuis Stocks et à la revue
finale. Elle arrondit le besoin net **après déduction du comptage**, sans arrondir
les dosages, stocks, factures ou réceptions réelles. L'API expose `netNeed`,
`orderStep` et `estimatedQuantity` ; le budget utilise la quantité commandable.
Les pas sont des conventions, pas des conditionnements fournisseur attestés :

- Liquides (`L`) : 0,5 L ; pièces (`pcs`) et douzaines (`dz`) : unités entières.
- Produits au poids : 1 kg par défaut, notamment fruits, légumes et épicerie.
- Catégories viandes/poissons : 0,5 kg ; fromages/charcuterie et beurre : 0,25 kg.
- Herbes et épices identifiées dans le nom (liste explicite dans la politique,
  notamment basilic, persil, poivre, paprika et cumin) : 0,05 kg.

Le serveur vérifie le pas depuis le produit du restaurant pour les décisions,
l'ajout au panier et la validation finale ; l'unité fournie par le client ne
fait pas autorité. Le chef peut modifier les quantités par ces pas avant de
valider. Une ancienne sélection incompatible doit être corrigée explicitement ;
les commandes et décisions déjà enregistrées ne sont pas réécrites. Aucun envoi
fournisseur ni mouvement de stock n'est déclenché par ces propositions.

### Historique

La page **Plus → Historique** (/history) appelle la route tenant-scopée
de lecture seule GET /api/workspace/timeline, sans borne de durée et avec une
coupe « Connu au ». L'API signale les réponses denses et limite chaque type de
ligne à 1 501 lignes lues, puis la réponse à 5 000 événements ; l'interface
invite alors à resserrer la période. Chaque événement sépare date d'effet, date à laquelle
son état est connu et date d'enregistrement ; les provenances affichées sont
pièce source, saisie, hors bilan, à confirmer ou non renseigné. Les statuts
techniques de provenance restent internes. Les pièces sont réduites côté SQL
à des métadonnées (aucun texte de transcription ni ligne brute), et les prix actuels
ne sont pas injectés dans l'historique. Les lignes WorkspaceDocument n'ayant
pas de journal de versions, leur date disponible est la dernière mise à jour ;
les états antérieurs restent inconnus et les entrées modifiées après la coupe
sont masquées. Les mouvements legacy sans snapshots gardent un libellé
historique inconnu. Les liens ouvrent les vues actuelles (un mouvement peut
ouvrir la fiche produit) ; aucune action ne rejoue une décision ni ne modifie
le solde depuis l'historique.

La chronologie inclut aussi la création des commandes internes, les décisions
de suggestion et les réceptions rapprochées. Une commande n'est pas présentée
comme envoyée et son état mutable n'est pas rejoué rétroactivement ; une
réception distingue sa date de livraison de sa date d'enregistrement. Les
enregistrements de fixtures gardent leur provenance de QA et ne sont jamais
utilisés comme opérations du compte Kookia. Les dates de travail des pièces
sont celles utilisées par l'interface ; les dates d'origine ne sont pas
exposées par les API du workspace.

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
  uniquement ; leur extension à des espaces opérationnels ou des seuils globaux
  attend une validation pilote. Les lots opérationnels ont une échéance déclarée
  et des sorties FEFO ; aucune durée sanitaire automatique ni règle de réemploi
  des préparations conservées n'est validée par cette fonctionnalité.
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
