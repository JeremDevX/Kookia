# Parcours utilisateur — état de réalisation

Ce document suit les décisions de l'audit UX du 23 septembre 2026. Il décrit ce que l'application permet réellement ; les scénarios de démonstration ne sont ni des ventes du restaurant ni des recommandations opérationnelles.

## Livré

| Priorité | Résultat | Limite explicite |
| --- | --- | --- |
| P0 — décision d'achat | Un seul panier et une seule revue dans **Achats**. Le chef peut écarter un article, modifier sa quantité et valider la commande complète. La commande enregistrée apparaît **À transmettre** ; elle n'envoie aucun email et ne modifie pas le stock. | Les quantités proposées depuis Stocks sont calculées à partir du seuil et du stock enregistrés, pas à partir des ventes ou d'une prévision. |
| P0 — confiance | Aujourd'hui, Stocks, Ventes et Bilan distinguent les données enregistrées des exemples. Les scénarios de démonstration sont consultables séparément, sans validation possible. Le rapport opérationnel exclut ces scénarios. | Le catalogue initial et les informations de l'établissement sont des exemples à confirmer. |
| P0 — première valeur | Après inscription, Aujourd'hui indique les étapes utiles et donne accès direct à l'import CSV Kookia ou à la saisie d'une vente. Ventes et Aujourd'hui affichent la date et la provenance du dernier service enregistré, même hors de la période d'historique visible. Une absence de saisie n'est pas présentée comme zéro vente. | CSV et saisie manuelle sont des replis disponibles aujourd'hui, pas des équivalents à une connexion caisse ou à un Ticket Z automatisé. |
| P1 — navigation et sobriété | Cinq destinations principales : Aujourd'hui, Achats, Stocks, Ventes, Plus. Recettes et Bilan sont secondaires ; simulations et graphiques d'exemple sont repliés. Stocks ouvre une vue « À vérifier » et relie une fiche produit aux recettes contenant cet ingrédient. Les niveaux de stock gardent des badges colorés et nommés selon le seuil enregistré. | Le lien vers Recettes n'affirme pas qu'un produit est en surstock ; une couleur de stock dépend des quantités et seuils enregistrés, qui restent à confirmer. |
| P1 — connexions visibles | Plus → Connexions montre les caisses envisagées et l'absence de connexion de facturation. | Il s'agit d'un état informatif, sans configuration, import automatique ni synchronisation actifs. |
| P2 — interface | La revue des quantités, les états vides, la navigation mobile et les actions au clavier ont été examinés sur les parcours critiques. | Il ne s'agit pas d'une mesure d'utilisabilité auprès de restaurateurs. |

## Capacités encore nécessaires pour la cible produit

1. **Achats réellement suggérés à partir de la demande.** Intégrer une source fiable de ventes (POS et/ou Ticket Z/OCR), son état de synchronisation, ses corrections et la détection des données manquantes. Relier les articles vendus aux recettes et ingrédients, puis confronter la consommation au stock, aux réceptions et aux seuils confirmés. Évaluer la qualité des propositions sur des données terrain avant d'afficher échéance ou fiabilité. Garder la modification et la validation humaines dans Achats.
2. **Recettes anti-surstock.** Définir une règle de surstock validée, fiabiliser les liens produit–recette et disposer, si la péremption entre dans la décision, des lots et dates pertinents. Aujourd'hui, l'application montre la faisabilité selon le stock enregistré, sans conclure à un excédent.
3. **Transmission et réception fournisseur.** Créer un acte d'envoi distinct et confirmé, avec destinataire et statut vérifiables. La réception doit rester une opération séparée avant tout mouvement de stock. Une validation de commande seule ne vaut pas commande transmise.
4. **Contexte externe.** La météo en direct et le moteur de prévision IA ne sont pas actifs. Ne les afficher comme source de décision ou étape de mise en route qu'une fois intégrés, contrôlés et traçables.
5. **Validation terrain.** Faire exécuter sans aide les tâches « première vente », « corriger une vente », « traiter un stock bas », « revoir puis transmettre une commande » et « sortir un bilan » par des profils chef, gérance et peu numérisé. Mesurer temps, erreurs, compréhension de la provenance et de l'effet de « Valider ». La cible de 30 secondes ne peut être évaluée pour des achats suggérés qu'après disponibilité de propositions fiables ; elle n'est pas atteinte ni démontrée par les scénarios d'exemple.

## Revue technique effectuée

- Compte local neuf : mise en route, liens CSV/saisie, création d'un article et d'une première vente, puis affichage de la date et de la source sur Aujourd'hui.
- Parcours de décision : Stocks → Achats → revue des quantités → commande **À transmettre**, avec montant, fournisseur et absence d'effet sur le stock explicités.
- Largeur mobile de 390 px : lecture des stocks et de la revue Achats ; tabulation et fermeture de la revue par Échap. Navigation mobile, Bilan et Ventes ont aussi été inspectés sur le rendu local.
- Vérification finale du 23 septembre 2026 : `npm run lint`, `npm run build`, `npm run build:api`, `npm test` (28 contrôles CSS et 42 tests Vitest), `npm run test:integration` (19 tests) et `git diff --check` réussis.
