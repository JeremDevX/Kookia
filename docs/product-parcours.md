# Parcours produit — la décision du restaurateur d'abord

## Point de départ

Le [cadrage du Jalon 1](references/cadrage-jalons.md) rapporte trois
entretiens et trois tests exploratoires. Ils montrent un besoin de lecture
immédiate, peu de temps de saisie et une volonté de garder la décision d'achat.
Le Jalon 2 formalise le pivot
**suggérer → modifier → valider par le chef**. Les mesures du prototype ne
prouvent pas que l'application actuelle atteint une validation en 30 secondes.

L'application possède déjà cinq destinations principales — **Aujourd'hui,
Achats, Stocks, Ventes, Plus** — et un seul écran de revue de commande. Le
[guide restaurateur](guide-restaurateur.md) décrit le parcours utilisable.
Ce document fixe la **cible de conception** à vérifier sur des établissements,
sans transformer les simulations ni les objectifs des Jalons en résultats acquis.

## La question à résoudre en premier

> « Qu'est-ce qui mérite mon attention avant de commander, sur quelles
> données, et quel geste dois-je faire maintenant ? »

Le premier écran doit répondre par une seule priorité lisible :
**compléter les ventes**, **vérifier un stock**, **revoir une commande** ou
**transmettre une commande validée**. Trois informations suffisent avant
dépliage : action, raison, date/source. Les totaux secondaires, graphiques et
paramètres ne concurrencent pas cette décision.

| Profil issu des Jalons | Moment d'usage | Ce qu'il doit voir d'abord |
| --- | --- | --- |
| Chef artisan | Avant la commande, entre deux services | Produit et quantité, raison, possibilité de corriger et d'écarter. |
| Gérante | Contrôle du coût et des anomalies | Date des données, montant estimé, commande à transmettre, variation expliquée. |
| Chef-gérant peu numérisé | Fin de service ou ouverture | Un geste court : importer, corriger ou revoir ; aucun vocabulaire technique requis. |

## Carte de navigation

| Destination | Question métier | Action principale | Second niveau |
| --- | --- | --- | --- |
| Aujourd'hui | Que faire maintenant ? | Ouvrir la priorité du jour. | Dernier service, stocks à vérifier, commande en préparation. |
| Achats | Que commander ou transmettre ? | Revoir puis valider une sélection. | Décisions, commandes à transmettre et historique. |
| Stocks | Qu'est-ce qui manque ou paraît incohérent ? | Inspecter un produit ; l'ajouter aux achats si nécessaire. | Inventaire, mouvements, pertes et réception. |
| Ventes | Mes services sont-ils couverts ? | Importer ou corriger une vente. | Historique, indicateurs et estimation test. |
| Plus | Où sont les tâches occasionnelles ? | Ouvrir Recettes, Bilan, Restaurant ou Connexions. | Compte, fournisseurs et rapports. |

Les calculs ne deviennent pas une destination de premier niveau. Une prévision
fiable doit arriver **dans Achats comme justification d'une proposition**, avec
un détail accessible, et non imposer un second chemin de validation.

## Parcours de bout en bout

### 1. Première ouverture

1. Montrer l'établissement actif et demander la vérification des coordonnées.
   Une adresse saisie n'est pas encore une position géographique vérifiée.
2. Montrer la dernière journée de ventes disponible. Si elle manque, proposer
   **Importer un fichier** ou **Saisir une vente** ; ne pas annoncer « 0 vente ».
3. Montrer un nombre limité de stocks à vérifier. Un stock initial non confirmé
   ne doit pas devenir une urgence d'achat certaine.
4. Laisser l'utilisateur revenir plus tard ; la mise en route n'est pas un
   tunnel qui bloque la consultation de l'inventaire.
5. Lorsque POS ou Ticket Z seront réellement branchés, proposer leur connexion
   au même endroit avec un état de synchronisation et un repli manuel.

### 2. Fin de service

1. Récupérer les ventes depuis une source identifiée ou un CSV confirmé.
2. Montrer date du service, nombre de lignes reconnues et lignes à corriger.
3. Permettre l'association des articles de caisse aux articles vendus et aux
   recettes ; ne jamais créer une correspondance silencieuse à faible confiance.
4. Conserver l'origine, la révision et l'acteur de chaque correction.
5. Si le service est incomplet ou la source indisponible, afficher **À compléter**
   et l'action de repli. Ne pas combler un trou par un zéro fictif.

### 3. Avant de commander

1. Classer les actions par risque et échéance **uniquement si ces données sont
   vérifiées**. Sinon, demander la vérification du stock ou des ventes.
2. Pour chaque achat suggéré, montrer produit, quantité, unité, fournisseur,
   coût estimé, stock connu, besoin prévu, date et provenance.
3. Déplier « Pourquoi cette quantité ? » : ventes utilisées, recette, stock,
   météo/événement si effectivement utilisés, qualité et date de chaque entrée.
4. Offrir **Écarter**, **Modifier** et **Conserver**. La proposition d'origine
   reste traçable même si le chef la change.
5. Une seule revue récapitule la commande entière. **Valider la commande**
   enregistre une décision ; une future transmission est un acte séparé.

### 4. Après la décision

1. Classer la commande validée dans **À transmettre**.
2. La transmission fournisseur, lorsqu'elle existera, nécessite destinataire,
   confirmation explicite, statut et gestion d'échec. Aucun simple calcul,
   import ou validation n'envoie un message.
3. La réception est une étape distincte, rapprochée de la facture et de la
   commande, avant toute entrée de stock.
4. Le Bilan distingue le montant commandé, les dépenses réellement reçues et
   les pertes constatées ; aucun de ces montants ne prouve seul une économie.

## Spécification rapide des écrans

| Écran | Zone visible sans défilement | Détail à dévoiler | Cas qui doit rester clair |
| --- | --- | --- | --- |
| Aujourd'hui | Date, établissement, une action dominante, source/date des données. | Quelques alertes, dernière vente, commande en préparation. | Aucun service récent, chargement, erreur API, données de démonstration. |
| Achats | Sélection et montant, bouton de revue, commandes à transmettre. | Raisons par ligne et historique. | Produit supprimé, fournisseur manquant, ligne de démo, double clic de validation. |
| Stocks | Produits à vérifier avec quantité, unité et seuil. | Recherche, filtres, prix, mouvements et recettes liées. | Stock nul, unité ambiguë, mouvement OCR ou simulé. |
| Ventes | Dernier service et action d'import/correction. | Historique, rejets, indicateurs, estimation test. | Journée absente, import partiel, doublon, correction concurrente. |
| Recettes | Faisabilité et ingrédients essentiels. | Historique, coût matière indicatif, demandes refusées. | Ingrédient insuffisant, recette sans ingrédients, production libre. |
| Bilan | Période, ventes enregistrées sourcées, export. | Détail par article et graphiques. | Période vide, source mixte, prix indicatifs, données simulées. |
| Connexions | Source des ventes et état de chaque connexion. | Dernière synchronisation et erreur corrigeable quand un fournisseur existe. | Aucune source externe reliée, données externes périmées. |

## Langage de l'interface

Employer des mots qui décrivent l'action et son effet, sans commentaire sur le
développement du logiciel :

| À dire | À éviter | Sens |
| --- | --- | --- |
| « Dernier service : 22/09, import CSV » | « Données synchronisées » sans date | Provenance vérifiable. |
| « Aucune vente enregistrée pour ce jour » | « 0 vente » si la source manque | Absence de donnée ≠ zéro observé. |
| « Quantité à revoir : 8 kg, selon le seuil » | « L'IA recommande 8 kg » pour une règle de seuil | Méthode honnête. |
| « Commande enregistrée, à transmettre » | « Commande envoyée » avant émission | Effet exact de la validation. |
| « Données de démonstration » en badge local | Long paragraphe répétitif sur les exemples | Signal bref près du chiffre concerné. |
| « Position non vérifiée » | « Météo locale » avant géocodage confirmé | Pas de faux contexte local. |
| « Prévision non disponible : ventes incomplètes » | « Confiance élevée » sans évaluation | Incertitude actionnable. |

Les messages sur l'état d'une source doivent proposer le prochain geste utile.
Les détails techniques (fournisseur API, code d'erreur, modèle) restent dans le
diagnostic, pas dans la première ligne d'une carte d'achat.

## Source, qualité et fraîcheur

Une étiquette doit accompagner chaque chiffre susceptible d'influencer une
décision : **saisie**, **CSV**, **caisse**, **Ticket Z relu**, **facture vérifiée**
ou **démonstration**. Le statut « caisse » ou « Ticket Z » n'est attribué
qu'après import réel, contrôle des doublons et association au bon établissement.
Une lecture OCR non corrigée reste un brouillon. Les dates affichées utilisent
la journée de service du restaurant, pas la date d'import du fichier.

La qualité n'est pas un pourcentage décoratif. Avant d'afficher une fiabilité,
définir la population évaluée, la période de test, le taux de jours manquants et
la calibration. La météo et les événements sont facultatifs : leur absence est
signalée et ne peut pas être remplacée par un « temps normal » inventé.

## Mobile et accessibilité

- Lecture verticale : priorité, raison, action ; pas de tableau large dans la
  revue de commande sur téléphone.
- Actions tactiles distinctes pour **Écarter** et **Valider** ; aucune validation
  en un clic non relu.
- Libellé textuel d'état en plus de la couleur, focus visible et ordre de
  tabulation prévisible.
- Message de chargement, erreur et succès perceptible au clavier et aux
  technologies d'assistance. Les dialogues se ferment au clavier et rendent le
  focus au déclencheur.
- La page reste utilisable si une source externe échoue : les données déjà
  confirmées demeurent visibles, avec leur date.

## Recette terrain à mesurer

Faire effectuer sans aide, sur téléphone puis ordinateur, ces tâches par les
trois profils : retrouver le dernier service ; corriger une vente ; traiter un
stock bas ; ajuster et valider une commande ; trouver une facture ; sortir un
bilan. Noter temps, erreurs, compréhension de la provenance et de l'effet de
« Valider ». La cible de lecture rapide et les 30 secondes citées dans les
Jalons restent **des objectifs à mesurer**, pas des résultats de ce dépôt.
