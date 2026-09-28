# W0–W2 — Open-Meteo comme contexte du service

## Statut et objectif

**Implémenté localement le 28 septembre 2026 ; configuration désactivée
par défaut, recette visuelle/interactions en attente.**
Ce document détaille le volet météo du [lot de continuité du service](service-flow-continuity.md).
Il ne remplace ni le parcours de préparation ni les contrats de vente et d'achat.

Afficher une prévision météo utile pour midi/soir, laisser le chef ajuster son plan
et conserver les informations disponibles lors de sa décision. **Aucun coefficient
météo sur ventes, couverts, portions ou achats ; aucune prétention de gain prédictif.**
La météo est facultative : son absence ne bloque ni préparation, ni achat, ni clôture.

Le [contrat F2 existant](../../server/src/application/workspace/salesForecastContext.ts)
ne décrit que des fixtures, leurs dates et un repli F1. Ce n'est ni un adaptateur
Open-Meteo ni une preuve de connexion. Ne pas exiger météo, événements et archives
ensemble pour afficher le seul contexte météo. Les calculs F1 et par service restent inchangés.

## Livraison et activation locale

- W0 : recherche/résolution serveur puis confirmation dans la modale météo ; invalidation
  versionnée après changement de ville/adresse, même si les anciens champs sont rétablis.
- W1 : adaptateur sans SDK, réponses normalisées, cache partagé par restaurant,
  fraîcheur 1 h / visibilité maximale 6 h et repli non bloquant. Aucun schéma Prisma ajouté.
- W2 : bouton météo dans la barre du haut, résumé compact et modale de réglages/détails ; référence vérifiée à la validation,
  contexte immuable dans la décision et la fiche imprimable. Un rejeu conserve son entrée,
  même lorsqu'une actualisation météo arrive entre deux tentatives frontend.
- Le raccord date/service utilise `serviceDate` et `serviceSlot` dans les liens Services ↔
  Réglages. Il ne livre pas tout S1 : les brouillons non enregistrés doivent toujours être
  enregistrés avant de quitter l'écran. Ouvrir/fermer la modale météo ne navigue pas et
  ne remonte pas la fiche. Le contexte affiché dans la barre est partagé avec sa validation.
  Sur Services, la météo suit la date et le service sélectionnés ; ailleurs, elle affiche
  aujourd'hui avec choix midi/soir dans la modale. Les anciens blocs des pages sont retirés.
- Le calendrier existant refuse les horaires débordant sur minuit ; aucune durée nocturne
  supplémentaire n'est supposée. Les heures UTC distinguent les répétitions du changement d'heure.
- Deux documents serveur réservés : `weather-position` et `weather-cache`. Ce dernier est
  remplacé, pas historisé ; l'expiration est vérifiée à chaque lecture, sans tâche de purge
  périodique. Seuls les contextes de décision ont une conservation historique métier.

Configuration dans l'environnement **serveur**, puis redémarrage de l'API :

| Variable | Usage |
| --- | --- |
| `OPEN_METEO_MODE=disabled` | Valeur par défaut, aucun appel fournisseur |
| `OPEN_METEO_MODE=evaluation` | Endpoint public, uniquement pour un usage non commercial autorisé |
| `OPEN_METEO_MODE=commercial` | Endpoints `customer-`, abonnement adapté requis |
| `OPEN_METEO_API_KEY` | Obligatoire en mode commercial ; aucun préfixe `VITE_`, aucune clé dans le dépôt |

Après configuration : bouton météo dans la barre du haut → rechercher la commune,
relire puis confirmer ; régler au besoin les horaires dans la même modale. « Terminer »,
la croix ou Échap ferment la modale ; seul le résumé reste dans la barre. Réglages et
Connexions ouvrent cette même modale, sans formulaire de localisation concurrent.
Pour désactiver, remettre `disabled` et redémarrer ; les décisions passées restent lisibles.
Ne pas activer une offre payante ni changer le compte conservé dans le cadre des tests.

### Preuves et limites

- Recette finale `npm run verify:local-delivery` réussie le 28 septembre 2026 :
  lint/CSS, builds web/API, tests unitaires et scripts, **59 tests d'intégration
  dans 34 fichiers**, migrations fraîches, parité Prisma et restauration témoin.
  PostgreSQL loopback/tmpfs supprimé à la fin ; aucune base opérationnelle utilisée.
  Après la dernière correction du lien Connexions → commune : lint, build web et
  les quatre tests de présentation/navigation repassés ; liens locaux et diff vérifiés.
- Déplacement dans la barre et modale : `npm run lint`, `npm run build`, `npm test`
  réussis (**278 tests Vitest**, 35 tests de scripts). Les tests du
  [bouton et du contenu](../../src/components/layout/WeatherNavButton.test.ts)
  couvrent contexte de service, états du résumé et sémantique SSR. Backend inchangé
  pour ce déplacement ; recette interactive toujours en attente.
- Tests sans réseau externe : schémas/erreurs/unités/timeout/429 de l'adaptateur,
  fenêtre Paris/DST et fraîcheur ; rendu SSR et navigation ; HTTP sur comptes temporaires
  (isolation, position, cache, concurrence, invalidation, décision/rejeu et invariance des prévisions).
  Fichiers principaux : [adaptateur](../../server/src/integrations/openMeteo.test.ts),
  [politiques](../../server/src/application/workspace/weatherPolicy.test.ts),
  [HTTP](../../server/src/http/weather.integration.test.ts),
  [présentation](../../src/components/services/ServiceWeatherPanel.test.ts).
- Connexion réelle distincte : le 28 septembre 2026 à 07:13 UTC, recherche Paris/France,
  résolution de l'identifiant `2988507` et prévision validées par l'adaptateur public :
  **168 heures**, `Europe/Paris`, `issuedAt: null`. Ni donnée privée ni écriture en base ;
  cela ne vaut pas activation commerciale ou connexion du compte du restaurant.
- La restriction de tests navigateur du plan principal est conservée : **recette
  visuelle/mobile/clavier en attente**, SSR ne prouvant pas les interactions.
- Aucun bénéfice prédictif mesuré, aucune vente/production/commande créée par la météo.

## W0 — localisation confirmée

**Prérequis : S1**, contexte date/service et règles de retour définis.

- Dans la modale ouverte depuis la barre du haut (également accessible depuis Réglages), proposer une recherche explicite depuis la ville du
  restaurant ; afficher commune, région et pays puis faire confirmer le résultat.
  Open-Meteo recherche des lieux ou codes postaux, pas une adresse de rue certifiée :
  enregistrer `precision: city`, jamais `address`. [Documentation du géocodage](https://open-meteo.com/en/docs/geocoding-api)
- Passer par le serveur ; valider la réponse et résoudre le lieu sélectionné depuis
  son identifiant fournisseur. Ne pas accepter de coordonnées client comme preuve.
  Aucun accès GPS au navigateur, aucune transmission du nom/contact du restaurant.
- Conserver restaurant, identifiant fournisseur, libellé, coordonnées, fuseau,
  précision, date/auteur de confirmation, révision et empreinte des champs de
  localisation de l'établissement. Une modification les rend à reconfirmer ; pas
  de météo présentée comme celle du nouveau lieu avec l'ancienne position.
- Stocker ce petit document typé avec le mécanisme `WorkspaceDocument` existant,
  sous un type réservé au serveur ; contrôler session, restaurant et révision.
  L'initiale reste Europe/Paris : ne pas convertir implicitement les services vers
  un autre fuseau ni étendre le calendrier à d'autres zones dans ce lot.
- Absence/ambiguïté/erreur : position non confirmée, parcours utilisable sans météo.

**Sortie :** lieu relu et confirmé, persistant après rechargement, isolé entre
restaurants, invalidation démontrée ; aucune localisation approchée présentée comme exacte.

## W1 — adaptateur serveur et cache

**Prérequis : W0**, contrat validé sur fixtures et conditions fournisseur cadrées.

- Utiliser `fetch` côté serveur, sans SDK ; endpoint fournisseur fixe selon l'offre,
  clé éventuelle en environnement serveur, jamais dans le navigateur ni les logs.
  Définir types externes/schéma de validation puis modèle interne normalisé.
- Requête bornée aux sept prochains jours : températures, précipitations,
  probabilité de précipitation et vent horaires, avec unités et fuseau explicites.
  Les variables horaires sont fournies par la [Forecast API](https://open-meteo.com/en/docs).
  Ne pas importer tous les modèles ni des années d'archives pour afficher un service.
- Contrat UI proposé : `GET /api/workspace/services/weather?date=…&slot=…`.
  Le serveur déduit le restaurant et la position, puis les horaires depuis le calendrier.
  Réponse : `status`, localisation/précision, fenêtre du service, valeurs/unité,
  couverture, `fetchedAt`, `issuedAt` nullable, expiration, source et référence de contexte.
- États explicites : `not_configured`, `unavailable`, `stale`, `partial`, `ready`.
  Horaires absents ou date hors horizon : pas de résumé de service supposé ; afficher
  la raison. Une date passée n'est pas reconstruite depuis la prévision actuelle.
- Afficher la plage de température, le vent maximal et les probabilités horaires
  sur les créneaux concernés. Si résumé par maximum horaire, le libeller ainsi :
  ce n'est pas la probabilité de pluie sur tout le service. Pluie absente ≠ 0 mm.
  Une tranche débordant sur minuit suit le calendrier existant ; ne pas inventer sa durée.
- Cache normalisé borné par restaurant, révision de position et fenêtre couverte,
  via document serveur distinct des décisions. Choix initiaux Kookia : fraîcheur
  1 h ; dernier résultat éventuellement visible jusqu'à 6 h, marqué ancien ; au-delà,
  indisponible. Ces durées ne sont pas des garanties de précision du fournisseur.
- Délai réseau maximal 5 s, requêtes concurrentes identiques regroupées, pas de boucle
  de retry ; sur `429`, respecter `Retry-After`. Le changement de position invalide le
  cache courant. Erreur/JSON invalide/heure manquante ne doivent pas écraser un résultat valide.
- Distinguer récupération (`fetchedAt`) et émission du modèle (`issuedAt`) : ne pas
  inventer cette dernière lorsqu'elle n'est pas fournie, ni utiliser `generationtime_ms`
  comme date. Une capture prouve seulement ce qui était connu à sa récupération.
- Le GET peut mettre à jour ce cache technique, jamais une opération métier. Une
  indisponibilité fournisseur retourne l'état métier non bloquant ; `401` et les
  erreurs de paramètres gardent leur statut HTTP. Connexions reflète le dernier
  succès réel, pas simplement la présence d'une configuration ou d'une fixture.

**Sortie :** réponses normalisées, cache/rate limit/repli testés, isolation et
fraîcheur visibles ; aucune modification des ventes, prévisions, achats ou stocks.

## W2 — affichage et trace de la décision

**Prérequis : W1.** L'accès météo est commun aux écrans authentifiés.

- Bouton secondaire dans la barre du haut : service/date et résumé de température,
  avec état ancien/partiel/inconnu. Sa modale présente « Météo du service » : lieu, midi/soir, température/pluie/vent,
  dernière actualisation, source et limites. Les horaires non renseignés conduisent
  au formulaire réutilisé dans la modale, sans bloquer la fiche. Pas de nouvel écran ni d'action principale concurrente.
- Charger indépendamment de la fiche ; une météo en panne ne remplace pas le bouton
  de préparation. Pas de rafraîchissement en boucle ni de perte de brouillon.
- Le chef modifie les portions dans le plan existant. Ne pas proposer « +20 % »
  ou « moins de couverts » depuis un seuil météorologique sans évaluation terrain.
- À la validation explicite du plan, transmettre seulement la référence du contexte
  consulté. Le serveur contrôle restaurant, date/service, révisions de position et
  d'horaires puis copie ce contexte normalisé dans le snapshot de décision existant.
  Ne pas accepter les valeurs météo soumises par le client comme source.
- Une référence expirée/absente/non correspondante n'est ni remplacée par une météo
  plus récente que le chef n'a pas vue ni un motif de rejet du plan : enregistrer
  explicitement « contexte météo non conservé » et l'indiquer au résultat.
- Garder `weatherContext` distinct de `forecastReference`, des critères de clôture
  et de `forecastKey` : une actualisation météo ne périme pas le calcul de ventes.
  Rejeu de validation = même décision et même contexte historique, jamais réécrits.
- Ne conserver durablement que le contexte lié à la décision, selon sa conservation
  existante ; remplacer le cache éphémère, ne pas archiver chaque consultation ni
  mettre en place un collecteur périodique. Aucun historique importé rétroactivement
  ne doit être présenté comme consulté à l'époque. Suppression avec l'espace conservée.

**Sortie :** panneau commun non bloquant, état lisible au clavier/mobile, décision
reliée aux données réellement disponibles sans effet automatique sur les quantités.

## Fichiers et frontières concernés

Réutiliser réglages et [restaurantService](../../src/services/restaurantService.ts),
[serviceCalendarService](../../src/services/serviceCalendarService.ts), la fiche
[serviceSheetService](../../server/src/application/workspace/serviceSheetService.ts),
son contrat partagé et les décisions immuables. Conserver les anciens snapshots lisibles.
Ajouter seulement un adaptateur Open-Meteo dans l'infrastructure serveur, les schémas/DTO
météo partagés, un service applicatif position/cache, des routes authentifiées, un client
HTTP frontend et le panneau réutilisable. Étendre les statuts existants de Connexions.
Ne pas brancher ce service dans les politiques de calcul des ventes ou des achats.
Si les documents existants suffisent, aucune migration ; tout besoin de table découvert
doit être justifié dans le plan avant implémentation, pas ajouté par anticipation.

## Vérification et activation

| Cas | Preuve attendue |
| --- | --- |
| Lieux homonymes, réponse vide, coordonnées invalides, changement d'adresse | Confirmation explicite, aucune position arbitraire, cache invalidé |
| Midi/soir, changement d'heure, minuit, horaires absents, horizon dépassé | Bonne fenêtre/fuseau ou limite explicite, aucune météo attribuée au mauvais service |
| `null`, heures manquantes, unités erronées, JSON invalide | Donnée partielle/inutilisable identifiée ; ni zéro ni probabilité agrégée inventés |
| Frais/périmé, timeout, `429`, `5xx`, deux consultations simultanées | Cache borné, appels maîtrisés, service toujours utilisable |
| Session absente, autre restaurant, référence manipulée | Autorisation serveur, pas de fuite de position/cache/décision |
| Validation, météo rafraîchie entre lecture et validation, rejeu | Snapshot consulté ou absence explicite ; décision immuable, sans effet stock/vente |
| Météo absente ou différente à entrées métier égales | Mêmes prévisions de ventes, besoins d'achat et règles de clôture |
| Affichage desktop/mobile/clavier, chargement/erreur | Source, fraîcheur, focus et prochaine action métier accessibles |

Tests Vitest et HTTP sur base isolée, transport fournisseur simulé : CI sans réseau
externe ni secret. Inclure ces tests dans la recette S6. La contrainte de revue
navigateur du plan principal reste applicable ; SSR ne vaut pas preuve interactive.
Consigner deux résultats : contrat testé sur fixtures, puis connexion réelle vérifiée
avec un lieu autorisé, offre adaptée et configuration serveur ; jamais confondre les deux.

L'API gratuite est destinée au non-commercial ; l'offre commerciale fournit un
endpoint dédié et une clé. Prévoir l'attribution Open-Meteo et celle des données de
localisation, et vérifier les conditions lors de l'activation. Aucun abonnement,
achat ou déploiement n'est effectué par cette mise à jour documentaire.
[Offres et attribution](https://open-meteo.com/en/pricing), [géocodage et source GeoNames](https://open-meteo.com/en/docs/geocoding-api).

## Après le lot : mesurer avant d'influencer les achats

Comparer ultérieurement les résultats avec/sans météo sur des ventes et services
terrain qualifiés, à horizon de décision identique. Exclure simulations et sorties
estimées 90/10 de toute preuve de précision. Les captures commencent à constituer
des traces, pas un jeu terrain représentatif ni une preuve que le chef les a utilisées.
Pour rejouer des prévisions anciennes, employer les émissions disponibles à l'époque,
pas la météo observée ensuite ; Open-Meteo expose une [API par émission](https://open-meteo.com/en/docs/single-runs-api).
Le choix d'un ajustement prédictif et ses critères d'acceptation font l'objet d'un lot séparé.
