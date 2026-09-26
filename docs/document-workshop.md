# Atelier documentaire Maison Sureau

## Lancer à côté de Kookia

Depuis la racine, après `npm install` :

```bash
npm run documents:dev
```

Ouvrir <http://127.0.0.1:5180>. Arrêt : `Ctrl-C` dans le terminal concerné.
L’atelier est une application locale séparée, sans API, PostgreSQL, compte,
connexion caisse ni envoi fournisseur. Il ne modifie aucun enregistrement Kookia.

```bash
npm run documents:build
npm run documents:preview
```

Le build autonome est dans `dist/document-workshop`. Le build principal vide
`dist` : reconstruire l’atelier après `npm run build` si nécessaire.

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
4. Dans **Jours ouverts, services et carte**, choisir les fermetures (lundi par
   défaut), midi, soir ou les deux. Les deux services répartissent la référence
   à 60 % / 40 %, puis s’arrondissent séparément. Au moins un jour de la semaine
   doit rester ouvert. Café à la commande et formule midi sont facultatifs.
5. Ajuster les parts d’entrée/dessert, de 0 à 100 %. Le **sur-parage de référence**
   est pondéré selon l’ingrédient, en complément de son rendement de préparation.
6. Choisir un incident, ou les imprévus variés, et sa fréquence. Un créneau tous
   les N jours calendaires depuis le début du dossier initial, uniquement sur
   journée ouverte. Un incident fournisseur sans livraison prévue est signalé
   sans effet, pas transformé en réception. Les reprises conservent cet ancrage.
7. Cliquer **Générer** puis télécharger le ZIP. Les réglages modifiés ne changent
   pas le dossier affiché avant génération. Mêmes paramètres, numéro et état
   d’ouverture : mêmes résultats.

La synthèse **De la prévision au service** distingue couverts prévus/demandés et
articles préparés/servis/invendus. Les demandes non servies ne deviennent jamais
ventes. Le détail quotidien expose incidents et nombre de lots reportés.

## Un déroulement chronologique

- **Avant service** : prévision indépendante des demandes à venir et carte de
  saison avec une entrée, deux plats au choix et un dessert. Les ingrédients sont
  partagés entre recettes ; popularité des plats et prix peuvent évoluer.
- **Achats** : commandes sur besoins prévus jusqu’à la tournée suivante, après
  déduction du stock encore utilisable et des commandes attendues. Maraîcher les
  mardi/jeudi/samedi, frais mardi/vendredi, épicerie mercredi ; commande à la clôture
  de la veille. Une livraison de mise en route est convenue avant le dossier neuf.
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
- **Retirer la reprise** revient à un dossier neuf lors de la prochaine génération.
  Cela ne modifie ni le dossier affiché ni un stock existant dans Kookia.

Le lecteur refuse dates incohérentes, doublons de lots/commandes, produits ou
fournisseurs inconnus, quantités négatives, pas incompatibles et versions
anciennes. Les anciens ZIP restent consultables ; pas de migration automatique
qui inventerait l’âge des stocks. Les recettes modifiées exigent une nouvelle
version datée lors de l’intégration, pas le remplacement d’une fiche passée.

## Contenu du ZIP et couverture Kookia

- `installation/` : établissement, fournisseurs, catalogue, recettes, calendrier.
- Répertoires datés : pièces selon leur date d’émission, CSV de chaque journée
  avec ventes et note `sans-ventes.md` pour les jours fermés ou sans vente.
- `ventes-periode-complete.csv`, seulement si au moins une vente existe.
- `scenario.json` : format 2, catalogue figé, options, commandes, journées,
  services, décisions, transactions, déchets et lots de clôture.
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

Les PDF fournissent des pièces à revoir et saisir, pas un import universel :
commandes puis réceptions, recettes en dosage brut, productions réellement
préparées, ventes, pertes brutes et comptages. Les prévisions et notes cuisine
ne déclenchent rien. Kookia prend désormais en charge les lots de réception,
déchets liés aux préparations et avoirs rapprochés, via ses formulaires/API
revus ; aucun import automatique du JSON de l'atelier n'est ajouté. Les
transactions détaillées et remises restent documentaires. Voir
[Services, carte et stocks opérationnels](operational-services.md) pour les
champs réellement persistés et leurs limites. Les estimations de retours de
l'atelier ne doivent pas être présentées comme des pesées observées.

**Garde-fous de rapprochement :**

- Réception par commande OU facture, jamais les deux ; une facture seule n’est
  pas une réception. Une commande reprise n’est pas une nouvelle commande.
- Production par service OU total quotidien, jamais les deux. Une vente ou une
  note de complément ne doit pas provoquer une deuxième déduction de production.
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

```bash
npx vitest run document-workshop/src/scenario.test.ts document-workshop/src/workshop.test.ts
npm run lint
npm run build
npm run documents:build
npm test
```

Les tests utilisent des objets temporaires, le parseur CSV et le contrôle de
fichiers Ticket Z de Kookia, sans compte ni base. Conservation matière/portions/
argent, causalité, FEFO, reprise, limites d’import, dates, PDF et ZIP sont couverts.
Le suivi des preuves du développement est dans le
[plan de réalisme](plans/document-workshop-realism.md).
