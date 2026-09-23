# Écarts vérifiés entre l'application et la cible

**Lecture au 24 septembre 2026.** « Présent » désigne le code et les parcours
inspectés, pas une validation commerciale ou statistique. Les
[cadrage des Jalons](references/cadrage-jalons.md) définit l'intention ;
la [référence technique](technical-development.md) et les fichiers liés
décrivent l'état actif. Les simulations persistées restent des simulations.

## Ce que l'application permet déjà

| Domaine | Présent et vérifiable | Limite importante |
| --- | --- | --- |
| Comptes et espace | Sessions, restaurant par propriétaire, isolation serveur, données en PostgreSQL/Prisma. [Routes](../server/src/http/workspaceRoutes.ts) et [schéma](../prisma/schema.prisma). | Pas de rôles multiples au sein d'un même restaurant. |
| Ventes | Articles vendus séparés des ingrédients, saisie/correction, CSV avec aperçu et rejets, historique sourcé, indicateurs datés. [Service](../server/src/application/workspace/salesService.ts) et [règles](sales.md). | Pas de flux caisse ou Ticket Z ; la couverture dépend de l'utilisateur. |
| Stocks et achats | Produits, seuil bas, mouvements, pertes, panier, revue/validation de commande et journal de décision. [Catalogue](../server/src/application/workspace/catalogService.ts) et [commandes](../server/src/application/workspace/orderService.ts). | Produit existant non éditable ; pas de seuil haut ; validation ≠ transmission. |
| Factures et recettes | Facture manuelle, réception et crédit de stock contrôlés ; recettes initiales, faisabilité et productions historisées. [Factures](../server/src/application/workspace/invoiceService.ts), [recettes](../server/src/application/workspace/recipeService.ts). | Pas d'OCR connecté ni de création/édition de recettes depuis l'interface. |
| Bilan | Ventes par période et export opérationnel ; baseline expérimentale isolée. [Bilan](../src/pages/Analytics.tsx), [baseline](../server/src/application/workspace/salesBaseline.ts). | Pas de preuve d'économie réalisée, ni de rapport réglementaire attesté. |
| Sources externes | La rubrique Connexions liste des fournisseurs de façon statique ; CSV et saisie restent utilisables. [Réglages](../src/pages/Settings.tsx). | Aucun contrat/adaptateur POS, OCR, position, météo ou événements, ni statut de synchronisation vérifié. |

## Écarts à combler dans l'ordre des dépendances

| Écart | Effet aujourd'hui | Prochaine preuve de résolution |
| --- | --- | --- |
| Fiches produit et recettes non maintenables | Un restaurant ne peut pas fiabiliser seul tous les seuils, prix, ingrédients et rendements initiaux. | Modifier une fiche sans altérer l'historique, créer une recette, produire et retrouver les mouvements correspondants. |
| Stock pas toujours vérifié | Un seuil bas sur une quantité initiale ou simulée ne suffit pas à décider. | Date/source du comptage visibles ; rapprochement réception, perte et production ; état « à vérifier » explicite. |
| Caisse et Ticket Z absents | Les ventes nécessitent saisie ou CSV Kookia. | Synchronisation POS avec reprise/idempotence ; OCR avec correction humaine et contrôle des doublons ; isolation par restaurant. |
| Position, météo et événements absents | Impossible d'affirmer qu'une prévision reflète le contexte local. | Position vérifiée, données datées/sourcées, bénéfice mesuré par rapport à la baseline sans ces variables. |
| Baseline non reliée aux achats | La moyenne expérimentale n'explique aucune quantité de commande. | Backtest terrain, conversion vente → recette → ingrédient → besoin net, raisons et limites lisibles dans Achats. |
| Décision externe non bouclée | La commande validée reste « à transmettre ». | Fiche fournisseur ou envoi séparé avec destinataire/confirmation/statut ; réception rapprochée, sans crédit double. |
| Impact non mesuré | Des opérations datées existent, mais leur simple total ne prouve pas une baisse des déchets. | Mesures comparables de pertes, ruptures, invendus et coûts ; méthode publiée ; pilotes terrain. |
| Qualité de livraison à renforcer | Les tests locaux ne prouvent pas seuls l'usage en cuisine ou la continuité. | CI frontend/API + tests d'intégration en base isolée, parcours clavier/mobile et préproduction vérifiés. |

## Décisions produit à confirmer avant activation réelle

1. **Fournisseur POS :** le Jalon 2 cite Lightspeed en *Must have*, tandis
   que son backlog technique classe l'adaptateur plus bas. Vérifier accès API,
   coût et ordre de livraison avec les pilotes ; ne pas présenter la liste
   statique de fournisseurs comme une intégration opérationnelle.
2. **Documents et données personnelles :** définir stockage, accès, rétention,
   suppression et échantillons de test avant le premier upload de Ticket Z ou
   de facture réelle. Le seuil OCR de 90 % évoqué dans les Jalons est une règle
   de revue souhaitée, pas un taux de précision acquis.
3. **Prévision :** choisir l'horizon et le coût relatif rupture/surstock avec
   les chefs. Publier les erreurs observées avant tout libellé de fiabilité.
4. **Commande et conformité :** transmission fournisseur, rapport de
   gaspillage, EDI et HACCP sont des périmètres séparés. Aucun export actuel
   n'est une attestation réglementaire.

Voir le [plan de réalisation](plans/roadmap-produit.md), son
[exécution vérifiable](plans/plan-execution.md), les
[sources et contrats](integrations.md) et le
[plan de prévision](plans/forecast-engine.md) pour les étapes et critères
d'acceptation. L'ancien inventaire des « petites tâches » a été retiré : il
décrivait des manques de ventes désormais comblés et brouillait les priorités.
