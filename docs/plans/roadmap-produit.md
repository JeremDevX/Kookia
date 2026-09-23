# Plan de réalisation — parcours fiable avant automatisation

## Lecture

Ce plan reprend les intentions du [cadrage des Jalons](../references/cadrage-jalons.md), puis les recale sur le
[code réellement présent](../technical-development.md). Les horizons du Jalon 2
(septembre 2026 à été 2027) sont des hypothèses de planification, non des
dates de livraison promises. Chaque lot se termine par un **parcours vérifiable
par le restaurateur**, pas seulement un schéma ou un stub. Le
[plan d'exécution](plan-execution.md) détaille les prérequis et preuves de chaque
incrément pour une session de développement longue.

## Dépendances en une ligne

```text
Ventes sourcées + stocks vérifiés + recettes maintenables
  → baseline évaluée → besoin matière expliqué → décision du chef
  → transmission/réception séparées → impact mesuré
```

La caisse et le Ticket Z sont deux voies envisagées pour obtenir des ventes ;
la saisie et le CSV restent des replis. La position, la météo et les événements
ne sont ajoutés que s'ils apportent un gain mesuré. Les contrats proposés dans
la [spécification d'intégration](../integrations.md) ne sont pas encore codés.

## Lot 0 — rendre l'existant compréhensible

**Base présente :** compte et espace persistés, ventes manuelles/CSV, stocks et
mouvements, factures/receptions, recettes, commande revue avec journal de
décision, exports, baseline expérimentale. L'application a cinq entrées
principales et distingue les données simulées.

**Travail :** supprimer les incitations à explorer des scénarios de démo dans
le parcours quotidien ; montrer source et date près des chiffres ; faire de
« Aujourd'hui » un point de départ actionnable. Garder l'accès aux rapports,
recettes et connexions dans Plus. Corriger les textes qui confondent validation
et transmission ou absence de données et zéro.

**Recette :** un chef nouveau trouve en quelques gestes où saisir la première
vente, vérifier un stock, préparer puis valider une commande. Il peut expliquer
ce qui a été enregistré et ce qui ne l'a pas été. Le parcours clavier/mobile
ne masque pas l'action principale.

## Lot 1 — fiabiliser les données de base

1. Permettre la **modification contrôlée des produits** (seuil, prix,
   fournisseur) sans modifier les montants des commandes historiques. L'unité
   reste immuable après le premier mouvement, sauf conversion explicite et
   auditée de tout l'historique : une édition de formulaire ne suffit pas.
2. Permettre la création/édition de recettes et versionner ingrédients et
   rendements utiles à la consommation matière ; conserver les productions
   passées.
3. Clarifier l'état « stock compté / stock théorique / stock à vérifier » et
   rapprocher pertes, réceptions et productions. Un seuil bas ne prouve pas
   un achat nécessaire.
4. Renforcer la qualité de l'import CSV : aperçu, rejets et dates de service
   compréhensibles. Garder le rejeu sans doublon et l'isolation par restaurant.
5. Afficher des indicateurs datés sans additionner des unités incompatibles ni
   appeler une variation « économie » sans mesure.

**Recette :** prix/seuil modifiés, recette produite et réception de facture se
retrouvent dans mouvements et bilan ; une journée absente reste absente.

## Lot 2 — raccorder les ventes externes

1. Choisir un pilote caisse et confirmer accès API, autorisations, formats,
   coûts et cas de remboursements. Le Jalon 2 cite Lightspeed comme cible ;
   le backlog technique le traite différemment. Arbitrer cet écart avant
   engagement de date.
2. Implémenter un adaptateur POS serveur, une ingestion idempotente et les
   correspondances d'articles. Faire voir les journées partielles et le dernier
   succès dans Ventes/Connexions.
3. Pour le Ticket Z, ajouter dépôt sécurisé, OCR, aperçu côte à côte et
   correction humaine. Évaluer la qualité sur de vrais documents consentis.
   Le seuil de 90 % évoqué au Jalon 2 est une règle de revue cible, pas la
   précision constatée d'un fournisseur.
4. Résoudre les doublons entre caisse, Ticket Z, saisie et CSV sur un même
   service avant que ces ventes alimentent une prévision.

**Recette :** coupure caisse puis reprise, Ticket Z illisible, doublon et
remboursement ne créent ni zéro fictif ni double vente. Le repli manuel marche
toujours. Aucun upload ou fournisseur réel n'est activé avant cadrage de
stockage, rétention et droits d'accès.

## Lot 3 — proposer une quantité défendable

1. Évaluer la [baseline](forecast-engine.md) sur historiques réels qualifiés,
   avec comparaison chronologique et jours exclus publiés.
2. Vérifier l'adresse puis la position du restaurant ; introduire météo et
   événements par adaptateurs séparés, facultatifs, seulement après mesure de
   leur valeur ajoutée.
3. Relier ventes prévues, recettes, stock et livraison à un besoin matière.
   Afficher raisons, sources, dates, données manquantes et intervalle évalué
   avant toute recommandation qualifiée de fiable.
4. Introduire un seuil haut si les pilotes en ont besoin, puis classer les
   recettes qui utilisent un surstock **déclaré/vérifié**.
5. Faire de la quantité proposée une ligne modifiable dans la revue existante ;
   conserver proposition initiale et décision finale côté serveur.

**Recette :** le chef peut écarter, modifier et valider ; l'historique explique
les trois gestes. Une entrée périmée ou absente retire l'affirmation de
fiabilité et offre le geste pour corriger la donnée.

## Lot 4 — boucler l'opération et mesurer

- Générer une fiche de commande par fournisseur à partir d'une commande validée.
  La transmission réelle nécessite destinataire vérifié, consentement au geste,
  statut d'envoi et traitement d'échec. La validation actuelle n'envoie rien.
- Rapprocher réception, facture et commande avant crédit de stock automatisé.
- Mesurer pertes déclarées, ruptures, corrections, produits invendus et coûts
  comparables sur une période. Documenter la méthode et les limites ; ne pas
  présenter un calcul théorique comme un gain réalisé.
- Préparer des rapports de gaspillage seulement après cadrage des obligations
  applicables. EDI fournisseur et HACCP restent des pistes ultérieures du
  Jalon 2, pas des capacités présumées.

**Recette :** une commande et sa réception sont distinguées ; les chiffres du
bilan se réconcilient avec leurs opérations sources.

## Portes de décision et de qualité

| Porte | Preuve attendue avant le lot suivant |
| --- | --- |
| Parcours | Test terrain sur téléphone et bureau : compréhension de l'action, provenance, durée, erreurs et contrôle du chef. Les 30 secondes du Jalon 1 restent une cible à mesurer. |
| Données | Jours couverts, rejets, doublons, corrections, unités et inventaires vérifiés disponibles par restaurant. |
| Modèle | Backtest hors échantillon, comparaison à une baseline simple, erreurs par horizon et comportement sur données insuffisantes. |
| Sécurité | Contrôles serveur de session/restaurant, secrets hors client, fichier externe validé, rétention et suppression. |
| Livraison | Lint, builds frontend/API, tests pertinents, tests d'intégration sur base isolée, passage clavier/responsive et procédure de retour arrière documentée. |

Les travaux indépendants (copie des écrans, édition produit, préparation des
adaptateurs) peuvent avancer en parallèle **dans le projet**, mais aucun flux
de données réelles ou commande automatique ne passe une porte par simple effet
de calendrier. Les arbitrages fournisseur, rétention et critères métier
requièrent l'accord des personnes responsables avant activation effective.
