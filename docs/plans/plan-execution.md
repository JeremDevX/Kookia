# Plan d'exécution vérifiable pour un développement long

## Usage et ordre de vérité

Ce plan transforme la [roadmap produit](roadmap-produit.md) en incréments
réalisables. Il ne déclare **aucun** lot ci-dessous livré. Avant chaque tâche,
relire le code et les tests concernés : l'état du dépôt prime sur ce plan, qui
doit être corrigé si le code a évolué. La
[référence technique](../technical-development.md) sépare présent et cible ; les
[écarts vérifiés](../ecarts-techniques.md) donnent le point de départ. Les Jalons
ne sont que des [sources de cadrage](../references/cadrage-jalons.md).

**Ordre de travail :** stabiliser le socle de test → rendre les pièces et données
maintenables et qualifiées → réconcilier les sources → évaluer la prévision →
proposer un achat → boucler transmission/réception → mesurer sur le terrain.
Un port fournisseur peut être développé avec fixtures avant obtention des accès,
mais il ne devient « connecté » qu'après preuve sur fournisseur et restaurant
autorisés. Ne pas lancer un modèle complexe pour contourner des données absentes.

## Discipline de reprise après interruption

Au début de chaque session `/goal` : lire `AGENTS.md`, cet index, `git status`,
les derniers changements et le contrat/test du prochain incrément. Choisir le
**premier incrément non prouvé dont les prérequis sont satisfaits**. Limiter le
diff au chemin vertical concerné. Écrire dans la PR ou le suivi du travail :
identifiant du ticket, décision métier retenue, fichiers/contrats touchés,
preuve de test, données de test, limite restante et retour arrière. Ne cocher
« terminé » qu'après preuve ; ce document n'est pas un compteur d'avancement
automatique. Si le dépôt évolue, mettre à jour la cartographie avant le ticket
suivant, sans re-jouer une migration accomplie.

**Définition de prêt :** entrée/sortie, propriétaire de la décision, comportement
sur absence/erreur/doublon, consommateurs, données de test, migration/retour
arrière si stockage change. **Définition de fait :** comportement observable,
tests ciblés positifs et négatifs, isolation restaurant, documentation du
contrat et parcours clavier/mobile si UI, puis contrôles CI applicables.
`npm run lint`, `npm run build`, `npm test` sont la CI actuelle ; ajouter
`npm run build:api` et les tests d'intégration sur
[base isolée](../setup-auth.md#base-isolée-pour-les-tests-dintégration) lorsqu'ils
concernent le backend. Ne jamais tester une suppression, un seed de remplacement
ou une migration risquée sur Camille. Avant modification de données conservées :
sauvegarde vérifiée, migration additive si possible et procédure de rollback.

Consigner **deux statuts distincts** pour les incréments dépendant d'une source
ou de pilotes : « implémenté sur fixtures / contrat vérifié » et « activé / évalué
sur données autorisées ». Le premier peut être terminé sans accès externe ; le
second exige les preuves de la porte correspondante. Pour F1–F4, des tests
synthétiques prouvent les calculs et les garde-fous, **pas** la précision d'une
prévision sur le terrain. En l'absence d'historique pilote qualifié, publier
« évaluation terrain en attente » et ne pas afficher de score de fiabilité
opérationnelle.

## Incréments ordonnés

Les identifiants sont stables pour le suivi, **pas** des commits imposés. Les
critères de sortie ci-dessous sont les minima ; les cas de concurrence,
d'autorisation et de données manquantes font partie de chaque contrat concerné.

| ID | Prérequis | Livraison vérifiable et preuve de sortie |
| --- | --- | --- |
| Q1 — garde de test | PostgreSQL Docker local ; [setup](../setup-auth.md) lu | Refuser automatiquement `test:integration` sur la base de développement ou une URL inconnue ; créer/migrer une base éphémère en CI ; exécuter build API et tests d'intégration dans la CI. Prouver refus sur URL `kookia`, réussite sur URL dédiée et aucune modification de l'espace conservé. |
| Q1b — jeu de scénario isolé | Q1 | Extraire le générateur/parser pur déjà présent et amorcer un tenant de démonstration **jetable** sur base dédiée ; ne pas assouplir les garde-fous des scripts `--write` réservés à Camille. Prévoir deux états de test : archive non réceptionnée et historique déjà crédité par la simulation. Le corpus privé peut être utilisé localement avec accès contrôlé ; CI, captures et préproduction partagée utilisent des fixtures anonymisées. Prouver isolation, rejeu idempotent, couverture et restauration de la copie. |
| Q2 — état de l'existant | Q1 | Capturer un parcours de lecture et revue Aujourd'hui → Ventes → Stocks → Achats sur mobile et clavier ; relever états vides, démo, erreurs et libellés. Corriger uniquement les blocages observés, puis refaire le même parcours. |
| D1 — fiche produit | Q1 | Éditer nom, catégorie, seuil, prix et fournisseur via validation serveur, contrôle du fournisseur de l'espace, version/conflit et historique préservé. **Unité immuable après premier mouvement** ; conversion explicite séparée seulement si besoin confirmé. Test : ancien prix de ligne de commande intact, autre restaurant refusé, édition concurrente détectée. |
| D2 — comptage de stock | D1 | Ajouter un comptage daté/attribué, distinct des mouvements théoriques ; afficher « compté », « théorique » ou « à vérifier » sans inférer la vérité depuis `currentStock`. Un écart accepté crée un mouvement unique, pas un écrasement silencieux. Tester rejeu, stock négatif, ancien comptage et autre restaurant. |
| D3 — recette maintenable | D1 | Créer/éditer une recette, ses ingrédients et le rendement du lot ; conserver des versions datées/attribuées et lier chaque nouvelle production à la version effective, sans inventer celle des productions antérieures. Unités héritées des produits du même espace. Tester qu'une édition ne recalcule pas une production passée et qu'une déduction au rendement reste atomique. |
| D4 — calendrier de service | Q1 | Représenter jour ouvert/fermé et couverture `complete/partial/missing`, distinguer **zéro observé** et donnée absente ; fuseau de service Europe/Paris pour l'initial, dates/horaires explicites. Ne pas convertir les 28 jours exigés par la baseline actuelle en 28 jours « zéro ». Tester jours fermés, changement d'heure et import partiel. |
| D5 — vente sourcée | D4 | Conserver lot, article source, révision, statut de revue et provenance de chaque contribution avant projection vers `DailySale`. Définir une seule vente acceptée par restaurant/jour/article ; caisse, CSV, Ticket Z et saisie concurrentes passent par **réconciliation**, jamais addition implicite. Tester rejeu, conflit, remboursement/annulation et simulation exclue de tout jeu terrain. |
| D6 — article vendu ↔ recette | D3 + D5 | Associer `SaleItem` à une recette/version selon période effective et quantité/yield ; correspondances proposées mais validées par le restaurant. Tester article inconnu, changement de carte et backtest sans recette future (pas de fuite temporelle). Réalisé localement : historique append-only daté, proposition par nom exact, validation explicite et projection matière sans effet stock ; preuve dans le journal Goal. |
| C1 — facture source actionnable | Q1b + réception manuelle actuelle | Partir des **431 fiches versionnées** (ne pas supposer leur présence dans la base isolée), non d'un futur OCR : rechercher une pièce, montrer sa date de travail fournie, son statut et ses lignes candidates, préremplir un brouillon corrigible, associer fournisseur/produit/unité/prix, puis laisser **réceptionner explicitement** par le flux transactionnel existant. Persister côté serveur l'identité de pièce `(restaurant, sourceDocumentId)` et ses révisions/hash entre archive, brouillon, mouvements, commande et livraison ; contrainte/idempotence empêchent deux factures ou clics concurrents de créditer la même pièce. Mesurer couverture/rejets ; avoir, BL et pièce illisible ne créditent rien sans revue. Refuser explicitement une réception partielle non prise en charge jusqu'à O2. Tester conflit, autre restaurant et pièce déjà créditée. |
| C2 — historique sur toute période disponible | C1 + D2 à D6 | Parcourir les dates de travail présentes et toute période ultérieure importée, sans limite produit fixe à quatre ans. Distinguer les événements sourcés, confirmés, estimés, hypothétiques et inconnus ; sans source de ventes/service, aucune sortie ne devient une opération enregistrée, mais une estimation séparée peut être fournie avec ses entrées et hypothèses. Les dates de travail fournies sont alignées sur 2026 ; ne pas exposer les dates d'origine. Une fenêtre de requête technique peut rester bornée et être navigable. Voir [le mandat d'historique](goal-kookia-reference.md). |
| I1 — statuts des sources | Q1 | Remplacer la liste statique par état serveur authentifié par restaurant, `not_connected` par défaut, dernier succès réel seulement ; aucune prétendue synchronisation. Suivre [le contrat proposé](../integrations.md) en l'ajustant aux consommateurs réels. Tester session absente, autre restaurant, source dégradée et repli manuel. |
| I2 — POS générique | D4 + D5 + I1 | Port et fixture avec fenêtre bornée, curseur, idempotence, mapping d'articles et revue des journées complètes/partielles. Tester coupure/reprise, doublon, remboursement, article inconnu et tenant croisé. **Non connecté réellement** sans fournisseur et droits validés. |
| I3 — Ticket Z candidat | D4 + D5 + I1 | Parcours manuel livré sans OCR : upload borné en mémoire et métadonnées seulement, transcription candidate, original rechargé et visible avant confirmation, provenance et conservation documentées ; sans détail article, aucune vente. Tester fichier illisible, dates, doublon POS/CSV, autre tenant, rejeu et suppression. Contrôle de pages/décodage PDF et tout OCR réel restent hors de cette tranche et demandent fournisseur/politique de données. |
| I4 — extraction d'une nouvelle facture | C1 + politique de stockage/accès | Le flux local sur fixture passe par l'upload HTTP authentifié, un adaptateur synthétique réservé à `demo:local`, un candidat rejouable tenant-scopé, l'ouverture de l'original public dans le navigateur et la correction C1. Les autres documents retombent sur la saisie manuelle ; aucun OCR générique ni fournisseur n'est actif. Une extraction n'est ni une réception ni un crédit de stock. Tester même pièce rejouée, correction et accès autre restaurant. Tout OCR réel, stockage ou transfert attend une politique d'accès/rétention distincte. Le corpus transcrit existant ne dépend pas de cet OCR. |
| F1 — baseline qualifiée | D4 + D5 | Rejouer des fenêtres temporelles figées ; **exclure simulations** de l'évaluation de précision terrain et les jours non qualifiés, comparer moyenne mobile et « même jour précédent ». Le bac démo peut exercer la même règle sur ses ventes simulées, avec résultat étiqueté démonstration et sans score de fiabilité réel. Publier erreurs, volumes, jours exclus et horizon ; si terrain insuffisant, aucune prévision opérationnelle. Tester jeu incomplet et absence de fuite future. La baseline expérimentale existante demeure distincte jusqu'à remplacement prouvé. |
| F2 — contexte facultatif | F1 + adresse confirmée ou position de fixture étiquetée | Position vérifiée puis météo/événements horodatés, émissions historiques pour backtest ; mesurer gain hors échantillon sur F1 **seulement si données terrain qualifiées disponibles**. Sur fixtures, prouver contrat et repli sans annoncer de gain. En panne ou valeur périmée, revenir à F1 **si ses entrées sont valides**, sinon aucune prévision. Aucun fournisseur réel avant droits et rétention cadrés. |
| F3 — besoin matière | D2 + D6 + F1 | Convertir prévisions de ventes en ingrédients avec recette/version/rendement, couvrir l'horizon de livraison, retrancher stock **vérifié** et réceptions confirmées seulement ; unités/conditionnements cohérents. Montrer raisons, dates et inconnues. Tester recette absente, unité incompatible, stock périmé et commande validée mais non reçue. |
| F4 — achat suggéré | F3 | Brancher la quantité explicable dans la **revue existante** ; chef écarte/modifie/valide, proposition et décision finales immuables côté serveur. Import, recalcul et double clic n'envoient rien ni n'écrasent la décision. Une suggestion issue de `demo_simulation` est **refusée comme achat réel** ; dans un tenant de démonstration isolé, seuls décision/commande/réception explicitement **simulées** sont permises, sans envoi ni mélange aux opérations réelles. Tester concurrence et cette séparation. |
| O1 — transmission | F4 ou commande manuelle validée | Générer d'abord une fiche par fournisseur. Un envoi réel, s'il est choisi, exige destinataire vérifié, action distincte du chef, tentative/idempotence, état envoyé/échoué et reprise. Tester échec de transport sans faux « envoyé » ; validation seule reste « à transmettre ». |
| O2 — réception rapprochée | O1 ou commande existante | Rapprocher commande, livraison, facture/avoir et écarts avant crédit ; stock crédité une fois par réception confirmée, opération et acteur tracés. Tester livraison partielle, facture dupliquée, prix différent et autre restaurant. |
| M1 — bilan d'impact | D2 + D5 + O2 | Définir pertes/ruptures/invendus/coûts et périodes comparables ; relier chaque chiffre à ses opérations sources et publier exclusions. Tester réconciliation des unités, simulation écartée et période vide. « Économie réalisée » seulement après mesure terrain contrôlée. |
| M2 — surstock et menus (Should) | D2 + D3 | Localement, proposer des menus depuis un **surstock explicitement compté/étiqueté dans le bac démo**, sans production implicite ni seuil haut global. Un seuil haut opérationnel attend validation pilote. Tester seuil absent, recette non réalisable et dates de péremption inconnues. |
| M3 — rapport gaspillage (Should) | M1 | Export **opérationnel** des pertes sourcées, période/méthode explicites et contrôle des données manquantes. Vérifier les exigences applicables avant tout libellé « conforme AGEC » ; sans cette preuve, ne pas en faire une attestation. |
| M4 — EDI/HACCP (Could) | O1/O2 + besoin pilote et obligations vérifiées | Re-cadrer séparément chacun de ces deux modules avant développement. EDI garde une confirmation d'envoi et un acquittement ; HACCP ne peut être qualifié de réglementaire sans modèle de preuve approuvé. Ils ne bloquent pas le MVP. |
| C3 — chaîne métier complète | C2 + F4 + O2 + M1 | Relier les opérations confirmées à leurs sources. En l'absence de sorties enregistrées, calculer au besoin des estimations distinctes depuis des entrées de stock revues, des recettes datées compatibles et des hypothèses affichées ; elles ne deviennent jamais des ventes, pertes, productions, mouvements ou KPI observés. Une facture seule ne prouve pas une réception ; une recette candidate ne prouve pas son usage. L'historique reste en lecture seule, sans rejeu. Les fixtures restent réservées à la QA technique isolée, hors compte Kookia. |
| R0 — préparation locale de livraison | Q1 + périmètre MVP défini | Documenter la topologie API + PostgreSQL, réseau/proxy `/api`, cookies/session, secrets, migrations, sauvegarde/restauration et observabilité ; automatiser une recette **locale isolée** avec données jetables. `vercel.json` ne déploie aujourd'hui que le frontend SPA. Aucun hébergeur ni déploiement externe n'est présumé. |
| R1 — activation préproduction | R0 + incréments MVP retenus + environnement/accord | Sur un environnement privé autorisé, déployer API/DB, vérifier sauvegarde/restauration et comptes pilotes consentants, puis smoke tests mobile/clavier et incidents. Tant que l'environnement ou l'accord manque, documenter « prêt localement, non activé » ; ne pas conclure à une mise en production. |

## Portes de décision qui ne bloquent pas le travail préparatoire

| Décision / propriétaire attendu | Travail autonome possible | Activation impossible sans réponse/preuve |
| --- | --- | --- |
| Priorité MVP : produit/UX classe POS + Ticket Z + météo « Must », stories techniques « Should/Could » ; responsable produit | Ports, fixtures, revue, import manuel et comparateurs | Date/périmètre MVP externe et promesse commerciale. |
| Fournisseur POS et restaurant pilote ; responsable produit + fournisseur | I1/I2 génériques, erreurs/reprise, mapping | API réelle, autorisations par restaurant, coût, contrat, quotas et tests de remboursement. |
| OCR, stockage et conservation ; responsable produit/sécurité + pilote | I3 sur fichiers synthétiques non personnels | Upload réel, transfert à un prestataire, conservation et correction de documents terrain. |
| Horizon d'achat, coûts rupture/surplus et seuil d'acceptation ; chef pilote + produit | F1, F3 avec hypothèses explicites et tests | Label « fiable », choix d'une méthode gagnante et automatisation de quantité. |
| Position, météo, événements ; restaurant + produit | Port et tests sur fixtures, comparaison F1 | Donnée locale réelle et bénéfice prédictif revendiqué. |
| Transmission fournisseur et destinataire ; chef + fournisseur | Fiche téléchargeable, états d'échec | Envoi externe, EDI ou commande automatiquement expédiée. |
| Mesure d'économies et obligations AGEC/HACCP ; produit + expertise compétente | Exports opérationnels sourcés | Chiffre de gain causal ou attestation réglementaire. |

Si une décision manque, continuer les incréments indépendants et consigner le
statut **préparé, non activé**. Ne jamais inventer une approbation, des données
réelles ou un fournisseur de substitution. Les 3 pilotes du Jalon 2 restent une
cible de recrutement, pas une source de données déjà disponible.
