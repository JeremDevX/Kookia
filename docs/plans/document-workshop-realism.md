# Réalisme de l’atelier documentaire

## Mandat et limites

Développer les sept axes demandés : prévision distincte des ventes, lots et
reprise, pertes différenciées, calendrier/services, carte tournante, incidents
causaux et pièces variées. L’atelier reste local, déterministe, sans API ni
écriture dans un compte. Ses hypothèses ne constituent pas une mesure terrain.

## Décisions d’implémentation

- Moteur chronologique pur : commandes sur besoins prévus, réception et lots,
  préparation contrainte par les matières, arrivée des clients, décisions cuisine,
  transactions, pertes et clôture. Pas d’utilisation de ventes futures pour acheter.
- Lots consommés par échéance ; pertes brutes seules déduites en plus de la
  production. Parures, invendus et retours d’assiette sont documentés comme des
  fractions de matière déjà consommée, jamais une seconde sortie de stock.
- Calendrier hebdomadaire et saisonnier, midi/soir au choix, petite carte de saison
  avec deux plats, ingrédients partagés, boissons sans alcool et formules facultatives.
- Reprise explicite par fichier local versionné contenant lots et commandes en
  attente. Validation à l’entrée, dates contiguës, aucun remplacement de stock Kookia.
- Exports adaptés aux contrats existants : ventes CSV agrégées par jour/article,
  recettes en dosages bruts, lots et déchets cuisinés documentaires. Les champs
  non pris en charge par Kookia ne deviennent pas des écritures implicites.

## Étapes et preuves attendues

| Étape | Livraison | Preuve avant achèvement |
| --- | --- | --- |
| Moteur | Calendrier, prévision, commandes anticipées, lots, production, clients, caisse, incidents | Tests de causalité, conservation matière/portions/argent, jours fermés, saisons, reproductibilité |
| Reprise | État final exportable/importable, commandes et lots conservés | Continuité monobloc/dossiers successifs, fichiers invalides/version/date/quantités refusés |
| Documents | Pièces datées reliées, modèles fournisseurs, ticket caisse, guide et JSON versionnés | Rapprochement CSV/transactions/Z, dates et montants, PDF/ZIP lisibles, inspection rendue |
| Interface | Réglages et synthèse compréhensibles, reprise locale, états vides/erreur | Parcours clavier et mobile en lecture ; création/reprise/export vérifiés hors navigateur sur fixtures isolées |
| Livraison | Documentation et consommateurs alignés | lint, build, documents:build, tests, diff --check ; aucun compte utilisé |

## Suivi

- Audit initial : 15 tests existants passent ; absence de causalité prévision/vente
  confirmée sur 90 jours. Aucun changement métier externe.
- Implémentation achevée le 27 septembre 2026 : sept axes couverts, sans nouvelle
  dépendance ni changement de contrat serveur.
- `npm test` : 216 tests Vitest (48 fichiers), dont 30 pour l’atelier, et 35 tests
  Node passent. Les scénarios couvrent neuf profils d’incident, FEFO, conservation
  matière/portions/argent, remboursements, jours fermés, saisons, limites des
  fichiers externes et identité entre 90 jours monobloc et une reprise 29 + 61.
- `npm run lint`, `npm run build`, `npm run documents:build` et
  `git diff --check` passent. Le build atelier a été exécuté après le build principal.
- Inspection rendue de 10 PDF temporaires (16 pages) : trois styles fournisseurs,
  ticket caisse, prévision, production, journal matière, lots, pertes et calendrier
  de 90 jours. Rendu PDFKit, texte extractible et contrôle automatique des limites
  de page ; archive ZIP de 129 fichiers vérifiée par CRC, sans doublon ni chemin
  traversant. Aucun de ces fichiers de contrôle n’est intégré au dépôt.
- Interface existante inspectée au clavier et sur écran étroit de 320 px : champs,
  contrôles de calendrier et reprise, focus du bouton Générer. La revue automatique
  a refusé l’activation de Générer, jugeant l’autorisation insuffisante. L’utilisateur
  a ensuite explicitement limité la vérification à l’absence de génération dans
  le navigateur : génération, reprise et téléchargements n’y ont donc pas été
  testés. Leurs fonctions pures, PDF/CSV et archives sont vérifiés automatiquement.
- Aucun compte ni enregistrement opérationnel Kookia utilisé ou modifié.
  Ces preuves contrôlent le modèle et sa cohérence, pas une calibration terrain,
  qui n’est pas fournie dans ce mandat.

## Extension terrasse et météo — 28 septembre 2026

- Choix Terrasse oui/non/non renseigné et météo facultative, conditions fixes ou
  variées par date. Aucune requête Open-Meteo : provenance `scenario`, coefficients
  indicatifs non calibrés, maxima saisonniers et répartition déterministe.
- Coefficients extraits dans `shared/weatherScenario.ts` et réutilisés par le
  contrôle météo serveur existant, sans modifier ses gardes ni ses résultats.
- Base semaine/saison et ajustement séparés ; même calcul pour achats et
  préparation, avant la demande. Détail quotidien, fiche établissement, prévision,
  guide et JSON enrichis. Aucun changement du CSV ni du checkpoint stock version 2.
- Les paramètres historiques omettant les nouveaux choix conservent leur calcul.
  Les choix de terrasse/météo restent ceux du formulaire lors d’une reprise.
- Validation : lint, builds web/API/atelier et `npm test` réussis : **316 tests
  Vitest dans 67 fichiers**, dont **38 pour l’atelier**, et **35 tests de scripts**.
  Les neuf scénarios d’incident vérifient désormais la conservation avec météo.
  Les nouvelles assertions couvrent repli, arrondis, causalité achats/prévision,
  reprise, PDF/ZIP et sémantique des champs en rendu React statique.
- Inspection finale de **3 PDF temporaires / 3 pages** (établissement, pluie avec
  terrasse midi/soir, brouillard sans terrasse renseignée), rendus avec PDFKit :
  texte lisible et extractible, coefficient et provenance visibles, aucune note
  isolée sur une page supplémentaire dans ces cas. ZIP de **58 entrées** vérifié
  par CRC, sans doublon ni chemin traversant. Fixtures temporaires uniquement,
  aucun compte ni base utilisé. Les 14 tests d’export/météo et le build atelier
  ont été relancés après les dernières corrections de copie PDF.
- L’utilisateur a confirmé **aucun test navigateur nécessaire** pour cette
  extension. Aucun test navigateur exécuté ; les contrôles sont hors navigateur.

## Retour arrière

Changements limités à l’atelier, sa documentation, le guide d’intégration et
l’extraction de la politique météo pure partagée avec le serveur.
Aucune migration de données. Les archives précédentes restent lisibles ; seule
la reprise automatique exige le nouveau format versionné.
