# Services, carte et stocks opérationnels

## Statut et accès

**Plus → Services et carte** relie carte datée, estimations, plan de préparation,
opérations saisies, clôture et signalements. L’API authentifiée persiste les
formulaires par restaurant. Aucun appel au générateur documentaire, aucune valeur
aléatoire et aucun envoi fournisseur ne créent d’opération.

Le développement vérifie ces fonctionnalités sur des fixtures isolées et
n’applique aucune migration à la base opérationnelle conservée. Le déploiement
de la migration additive exige la procédure habituelle de sauvegarde de
l’environnement concerné. La précision des prévisions reste à évaluer sur un
historique terrain qualifié ; aucun POS, OCR ou moteur météo n’est activé.

## 1. Paramétrer puis qualifier les services

- **Paramètres** : horaires hebdomadaires midi/soir, dimanche = 0.
- **Ventes** : exceptions datées, couverts observés et couverture des ventes
  manquante, partielle ou complète.
- Les horaires planifiés ne créent aucune vente ni complétude. Une date future
  ne peut contenir de couverts observés ou de ventes déclarées complètes.
- Les ventes restent canoniques par jour/article. Leur ventilation explicite
  répartit la quantité entre midi et soir ; le reliquat reste **non ventilé**.
- Corriger une vente invalide sa ventilation précédente. Le service revient à
  vérifier et ses chiffres ne qualifient plus les prévisions.

## 2. Préparer une carte datée

Choisir date/service, puis ajouter entrées, plats, desserts, boissons ou formules.
Chaque article porte prix, disponibilité, éventuel article de vente associé et
recettes/portions consommées. Les recettes ont des versions datées.

Une formule se décompose directement en recettes, sans seconde consommation de
« recette formule ». Les ventes portent la formule **ou** ses composants, jamais
les deux pour le même repas. Les besoins des ingrédients partagés sont additionnés
une seule fois par composant associé à l’article vendu.

**Valider et enregistrer la carte** conserve une nouvelle version avec noms,
prix et dosages applicables. L’historique reste consultable et les modifications
concurrentes sont refusées. Aucun stock n’est réservé ou déduit.

## 3. Lire les estimations et valider le plan

Les prévisions par service utilisent ventes enregistrées, ventilées et revues,
ainsi que la carte proposée. Simulations, données incomplètes et ventilations
invalidées sont exclues. Une absence de vente ne devient zéro que lorsque la
couverture et la présence de l’article à la carte le permettent.

Règles initiales transparentes, sans calibration terrain :

- Quatre observations pour le même jour de semaine/service ; sinon huit du
  même service.
- Saison seulement avec huit observations comparables sur au moins deux années.
  Fenêtre d’analyse de trois ans, sans limiter l’historique conservé.
- Plage observée et écart-type décrivent la dispersion, pas une confiance garantie.
- Ratios entrée/plat/dessert/boisson fondés sur des couverts saisis et cartes
  connues ; indisponibles si les preuves manquent.

La reprise des estimations remplit un **brouillon**. Le chef le modifie puis le
valide. Le serveur revérifie la référence de prévision et conserve son état avec
le plan final. Une prévision modifiée demande une nouvelle revue. Le plan manuel
reste possible et distinct.

La baseline quotidienne expérimentale et les estimations d’écoulement depuis
les réceptions restent des lectures séparées. L’hypothèse 90/10 de ces dernières
n’est pas une mesure et n’est pas silencieusement remplacée.

## 4. Produire et clôturer

Saisir dans **Recettes** les préparations et compléments effectivement réalisés,
avec date/service. Le plan ne crée pas de production. La fiche rapproche
productions, ventes ventilées, pertes liées, demandes refusées et substitutions.
Un refus n’est ni une vente ni une perte de matière.

Le responsable répartit les invendus entre **conservé** et **écarté**, explique les
écarts et rapproche les portions écartées des pertes déjà déclarées. Les retours
d’assiette restent inclus dans les portions vendues, sans nouvelle consommation.

La clôture exige une couverture complète et une réconciliation cohérente. Les
inconnues ne deviennent pas zéro. Elle conserve un constat immuable ; les
corrections ultérieures sont signalées sans le réécrire. La fiche imprimable
reprend plan, productions, ventes, invendus et explications.
Les composants de formules et les invendus peuvent être fractionnels, avec une
précision de trois décimales. Les remboursements monétaires signalés sont
consultables et imprimables avec leur référence de vente/article et leur jour.
La source ne renseigne ni montant ni service : ces champs restent inconnus,
sans réaffectation arbitraire à midi/soir ni diminution des quantités servies.

Les portions conservées sont un constat de clôture, pas un crédit de matières
premières. Leur réutilisation interservices ne doit pas être représentée par une
nouvelle production déduisant ces ingrédients une seconde fois.

## 5. Lots, rendements et pertes

Une réception rapprochée crée des lots : quantité, date de réception, coût et
échéance facultative renseignée. Aucune durée sanitaire n’est déduite de la
catégorie ; les anciens stocks sans preuve restent sans âge connu.

Les productions consomment d’abord les échéances les plus proches (FEFO), sans
utiliser les lots déjà échus à la date de production. Les allocations tracent
chaque sortie ; un échec conserve stock, lots et production inchangés. Une
échéance dépassée n’enregistre pas automatiquement une perte.

Les recettes conservent **brut consommé** et **net utile facultatif**, versionnés.
Le rendement de préparation découle du rapport net/brut connu. Les anciens
dosages restent bruts, sans net inventé.

| Déclaration | Lien et effet |
| --- | --- |
| Perte brute | Produit/lot ; une seule sortie confirmée |
| Parures liées à une préparation | Produit et production, unité matière ; déjà dans le brut |
| Invendus écartés | Préparation et portions ; aucune seconde sortie matière |
| Retours d’assiette | Préparation et portions servies ; aucune seconde sortie |

Quantités, causes, unités, service et évitabilité restent séparés. Un coût n’est
fourni qu’avec une provenance exploitable ; coût manquant ne signifie pas zéro.
Les déclarations typées sont datées par service, les pertes historiques sans
déclaration liée conservent leur date d’enregistrement UTC. Les déchets cuisinés
sont présentés séparément des sorties de matières, jamais additionnés à celles-ci.

## 6. Acheter et rapprocher les pièces

Renseigner jours de livraison, délai, heure limite Europe/Paris du fournisseur
et conditionnement réel dans la fiche produit. Une convention de pas ne devient
pas un conditionnement fournisseur attesté.

Les suggestions cumulent cartes et services jusqu’à la livraison suivante.
Elles distinguent stock compté, quantités utilisables selon les échéances et
commandes attendues. Une arrivée attendue ne couvre pas les besoins antérieurs
à sa date et ne crée aucun stock. Paramètres inconnus et projections incomplètes
empêchent de valider une suggestion ; le chef conserve la revue et la décision.

Le suivi permet de renseigner/reporter l’arrivée par ligne, avec révision et
explication. Le rapprochement relie commande, réception, facture et avoir
financier. L’avoir ne crée ni perte ni mouvement de stock. La validation d’une
commande n’envoie toujours aucun message au fournisseur.

## 7. Signaler un incident

Relier le signalement au service, produit, lot, ligne de commande ou recette :
retard, indisponibilité, lot écarté, rupture, substitution ou fréquentation
inattendue. Le suivi expose stock théorique, besoins estimables et limites, puis
propose des actions à examiner.

Déclarer ou clore le suivi ne modifie aucune commande, production, vente ou
perte. Ces opérations se confirment séparément dans leurs écrans. La réponse du
responsable est attribuée et historisée.

## Vérification

Le [plan de cette adaptation](plans/operational-realism.md) conserve les preuves
par axe. Les tests HTTP utilisent des comptes synthétiques sur PostgreSQL
jetable loopback/tmpfs. Les tests navigateur sont exclus à la demande explicite
de l’utilisateur : contrôles UI par TypeScript, politiques, états rendus côté
serveur et structure des fiches imprimables, sans prétendre à une recette visuelle.

Les documents sont opérationnels, sans attestation comptable ou réglementaire.
