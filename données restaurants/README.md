# Données extraites des pièces du restaurant

Le tri des **990 fichiers** de `factures fournisseurs/` est terminé. Ce dossier contient **431 fiches de pièces d’achat utiles** (factures, tickets, avoirs ou bons de livraison identifiés séparément), **un devis** conservé comme référence de prix et **32 index fournisseurs**. Ce sont des transcriptions de travail, pas des écritures comptables ni des réceptions de stock validées.

## Dates de travail alignées sur 2026

Les dates fournies avec les fiches et index sont les dates de travail à utiliser
dans l'espace Kookia ; elles ont été décalées pour s'aligner sur l'année 2026.
L'application ne doit pas exposer les dates d'origine. Les PDF et images source
ne sont pas modifiés. Ce décalage n'ajoute aucune date absente et ne transforme
pas une transcription en réception, vente ou autre opération métier.

## Lire les fiches

Chaque fiche indique sa source et, lorsqu’elle est disponible, son empreinte SHA-256. Les PDF composites sont séparés par facture et par page ; une copie du même achat ne crée pas une seconde entrée. Les avoirs, consignes, bons de livraison et devis sont distingués des factures. Les libellés, quantités ou montants illisibles ne sont pas déduits artificiellement ; les lectures OCR partielles ou incertaines sont signalées dans les fiches.

Les coordonnées privées, numéros de carte et coordonnées bancaires ne sont pas recopiés. Ces informations privées ne sont pas importées dans Kookia. Une personne doit confronter chaque fiche à l’original avant toute utilisation opérationnelle des stocks ou des prix.

## Usage dans Kookia

Les 431 fiches sont des transcriptions d'achats, pas des écritures comptables
ni des réceptions confirmées. Le parseur et le script d'aperçu servent à lire
les entrées et à mesurer leur couverture. Ne pas lancer d'import avec écriture
ou de script de simulation sur le compte Kookia. Les sorties absentes peuvent
être estimées séparément à partir d'entrées revues et de recettes compatibles,
avec hypothèses et provenance visibles ; elles ne deviennent jamais des ventes,
services, productions ou pertes enregistrés. Sans source suffisante, les
opérations restent inconnues plutôt que remplacées par des zéros.

Les scripts d'import et de simulation déjà présents sont des outils techniques
hérités ; leur option d'écriture ne fait pas partie de la revue du compte
Kookia. Les fixtures synthétiques restent réservées à la QA isolée.

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
