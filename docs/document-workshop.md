# Atelier documentaire Maison Sureau

## Lancer à côté de Kookia

Depuis la racine, après `npm install` :

```bash
npm run documents:dev
```

Ouvrir <http://127.0.0.1:5180>. Arrêt : `Ctrl-C` dans le terminal concerné.
L’interface de l’atelier est autonome. Elle prépare les dossiers dans le
navigateur et les télécharge à la demande.

```bash
npm run documents:build
npm run documents:preview
```

Le build autonome est dans `dist/document-workshop`. Le build principal vide
`dist` : reconstruire l’atelier après `npm run build` si nécessaire.

## Suivre la génération automatique

Depuis le tableau de bord de l’espace de test, ouvrir **Génération automatique**.
Le générateur retrouve la session Kookia sur le même domaine. **Dossiers à
exporter** permet de préparer un dossier autonome.

Le suivi affiche la dernière journée confirmée, le dernier passage et la
prochaine exécution en heure de Paris. **Aujourd’hui** présente les services
ouverts, leur fréquentation prévue et l’effet de la météo. Dans l’historique,
une journée détaille les ventes, préparations, pertes et mouvements transmis.
Pour les transferts anciens, certains stocks d’ouverture et de clôture sont
inconnus. Les nouveaux transferts conservent ces soldes avec la date.

Le propriétaire peut ajuster les couverts de référence et la cadence des
imprévus à partir de la prochaine journée indiquée. La grille hebdomadaire
de Kookia, si elle est renseignée, fixe les services à simuler. Une journée
déjà préparée conserve son scénario lors d’une reprise. En cas d’échec, le
panneau indique l’étape concernée et conserve la dernière clôture confirmée.
Après correction du blocage, **Relancer le transfert** ajoute une demande au
processus habituel. Une journée confirmée ne génère aucun double mouvement.

Le suivi des suggestions, commandes validées et réceptions liées s’appuie sur
le mode connecté de l’espace de démonstration. Les validations restent dans
**Achats**.

## Synchroniser le compte de test Kookia

Sur le serveur du générateur, `npm run documents:sync` simule chaque journée du
profil Maison Sureau jusqu’à la veille en heure de Paris. Une exécution traite les
dates dans l’ordre. Elle reprend les lots et les commandes en attente de la
dernière journée transmise. L’API alimente les ventes et le calendrier de service
de l’espace de test désigné. Les ventes portent la provenance
`demo_simulation`. Les quantités suivent les portions servies du CSV quotidien.
Le mode de synchronisation avec stock rapproche les lots d’ouverture et ajoute
les entrées et sorties simulées jusqu’au solde de clôture. Les mouvements portent
la provenance de l’atelier. Le mode avec opérations ajoute les commandes,
réceptions et factures simulées, les préparations, refus et pertes, ainsi que les
services et la ventilation des ventes. Les cartes sont renseignées lorsqu’une
version datée de chaque recette existe. Les PDF restent dans le dossier
documentaire.

Variables du processus de synchronisation, à renseigner côté serveur :

| Variable | Valeur |
| --- | --- |
| `WORKSHOP_API_ORIGIN` | Origine de l’API Kookia, en HTTPS ou en HTTP sur loopback. |
| `WORKSHOP_IMPORT_TOKEN` | Jeton dédié partagé avec l’API, distinct du mot de passe du compte. |
| `WORKSHOP_START_DATE` | Première date à transmettre, au format `AAAA-MM-JJ`. Choisir une date libre dans l’espace de test. |
| `WORKSHOP_STATE_FILE` | Chemin absolu du fichier de reprise, hors du répertoire de publication. Son dossier doit exister. |
| `WORKSHOP_STOCK_STATE_FILE` | Facultatif. Chemin absolu distinct du fichier de reprise des ventes. Active l’envoi conjoint des ventes et des stocks. Le premier envoi compare le stock Kookia au stock d’ouverture du dossier. |
| `WORKSHOP_OPERATIONS_STATE_FILE` | Facultatif. Chemin absolu distinct des autres fichiers de reprise. Active l’envoi des opérations en plus des ventes et, si configuré, du stock. |
| `WORKSHOP_OPENING_CHECKPOINT_FILE` | Facultatif. Chemin absolu du `stock-reprise.json` du dossier précédent. Sa clôture doit précéder d’un jour la première date à transmettre. Conserver ce fichier pour les reprises suivantes. |
| `WORKSHOP_LIVE_WEATHER_FROM` | Facultatif côté générateur. Première journée qui utilise la prévision Open-Meteo de l’espace de test. Choisir une journée encore à transmettre. |
| `WORKSHOP_CONTROL_FROM` | Facultatif côté générateur. Date de début des réglages liés à l’espace Kookia et du suivi des passages. |
| `WORKSHOP_SCHEDULE_TIME` | Facultatif côté API. Heure planifiée en Europe/Paris, au format `HH:MM`. Elle doit correspondre à la tâche du serveur. |
| `WORKSHOP_VARIATION_FROM` | Facultatif. À partir de cette date de service (`AAAA-MM-JJ`), activer la météo simulée avec terrasse et les imprévus variés du scénario. Conserver cette date d’activation pour les rejeux. |
| `WORKSHOP_FOLLOW_VALIDATED_ORDERS_FROM` | Facultatif. Date de début du mode connecté, identique côté API et générateur. Exige un espace de démonstration dédié, les stocks, les opérations et la prévision. |
| `WORKSHOP_FORECAST_ENABLED` | Facultatif. `true` côté générateur et côté API pour publier la prévision simulée du jour dans le tableau de bord de l’espace de test configuré. |
| `WORKSHOP_REQUEST_TIMEOUT_MS` | Facultatif. Délai maximal par envoi, 30 000 ms par défaut. |

Configurer le même `WORKSHOP_IMPORT_TOKEN` dans l’API Kookia ainsi que
`WORKSHOP_IMPORT_RESTAURANT_ID`, l’identifiant serveur de l’espace du compte de
test. Le mode `demo` est accepté par défaut. Si cet espace de test a déjà le
mode `operational`, autoriser explicitement cette cible dans l’API avec
`WORKSHOP_IMPORT_ALLOW_OPERATIONAL_TEST_WORKSPACE=true`. Conserver le jeton dans
les secrets des deux processus. L’API reste désactivée sans jeton ni identifiant.

Planifier une exécution quotidienne après minuit, heure de Paris. Conserver
le fichier de reprise entre les déploiements. Si la relance est activée, planifier
aussi `npm run documents:sync -- --retry-requested` toutes les minutes. Ce passage
ne lance le transfert qu’en présence d’une demande. Les deux tâches doivent
partager un verrou exclusif pour le même fichier de reprise. Le [script d’activation du VPS](../scripts/enable-workshop-control.sh) configure les deux tâches et vérifie la version attendue.

Un échec arrête la transmission sur sa date. Après correction,
relancer avec le même fichier de reprise. Si l’API avait enregistré la journée
avant la coupure, elle reconnaît le même envoi et le générateur poursuit. Une
date déjà occupée ou un contenu différent pour une date transmise déclenche un
conflit à examiner dans Kookia.

Les variations du scénario dépendent de la date et du numéro de dossier. Un
rejeu reproduit la fréquentation, la météo et les incidents de la journée. Un
créneau d’imprévu est prévu tous les trois jours calendaires si le restaurant est
ouvert ce jour-là. Les commandes en attente à l’activation sont reprises depuis
la clôture précédente.

Pour ajouter les stocks à un dossier dont les ventes ont déjà été transmises,
réutiliser le fichier d’ouverture et la première date du dossier avec un nouveau
`WORKSHOP_STOCK_STATE_FILE`. Les ventes identiques sont reconnues. Les écritures
de stock se font dans les lots rapprochés et s’arrêtent en cas d’écart d’ouverture.
Un mouvement simulé met à jour le stock et n’atteste pas d’une réception fournisseur.

Un rattrapage des opérations peut rejouer des journées déjà vendues depuis le
point d’ouverture d’origine. Les réceptions et les productions enregistrent le
détail simulé. Le stock est ajusté par son propre rapprochement, une fois par
jour. Les nouveaux imports distinguent la consommation des écarts de
comptage négatifs et rattachent chaque mouvement au lot concerné. Une journée
importée avec l’ancien format reste rejouable si ses données d’origine
concordent. Ses mouvements restent tels qu’enregistrés.
Pour enrichir une période antérieure à la clôture initiale du stock,
transmettre les opérations et les ventes avec une reprise distincte et sans
fichier de reprise stock. La validation des décisions reste dans Kookia.

La prévision simulée utilise la clôture de la veille et le plan du jour. Le
tableau de bord présente les couverts par heure, le chiffre d’affaires estimé aux
prix de la carte et les produits suggérés par le scénario. La prévision expire
en fin de journée à Paris. En mode autonome, les besoins de l’atelier
s’affichent à titre indicatif. En mode connecté, ils sont proposés dans **Achats**.

### Tenir compte de la météo de Kookia

Le jour du service, la synchronisation relève la prévision Open-Meteo pour
la commune enregistrée ou confirmée dans Kookia. Elle utilise aussi le réglage
Terrasse de l’établissement. Le fichier `.weather` conserve le relevé avant
la préparation. Au transfert nocturne, l’atelier reprend ce relevé pour simuler
la veille. Une demande en retard conserve la fréquentation de référence si le
relevé du jour manque. Les journées déjà importées gardent leur historique.

Le midi utilise les heures de 12 h à 15 h et le soir celles de 19 h à 22 h.
La simulation ouvre la terrasse sur un créneau sec, de 15 à 28 °C et avec un
vent inférieur à 25 km/h. La pluie, le vent fort et la fermeture de la terrasse
peuvent réduire les couverts prévus. Les portions et besoins d’achat suivent la
même estimation. Les coefficients sont des hypothèses indicatives. Une heure
manquante ou une prévision relevée après le début de la préparation laisse les
couverts de référence. Le tableau de bord indique l’effet par service.

Conserver les fichiers `.weather` et `.pending` avec le fichier de reprise.
L’atelier autonome et les jours qui précèdent l’activation suivent les réglages
de scénario habituels.

### Suivre les commandes validées dans Kookia

Choisir comme date de début la première journée encore à transmettre. Régler
`WORKSHOP_FOLLOW_VALIDATED_ORDERS_FROM` des deux côtés avec la même valeur.
L’espace ciblé doit être en mode démonstration. Les fiches du catalogue Maison
Sureau doivent correspondre par produit, unité et fournisseur.

La prévision transmet les besoins simulés par date sur 21 jours. Dans **Achats**,
Kookia rapproche ces besoins des lots, du dernier comptage et des quantités en
attente. Vérifier le stock, revoir la suggestion puis valider la commande. La
quantité choisie à la validation et la date prévue alimentent le scénario.
Une suggestion écartée ou laissée dans le panier ne déclenche rien. Aucun
message fournisseur n’est envoyé.

La simulation reprend les stocks et les livraisons déjà en transit. Les
nouvelles réceptions suivent les commandes issues d’une suggestion validée,
à partir du jour suivant la validation. Les 16 lignes les plus anciennes
arrivées à échéance sont traitées en premier. Le reste demeure en attente.
Un retard peut reporter la réception d’un jour. En cas de livraison partielle,
seule la quantité reçue alimente le stock et le reliquat est à nouveau
éligible le lendemain. Les pertes, écarts de comptage et variations de
fréquentation se répercutent sur la préparation, les ventes et la clôture.
Les imprévus dépendent du jour et du numéro du dossier pour rester rejouables.
Les pièces, réceptions et mouvements restent des données de simulation.

Conserver le fichier `.pending` au côté du fichier de reprise pendant une
coupure. Il contient la journée préparée et permet de renvoyer les mêmes
données lorsque l’accusé de réception manque. Après un changement de commande
détecté par l’API, le prochain passage recharge les quantités validées.
Conserver la date de début si une journée a déjà été transmise dans ce mode.

## Préparer un dossier

1. Choisir une période de **1 à 90 jours**, passée ou future. Les raccourcis
   proposent les sept derniers jours, sept jours dès aujourd’hui et quatorze jours
   à venir. Il n’existe pas de limite à quatre ans d’historique.
2. Renseigner les **couverts de référence par jour ouvert**, entre 5 et 200.
   La prévision applique un profil semaine/week-end et saisonnier ; ce champ
   n’est ni une capacité maximale ni une moyenne garantie sur la période.
3. Régler l’écart de fréquentation autour de la prévision, de 0 à 50 %.
   À 0 %, les couverts suivent la prévision, mais le calendrier, le choix des
   plats et les incidents de fréquentation peuvent toujours varier.
4. Dans **Terrasse et météo**, indiquer si le restaurant a une terrasse et choisir
   sans météo, conditions variées, éclaircies, pluie, brouillard ou orage/vent fort.
   Ce sont des **hypothèses de scénario**, pas des prévisions Open-Meteo. Sans météo
   ou sans indication de terrasse, la base semaine/saison reste inchangée.
5. Dans **Jours ouverts, services et carte**, choisir les fermetures (lundi par
   défaut), midi, soir ou les deux. Les deux services répartissent la référence
   à 60 % / 40 %, puis s’arrondissent séparément. Au moins un jour de la semaine
   doit rester ouvert. Café à la commande et formule midi sont facultatifs.
6. Ajuster les parts d’entrée/dessert, de 0 à 100 %. Le **sur-parage de référence**
   est pondéré selon l’ingrédient, en complément de son rendement de préparation.
7. Choisir un incident, ou les imprévus variés, et sa fréquence. Un créneau tous
   les N jours calendaires depuis le début du dossier initial, uniquement sur
   journée ouverte. Un incident fournisseur sans livraison prévue est signalé
   sans effet, pas transformé en réception. Les reprises conservent cet ancrage.
8. Cliquer **Générer** puis télécharger le ZIP. Les réglages modifiés ne changent
   pas le dossier affiché avant génération. Mêmes paramètres, numéro et état
   d’ouverture : mêmes résultats.

La synthèse **De la prévision au service** distingue couverts prévus/demandés et
articles préparés/servis/invendus. Les demandes non servies ne deviennent jamais
ventes. Le détail quotidien expose incidents et nombre de lots reportés.

### Terrasse et météo : une hypothèse explicite

Le détail quotidien et la fiche de prévision montrent la **base avant météo**,
la condition (pluie, brouillard…), les maxima de température/vent, le pourcentage
et le **prévu ajusté**. Les coefficients sont ceux du
[lot météo Kookia](plans/terrace-weather-adjustment.md), mutualisés dans une
[politique pure](../shared/weatherScenario.ts) : pluie −15 % avec terrasse contre
−5 % sans terrasse, par exemple. Ils ne sont pas calibrés sur les ventes réelles.
La base de l’atelier reste un profil semaine/saison, pas un historique de ventes.

La météo varie de façon reproductible par date et numéro de dossier, avec des
températures de travail saisonnières. La même hypothèse de journée vaut pour midi
et soir. Les couverts ajustés sont arrondis par service, puis les portions par
recette et les lots de préparation. Les achats utilisent ce même calcul, avant
déduction du stock et des commandes attendues. Les jours fermés restent à zéro.
La demande est ensuite répartie autour de cette estimation avec l’écart et les
incidents choisis : ce mécanisme **ne prouve aucun gain prédictif**.

La fiche établissement conserve le choix Terrasse. Le guide explique sa reprise
dans les paramètres de Kookia et la confirmation séparée de la commune depuis le
bouton météo. Le dossier ne configure aucune connexion et ne fournit jamais une
météo à importer comme observation réelle. Ne pas appliquer une seconde fois le
coefficient aux quantités déjà ajustées.

## Un déroulement chronologique

- **Avant service** : prévision indépendante des demandes à venir et carte de
  saison avec une entrée, deux plats au choix et un dessert. Les ingrédients sont
  partagés entre recettes ; popularité des plats et prix peuvent évoluer.
- **Achats** : commandes sur besoins prévus jusqu’à la tournée suivante, après
  déduction du stock encore utilisable et des commandes attendues. Maraîcher les
  mardi/jeudi/samedi, frais mardi/vendredi, épicerie mercredi ; commande à la clôture
  de la veille, avant 23 h 59. Une livraison de mise en route est convenue avant le dossier neuf.
  Le répertoire donne les jours de livraison, le délai d’un jour calendaire et
  l’heure limite à relever dans **Paramètres → Fournisseurs**. Kookia calcule ses
  propositions sur les jours d’ouverture. Les bons indiquent les livraisons du
  dossier, y compris celles reçues un jour de fermeture.
  Les conditionnements de travail sont des multiples des pas Kookia partagés,
  pas des conditionnements fournisseur certifiés. Le surplus réduit les achats.
- **Réception et tri** : un retard repousse réellement l’entrée ; un manque
  réduit la matière disponible et produit un avoir. Les lots écartés avant
  cuisine ne sont plus disponibles. Aucun réapprovisionnement immédiat n’efface
  automatiquement une rupture.
- **Production** : lots préparés sur prévision, limités par la matière. Les lots
  dont l’échéance est la plus proche sont consommés en premier (FEFO).
- **Service** : demandes différentes de la prévision, compléments limités sur
  recettes rapides, substitutions acceptées vers l’autre plat disponible ou
  demandes non servies. Le café est préparé à la commande.
- **Caisse** : transactions par table, articles effectivement servis, remises,
  carte ou espèces et éventuel remboursement d’un article. Les justificatifs
  clients ne sont produits que pour les transactions qui en demandent un.
- **Clôture** : invendus, retours d’assiette, écarts d’inventaire signés et lots
  restants. Les achats du lendemain utilisent le disponible de clôture, jamais
  les ventes encore inconnues du lendemain.

Les incidents couvrent livraison partielle, produit non livré, tournée retardée,
lot frais altéré, fréquentation inattendue, remboursement et écart de comptage.
Leur impact dépend des quantités et possibilités présentes dans le dossier.
Même sans incident ajouté, une prévision imparfaite peut créer invendu ou rupture.

## Lots, pertes et unités

Les lots portent réception, échéance, quantité restante et prix d’entrée. Une
échéance est inclusive : le lot est écarté à l’ouverture du jour suivant, même
si le restaurant est fermé. Les durées sont des **hypothèses de travail**, pas
une consigne sanitaire vérifiée. Les quantités sont au millième de l’unité.

| Catégorie | Interprétation | Nouvelle sortie de stock Kookia ? |
| --- | --- | --- |
| Péremption / altération brute | Matière écartée avant production, avec lot et cause | Oui, une fois |
| Parures non comestibles | Fraction du dosage brut nécessaire à la préparation | Non, déjà dans la production |
| Sur-parage évitable | Matière écartée pendant la préparation | Non, déjà dans la production |
| Invendus | Portions préparées mais non servies, écartées en fin de service dans ce dossier | Non, déjà dans la production |
| Retours d’assiette | Estimation en équivalents-portions sur les articles servis | Non, déjà dans la production et le servi |

Les fiches recettes distinguent net et **BRUT à saisir** pour dix portions. Le
brut est arrondi à 10 g/mL par lot, soit 1 g/mL par portion ; les productions
initiales et compléments se réconcilient aussi lorsqu’ils sont agrégés.
Ne pas additionner kg, L et portions. Les retours ne sont pas des pesées et aucun
poids cuit mesuré n’est fourni. Les hypothèses demandent une calibration terrain.

## Reprendre sans remettre les stocks à zéro

- **Continuer après le dossier affiché** prépare les réglages du dossier suivant.
- Sinon, charger `stock-reprise.json`, ou le `scenario.json` version 2 complet,
  dans **Reprendre les stocks d’un dossier**. Limite : 25 Mo ; aucun transfert.
- Le début est obligatoirement le lendemain de la clôture. Lots, dates, prix et
  commandes en attente sont conservés ; une tournée retardée reste en attente.
- Les réglages d’activité du formulaire sont conservés et restent à revoir. À
  réglages identiques, découper une période ne change pas les journées obtenues.
  Cela comprend Terrasse et Météo : le fichier de stock ne les remplace pas.
- **Retirer la reprise** revient à un dossier neuf lors de la prochaine génération.
  Cela ne modifie ni le dossier affiché ni un stock existant dans Kookia.

Le lecteur refuse dates incohérentes, doublons de lots/commandes, produits ou
fournisseurs inconnus, quantités négatives, pas incompatibles et versions
anciennes. Les anciens ZIP restent consultables ; pas de migration automatique
qui inventerait l’âge des stocks. Les recettes modifiées exigent une nouvelle
version datée lors de l’intégration, pas le remplacement d’une fiche passée.

## Contenu du ZIP et couverture Kookia

- `installation/` contient l’établissement, les fournisseurs, le catalogue, les
  fiches techniques et le calendrier. `installation/recettes/` fournit un CSV
  d’ingrédients par fiche, avec les dosages bruts pour dix portions.
- Répertoires datés : pièces selon leur date d’émission, `ventes.csv` pour les
  ventes du jour ou des jours passés, et `ventes-a-partir-du-AAAA-MM-JJ.csv` pour
  les jours à venir. Les jours sans vente ont une note.
- `ventes-jusqu-au-AAAA-MM-JJ.csv` à la racine, si des ventes ont atteint leur
  date de service au jour du téléchargement (Europe/Paris). Utiliser ce fichier
  ou les CSV quotidiens correspondants. Les anciens ZIP peuvent contenir
  `ventes-periode-complete.csv`, y compris des dates futures.
- `scenario.json` : format 2, catalogue figé, options, commandes, journées,
  services, décisions, transactions, déchets et lots de clôture. Les journées
  ajoutent `baselineCovers` et une météo de provenance `scenario` avec ses
  conditions, sa version de règle, le choix Terrasse, le coefficient et sa raison.
- `stock-reprise.json` : état minimal versionné à réutiliser dans l’atelier.
- `guide.md` : ordre et limites de reprise, pièces et rapprochements.

Les commandes peuvent précéder la période et les factures suivre les livraisons.
Le filtre **Date de pièce** inclut ces dates périphériques. Trois présentations
fournisseurs distinctes et un Ticket Z étroit à police de caisse sont générés,
avec la même mise en page dans l’aperçu et le PDF sélectionnable.

Le CSV natif reste `service_date,item_name,quantity` : une ligne **positive** par
article/jour, tous services confondus, sans doublons. Le Z et les transactions
se rapprochent de ces mêmes quantités. Les jours à zéro passent par le calendrier,
jamais par des lignes CSV invalides. Le bouton **CSV jusqu’à aujourd’hui** exclut
les dates futures ; il ne détecte pas les ventes déjà présentes dans Kookia.

Les opérations du dossier sont simulées. Pour essayer les imports et les
saisies, utiliser un espace de test isolé. Un CSV importé via **Ventes** alimente
les ventes enregistrées de l’espace.

- Dans **Recettes**, choisir **Importer une fiche CSV**, associer les produits
  du catalogue puis renseigner la recette d’après le PDF, dont la catégorie,
  le rendement de dix portions et la date d’effet. Le CSV préremplit les
  ingrédients.
- Dans **Mes commandes**, rapprocher facture et bon de livraison. Le bon
  indique la référence et l’échéance de chaque lot effectivement reçu.
- Dans **Ventes**, ventiler les quantités de chaque article à partir de la
  colonne **Vendu** du bilan de midi et de soir. Le registre des pertes indique
  le service, la recette et, pour les parures, le produit. Dans **Services et
  carte**, rapprocher les quantités conservées et écartées avant la clôture.

Les PDF servent à renseigner les formulaires. Les transactions détaillées et
les remises restent documentaires. Les retours d’assiette restent des
estimations en équivalents-portions. Voir
[Services, carte et stocks opérationnels](operational-services.md).

**Garde-fous de rapprochement :**

- Réception par commande OU facture, jamais les deux ; une facture seule n’est
  pas une réception. Une commande reprise n’est pas une nouvelle commande.
- Production par service pour le rapprochement de la fiche de service.
  Inclure les compléments dans le total. La confirmation dans **Recettes**
  enregistre la production à la date de saisie. Pour une reprise historique qui
  doit conserver les dates, garder cette production en attente dans ce parcours.
- CSV OU Ticket Z OU saisie manuelle, jamais additionnés pour le même article/jour.
  La facture client est déjà incluse ; remboursement sans annulation de quantité.
- Une régularisation par ajustement OU comptage, jamais les deux.
- Les ventes et productions futures sont refusées par Kookia. Les déclarations
  de pertes structurées portent une date/service explicite ; leur saisie tardive
  reste tracée. Les ajustements et comptages conservent leur date d'enregistrement,
  sans antidatage automatique lors d'une reprise.
- Les pièces sont des supports opérationnels, pas une certification fiscale.
  Aucun identifiant réel tiers ni numéro de caisse certifiée n’est attribué.

Le skill [kookia-import-documents](../.agents/skills/kookia-import-documents/SKILL.md)
guide le rapprochement, les écritures par les contrats existants et la reprise
sans doublons. L’historique, les prévisions Kookia et rapports restent des sorties
calculées, pas des fichiers à réimporter. POS, météo et OCR générique ne sont pas
activés par l’atelier.

## Architecture et validation

Application React/Vite séparée. Moteur pur par responsabilités : calendrier et
carte, achats, lots, service et caisse ; assemblage documentaire séparé du modèle.
La reprise valide le JSON externe à sa frontière. Aucune nouvelle dépendance.
Les anciens paramètres sans Terrasse/Météo sont normalisés en « non renseigné »
et « sans météo ». Le format de reprise stock version 2 et le CSV natif ne
changent pas. Les gardes de provenance/fraîcheur de la météo réelle restent côté
serveur : partager les coefficients n’autorise pas une fixture à ajuster Kookia.

```bash
npx vitest run document-workshop/src/scenario.test.ts document-workshop/src/workshop.test.ts document-workshop/src/weather.test.ts
npm run lint
npm run build
npm run documents:build
npm test
```

Les tests utilisent des objets temporaires, les parseurs CSV de ventes et
d’ingrédients et le contrôle de fichiers Ticket Z de Kookia. Ils couvrent la
conservation de matière, des portions et de l’argent, les dates, les lots, la
reprise et les formats PDF et ZIP.
Le suivi des preuves du développement est dans le
[plan de réalisme](plans/document-workshop-realism.md).
