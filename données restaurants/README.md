# Données extraites des pièces du restaurant

Le tri des **990 fichiers** de `factures fournisseurs/` est terminé. Ce dossier contient **431 fiches de pièces d’achat utiles** (factures, tickets, avoirs ou bons de livraison identifiés séparément), **un devis** conservé comme référence de prix et **32 index fournisseurs**. Ce sont des transcriptions de travail, pas des écritures comptables ni des réceptions de stock validées.

## Dates décalées pour démonstration

Les dates figurant dans les noms des fiches et dans les index sont **fictives** : un décalage identique de **1 728 jours** place la dernière facture datée du lot, initialement du 30 décembre 2021, au **23 septembre 2026**. Toutes les autres pièces datées, y compris le devis, conservent ainsi leur ordre chronologique et leurs écarts exacts ; les index fournisseurs les présentent de la plus récente à la plus ancienne. La date réellement lue sur chaque pièce reste indiquée dans sa fiche avec la mention « pièce d’origine ». L’unique scan sans date fiable n’a pas reçu de date inventée. Les PDF et images sources n’ont pas été modifiés. Ces dates de démonstration ne doivent pas être utilisées comme dates comptables.

## Lire les fiches

Chaque fiche indique sa source et, lorsqu’elle est disponible, son empreinte SHA-256. Les PDF composites sont séparés par facture et par page ; une copie du même achat ne crée pas une seconde entrée. Les avoirs, consignes, bons de livraison et devis sont distingués des factures. Les libellés, quantités ou montants illisibles ne sont pas déduits artificiellement ; les lectures OCR partielles ou incertaines sont signalées dans les fiches.

Les coordonnées privées, numéros de carte et coordonnées bancaires ne sont pas recopiés. Ces informations privées ne sont pas importées dans Kookia. Une personne doit confronter chaque fiche à l’original avant toute utilisation opérationnelle des stocks ou des prix.

## Jeu de données Kookia

Après démarrage de PostgreSQL et application des migrations, `npm run import:invoices -- camille.kookia@kookia.com` importe ces 431 fiches dans **cet espace uniquement**. Les PDF et images d’origine restent exclus de Git. Le script peut être relancé : il refuse une fiche modifiée et n’ajoute pas deux fois une réception. Les fiches sont consultables depuis « Factures » sur l’accueil.

Seules les lignes comportant une quantité et un prix unitaire cohérents génèrent un produit et une entrée de stock de **démonstration** ; les pièces sans ces données restent consultables. Les avoirs et bons de livraison ne créent pas d’entrée. Des sorties `simulated_consumption` sont ajoutées entre les achats et après la dernière livraison pour illustrer le fonctionnement du stock : ni ces sorties ni les entrées OCR ne constituent une réception ou une consommation réelle validée. Les dates décalées ne sont pas des dates comptables.

## Index par fournisseur

| Fournisseur | Fiches |
| --- | --- |
| [Boucherie Robin](index-robin.md) | Viande |
| [Boulangerie Morandat](index-morandat.md) | Pain et pâtisserie |
| [Brasserie du Loup Blanc](index-loup-blanc.md) | Bière, consignes et avoirs |
| [Canavese](index-canavese.md) | Boissons |
| [Carrefour](index-carrefour.md) | Denrées des tickets mixtes |
| [Cave Saint-Désirat](index-cave-saint-desirat.md) | Vins |
| [Chèvre du Bancel](index-chevre-bancel.md) | Fromages |
| [Comptoir Plus](index-comptoir-plus.md) | Consommables de combustion |
| [Dromadis](index-dromadis.md) | Viandes et avoirs |
| [DS Restauration](index-ds-restauration.md) | Viandes et bon de livraison |
| [E.Leclerc](index-leclerc.md) | Denrées des tickets mixtes |
| [EpiSaveurs](index-episaveurs.md) | Denrées et consommables identifiés |
| [La Ferme aux Escargots](index-ferme-escargots.md) | Escargots |
| [France Boissons](index-france-boissons.md) | Boissons et consignes |
| [Grand Frais](index-grand-frais.md) | Produits frais, factures composites |
| [Intermarché](index-intermarche.md) | Denrées et boissons |
| [La Nature à Table](index-nature-a-table.md) | Denrées, boissons, achats mixtes |
| [Le Panier Fermier](index-panier-fermier.md) | Produits fermiers |
| [Lidl](index-lidl.md) | Denrées des tickets mixtes |
| [Maltivor](index-maltivor.md) | Ingrédients |
| [Manet Frères](index-manet-freres.md) | Charcuteries |
| [Marie Blachère](index-marie-blachere.md) | Boulangerie |
| [Mère Maury](index-mere-maury.md) | Ravioles et produits associés |
| [Metro](index-metro.md) | Denrées, boissons et quelques achats opérationnels distincts |
| [Minoterie Chabert](index-minoterie-chabert.md) | Farine et levure |
| [Ô Délices de la Bergère](index-delices-de-la-bergere.md) | Produits laitiers, lecture partielle |
| [Promocash](index-promocash.md) | Denrées et [devis distinct](devis/2026/2026-01-22-promocash-devis-342097.md) |
| [Prodine](index-prodine.md) | Consommables de service et d’hygiène |
| [RPDA / Relais d’Or](index-rpda.md) | Denrées et surgelés |
| [SARL du Creux](index-sarl-du-creux.md) | Fruits et légumes, détail non disponible |
| [Valrhona](index-valrhona.md) | Chocolat et pâtisserie |
| [Vins Gary](index-vins-gary.md) | Vins |

## Périmètre du tri

Le lot comprend 940 PDF (dont huit fichiers sans extension), 19 images, un classeur, un document ODT et 29 fichiers système `.DS_Store`. Les PDF sans texte exploitable et les images ont été soumis à l’OCR local ; les pièces pertinentes mal nommées ont aussi été recherchées dans les documents composites. Les relevés bancaires, confirmations de paiement, documents administratifs, contrats, services, carburant et achats sans donnée utile de produit ont été laissés dans le lot source, sans fiche d’achat. Des scans trop dégradés pour identifier les articles ne sont pas transformés en stocks fictifs ; une fiche ne retient alors au plus que les montants réellement lisibles, avec sa limite de lecture.
