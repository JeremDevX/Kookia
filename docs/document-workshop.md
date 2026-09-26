# Atelier documentaire Maison Sureau

## Lancer à côté de Kookia

Depuis la racine du dépôt, après `npm install` :

```bash
npm run documents:dev
```

Ouvrir <http://127.0.0.1:5180>. Kookia peut rester sur son port habituel.
L'atelier fonctionne sans API, sans PostgreSQL, sans compte et sans accès à
Kookia. Tous les calculs et téléchargements sont effectués dans le navigateur.
Il n'envoie aucun email et ne modifie aucun enregistrement métier.
Arrêt : `Ctrl-C` dans le terminal du générateur.

```bash
npm run documents:build
npm run documents:preview
```

Le build autonome est dans `dist/document-workshop`. Le build principal de
Kookia vide `dist` : reconstruire l'atelier après `npm run build` si nécessaire.

## Générer un dossier

1. Choisir une période : **7 derniers jours**, **7 jours dès aujourd’hui** ou
   **14 jours à venir**, ou saisir une date de début et une durée de 1 à 90 jours.
   Les dates passées et futures sont acceptées, sans limite à quatre ans.
2. Régler les couverts moyens (5 à 200) et la variation quotidienne (0 à 50 %).
   L'interface indique immédiatement la fourchette de fréquentation. À 0 %,
   toutes les journées ont le même nombre de couverts.
3. Dans **Affiner les repas et les pertes**, choisir la part de clients prenant
   une entrée et un dessert (20 à 100 %, arrondie en portions entières), et le
   taux habituel de pertes (0 à 20 % des quantités utilisées en production).
   Chaque couvert prend un plat ; les achats suivent les besoins matière.
4. Choisir un incident facultatif et sa fréquence : un incident tous les N jours,
   le premier au jour N. Une perte élevée ajoute 10 points au taux habituel ;
   une livraison incomplète manque de 500 g de tomates ; l'écart d'inventaire
   ajoute 250 g ; un remboursement concerne un repas complet. Les autres jours
   restent habituels.
5. Adapter au besoin l'identité et le numéro de dossier dans le volet dédié.
   Mêmes paramètres et numéro : mêmes résultats. **Essayer une autre
   répartition** change le numéro sans toucher aux autres réglages.
6. Cliquer **Générer N jours de documents**, puis **Télécharger tout (.zip)**.
   Le dossier précédent reste consultable tant que les nouveaux réglages ne
   sont pas appliqués ; un message explicite le signale.

### Préparer plusieurs semaines sans régénérer

Le ZIP contient :

- `installation/` : établissement, fournisseurs, produits, recettes, calendrier ;
- un répertoire `AAAA-MM-JJ/` pour chaque jour, avec ses PDF et son `ventes.csv` ;
- `ventes-periode-complete.csv` : toutes les ventes de la période ;
- `guide.md` et `scenario.json` : ordre de saisie et journal chiffré complet.

Télécharger puis décompresser le ZIP une fois. Chaque jour, utiliser le dossier
correspondant : le générateur peut être fermé. Les stocks de fermeture se
reportent au jour suivant ; suivre l'ordre chronologique des opérations.

Kookia refuse toujours les ventes et productions futures. Les pièces futures
sont préparées, mais s'utilisent à partir de leur date. Le bouton **CSV jusqu’à
aujourd’hui** exclut les dates futures et est désactivé si toute la période est
à venir. Il contient toutes les dates éligibles du dossier, pas seulement les
ventes encore absentes de Kookia : pour un usage quotidien, préférer les CSV
par journée et vérifier les doublons lors de la revue.

Le dossier courant reste en mémoire dans l'onglet : télécharger l'archive avant
de fermer ou recharger la page. Un changement de paramètre n'affecte le dossier
qu'après validation par le bouton Générer. Utiliser un nouveau numéro pour un
nouveau dossier afin de distinguer les références ; un dossier couvrant une
date déjà saisie nécessite un rapprochement, pas une addition de ventes.

## Couverture des entrées

| Pièce | Utilisation dans Kookia |
| --- | --- |
| Fiche établissement | Paramètres du restaurant, saisie manuelle |
| Répertoire fournisseurs | Création/édition des fournisseurs |
| Catalogue ingrédients | Produits, unités, catégories, prix HT, seuils ; stock initial zéro |
| Fiches techniques | Recettes datées, dosages pour 10 portions, correspondance article/recette |
| Carte du jour | Choix et validation du menu |
| Bons de commande | Panier/commande par fournisseur puis validation |
| Factures fournisseurs | Saisie manuelle des références, lignes, quantités et prix HT |
| Bons de livraison | Réception complète/partielle et écarts sur la commande |
| Avoir fournisseur | Rapprochement documentaire ; pas de comptabilité fournisseur importable |
| Feuille de production | Production datée par recette et nombre de portions |
| Journal des décisions cuisine | Note de réalisation et refus d'un lot supplémentaire, sans sortie matière |
| Ticket Z détaillé | Upload PDF puis transcription et revue manuelles |
| `ventes.csv` | Import natif `service_date,item_name,quantity`, avec association des articles |
| Facture client | Justificatif d'un repas déjà inclus dans les ventes, sans réimport additionnel |
| Avoir client | Motif de remboursement sur les articles ; les quantités servies restent inchangées |
| Registre de pertes | Ajustements négatifs de type perte |
| Fiche de régularisation | Écart physique positif, par ajustement OU comptage |
| Feuille d'inventaire | Comptage final après les opérations |
| Calendrier des services | Journées ouvertes et couverture complète après revue |
| Journal matière | Contrôle initial + reçu − produit − perdu + écart = final |

Les choix de compte, de notifications, de source et de préférences d'affichage
ne sont pas des pièces métier. Ils restent configurés dans Kookia. L'historique,
les prévisions et les rapports d'impact sont des sorties calculées par Kookia,
pas des fichiers à réimporter. POS, météo, EDI et HACCP ne constituent pas des
imports opérationnels actifs et ne sont pas activés par l'atelier.

## Ordre et limites à respecter

Créer fournisseurs, produits (stock initial zéro), recettes et articles avant
les opérations. Enregistrer ensuite réceptions, productions, ventes, pertes et
comptages ; renseigner enfin la couverture du service. La colonne « Utilisation
dans Kookia » de chaque aperçu explique le parcours précis.

- **Factures :** pas d'OCR générique. Le PDF fournit la pièce à reprendre dans
  le formulaire manuel. Réceptionner par facture OU par commande, jamais deux
  fois une même livraison. Avec un manque, utiliser les quantités du BL.
- **Ventes :** CSV OU Ticket Z OU saisie manuelle pour une date/article donné.
  La facture client n'ajoute pas de ventes au Z. Un remboursement est tracé dans
  Kookia sans changement de quantité vendue ; son montant figure sur l'avoir.
- **Stock :** les ingrédients sont consommés par les productions, pas une
  deuxième fois par la saisie des ventes. Les pertes s'ajoutent aux dosages.
  Une régularisation de stock est réalisée une fois, par ajustement ou comptage.
- **Dates :** les pertes, ajustements et comptages Kookia sont datés à la saisie.
  Le générateur ne contourne pas cette limite. Pour une réconciliation datée
  exacte de ces opérations, utiliser une journée courante. Les ventes et
  productions permettent une date passée.
- **Périmètre :** les pièces sont des supports opérationnels, pas une
  certification fiscale. Aucun numéro d'immatriculation ni identifiant de
  caisse certifiée n'est attribué à un tiers. Les coordonnées `.example`
  évitent toute communication vers un tiers ; elles sont modifiables pour
  l'établissement dans l'atelier.

## Intégration accompagnée par un agent

Le skill versionné [`kookia-import-documents`](../.agents/skills/kookia-import-documents/SKILL.md)
guide la lecture du ZIP, le rapprochement avec l’existant, les écritures par les
contrats Kookia et la vérification finale. Exemple de demande :

> Utilise $kookia-import-documents pour intégrer ce ZIP dans mon espace Kookia.

Joindre de préférence le ZIP complet. Le skill n’est pas un importeur automatique :
il distingue les opérations compatibles, les doublons, les dates à venir et les
limites du modèle actuel. Il prévoit un manifeste local pour reprendre sans rejouer
les opérations déjà confirmées. Une simple analyse du dossier ne modifie rien.

## Architecture et vérification

Application Vite/React séparée dans `document-workshop/`, dépendances existantes
du dépôt, aucune route ajoutée à Kookia. Scénario pur déterministe, montants en
centimes, quantités au millième. Les PDF utilisent du texte sélectionnable et
une pagination A4 partagée avec l'aperçu. Le ZIP ne nécessite aucune dépendance.
Le catalogue CSS de l'atelier est contrôlé séparément de celui de Kookia, avec
les mêmes règles de centralisation et de validation.

```bash
npx vitest run document-workshop/src/workshop.test.ts
npm run documents:build
npm run lint
npm run build
npm test
```

Les tests utilisent des objets temporaires et les frontières pures du parseur
CSV et du contrôle de fichiers Ticket Z de Kookia, sans connexion à une base.
Ils ne créent aucune opération dans un compte.

### Vérification initiale du 26 septembre 2026

- `lint`, `build` et `documents:build` réussis ; `npm test` : 172 tests Vitest
  et 35 contrôles Node réussis, dont 10 tests propres au générateur.
- Navigateur : génération avec avoir au clavier, téléchargement individuel PDF
  et ZIP complet, puis vérification de son CRC et de ses 28 fichiers (25 PDF,
  CSV, guide et journal). Aperçus et formulaires vérifiés à 320 pixels.
- PDF : ouverture et extraction du texte avec PDFKit ; rendu inspecté pour
  facture, Ticket Z, journal matière et calendrier de 90 jours sur quatre pages.
- Aucun compte ni enregistrement de Kookia utilisé pour ces contrôles.

### Évolution interface et périodes

- Parcours en trois étapes, raccourcis de dates, réglages explicites et état
  « réglages modifiés » vérifiés dans le navigateur ; champs de période et
  aperçu contrôlés à 320 pixels.
- Génération et téléchargement clavier d'une quinzaine future avec variation
  de 15 % : archive vérifiée (CRC, 245 PDF, 14 CSV quotidiens, CSV global,
  guide et journal). Le CSV immédiat est désactivé pour une période entièrement
  future ; sa date limite se met à jour si l'onglet reste ouvert la nuit.
- `lint`, `build`, `documents:build` et `npm test` réussis : 176 tests Vitest
  et 35 contrôles Node ; 14 tests du générateur couvrent notamment périodes
  futures, bornes de variation, taux, fréquence des incidents et exports datés.
