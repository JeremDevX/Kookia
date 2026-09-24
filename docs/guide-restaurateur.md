# Guide restaurateur — décider et suivre ses achats

Kookia réunit vos ventes, votre inventaire et vos décisions d'achat. Une
quantité proposée reste à vérifier : vous choisissez, modifiez et validez.
Une commande validée est **à transmettre** ; elle n'est ni envoyée au fournisseur
ni ajoutée au stock par cette validation.

> Dans l'espace local Camille, les ventes, productions et une partie des
> mouvements de stock portent la provenance **démonstration**. Ils servent à
> parcourir l'application, pas à prendre une décision d'achat réelle.

## En trois gestes

1. **Aujourd'hui** : lisez la première action affichée et la date du dernier
   service. Si une vente manque, ouvrez **Ventes**.
2. **Stocks → Achats** : vérifiez le produit, son seuil et la quantité suggérée
   par le seuil. Écartez ou ajustez chaque ligne avant de valider.
3. **Après validation** : retrouvez la commande dans **À transmettre**. Envoyez-la
   par votre canal habituel ; enregistrez une réception distincte à l'arrivée.

Cette boucle ne dépend ni d'un graphique, ni d'une prévision. Elle fonctionne
avec les données effectivement enregistrées dans votre espace.

## Première mise en route

1. Ouvrez **Plus → Restaurant**. Vérifiez nom, adresse, ville, contact et
   couverts moyens. Les valeurs initiales peuvent être des données de
   démonstration.
2. Ouvrez **Stocks**. Contrôlez les produits, unités, prix et seuils utiles.
   Vous pouvez créer une fiche manquante, mais pas encore modifier une fiche
   existante ; n'utilisez pas une valeur incorrecte pour commander. Un seuil
   indique un niveau à revoir ; il n'est pas calculé à partir des ventes.
3. Ouvrez **Ventes**. Créez les articles vendus correspondant à votre carte.
   Importez un [CSV au format Kookia](sales-csv.md) ou saisissez une vente.
   Contrôlez les correspondances et les rejets avant de confirmer un import.
4. Si vous utilisez les recettes, vérifiez leurs ingrédients et quantités avant
   d'enregistrer une production. Les fiches initiales sont à confirmer.
5. Revenez sur **Aujourd'hui** pour retrouver la dernière date et la source des
   ventes. Une journée absente n'est jamais interprétée comme zéro vente.

## À la fin d'un service : mettre les ventes à jour

1. Dans **Ventes**, choisissez **Importer un CSV Kookia** ou **Saisir une vente**.
2. Pour une saisie, choisissez l'article, la date du service et la quantité.
   Si l'article n'existe pas, créez-le d'abord.
3. Pour un CSV, prévisualisez les lignes, associez les articles inconnus et
   corrigez les lignes refusées. N'importez pas deux fois le même service.
4. Vérifiez **Historique enregistré** : date, quantité et provenance sont
   affichées. Une correction conserve l'origine d'un import CSV.
5. Dépliez **Indicateurs des ventes** pour une période. Les moyennes portent
   sur les jours avec ventes enregistrées, pas sur tous les jours du calendrier.

La section **Estimation test** applique une moyenne de sept jours uniquement si
chaque article possède les 28 journées consécutives requises. Elle ne tient pas
compte de la météo et ne prépare aucun achat. Ses erreurs rétrospectives ne sont
pas une garantie de fiabilité. Voir les [règles détaillées](sales.md).

## Le matin : repérer ce qui demande une action

- **Aujourd'hui** place en tête la commande en préparation, une vente manquante
  ou un stock à vérifier selon les données chargées.
- **Stocks** ouvre d'abord la vue **À vérifier**. Comparez quantité enregistrée,
  seuil et unité ; ouvrez la fiche pour lire les mouvements.
- **Tout l'inventaire** permet de chercher et filtrer les produits. La couleur
  ne remplace pas le libellé d'état.
- Si une donnée paraît fausse, **Ajuster le stock** dans la fiche du produit
  avec le bon motif. **Signaler une perte** enregistre une sortie distincte.
  Vérifiez le signe et l'unité avant de confirmer.

Une vente enregistrée ne déduit pas automatiquement les ingrédients. Une
**production validée** à partir d'une fiche recette déduit ses ingrédients ;
une préparation libre conserve un journal sans inventer cette consommation.

## Préparer une commande

1. Depuis **Stocks**, choisissez **Ajouter à la commande** pour un produit à
   traiter. La quantité initiale provient du stock et du seuil enregistrés.
2. Dans **Achats**, ouvrez **Commande en préparation**. Écartez les lignes
   incorrectes ; puis choisissez **Revoir les quantités**.
3. Vérifiez chaque produit, son fournisseur, son unité, son prix et le montant.
   Modifiez les quantités selon le service à venir et votre expertise.
4. Validez la commande complète. Kookia conserve la décision et les prix de
   cette validation dans **À transmettre**.
5. Transmettez la commande au fournisseur par votre canal habituel. La
   validation dans Kookia ne déclenche aucun email.
6. À la livraison, enregistrez la réception séparément. La commande seule ne
   crédite pas le stock.
7. Dans **Commandes enregistrées**, ouvrez « Rapprocher une facture et une
   livraison ». Choisissez une facture brouillon du même fournisseur, vérifiez
   les correspondances, indiquez référence/date du bon de livraison et quantité
   réellement arrivée. Une réception partielle laisse le reliquat visible ; un
   prix différent doit être expliqué avant d'ajouter la quantité reçue au stock.

Une suggestion issue de ventes simulées ne devient pas un achat réel. Dans un
espace de démonstration, commande et réception portent la mention simulation et
ne changent pas le stock réel.

## Factures, réceptions et provenance

Depuis **Aujourd'hui → Saisir une facture**, créez un brouillon avec référence,
date, fournisseur, produits, quantités et prix. Pour une commande existante,
enregistrez la facture puis rapprochez chaque livraison depuis l'historique des
commandes. Sans commande liée, vérifiez les lignes avant **Réceptionner et
ajouter au stock**. Le système ne crédite que les quantités explicitement reçues
et empêche de rejouer une même livraison ou de dépasser facture/commande.

L'archive des pièces importées est distincte de la saisie manuelle. Une
transcription ou un statut OCR à vérifier ne prouve pas une réception réelle.
Dans l'espace Camille, les dates de certaines pièces ont été décalées pour la
démonstration ; la date de la pièce d'origine reste consultable.

## Recettes et bilan

- **Aujourd'hui → Voir le menu d'exemple** : dans le bac de démonstration,
  choisissez un comptage positif encore actuel et indiquez la quantité que vous
  désignez explicitement comme surstock. Aucun seuil haut global n'est utilisé.
  Chaque recette est évaluée séparément avec cette quantité ; les portions de
  plusieurs idées ne s'additionnent pas.
  Les idées utilisent la version de recette applicable et les autres stocks
  comptés avec une unité compatible ; si une quantité n'est pas vérifiée, la
  recette est signalée comme non réalisable. Les dates de péremption sont
  inconnues : contrôlez-les vous-même. Une idée faisable ne remplit que le
  brouillon modifiable ; relisez-le puis enregistrez ou validez séparément. Cela
  ne lance aucune production et ne modifie pas le stock. Cette aide n'est pas
  disponible dans les espaces opérationnels.
- **Plus → Recettes réalisables** : consultez la faisabilité à partir des
  quantités enregistrées. Depuis une fiche de stock, ouvrez les recettes qui
  contiennent ce produit. Une recette réalisable n'est pas nécessairement une
  solution à un surstock.
- **Produire cette recette** : vérifiez le nombre de portions. Le stock est
  déduit à la validation si les ingrédients sont suffisants.
- **Produites cette semaine** : consultez le journal ; les productions de
  démonstration sont identifiées dans l'espace Camille.
- **Plus → Bilan** : choisissez une période, comparez-la à la période précédente
  de même durée et consultez les ventes, pertes explicitement déclarées et
  dépenses de produits réceptionnés avec leurs sources. Les simulations sont
  séparées ; ruptures et invendus restent non mesurés tant qu'ils ne sont pas
  enregistrés. Les économies réalisées ne sont pas déduites. Vous pouvez ensuite
  exporter le rapport opérationnel : la section **Pertes déclarées** ne retient
  que les mouvements négatifs explicitement enregistrés comme pertes, datés en
  UTC et reliés à leur opération source. Le coût n'est indiqué qu'à partir du
  prix snapshoté ; un prix absent est marqué non valorisé et une unité
  incompatible apparaît à vérifier, hors total. L'export exclut les simulations
  et rappelle que ruptures et invendus ne sont pas mesurés. Ce n'est pas une
  attestation AGEC. Les graphiques de démonstration repliés ne mesurent pas votre
  activité.

Un rapport Kookia n'est pas, par son seul titre, une attestation réglementaire
ou une mesure de pertes évitées. Gardez les justificatifs originaux nécessaires
à votre propre suivi.

## Si une information manque

| Situation | Geste utile |
| --- | --- |
| Dernier service absent | Saisir ou importer les ventes, puis vérifier la date affichée. |
| Historique incomplet | Compléter les journées réellement observées ; ne pas inventer des zéros. |
| Stock incohérent | Lire les mouvements et ajuster la fiche avec le motif correct. |
| Produit sans fournisseur fiable | Vérifier la fiche et le fournisseur avant de transmettre. |
| Caisse ou OCR non disponible | Utiliser le CSV ou la saisie ; **Plus → Connexions** liste les fournisseurs envisagés, sans synchronisation active. |
| Prix ou lecture de facture incertains | Reprendre la pièce d'origine avant réception ou décision. |
