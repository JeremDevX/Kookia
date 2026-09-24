# Sources de données — contrats et branchement

## Frontière actuelle

Les ventes utilisables sont saisies ou importées au
[format CSV Kookia](sales-csv.md). Les factures manuelles peuvent créditer le
stock après réception explicite. Les 431 pièces de l'espace local Camille sont
des transcriptions à vérifier, pas un service OCR connecté.

La rubrique **Plus → Connexions** lit maintenant `GET /api/workspace/sources`,
authentifié et limité au restaurant de la session. En
l'absence d'adaptateur configuré, chaque source répond `not_connected` avec
`lastSuccessAt: null` ; aucune requête fournisseur ni synchronisation n'est
déclenchée. Les ventes sont saisies, importées en CSV ou rapprochées depuis la
transcription manuelle Ticket Z décrite ci-dessous. Les factures restent
vérifiées dans Achats ; aucun OCR réel n'est branché.

## Contrat minimal présent et extensions futures

Placer les types normalisés et ports sous `server/src/integrations`, puis un
registre par source. Les noms exacts pourront évoluer avec les contraintes du
premier fournisseur, mais les distinctions de statut et de provenance doivent
rester explicites :

```ts
type SourceKind = "pos" | "ticket_ocr" | "geocoding" | "weather" | "events";
type SourceHealth = {
  state: "not_connected" | "ready" | "degraded";
  lastSuccessAt: string | null;
};
type SourceResult<T> =
  | { status: "ok"; value: T; provenance: {
      provider: string; retrievedAt: string; observedAt: string | null;
    } }
  | { status: "unavailable"; reason:
      "not_configured" | "temporary_error" | "invalid_data" };
interface SourceAdapter<Input, Output> {
  status(restaurantId: string): Promise<SourceHealth>;
  read(restaurantId: string, input: Input): Promise<SourceResult<Output>>;
}
```

La route renvoie actuellement `not_connected` pour chaque source, **sans
requête externe ni valeur inventée**. Elle prend le `restaurantId` de la session
serveur, pas d'un paramètre client. Sa réponse est
`{ sources: Array<{ kind: SourceKind } & SourceHealth> }`. Lorsqu'un adaptateur
sera configuré, une panne de son statut ne devra pas masquer les autres. L'UI
de Connexions ne déclenche jamais `read` ; elle offre les replis CSV/saisie et
n'affiche une dernière synchronisation que lorsqu'elle existe réellement.

Pour I4, un port OCR de facture préparé sur fixture borne l'original à 4 Mio et
PDF/JPEG/PNG, calcule son SHA-256 côté serveur, valide strictement le résultat
normalisé et le transforme en candidat C1 lié au hash et au tenant. Les lignes
restent à rapprocher ; avoir/bon de livraison ne produit aucune ligne stock.
Le test utilise uniquement des octets et textes synthétiques, puis exerce le
brouillon C1, la correction, le refus avant confirmation humaine et la réception
simulée explicite. L'adaptateur actif reste `not_configured` : aucune route
d'upload facture ni aucun fournisseur n'est branché, et l'original n'est pas
persisté. L'aperçu/comparaison à l'original et une règle de conservation sont
des prérequis avant activation ; la saisie manuelle reste le repli utilisable.

### Formes normalisées minimales à stabiliser

| Source | Requête du port | Résultat métier avant persistance |
| --- | --- | --- |
| `pos` | `from`, `to` (journées de service bornées) | `coverage: complete/partial` et lignes `{sourceRecordId, serviceDate, externalItemId?, itemLabel, quantity, refunded}`. |
| `ticket_ocr` | Octets, MIME PDF/JPEG/PNG, finalité `ticket_z` ou `purchase_invoice` | Texte et champs candidats `{name, text, confidence?, page?}` ; **aucune vente ou réception validée**. |
| `geocoding` | Adresse, ville, pays confirmés | Latitude, longitude, fuseau, précision `address/city` et date de confirmation. |
| `weather` | Position confirmée, dates et horizon | Journées avec températures min/max et précipitations éventuellement absentes ; date d'émission indispensable. |
| `events` | Position confirmée, rayon et période | Identifiant fournisseur, titre, dates et source ; pertinence non présumée. |

Pour chaque port, définir avant le premier fournisseur les bornes de dates,
taille/volume, fuseau, unités et règle d'arrondi. La couche d'ingestion ajoute
`restaurantId`, clé d'idempotence, état de revue et version ; le fournisseur ne
détermine jamais directement ces champs de confiance.

## Règles communes à toutes les sources

1. L'API récupère l'identité et le `restaurantId` dans sa session serveur.
   Le client ne choisit pas le tenant d'une requête.
2. L'adaptateur valide et transforme la réponse du fournisseur **à sa
   frontière**. Les payloads bruts ne traversent pas le domaine.
3. Une donnée normalisée porte une provenance : fournisseur, date de
   récupération et date de l'observation quand elle existe.
4. `null` signifie champ absent. Une journée sans import n'est pas zéro vente,
   et une météo absente n'est pas un jour sec.
5. Toute écriture issue d'une source possède une clé stable
   `(restaurant, source, identifiant source, révision)` ou un hash défini et
   testé. Le rejeu ne crée ni deuxième vente ni deuxième réception.
6. La correction humaine conserve original, valeur corrigée, auteur, date et
   statut. Elle ne valide ni commande fournisseur ni stock à elle seule.
7. Une source indisponible ne fait pas disparaître les valeurs déjà confirmées ;
   leur date et leur état restent visibles.
8. Les secrets restent côté serveur et hors dépôt, URL, bundle client et logs.

Le type cible `SourceResult<T>` distingue `ok` de `unavailable`. Le code appelant
doit traiter `not_configured`, `temporary_error` et `invalid_data`
explicitement. Un adaptateur peut signaler `ready`, `degraded` ou
`not_connected` pour **un restaurant donné** ; la page de Connexions n'appelle
pas sa méthode de lecture. La panne d'un statut fournisseur devra devenir
`degraded` sans masquer les autres statuts.

## Ordre de branchement d'un fournisseur

1. **Choisir le périmètre métier.** Définir la donnée recherchée, la période,
   la granularité, les limites du contrat fournisseur et le coût d'appel.
2. **Cadrer l'accès.** Choisir la méthode d'authentification côté serveur,
   l'emplacement chiffré des jetons par restaurant, la rotation, la révocation
   et la suppression lors de la fermeture du compte. Ne jamais demander un
   secret fournisseur dans une configuration frontend publique.
3. **Implémenter un adaptateur.** Créer le contrat typé correspondant dans
   `server/src/integrations`, valider le JSON ou le document externe et mapper vers le
   modèle normalisé. L'état `ready` exige une configuration réellement
   utilisable, pas la seule présence du code.
4. **Brancher dans un registre serveur.** Remplacer le port non configuré par
   l'adaptateur, en gardant une réponse indisponible explicite lorsque le compte
   restaurant n'a pas connecté cette source.
5. **Ajouter une ingestion métier séparée.** Elle contrôle doublons, dates,
   correspondances, provenance, révisions et transactions avant toute
   persistance. Aucun port ne modifie directement `DailySale`,
   `StockMovement` ou `PurchaseOrder`.
6. **Exposer le parcours de correction.** Afficher l'aperçu, les rejets et la
   date de dernière réussite dans Ventes ou Factures selon la source ; le statut
   de Connexions reste un diagnostic secondaire.
7. **Tester puis activer.** Tester absence de configuration, réponse partielle,
   erreur transitoire, doublon, correction, autre restaurant et données
   périmées. Vérifier que la simulation locale n'est jamais recatégorisée comme
   observation réelle.

## Caisse / POS

Le port serveur `PosAdapter` demande une fenêtre de journées de service bornée
à 31 jours et un curseur, puis renvoie un lot identifié avec `coverage:
complete | partial`. Chaque ligne a un `sourceRecordId`, une révision source,
une date, un identifiant d'article fournisseur éventuel, un libellé, une
quantité positive et un indicateur de remboursement. Les réponses externes
sont validées avant toute écriture ; une date hors fenêtre, un lot invalide ou
une exception d'adaptateur n'ajoute aucune vente.

### Comportement local implémenté

- `syncPosSales` isole le curseur par restaurant et fournisseur, rend les
  fenêtres partielles reprenables uniquement sur leur fenêtre d'origine et
  refuse une fenêtre future. Les lots et lignes source sont idempotents ; une
  révision modifiée sans incrément explicite est un conflit.
- Chaque ligne devient d'abord une `SaleContribution` en attente, associée au
  lot, à l'article source, sa révision, son état de remboursement et sa
  provenance. Elle ne devient jamais un `DailySale` avant la décision explicite
  du restaurateur.
- Un article inconnu se mappe vers un `SaleItem` dans la revue. « Accepter /
  remplacer », « garder la vente existante » et « écarter » sont journalisés ;
  la vente existante n'est pas additionnée implicitement. Un remboursement
  demeure une information source, ne retire pas les quantités vendues et ne
  peut pas être accepté comme vente.
- `coverage` du lot n'affirme pas que le restaurateur a terminé la revue d'une
  journée : le jour reste partiel tant qu'il ne confirme pas lui-même sa
  couverture complète. Une fixture porte `demo_simulation` jusqu'aux ventes,
  métriques et baselines ; elle n'est jamais convertie en POS enregistré.
- Il n'existe encore aucun adaptateur fournisseur actif : la route de sync
  répond `not_connected` (`503`), les statuts de Connexions restent
  `not_connected`, et saisie/CSV restent disponibles. Les tests POS utilisent
  exclusivement un adaptateur fixture et une base d'intégration jetable.

### Activation fournisseur non réalisée

Le choix du fournisseur, du contrat, des droits API et du restaurant pilote
reste à confirmer. Le flux générique ne prétend pas connecter Lightspeed ni
une autre caisse. Avant activation, il faut implémenter et tester l'adaptateur
réel, ses erreurs et ses remboursements sur un restaurant autorisé, puis mettre
à jour les statuts serveur sans faire transiter de secrets côté client.

## Ticket Z et factures par OCR

Le port cible `ticket_ocr` accepte des octets PDF/JPEG/PNG et une finalité
`ticket_z` ou `purchase_invoice`. Il retourne texte et champs candidats
avec page et confiance **éventuelle**. Il ne retourne pas directement des ventes
ou réceptions validées : l'interprétation métier est une étape séparée.

### Ticket Z — parcours de revue

**Parcours actuellement disponible (sans OCR).** Un responsable authentifié
peut téléverser un PDF, JPEG ou PNG de 4 Mio au plus. L'API contrôle le MIME,
la signature du fichier et, pour les images, les dimensions (10 000 pixels par
côté et 25 mégapixels au plus). Les octets sont lus en mémoire pendant la
requête, hachés puis abandonnés : ils ne sont ni enregistrés, ni envoyés à un
prestataire, ni ajoutés à `WorkspaceDocument`. Le navigateur garde l'original
localement pour l'aperçu.

La date lue et les lignes détaillées (libellé et quantité entière) sont
transcrites manuellement. Le serveur conserve le hash, le type/taille, les
dates, le nombre de lignes, la provenance `recorded_sales` ou
`demo_simulation`, puis les contributions et événements de revue. Il ne déduit
pas les articles ni ne transforme un total général en quantités par article.
Une ligne candidate ne devient `DailySale` qu'après association à un article,
vérification des ventes déjà enregistrées et décision explicite ; les conflits
CSV/POS passent par la même réconciliation. Un ticket sans détail n'ajoute
aucune vente et son brouillon peut être supprimé.

Les pièces ne sont pas conservées : après rechargement de la page, le même
fichier doit être téléversé de nouveau pour afficher l'original et autoriser
« accepter/remplacer » ou « garder la vente existante ». Les apports candidats
et leur historique ne sont pas effaçables depuis ce parcours ; il faut écarter
les lignes dans la revue. Le hash et les données de transcription restent
persistés jusqu'à la suppression de l'espace, sans durée TTL implémentée.

**Limites explicites.** Aucun OCR ni parsing complet du PDF n'est exécuté ; le
nombre de pages PDF n'est pas vérifié côté serveur. Les contrôles d'image
vérifient la structure des chunks et les dimensions, pas un décodage complet.
Ce flux manuel n'établit donc ni précision OCR ni durée de rétention d'une
pièce source. Toute extraction automatique, stockage durable, transfert à un
fournisseur ou conservation terrain exige un contrat, des droits et une
politique de rétention séparés. Le seuil cible de confiance de **90 % mentionné
dans les Jalons** reste une cible, jamais une performance acquise.

Pour le flux futur, contrôler aussi le nombre de pages et le décodage avant
traitement temporaire, puis présenter les champs et zones illisibles à côté de
l'original accessible. Sous le seuil cible, la correction humaine reste
obligatoire. En cas d'échec, conserver la saisie/CSV sans inventer un jour
« zéro vente ».

### Facture fournisseur — séparation des effets

Une extraction produit des champs candidats et une pièce consultable. Les
quantités, unités, taxes et prix restent à valider sur l'original. Un **avoir**
ou **bon de livraison** ne devient pas une facture reçue par défaut. La
réception et l'entrée de stock sont des actions explicites distinctes de
l'OCR ; la même pièce ne crédite pas deux fois le stock.

## Adresse, position et météo

L'adresse/ville actuelles sont du texte saisi dans `Restaurant` ; il n'existe
pas de latitude/longitude vérifiée. Le port cible `geocoding` transforme une adresse
confirmée en `GeoPoint` (coordonnées, fuseau, précision adresse/ville).

1. Le restaurateur vérifie l'adresse. Une position déduite au niveau de la
   ville n'est pas présentée comme une adresse exacte.
2. Le service géocode côté serveur, valide latitude/longitude/fuseau et
   présente l'écart si plusieurs résultats plausibles apparaissent.
3. Seule une position confirmée alimente la météo ou les événements.
4. Le futur port `weather` lit des journées bornées avec températures min/max et
   précipitations éventuellement absentes. Il faut conserver fournisseur,
   heure d'émission, horizon, fuseau et date du service.
5. La prévision utilise les **prévisions météo qui étaient disponibles à la
   date de décision** lors d'un backtest, pas les observations ultérieures :
   sinon le test fuit l'avenir.
6. Si le fournisseur échoue ou la météo est trop ancienne, calculer sans cette
   variable, signaler son absence et ne jamais remplir par une valeur fictive.

Une future table de position doit porter `restaurantId`, source, précision,
date de confirmation et version d'adresse. Une table météo, si nécessaire,
doit permettre d'identifier l'émission utilisée et son expiration ; ne pas
stocker des années de réponses brutes sans usage défini.

## Événements locaux

Le port cible `events` prend la position confirmée et une plage de dates. Chaque
événement normalisé possède identifiant fournisseur, titre et dates de début/
fin. Avant usage prédictif, définir rayon, dédoublonnage, pertinence pour
l'établissement et comportement en l'absence de couverture. Un calendrier
incomplet n'est pas la preuve qu'il n'y a aucun événement.

## Frontière avec la prévision et l'achat

Les sources alimentent un jeu de données daté et traçable. La
[baseline actuelle](sales.md) n'utilise que les ventes enregistrées ; les futurs
ports ne devront pas l'altérer sans évaluation séparée. Le
[plan du moteur de prévision](plans/forecast-engine.md) décrit l'évaluation
avant toute prévision opérationnelle. Même une prévision retenue ne crée qu'une
**suggestion** ; la revue du chef, la validation, la transmission et la
réception restent quatre états distincts.

## Matrice de tests avant activation

| Cas | Attendu commun | Particularité à vérifier |
| --- | --- | --- |
| Aucune configuration | `not_connected`, lecture `not_configured`, aucune donnée écrite. | CSV/saisie restent accessibles. |
| Réponse partielle ou malformée | `invalid_data` ou brouillon à corriger, jamais une observation silencieuse. | Journée POS partielle ; champ OCR illisible ; météo manquante. |
| Timeout ou quota fournisseur | `degraded` et erreur datée, sans masquer les autres sources. | Reprise bornée sans boucler ni créer de doublon. |
| Rejeu identique | Même résultat logique, aucune nouvelle vente/réception. | Hash de document ou identifiant d'enregistrement externe stable. |
| Même identifiant, contenu changé | Conflit/version explicite et revue humaine. | Remboursement ou facture corrigée, sans perte de l'original. |
| Deux restaurants | Aucun secret, résultat, document ou curseur partagé. | Tester avec deux comptes distincts en base de test. |
| Donnée simulée | Conservation de `demo_simulation`, jamais recatégorisée en réel. | Exclure des performances terrain et des achats automatiques. |
