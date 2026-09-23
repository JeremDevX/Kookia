# Cadrage des Jalons — extrait exploitable

## Rôle et traçabilité

Cette synthèse conserve les exigences utiles des documents de cadrage locaux
`Rendu Jalon 1 M1 2025-2026.md` et `Dossier Jalon 2 final.md`. Elle est
autonome : ces originaux ne sont pas nécessaires pour reprendre le développement
et peuvent contenir des informations non destinées au dépôt. **Un objectif des
Jalons n'est jamais une capacité vérifiée du code.** La [référence technique](../technical-development.md)
et les tests priment pour l'état livré.

| Origine | Fait de cadrage à conserver | Portée de la preuve |
| --- | --- | --- |
| Jalon 1, §§2.2 et 5.5.1 | Trois entretiens qualitatifs et tests d'utilisabilité associés. Rupture T1 : 100 %, 8 s ; surstock T2 : 66 %, 22 s ; export T3 : 100 %, 12 s. | Mesures d'un **prototype** et d'un petit échantillon ; ni résultat de l'application actuelle ni preuve statistique. |
| Jalon 1, §5.5.1 | Pivot « suggérer puis faire valider par le chef », abandon de la commande opaque automatique. | Exigence produit durable ; toute action externe conséquente reste explicite. |
| Jalon 1, §§2 et 5 | Saisie rapide, vocabulaire métier, lisibilité en service, contrôle humain. | Hypothèses de design à revérifier sur l'interface actuelle et les pilotes. La cible de lecture en 30 s n'est pas une mesure acquise. |
| Jalon 2, §4.2 | MVP « Must have » : connexion native Lightspeed, algorithme historique + météo, validation chef, OCR Ticket Z. | Priorité produit visée, non implémentation ni garantie d'accès fournisseur. |
| Jalon 2, §4.2 | « Should have » : rapports gaspillage AGEC et menus sur surstocks à T+9 mois ; « Could have » : EDI et module HACCP à T+12 mois. | Intentions de planification ; aucune conformité ou transmission ne peut être revendiquée sans vérification. |
| Jalon 2, §4.1 | Trois pilotes en Isère et bêta fermée au printemps 2027 ; lancement projeté été 2027. | Calendrier historique à réévaluer selon accès, données, recrutement, sécurité et recette. |
| Jalon 2, §§4.2, 6.2 et backlog développement | L'ingestion est « Must have » au niveau produit/UX, alors que des stories techniques la classent « Should/Could ». | Divergence de priorité : le plan d'exécution traite les ports génériques en amont et exige un arbitrage explicite avant de promettre le MVP externe. |

## Règles de lecture pour le développement

1. Les capacités déjà livrées se lisent dans le code et les
   [parcours techniques](../parcours-techniques-actuels.md), pas dans les
   échéances académiques.
2. Le socle de données et le parcours de revue peuvent avancer sans contrat
   Lightspeed, prestataire OCR, météo ou pilote. Les connexions opérationnelles,
   la précision d'une prévision et les gains réels ne peuvent pas être validés
   avec des fixtures ou l'espace Camille.
3. Les décisions externes encore ouvertes sont listées dans le
   [plan d'exécution](../plans/plan-execution.md) avec un repli sûr. Tant qu'elles
   ne sont pas résolues, leur tâche reste « prête pour adaptateur/fixture » et
   non « intégration réelle livrée ».
