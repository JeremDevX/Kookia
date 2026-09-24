# Plan du moteur de prévision — de la vente observée à l'achat proposé

## Statut et objectif

Ce plan décrit une **cible**, pas une prévision déjà livrée. Aujourd'hui, les
ventes enregistrées (`manual`, `csv` et, dans le jeu local, `demo_simulation`)
alimentent des indicateurs et une
[baseline expérimentale](../sales.md) distincte des prévisions de démonstration.
Cette baseline accepte actuellement aussi la simulation ; elle requiert
28 journées consécutives, calcule une moyenne mobile sur
7 jours et la compare à « même jour de semaine précédent » sur les 7 dernières
dates complètes ; avec une correspondance
article↔recette explicitement confirmée et datée, elle projette aussi les
ingrédients au rendement effectif par jour, sans stock ni commande. Les
recettes à date inconnue/future ne sont pas utilisées dans le backtest. Les 946
jours du jeu de démonstration sont simulés : ils servent aux tests de cohérence
et d'ergonomie, jamais à affirmer une performance terrain.

La sortie utile au chef est une **quantité à revoir**, avec son horizon, sa
raison et ses limites. L'objectif opérationnel est de réduire les ruptures et
les pertes sans automatiser la décision d'achat. Une valeur prédite sans
inventaire vérifié, unité cohérente ou date de réception ne devient pas une
commande.

## 1. Définir l'unité de décision

1. Fixer le restaurant, la journée de service locale et l'horizon de commande
   (prochains services couverts avant la prochaine livraison).
2. Distinguer trois niveaux : article vendu en caisse, recette produite, et
   ingrédient acheté. Une vente d'article n'est pas directement une consommation
   de kg ; la conversion dépend d'une recette versionnée et de son rendement.
3. Séparer quantités vendues, invendus déclarés, pertes, réceptions et stock
   compté. Une différence d'inventaire inexpliquée reste inconnue.
4. Décider des unités et arrondis par produit, conditionnement fournisseur et
   minimum de commande, avec validation humaine de l'hypothèse.
5. Conserver le résultat proposé, les entrées et leurs versions, puis la
   correction éventuelle du chef dans le journal de décision.

## 2. Constituer un historique exploitable

| Entrée | Source actuelle / cible | Condition avant usage |
| --- | --- | --- |
| Vente datée | Saisie/CSV ; caisse et Ticket Z relu à venir | Restaurant, date de service, article associé, source et état complet/partiel. |
| Stock disponible | Produits et mouvements persistés | Comptage ou rapprochement récent, unité cohérente, réceptions non doublées. |
| Recette | Catalogue initial et productions | Ingrédients, rendement et version validés par le restaurant. |
| Calendrier | Saisie/événements locaux à venir | Source, date, zone et pertinence confirmées. |
| Météo | Adaptateur futur après position vérifiée | Zone, échéance, horodatage et observation/prévision distinguées. |

Le pipeline marque les journées absentes, importées partiellement, remboursées
ou corrigées ; il ne les convertit pas en zéro. Les ventes de simulation, les
prévisions `demo` et les factures transcrites non vérifiées ne sont pas mélangées
aux observations de restaurant. Si la couverture est insuffisante, le système
affiche **Prévision indisponible : ventes à compléter**, avec un chemin de
saisie/import, tout en laissant les règles de seuil de stock visibles.

## 3. Ordre de construction et critères de sortie

### Étape A — Baseline reproductible

- Conserver la baseline actuelle comme point de comparaison, mais élargir
  l'évaluation par article et restaurant uniquement lorsque les correspondances
  et la couverture sont validées.
- Fixer avant chaque essai les fenêtres d'entraînement/test, les règles pour
  jours fermés, jours manquants et promotions ; éviter les fuites temporelles.
- Versionner chaque calcul avec données d'entrée, période, horizon, règle,
  résultat et date. Comparer au minimum à « même jour de la semaine précédente »
  et à la moyenne mobile ; une méthode plus complexe doit battre ces références
  sur des données jamais utilisées pour la régler.
- **Sortie :** calcul déterministe, backtest reproductible, aucun chiffre de
  confiance affiché comme certitude et aucun passage automatique au panier.

### Étape B — Prévision des ventes par horizon

- Produire des quantités par article/service, puis agréger seulement à des
  horizons compatibles avec la commande et les livraisons.
- Traiter explicitement saison, jour de semaine, fermetures, événements connus
  à l'avance et changements de carte. Ajouter météo/événements seulement si
  leur disponibilité future, qualité et gain hors-échantillon sont démontrés.
- Une donnée météo future ne doit pas être remplacée par une observation passée
  lors du backtest ; simuler ce qui était réellement connu à la date de décision.
- **Sortie :** erreurs par horizon/segment, taux de couverture des entrées,
  comportement défini pour nouvelles recettes et données périmées.

### Étape C — Besoin matière et proposition

- Convertir les ventes prévues avec la recette **en vigueur à la date visée** ;
  signaler tout ingrédient ou rendement non renseigné.
- Calculer le besoin à couvrir, puis retrancher le stock vérifié et les
  réceptions attendues confirmées. Ne pas soustraire une commande simplement
  validée mais non reçue comme du stock disponible.
- Respecter unité/conditionnement et afficher hypothèses : « selon 6 services
  couverts, 8 kg en stock vérifié le 22/09, livraison jeudi ».
- Écarter ou rendre « à vérifier » une suggestion si stock, fournisseur, coût
  ou recette sont trop incertains. L'étiquette « besoin estimé » ne doit pas
  cacher une entrée manquante.
- **Sortie :** proposition explicable, modifiable ou rejetable ; validation
  serveur enregistrée avec acteur/date ; transmission fournisseur séparée.

## 4. Évaluer avant d'afficher une fiabilité

Mesurer sur **restaurants pilotes consentants**, séparés de toute simulation :
nombre de restaurants, dates, services, articles et proportion de jours
manquants. Utiliser une séparation chronologique et, si possible, des
restaurants non vus pour éprouver le transfert. Publier les résultats par
horizon et type d'article plutôt qu'un seul score global.

| Mesure | Question |
| --- | --- |
| Erreur absolue et erreur signée | De combien se trompe-t-on, et sur/sous-estime-t-on systématiquement ? |
| Erreur relative pondérée sur volume non nul | Quelle erreur pour le volume réellement servi ? |
| Couverture et calibration d'un intervalle | La plage annoncée contient-elle la demande aussi souvent que promis ? |
| Jours exclus et corrections | Quelle part du terrain n'entre pas dans la mesure ? |
| Ruptures, invendus et corrections humaines | La décision devient-elle réellement meilleure, sans déplacer le problème ? |

Définir seuils d'acceptation avec les pilotes **avant** l'essai, sur coûts
d'erreur métier (rupture vs surplus) et performance de la baseline. Une
amélioration de score ne prouve pas une réduction du gaspillage. Mesurer cette
dernière avec une méthode de comptage des pertes stable, une période de
référence comparable et les facteurs de contexte documentés. Ne pas présenter
un `confidence` de scénario comme une probabilité calibrée.

## 5. Surveillance, repli et contrôle humain

1. À chaque calcul, vérifier fraîcheur et couverture des ventes, stock, recettes
   et sources contextuelles ; inscrire les motifs de non-calcul.
2. Surveiller dérive de volume, changement de carte, erreurs par horizon,
   couverture d'intervalle et taux de corrections/rejets par chef.
3. Si la source externe échoue, garder la dernière donnée confirmée datée,
   désactiver son influence future et revenir à la baseline **seulement si** ses
   propres conditions d'entrée sont remplies ; sinon, aucune prévision.
4. Permettre au chef de voir « pourquoi », modifier la quantité et conserver le
   choix final. Ni recalcul ni synchronisation ne réécrivent sa décision.
5. Garder les données par restaurant, limiter les accès serveur et définir une
   rétention pour observations brutes, documents et jeux d'entraînement avant
   collecte réelle.

## Dépendances de réalisation

Voir [sources et contrats](../integrations.md) pour les points de branchement,
[parcours produit](../product-parcours.md) pour l'explication dans Achats et
[roadmap](roadmap-produit.md) pour l'ordre des livraisons. Le choix d'un modèle
ML, d'un fournisseur météo ou d'un hébergement n'est pas un prérequis à une
baseline et à des données de qualité ; ces décisions suivent la mesure.
