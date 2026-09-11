# Audit de fin de migration — 11 septembre 2026

Ce bilan complète la [cartographie et le plan](database-migration.md).
Les chemins ci-dessous sont relatifs à la racine du dépôt.

## Preuves par domaine

| Domaine cartographié | Persistance / traitement actuel | Preuve contrôlée |
| --- | --- | --- |
| Fournisseurs et produits | `Supplier`, `Product`, API catalogue et gestion fournisseurs | `workspace.integration.test.ts` : parité de tous les champs ; `restaurant.integration.test.ts` : création/modification fournisseur, références et isolation |
| Stocks et historique | `StockMovement`, débits/crédits transactionnels | Tests concurrence, relecture, idempotence et refus de stock négatif ; Arc : Tomates 12→13, rechargement et mouvement +1 |
| Recettes et ingrédients | `Recipe`, `RecipeIngredient`, rendement/coût sur catalogue chargé | Parité HTTP complète ; date de dernière production conservée au jour, sans heure fictive |
| Productions et refus | `Production`, consommation seulement pour une recette liée | Tests rollback, répétition et déclaration libre ; navigateur : 2 Panna Cotta, crème 15→14,6 L, journal relu |
| Prévisions | `Prediction`, dates fixes et provenance démonstrative | Parité de chaque prévision dans `workspace.integration.test.ts`, relecture dans une nouvelle session |
| Décisions et commandes | `PurchaseOrder`, lignes figées et `RecommendationDecision` | Tests validation concurrente, suggestions initiales, quantités revues, journal et absence d’effet stock ; navigateur : commande 3 kg, statut « à transmettre » |
| Panier | Document `cart`, sérialisation serveur et retrait transactionnel des lignes validées | Ajouts concurrents, dédoublonnage, panier périmé refusé, isolation ; sélection/revue/validation dans Arc |
| Notifications | Document `notifications`, dates et état lu persistés | `notifications.integration.test.ts` : parité, répétition et isolation ; relecture après nouvelle session |
| Analytics et activité | Documents `analytics` et `activity` | Parité HTTP exacte et stabilité après reconnexion ; graphiques rendus dans Arc et Chrome |
| KPI et hypothèses ROI | Document `insights` | Parité exacte des valeurs et périodes ; scénario ROI local explicitement hypothétique |
| Préférences analytics | Document `preferences`, reprise du stockage local sans écrasement | Tests reprise/isolation/validation ; 42 g relus après rechargement, cible et trois sections masquées réellement appliquées |
| Restaurant | Table `Restaurant`, formulaire serveur | Tests relecture, validation, isolation ; salutation du compte et ville chargées dans le dashboard |
| Météo | Ancienne constante inutilisée supprimée | Aucun service météo annoncé ou fausse observation courante affichée |
| Menu | Document `menu`, révision et décision de validation | Parité, conflit et idempotence testés ; Chrome : brouillon corrigé, validation datée, aperçu d’une page sans production implicite |
| Factures et réception | Documents `invoice:*`, mouvements atomiques, facture reçue verrouillée | Tests rollback et double réception concurrente ; navigateur : brouillon corrigé relu, réception autorisée, quatre stocks crédités une fois |
| Intégrations | Catalogue UI seulement, connecteurs déclarés indisponibles | Faux secrets, compteurs et synchronisations retirés ; parcours manuel conservé |
| Rapports | API isolée et filtrée en UTC, sérialisation CSV/XML, impression PDF | Tests dates/isolation/échappement ; CSV et XML téléchargés, PDF de quatre pages généré et enregistré |

Les tests cités sont sous `server/src/http`, sauf les tests de bootstrap sous
`server/src/application/workspace` et les sérialisations sous `src/services`.

## Contrôles transversaux

- `reconnect.integration.test.ts` compare 17 lectures avant déconnexion et après
  une nouvelle authentification ; seules les dates de génération des exports varient.
- Les routes métier déterminent l’espace via la session serveur, jamais via un
  restaurant fourni par le client. Accès anonyme et références étrangères testés.
- Quatre migrations appliquées : `prisma migrate status` annonce une base à jour.
- Recherche finale : aucun import/tableau mock métier dans le runtime frontend.
  Le stockage local sert seulement à reprendre les anciennes préférences ; les
  temporisations restantes servent au splash, aux toasts et aux URLs de fichiers.
- CSV téléchargé : 80 lignes métier, production et réception présentes.
- XML téléchargé : parse XML réussi, 84 lignes avec métadonnées/en-tête et 62
  cellules numériques ; noms/unités des produits issus de la base.
- PDF enregistré : 185 349 octets, quatre pages ; période en paragraphes lisibles,
  titres de colonnes répétés, données et provenance visibles dans l’aperçu.
- Fenêtre étroite : page analytics et modale lisibles, sans débordement observé.
  Tab atteint le champ quantité/cible ; Escape ferme et rend le focus au déclencheur.

## Limites explicites, hors capacités simulées

Les exemples migrés restent démonstratifs. Aucun POS, OCR, moteur IA, service météo,
email fournisseur ou moteur d’alerte automatique n’est connecté. Un seuil d’alerte
est conservé, mais aucune alerte générée n’est promise. Les exports ne certifient
aucune conformité. Excel n’étant pas installé, le XML a été téléchargé et parsé,
mais pas ouvert dans Excel ; l’aperçu PDF et le fichier enregistré ont été vérifiés.
Aucune impression physique ni communication fournisseur n’a été lancée.

## Validation et clôture

Lint, builds frontend/API, 29 tests unitaires et 14 scénarios PostgreSQL passent.
Le scénario production vérifie également le refus répété sans effet stock/date.
Tous les lots du plan sont terminés. Après autorisation explicite de l’utilisateur,
deux exécutions finales de `npm run db:seed` ont conservé exactement les douze
ensembles métier : restaurant, fournisseurs, produits, recettes, ingrédients,
prévisions, documents, mouvements, productions, commandes, lignes et décisions.
Les empreintes SHA-256 avant/après chaque passage sont identiques.

Le compte temporaire a été supprimé par son identifiant et son email exacts, avec
sauvegarde de ses seules données de test dans `/tmp/kookia-browser-audit-backup.json`
(sans mot de passe ni jeton). La transaction a vérifié la suppression de son espace
et de ses sessions, ainsi que la conservation exacte des autres comptes et données.
Aucun fichier de test, export, sauvegarde, identifiant ou secret n’est ajouté au dépôt.
