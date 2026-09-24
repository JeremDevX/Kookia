# Référentiel du Goal — Kookia vécue de bout en bout

## 1. Usage, périmètre et vérité

Ce fichier est le **repère durable** du [prompt `/goal`](goal-kookia-prompt.md).
Il décrit le résultat à construire, pas un état livré. Le [plan d'exécution](plan-execution.md)
donne l'ordre et les prérequis techniques ; le [journal du Goal](goal-kookia-progress.md)
conserve les preuves et décisions entre sessions. Relire ces trois fichiers
après compaction ou reprise, puis confronter chaque affirmation au code courant.

L'objectif autonome est une application **locale utilisable de bout en bout
par un restaurateur**, avec un scénario démonstratif sur quatre années civiles
consultables. « Prête » signifie parcours et contrôles vérifiés, pas services
externes inventés, lancement commercial, conformité ou économies prouvées.
La préproduction privée est une activation séparée, seulement si environnement
et autorisation existent.
Préserver `AGENTS.md`, les données existantes, les modifications de travail non
commitées et la séparation entre démonstration et activité réelle.

**Sources de vérité, dans cet ordre :** code/tests/schéma et état de la base
isolée ; [référence technique](../technical-development.md) ;
[parcours actuels](../parcours-techniques-actuels.md) ;
[simulation Camille](restaurant-simulation.md) et
[inventaire du corpus](../../données%20restaurants/README.md) ;
[parcours produit](../product-parcours.md), [design](../design-system.md),
[prévision](forecast-engine.md), [sources](../integrations.md) ;
[cadrage historique](../references/cadrage-jalons.md). Si deux sources
divergent, vérifier le code, consigner la divergence et corriger le document
qui induit en erreur.

## 2. Ce qui existe, sans surinterprétation

Le runtime actuel est React/TypeScript → API Express/TypeScript →
PostgreSQL/Prisma, avec sessions et espace par propriétaire. Ventes manuelles/
CSV, stock et mouvements, recettes seedées, facture manuelle et réception,
commande relue avec décision, bilan et baseline expérimentale existent. POS,
Ticket Z/OCR connecté, météo réelle, prévision IA et envoi fournisseur
n'existent pas. La validation de commande crée « à transmettre », pas « envoyé ».

Les **431 fiches Markdown transcrites**, déjà suivies dans
`données restaurants/factures/`, sont importables dans l'archive métier et
consultables depuis une sous-section de la modale Factures. Ce ne sont ni 431
réceptions vérifiées, ni les PDF originaux, ni un OCR opérationnel. Le code à
examiner d'abord est `server/src/scripts/sourceInvoices.ts`,
`server/src/scripts/restaurantSimulationPlan.ts`,
`server/src/scripts/restaurantSimulationReceipts.ts`,
`server/src/application/workspace/invoiceService.ts`,
`server/src/http/invoiceRoutes.ts`, `src/components/dashboard/InvoiceModal.tsx`
et `SourceInvoiceArchive.tsx`. Le parcours actuel n'offre pas encore une action
continue « reprendre cette pièce → corriger ses lignes → réceptionner ».

| Mesure du corpus/scénario actuel | Interprétation obligatoire |
| --- | --- |
| 431 fiches : 415 classées `invoice` par défaut par le parser, 15 avoirs, 1 bon de livraison ; 430 dates de démonstration et 1 sans date | Classement technique à **vérifier sur la pièce**, pas 415 factures opérationnelles validées ; avoir/BL ne deviennent pas réceptions par défaut. |
| Dates originales lisibles 2018-08-09→2021-12-30, décalage de 1 728 jours vers 2023-05-03→2026-09-23 | **Quatre années civiles traversées**, pas quatre exercices complets. Le parser ne structure que 429 dates originales : une autre reste incertaine en texte et une pièce est sans date ; afficher « à confirmer » plutôt qu'en inventer une. |
| 2023 : 3 fiches ; 2024 : 57 ; 2025 : 184 ; 2026 : 186 ; 1 sans date | Couverture très inégale ; nombre de pièces ≠ croissance de l'activité. |
| 1 064 lignes parsées, 173 mappées au catalogue de scénario, 21 non exploitables, 870 hors carte, 220 fiches sans ligne de stock parsée | Afficher les taux et motifs de couverture, pas « 431 factures intégrées au stock ». |
| 151 réceptions de scénario dérivées des pièces et 2 574 réapprovisionnements synthétiques | Ces deux catégories sont **simulées** ; ni l'une ni l'autre ne prouve une livraison constatée. Les réappros ne sont pas des factures ou commandes. |
| 946 jours de service, 5 026 ventes et 5 026 productions, 100 431 portions vendues et 1 531 invendues | Tous ces volumes sont **simulés**. Le taux de perte hypothétique ne mesure pas le gaspillage réel. |
| Six recettes de démonstration reliées aux ingrédients et 31 469 mouvements de stock | Le scénario lie déjà des opérations, mais Dashboard/recommandations/menu et certains graphiques restent seedés, non réconciliés avec les ventes simulées. |

Les originales PDF/images de `factures fournisseurs/` sont locales et ignorées
par Git. Ne pas recopier pièces brutes, identifiants, coordonnées ou secrets
dans une fixture, un log, une capture, un commit ou un service tiers. Les
transcriptions restent **à confronter aux originaux** avant toute opération
réelle. Le parser n'a pas de confiance OCR structurée par champ : ne pas
fabriquer un score. Les prix HT, TTC ou sans base connue et les hypothèses de
conditionnement restent distincts ; les valeurs aberrantes restent auditables.
Les transcriptions déjà suivies en Git doivent faire l'objet d'un audit de
sensibilité et de droit d'usage avant tout partage du dépôt ou exposition en
préproduction. CI, captures et environnements partagés utilisent des fixtures
anonymisées, jamais les pièces privées copiées telles quelles.

## 3. Le récit démonstratif demandé : vivant, explicite, réversible

Créer une **histoire fictive cohérente de Camille**, explorée par date de
service et par chapitre, qui donne l'impression d'un restaurant effectivement
utilisé pendant la période représentée. Réemployer d'abord le générateur
existant : ne pas écraser ni réimporter aveuglément Camille. Une donnée de
source peut ancrer un épisode ; recettes, portions, fermetures, pertes,
incidents et décisions ajoutés sont des **hypothèses/scénarios**. Ne jamais
présenter ce récit comme l'histoire réelle du restaurant.

Le fil est **continu** : mêmes produits/fournisseurs, soldes reportés, carte et
versions de recettes évoluant dans le temps, corrections et décisions qui ont
une conséquence visible au service suivant. Ne pas fabriquer quatre tableaux
annuels indépendants. Partir des six plats déjà simulés (Margherita, Reine,
Caprese, Carbonara, César, poulet rôti–pommes de terre), puis proposer si le
corpus le justifie des fiches *candidates* avec ingrédients, quantités et
rendement à confirmer ; aucun plat n'est attesté par la seule présence de ses
ingrédients sur une facture. Chaque chapitre doit pouvoir être vécu comme une
journée de travail : ouverture et tri des tâches, préparation/service,
correction de fin de service, achat, réception suivante et retour au bilan.
Auditer les familles d'ingrédients du corpus avant d'étendre la carte, sans
forcer les 870 lignes hors carte en stock. Montrer au moins deux **fiches recette
candidates** appuyées par des ingrédients traçables : l'une corrigée/confirmée
dans le bac de démonstration, l'autre laissée en attente ou écartée. Quantités,
rendements et association à un plat restent des hypothèses éditables. Si la
couverture ne permet pas deux propositions défendables, consigner le manque
plutôt que fabriquer de fausses pièces ou de fausses recettes « observées ».

| Chapitre de la démonstration | Récit opérationnel à construire et traverser | Limite à afficher |
| --- | --- | --- |
| 2023 — premier suivi visible | Camille **consulte et classe** les premières pièces, constitue le catalogue et vérifie un stock d'ouverture fictif ; des services fictifs lient carte, préparations, ventes et premiers écarts. Une journée sans pièce ni vente est montrée comme inconnue ou fermée selon le calendrier fictif, jamais zéro présumé. | Seulement 3 fiches, **aucune ligne parsée ni réception sourcée** : aucun crédit de stock issu de ces pièces ni chiffre annuel réel défendable. |
| 2024 — routine d'achat | Les pièces disponibles ancrent plusieurs réceptions revues. Camille retrouve depuis un ingrédient les pièces, prix et mouvements ; depuis une recette elle voit besoins et faisabilité ; elle corrige une unité ou un fournisseur avant de recevoir. | 57 pièces disponibles n'établissent pas toutes les livraisons de l'année. |
| 2025 — ajustements de carte | Une version de recette change à date effective ; anciennes productions gardent l'ancienne version. Un avoir, une ligne ambiguë et une variation de prix déclenchent revue, non crédit automatique. Dans la fixture locale, une version Carbonara prend effet le 16 juin ; un comptage de tomates montre un surstock le 13 juin, suivi d'une perte explicite le même jour. Le 26 décembre, un comptage de crème insuffisant bloque une demande de 35 portions sans mouvement de sortie ; le réassort simulé précède seulement la production planifiée suivante. Aucun solde négatif n'est inventé. | Tous les nombres/épisodes de ce chemin sont synthétiques et non observés, non des recommandations de recette ou d'exploitation. Surstock, rupture, perte, ventes et composition restent simulés sauf preuve source explicite. |
| 2026 — service et achat à venir | Camille complète le dernier service, vérifie stock et factures à traiter, consulte une estimation seulement si les jours sont couverts, revoit une quantité et valide une commande « à transmettre » ; la réception future reste distincte. Le bac garde un comptage courant explicite, seul point d'entrée autorisé aux idées de menu sur surplus ; péremption inconnue. Montrer aussi source en panne, service partiel et stock périmé. | 186 pièces datées seulement jusqu'en septembre ; le comptage final est une donnée de démonstration, et les 28 jours de baseline/impact économique ne sont pas une performance terrain. |

Ces épisodes sont des **scénarios de recette** à placer sur des dates compatibles
avec les données et les règles de service, sans écraser une saisie humaine.
L'agent peut améliorer la narration après avoir observé le corpus, mais il doit
conserver ces quatre types de situation et leur étiquette de preuve. Un mode
« voir au jour du service » doit figer les données connues à cette date : pas
d'adresse, prix, recette, météo, facture ou vente du futur dans un écran passé.
La date de consultation du navigateur n'est pas une preuve que septembre 2026
est « aujourd'hui » lors d'une future session.

Modéliser pour les vues et calculs historiques `effectiveAt` (date de service ou
d'effet métier), `knownAt` (date à laquelle l'information était disponible) et
`recordedAt` (date de saisie). Conserver à part date originale de pièce et date
décalée de démonstration. Un backtest et une vue passée utilisent uniquement
les données **connues alors** ; filtrer le seul calendrier affiché ne suffit pas.
Si `knownAt` n'est pas attesté par la source, l'usage historique est une
hypothèse de scénario étiquetée ; ne pas supposer qu'une facture datée était
déjà disponible pour un calcul passé.

Pour **2024–2026** : au moins un parcours complet pièce → correction → stock →
recette/production → service → bilan/décision est rejouable et contrôlable. En
**2023**, le parcours part d'une pièce consultée/classée sans effet de stock,
puis d'un stock d'ouverture ou réapprovisionnement fictif **séparé** ; il ne
simule pas une réception sourcée absente. Chaque année possède aussi un cas
incomplet ou anormal. Le corpus entier reste recherchable, mais
les pièces sans ligne exploitable demeurent consultables **sans effet de stock**.
L'historique doit conserver la source, les corrections, leur auteur/date et la
version de règle ou d'hypothèse utilisée.

Ce minimum ne remplace pas la **continuité de toute la période** : vérifier
calendrier de service ouvert/fermé/partiel/inconnu, semaines représentatives de
chaque saison disponible, passages entre années, trajectoire des stocks, prix,
fournisseurs et carte, et KPI mensuels recalculés depuis les mêmes opérations.
Les trous documentaires restent visibles ; seule une simulation étiquetée peut
les combler. Une vue historique est **en lecture seule** sur les données
conservées. Pour rejouer une décision passée, utiliser un bac à sable séparé
avec un bouton « Rejouer ce geste » ; ni visite ni clic historique ne modifie
le stock courant. Une correction rétroactive réelle nécessiterait un recalcul/
contre-mouvement contrôlé et n'est pas un simple changement de date.

## 4. Ontologie de preuve et invariants métier

Toute valeur décisive possède `restaurant`, date de service, unité, source,
statut et, si elle est dérivée, références/versions des entrées. À la fois dans
les calculs et l'interface, distinguer : **pièce transcrite à confirmer**,
**hypothèse de conversion ou de recette**, **opération simulée**,
**opération confirmée par l'utilisateur** et **inconnu**. Un badge seul ne
suffit pas si le KPI agrège différentes provenances : afficher couverture et
détail des exclusions. La provenance est **transitive** : une réception validée
*dans le bac de démonstration* reste simulée dans stock, bilan, suggestions et
exports ; le clic humain ne la transforme pas en achat réellement observé.

1. **Archive seule ≠ réception.** L'extraction ou la présence en archive ne crée
   aucun mouvement. La simulation existante a cependant déjà créé 151
   réceptions **étiquetées démonstration** à partir de certaines pièces : une
   nouvelle facture manuelle issue de la même pièce doit les rapprocher, jamais
   ajouter silencieusement un second crédit. Établir une identité source commune
   entre archive, brouillon, mouvements, commande et livraison, avec contrainte
   d'unicité/idempotence côté serveur sur l'effet accepté par pièce et test de
   concurrence. Type,
   fournisseur, date, produit, quantité, unité,
   conditionnement, prix et base HT/TTC doivent être revus. Avoir, consigne,
   bon de livraison et doublon suivent chacun leur politique explicite.
2. **Réception ≠ commande.** Une commande validée reste à transmettre ; un
   éventuel envoi est un geste séparé ; seul le reçu confirmé rapproche pièce,
   livraison et commande puis crédite une fois le stock.
3. **Achat ≠ consommation.** Les ingrédients achetés ne prouvent pas ce qui fut
   cuisiné. Les factures peuvent **suggérer** des recettes candidates ; une
   recette, ses proportions, portions et rendement doivent être confirmés ou
   marqués hypothétiques dans la simulation.
4. **Vente ≠ production.** Associer article vendu ↔ version de recette à dates
   effectives. Une production validée peut déduire le stock une fois. Une
   consommation *estimée* depuis les ventes est un calcul distinct, jamais un
   second mouvement. Invendus et pertes exigent leur propre source/étiquette.
5. **Manquant ≠ zéro.** Jour fermé, ouvert sans vente, partiel et non renseigné
   sont quatre états. POS, CSV, Ticket Z et saisie se réconcilient ; ils ne se
   somment pas silencieusement. Un Ticket Z sans détail article ne prouve pas
   des quantités par recette. Une annulation de vente retire une quantité
   erronée avec audit ; un remboursement financier est un événement distinct
   et ne diminue pas les unités vendues sans preuve d'annulation des articles.
6. **Stock théorique ≠ compté.** Afficher dernier comptage, réceptions, pertes,
   productions et écart ; un stock initial ou simulé ne devient pas fiable par
   ancienneté. Les unités ne changent pas par simple édition après mouvement.
7. **Suggestion ≠ décision.** Stock, prix, recette, prévision et commande
   portent leurs limites. Le chef peut écarter/modifier/valider ; proposition et
   décision sont conservées côté serveur. Aucune source, simulation ou recalcul
   ne déclenche un envoi fournisseur. Dans l'espace réel, des ventes
   `demo_simulation` ne peuvent pas valider un achat opérationnel. Dans le bac
   isolé, le scénario peut enregistrer **décision, commande et réception
   simulées**, avec provenance transitive et aucun chemin vers l'envoi réel.
   Une prévision calculée sur ces ventes sert à tester la cohérence du scénario,
   jamais à publier une précision mesurée sur des restaurants.
8. **Bilan ≠ preuve d'économie.** N'additionner ni kg avec pièces, ni HT avec
   TTC inconnu, ni hypothèses avec montants observés. Ventes, dépenses reçues,
   coût matière estimé et pertes constatées ont périodes, dénominateurs et
   exclusions distincts. Aucun label AGEC/HACCP ou « gaspillage évité » sans
   vérification indépendante et méthode terrain. `DailySale` ne contient pas
   un prix de vente : **aucun chiffre d'affaires ni marge** sans prix de vente
   sourcé ; le coût matière reste indicatif avec date et base de prix.

## 5. Chaîne d'interface et placement des gestes

Ne pas résoudre chaque exigence par une nouvelle page. Partir des cinq
destinations **Aujourd'hui, Achats, Stocks, Ventes, Plus**, puis relier les
écrans par des actions contextuelles. Le parcours primaire doit être faisable
sur téléphone, tablette et bureau, sans tableau horizontal obligatoire ni
réouverture de trois menus entre deux étapes. La complexité est dans les
services métier ; la première ligne de l'écran montre **état → raison → action**.

| Lieu | Information immédiatement utile | Geste direct, puis détail facultatif |
| --- | --- | --- |
| Aujourd'hui | Une priorité du service ; 3–4 repères maximum : ventes couvertes/à compléter, stocks à vérifier, factures à traiter, commandes à revoir/à transmettre. Chacun avec date et source. | Ouvrir exactement la correction ou revue concernée. Les chiffres décoratifs et graphiques seedés ne précèdent pas la tâche. |
| Factures et réceptions | Dossiers « à vérifier », « prêts à recevoir », « reçus », archive ; recherche par date/fournisseur/statut ; date source et date démo distinctes. Le dossier de revue est une étape identifiable d'Achats, pas seulement un `<details>` de modale. | Depuis une pièce, vérifier/corriger les lignes, enregistrer et reprendre plus tard, voir la conséquence stock, puis réceptionner explicitement. Depuis produit/commande, retrouver la pièce liée. Pas de transcription brute comme seule expérience. |
| Stocks | Quantité/unité, dernier comptage, seuil, raison de « à vérifier », dernières entrées/sorties. | Compter/ajuster, ouvrir pièce liée, voir recettes utilisatrices, ajouter à une commande. Une urgence supposée n'est pas montrée en rouge comme certitude. |
| Recettes | Ingrédients, portions/rendement, version, faisabilité et coût matière indicatif avec base de prix. | Créer/corriger/valider la fiche, produire avec déduction unique, retrouver article vendu et mouvements ; erreur d'unité proche du champ. |
| Ventes | État du dernier service, source, couverture et lignes à corriger. | Saisir/importer/réconcilier, associer article à recette ; historique et estimation test viennent après le geste. |
| Achats | Besoin, stock vérifié ou à vérifier, quantité/unité, fournisseur/coût indicatif, raison et provenance. | Écarter/modifier, relire **une seule** commande, valider puis voir « à transmettre » ; réception reste distincte. |
| Bilan | Période, données couvertes/exclues, dépenses reçues, ventes enregistrées et pertes selon leurs catégories de preuve. | Explorer source depuis un KPI et revenir ; export opérationnel sans revendication réglementaire. |
| Histoire sur quatre années | Année, date de service « vue à cette date », épisodes, liens vers pièces et opérations. | Passer de l'épisode à l'écran métier pertinent et revenir à la même date ; le mode démo est identifié sans contaminer l'activité réelle. |

Chaque action importante a chargement, succès, erreur, vide, donnée partielle,
conflit et rejeu compréhensibles. Préserver le brouillon si une requête échoue.
Le bouton est au moment de la décision ; aucun CTA n'annonce un effet qui n'a
pas eu lieu. Les liens emmènent au bon objet, pas à la racine de sa rubrique.
Après chaque opération, montrer l'état mis à jour et le **prochain geste** :
pièce reçue → produit/mouvement ; vente corrigée → recette ou bilan ; commande
validée → à transmettre ; réception → stock/écart. En revenant, conserver
date, filtre et brouillon de travail. Vérifier ces allers-retours sur mobile.

## 6. KPI, identité visuelle, accessibilité et mots

Un KPI n'existe en première vue que s'il modifie une décision : **question
métier, calcul, période, couverture, unité, source, fraîcheur, action** sont
documentés. Préférer « 3 factures à vérifier » à un montant cumulé sans statut ;
« stock compté hier » à une fausse précision ; « 2 commandes à transmettre » à
un taux de performance sans dénominateur. L'agrégation de démo et de réel ne
doit jamais donner un total silencieux. Conserver les KPI secondaires dans le
Bilan, avec accès aux opérations qui les composent. Pour chaque KPI testé,
vérifier numérateur, dénominateur si applicable, date, fraîcheur, action et
retour aux données sources, y compris jour absent et données simulées.

Les couleurs doivent être visibles sur **bandeaux de situation, fonds de cartes,
zones de correction, alertes et encarts de succès**, pas uniquement sur un petit
bouton/badge. Réutiliser les tokens `src/styles/index.css`, puis harmoniser
neutre/inconnu/démonstration, ambre/à vérifier, rouge/blocage réel et vert/
confirmé. Chaque couleur est accompagnée d'un titre, d'un pictogramme ou d'une
forme et d'une raison textuelle ; pas de rouge pour une simple hypothèse ni de
succès vert avant confirmation. Contrôler contrastes des grandes surfaces,
textes, bordures et focus sur thèmes existants, avec mouvement réduit.

Microcopie : vocabulaire de cuisine et de gestion quotidienne, phrase courte,
effet exact, sans charabia ni paragraphe défensif. Employer « Service du … à
compléter », « Facture à vérifier », « Stock compté hier », « Recette à
corriger », « Quantité à revoir », « Commande enregistrée, à transmettre »,
« Réceptionner et ajouter au stock ». Réserver `OCR`, endpoint, baseline,
score, tenant, pipeline et version technique aux diagnostics. « 0 vente » n'est
autorisé que pour un service explicitement complet à zéro ; « envoyé » seulement
après envoi réussi ; « économie » seulement après mesure vérifiable.
Dans l'interface, préférer « services renseignés / à compléter » à
« couverture », « recette utilisée ce jour-là » à « version », « ingrédients
prévus / réellement sortis » à « consommation estimée » et « facture d'origine »
à « source ». Le détail technique peut être déplié ; l'avertissement démo doit
rester bref et proche du chiffre, pas remplir tout l'écran.

Vérifier écran étroit, tablette, bureau et zoom important ; actions tactiles
séparées, grands objets manipulables sans zoom, lecture verticale, libellés de
champs visibles, navigation et dialogues au clavier, ordre/focus/retour du
focus, annonce des erreurs et mises à jour, aucune information portée par la
couleur seule. L'agent doit **rendre et regarder** les écrans (captures ou
navigateur), corriger ce qui gêne le parcours, puis re-tester ; lint seul ne
valide pas une interface. Vérifier aussi un vrai passage avec technologie
d'assistance sur les flux pivots (navigation, dialogue, succès/erreur,
tableau ou cartes) et agrandissement du texte, en plus du contrôle visuel.
Matrice rendue minimale : largeur étroite d'environ 320–375 px, tablette
d'environ 768 px et bureau d'au moins 1280 px, puis zoom texte/page à 200 %, sur
les parcours pivot et leurs états long, vide, chargement, erreur et conflit.
Noter débordement, masquage, ordre de lecture et gêne tactile ; une capture
seule ne prouve pas la navigation au clavier ou au lecteur d'écran. Les temps
du prototype Jalon 1 restent des cibles à mesurer, pas des performances acquises.

## 7. Vérification, autonomie et fin du Goal

Avant les incréments produit : appliquer Q1 puis Q1b du [plan](plan-execution.md), base
de tests réellement isolée et garde-fou d'URL. Les scripts actuels
`import:invoices -- --write` et `simulate:restaurant -- --write` ciblent Camille
localement ; **ne pas les relancer pour tester**. Utiliser une copie de scénario
jetable/anonymisée et des règles réutilisables plutôt qu'un reset des données
conservées. Ces scripts refusent volontairement une autre base : extraire les
règles pures et créer un **amorçage séparé** de fixture/tenant de test, sans
desserrer leurs garde-fous Camille. Pour une migration de données à conserver :
sauvegarde, essai de restauration et accord explicite si action destructive ou
risquée. Le journal de reprise est édité par l'agent intégrateur principal,
non simultanément par plusieurs sous-agents.

Faire des **commits locaux fréquents**, après chaque tranche verticale cohérente
et vérifiée, avec un message décrivant le résultat métier et la preuve. Ajouter
explicitement les seuls fichiers de la tranche : ne pas embarquer les
modifications préexistantes d'un autre travail, les pièces privées, secrets,
fixtures non anonymisées ou artefacts de test. Garder les migrations et leur
procédure de retour arrière dans un commit identifiable. Ne pas pousser vers un
dépôt distant sans instruction distincte. Inscrire le hash de chaque commit
dans le journal de reprise.

**Portée de fin locale obligatoire :** Q1/Q1b/Q2, D1–D6, C1–C3, I1,
I2–I4 sur fixtures avec correction/repli, F1–F4 évalués sur les données
autorisées disponibles (ou affichant honnêtement l'insuffisance), O1 sous forme
de fiche non envoyée, O2, M1, M2 **sur surstock compté/étiqueté du bac démo
sans seuil haut global**, M3 comme export **opérationnel** et R0. M4
reste une décision différée, pas un faux module EDI/HACCP. Les fournisseurs
réels, pilotes, précision terrain, claims réglementaires et R1 sont des
**activations externes distinctes** : « préparé sur fixtures » n'est jamais
« connecté/validé terrain ». Cette séparation ne dispense pas de livrer un
parcours manuel fonctionnel et les tests négatifs associés.

### Matrice minimale de preuves

| Parcours à prouver | Cas normal et cas qui doit échouer correctement |
| --- | --- |
| Corpus → facture | Une pièce datée est retrouvée, ses lignes/prix/unité sont revus, un brouillon sourcé est conservé. Pièce à date originale incertaine, illisible, avoir et doublon ne créent aucun nouveau stock sans revue. |
| Facture → réception → stock | Une confirmation crédite exactement une fois et reste consultable depuis pièce et produit. Double clic, correction concurrente, autre restaurant et pièce déjà utilisée par la simulation ne doublent rien. C1 refuse explicitement la réception partielle non prise en charge ; O2 prouve ensuite la vraie réception partielle rapprochée. |
| Produit → recette → production | Version de recette applicable et rendement convertissent des quantités cohérentes ; la production confirmée déduit une fois. Édition ultérieure, unité incompatible et stock insuffisant préservent l'historique. |
| Pièces → idées de recette | Au moins deux candidates relient leurs ingrédients aux familles de pièces, exposent les quantités/rendements supposés ; une est corrigée/confirmée dans le bac démo, l'autre reste en attente ou est écartée. Aucune ne se présente comme plat réellement cuisiné sans preuve de production. |
| Service → vente → consommation | Vente simulée ou observée, jour couvert/partiel/fermé/manquant, article associé à recette ; consommation estimée distincte du débit de production. Rejeu/annulation ne produit pas de seconde consommation. |
| Stock/vente → achat | Raison, source, date, incertitude et quantité lisibles ; chef modifie/écarte/valide ; décision persistée, commande à transmettre sans envoi. Stock non compté ou recette absente dégrade la suggestion. |
| Chronologie → bilan | Explorer semaines/saisons représentatives et transitions entre les quatre années civiles ; retrouver pièce, opération, résultat et source ; KPI mensuels réconciliés, trous visibles. Démo/hypothèse persistantes ; date future ne fuit pas dans une vue passée ; visite historique sans effet sur le présent ; période insuffisante sans économie fictive. |
| Interface → tâche | Sur téléphone/tablette/bureau et clavier, corriger une facture, vérifier un stock, lier une recette, compléter un service et revoir une commande sans impasse. Tester chargement/erreur/long libellé/contraste et corriger après inspection rendue. |
| Livraison technique | `npm run lint`, `npm run build`, `npm run build:api`, `npm test`, intégration sur DB isolée, liens/docs cohérents, migration/rollback prouvés. Le rapport final donne commandes et résultats exacts. |

Une revue indépendante (sous-agent si disponible) doit chercher des trous **de
chaîne métier**, doublons, claims non justifiés, bugs clavier/mobile et
régressions à chaque jalon cohérent. Réparer et revérifier avant d'avancer.
Déléguer les enquêtes, les implémentations non concurrentes et la revue ;
l'agent principal intègre et garde la responsabilité du résultat. Ne pas laisser
deux agents modifier le même fichier simultanément.

La fin du Goal exige une matrice de parcours passée, données de démonstration
rejouables et traçables, captures/observations UI, contrôles CI applicables
verts, documentation actuelle et liste honnête des seules activations externes
encore en attente. Ne pas conclure après une simple première passe ou parce
qu'un lot manque de données. Si une porte externe reste fermée, terminer les
adaptateurs/fixtures et le repli utilisable, marquer « préparé, non activé » ;
si un bloqueur empêche réellement tout progrès utile, indiquer preuve, essais,
impact et entrée nécessaire. Aucun déploiement public, envoi fournisseur ou
exposition de données tierces n'est implicite dans ce Goal.
