# Scénario local de restaurant — Camille

Cette simulation locale sert à explorer les parcours Stocks, Factures, Recettes,
Ventes, Bilan et Achats. Elle ne décrit pas l’activité réelle du restaurant et
n’active ni POS, ni moteur IA, ni météo, ni envoi de commande.

## Périmètre et lancement

Les scripts n’acceptent que PostgreSQL local `kookia`. Le workspace est repéré
par le nom seedé **et** l’empreinte unique de ses 431 pièces source (ou de
l’ancien import lors de l’ajout initial des pièces). Si cette empreinte n’est
pas unique, le script s’arrête. L’adresse du compte n’est pas écrite dans le
code, les sorties ou ce document.

```bash
npm run import:invoices                         # aperçu documentaire, lecture seule
npm run import:invoices -- --write              # ajoute uniquement les fiches absentes
npm run simulate:restaurant                     # dry-run, lecture seule
npm run simulate:restaurant -- --write          # sauvegarde privée puis transaction locale
npm run restore:restaurant-simulation -- --backup /private/tmp/.../pre-simulation.json
```

L’import documentaire vérifie le hash des fiches déjà présentes et ne les
réécrit pas. L’import de scénario vérifie les seeds, les références et les
provenances avant toute mutation. Il conserve le bon de commande et la décision
de recommandation présents. Les 590 produits `invoice-product-*` et les 2 042
mouvements de l’ancien import n’étaient reliés à aucune recette, prédiction ou
ligne de commande ; seuls ces produits et les mouvements d’opération source
reconnus sont remplacés. Les 15 produits et 15 recettes seedés doivent encore
correspondre exactement au catalogue de référence, faute de quoi le script
s’arrête pour protéger une éventuelle saisie humaine.

Avant l’écriture, une sauvegarde JSON limitée aux lignes concernées est créée
hors du dépôt dans un répertoire privé de `/private/tmp` (permissions `0700`,
fichier `0600`). Le rollback restaure les lignes de stock, recettes et mouvements
antérieurs puis retire le marqueur et les lignes de scénario. Il s’arrête si une
vente, production, recette ou variation de stock a été modifiée depuis la
simulation ; il ne doit pas écraser ces saisies. Les fiches sources, comptes,
autres espaces, commandes et décisions ne sont jamais restaurés ni supprimés.

## Scénario reproductible

- Période : 2023-05-03 → 2026-09-23. Les transcriptions conservent la date
  d’origine et la date de démonstration décalée de 1 728 jours. Aucune date
  générée ne dépasse le 23 septembre 2026.
- Ouverture habituelle du mercredi au dimanche, du mardi au dimanche en juin–août,
  fermeture le lundi. Pour tester l’historique récent, le service est ouvert
  chaque jour du 26 août au 23 septembre 2026. La baseline utilise les 28 jours
  terminés du 26 août au 22 septembre.
- Portions vendues déterministes par date et recette, avec variations semaine,
  week-end, saison et maturité du restaurant. La carte comprend Margherita,
  Reine, Caprese (avril–septembre), Carbonara, César (mars–octobre) et poulet
  rôti avec pommes de terre.
- Une hypothèse de perte de 1,5 % des portions vendues est répartie par
  arrondi déterministe. Les portions invendues sont des mouvements
  `simulation_loss`; elles ne sont pas des pertes observées. Les mouvements
  `production` portent seulement les ingrédients des portions vendues.
- Les productions préparent portions vendues + invendues. Leur note lie la vente
  par opération ; `DailySale.operationId` se termine par `:sale` après
  `Production.operationId`. Les mouvements de perte se terminent par `:unsold`.
- Les réapprovisionnements synthétiques ne sont ni des factures, ni des
  commandes : ils remplissent le niveau cible du produit lorsqu’un service en a
  besoin. Aucun `PurchaseOrder` n’est créé ou validé. Les stocks d’ouverture
  proviennent du seed et sont explicitement étiquetés comme simulés.

## Unités, prix et provenance

Le parser conserve le texte de quantité, le numéro de ligne, le fondement du prix
(prix unitaire lu ou montant HT/TTC divisé par la quantité) et sa base fiscale
(HT, TTC ou inconnue). Les conversions par ligne sont enregistrées dans le
document `restaurant-simulation:v1`; chaque entrée de stock relie aussi la fiche
source par `invoiceId` dans son `operationId`. Les documents originaux gardent
leur statut OCR à vérifier.

- Œufs : les cartons/plateaux ne sont convertis en pièces que si le nombre
  d’œufs est lisible (par exemple carton de 90). Un conditionnement sans nombre
  exploitable est exclu ; aucune fraction de pièce n’est créée.
- Œufs seedés : douzaine → 12 pièces ; une tête de laitue → 0,300 kg ; un pot ou
  une botte de basilic → 0,050 kg. Ces conversions de stock d’ouverture sont
  étiquetées comme hypothèses.
- Autres hypothèses conditionnelles : sac de farine Minoterie Chabert sans poids
  → 25 kg ; sac/lot/filet de pommes de terre sans poids → 2,5 kg, sauf poids
  explicite ; laitue sans poids → 0,300 kg/pièce ; basilic ou persil sans poids
  → 0,050 kg/pièce ; brique de crème UHT sans volume → 1 L. L’hypothèse et le
  facteur restent visibles ligne par ligne.
- Les conversions explicites de conditionnement (par ex. sac de pâtes 5 kg ou
  crème 12 × 1 L) priment sur ces hypothèses. Les produits préparés ou hors carte,
  les produits non alimentaires et les lignes non reconstructibles ne modifient
  pas le stock.
- Le prix unitaire de référence dans le catalogue est la médiane des prix
  unitaires convertis des réceptions source positives. À défaut, le prix seed est
  converti ou un prix de scénario est utilisé. Ces prix et coûts matière sont
  indicatifs ; les sources peuvent mélanger HT, TTC et base inconnue.

Anomalies conservées et traitées sans masquer la source : une ligne transcrite
de macaroni, sac de 5 kg, produit 11,6744 €/kg contre une médiane de référence
de 1,8574 €/kg. La ligne reste traçable et la fiche conserve son statut OCR à
vérifier ; le prix catalogue et les coûts matière utilisent la médiane. Les
quantités/prix source ne sont donc pas présentés comme des achats vérifiés.

## Couverture issue du dry-run

Les 431 fiches comprennent 430 fiches datées et une sans date. Les avoirs et
bons de livraison ne sont pas transformés en réceptions. « Mappées » se
décompose en conversion directe / conditionnement explicite / hypothèse. Les
lignes « hors carte » restent dans l’archive sans effet de stock.

| Année | Fiches | Lignes parsées / mappées | Directes / paquet / estimées | Non exploitables / hors carte | Jours de service | Lignes vente / production | Portions vendues / préparées / invendues simulées | Réceptions facture / réappros synthétiques |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2023 | 3 | 0 / 0 | 0 / 0 / 0 | 0 / 0 | 188 | 1 017 / 1 017 | 19 061 / 19 349 / 288 | 0 / 496 |
| 2024 | 57 | 42 / 9 | 3 / 4 / 2 | 1 / 32 | 273 | 1 423 / 1 423 | 27 598 / 28 023 / 425 | 8 / 731 |
| 2025 | 184 | 355 / 56 | 26 / 24 / 6 | 3 / 296 | 274 | 1 427 / 1 427 | 28 930 / 29 369 / 439 | 49 / 739 |
| 2026 | 186 | 667 / 108 | 34 / 45 / 29 | 17 / 542 | 211 | 1 159 / 1 159 | 24 842 / 25 221 / 379 | 94 / 608 |
| Sans date | 1 | 0 / 0 | 0 / 0 / 0 | 0 / 0 | 0 | 0 / 0 | 0 / 0 / 0 | 0 / 0 |
| **Total** | **431** | **1 064 / 173** | **63 / 73 / 37** | **21 / 870** | **946** | **5 026 / 5 026** | **100 431 / 101 962 / 1 531** | **151 / 2 574** |

Les 1 531 portions invendues représentent 1,52 % des portions vendues après
arrondi entier. Le plan contient 31 469 mouvements de stock au total : ouverture,
réceptions source, réapprovisionnements synthétiques, consommations de
production et pertes simulées. Les coûts matière indicatifs après conversion
sont : Margherita 1,36 €, Reine 2,09 €, Caprese 1,49 €, Carbonara 1,22 €, César
1,41 € et poulet–pommes de terre 1,96 € par portion.

Parmi les 173 lignes mappées, 153 portent un prix HT, 16 un prix TTC et 4 une
base fiscale inconnue. Au total, 220 fiches n’ont pas de ligne de stock parsée ;
les autres lignes parsées sont exclues ou hors carte et restent consultables
dans l’archive source.

## Limites visibles dans l’application

- Les ventes portent la provenance `demo_simulation`; l’historique, les
  indicateurs, la baseline et le Bilan l’affichent. La baseline reste un test
  expérimental ; ses résultats ne sont pas une mesure terrain ni une confiance
  IA.
- Les mouvements d’ouverture, réceptions et réapprovisionnements sont marqués
  comme simulation. Les productions et pertes portent le marqueur d’opération.
- Le tableau de bord, les recommandations, le menu et certains indicateurs
  statiques existants restent des exemples seedés ; ils ne sont pas recalculés
  à partir de ces ventes et ne valident aucun achat.
- Les achats synthétiques n’ajoutent rien au panier, ne valident rien et
  n’envoient aucun message fournisseur. Le bon de commande et la décision déjà
  présents sont laissés intacts.
