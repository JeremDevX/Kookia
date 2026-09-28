# Lot — un service complet, avec météo informative

## 1. Objectif et statut

**Évolution séparée :** le [lot terrasse et ajustement météo](terrace-weather-adjustment.md)
étend désormais W0–W2 aux estimations opérationnelles, sur demande explicite.
Les exclusions d’ajustement météo de ce plan concernent son périmètre initial,
pas ce nouveau lot. Les restrictions de recette navigateur restent inchangées.

**Plan proposé le 27 septembre 2026, complété le 28 septembre avec Open-Meteo ; non implémenté.** Inspection au commit
`8c69c6f`, arbre propre avant rédaction. Les résultats de tests de
[l'adaptation opérationnelle](operational-realism.md) sont des preuves antérieures,
pas des contrôles relancés pour ce plan. Le code prime sur les anciens inventaires.

**Résultat attendu :** depuis Aujourd'hui, préparer un service, enregistrer les
préparations, revoir les ventes, déclarer les pertes puis clôturer ; conserver
date, midi/soir, objet concerné et saisies lors des allers-retours. Le chef voit
ce qui est prévu, enregistré, manquant et la prochaine action utile, sans aide.
La météo de la journée éclaire sa décision, sans modifier automatiquement les quantités.

Références : [règles d'interface](../design-system.md),
[contrats opérationnels actuels](../operational-services.md),
[ordre de livraison](plan-execution.md), [recette isolée](../local-delivery.md).
Le [volet Open-Meteo W0–W2](service-weather.md) détaille ses contrats et sa validation.
Depuis le 28 septembre 2026, ce volet est implémenté localement, désactivé par défaut ;
Le développement local utilise l'offre publique sans clé pour le prototypage. La modale
se limite à la commune ; aucun horaire requis. Ses preuves et limites sont dans le document lié. Les lots S0–S6 restent
planifiés : les liens météo conservent la sélection, pas encore les brouillons non enregistrés.

### Périmètre

- Réutiliser Aujourd'hui, Services et carte, Recettes, Ventes, Stocks et leurs formulaires.
- Ajouter contexte de navigation, conservation temporaire des brouillons,
  reprise après opération, progression lisible et erreurs actionnables.
- Aligner les textes touchés avec les prévisions par service, sans changer leurs calculs.
- Connecter Open-Meteo côté serveur, afficher température/pluie/vent par service et
  conserver le contexte météo consulté lors de la validation du plan.
- Aucun nouvel assistant concurrent, moteur de workflow, store générique, SDK ou dépendance.
- Hors lot : POS/OCR, ajustement prédictif météo, envoi fournisseur, calibration terrain, rôles multiples,
  stock cuisiné reportable, rectification générale de l'historique et déploiement externe.
- Pas de migration Prisma prévue : position et cache météo borné via documents structurés,
  contexte de décision via snapshots existants, selon W0–W2. La migration précédente reste un
  prérequis des bases de test ; son application à une base conservée n'est pas autorisée ici.

## 2. Écarts vérifiés et réutilisation

| Point actuel | Effet | Intervention bornée |
| --- | --- | --- |
| [Services](../../src/pages/Services.tsx) garde date/service en `useState` et remonte la fiche après modification de carte | Retour sur aujourd'hui/midi ; brouillon susceptible d'être perdu | URL comme contexte, état éditable conservé séparément des lectures |
| [Fiche](../../src/components/services/ServiceSheetPanel.tsx) lie `/recipes`, `/sales`, `/stocks` sans contexte | Ressaisie, choix de préparation et retour manuels | Liens contextualisés et retour explicite |
| [Recettes](../../src/pages/Recipes.tsx) transmet la date du jour pour production/refus | Un service passé peut recevoir une opération du mauvais jour | Date transmise explicitement, revue de version datée avant production |
| [Ventes](../../src/pages/Sales.tsx), [services datés](../../src/components/sales/DatedServices.tsx), [pertes](../../src/components/stocks/StockLotsAndWaste.tsx) ont leurs valeurs initiales indépendantes | Date/service à choisir à nouveau | Initialisation contextuelle sans écraser une saisie en cours |
| `facts.gaps` et erreurs de clôture sont des textes ; le bouton ne couvre pas toutes les erreurs de lignes | Correction difficile à orienter ; refus tardif | Motifs typés issus de la politique serveur existante |
| [Aujourd'hui](../../src/pages/Dashboard.tsx) priorise panier/ventes/stock sans fiche de service | Le nouveau parcours est surtout accessible dans Plus | Une entrée par service et une action principale contextualisée |
| L'accueil généralise encore le seuil de 28 jours | Confusion baseline quotidienne / estimation par service | Texte bref, conditions détaillées depuis les résultats du calcul |
| F2 teste uniquement des fixtures ; aucune position vérifiée ni donnée météo active | Pas de contexte météo utilisable | W0–W2 indépendant des calculs de ventes et d'achat |

Réutiliser `formatLocalISODate`/`isValidISODate` dans
[date.ts](../../src/utils/date.ts), `ServiceSlot`/ses libellés, les services HTTP,
`Modal`, les erreurs/révisions/idempotences existantes et le principe de retour
à cible bornée de [analyticsNavigation](../../src/utils/analyticsNavigation.ts).
Ne pas modifier les retours Bilan/Historique pour un besoin propre aux services.

## 3. Décisions fonctionnelles

### Navigation et contexte

- Contrat URL commun : `serviceDate=YYYY-MM-DD`, `serviceSlot=lunch|dinner`.
  Sur les destinations, `serviceReturn=menu|sheet` et, si utile, `recipeId`,
  `productionId` ou le paramètre produit déjà existant. Exemple :
  `/recipes?serviceDate=2026-09-27&serviceSlot=dinner&serviceReturn=sheet&recipeId=…`.
- Construire le retour vers `/services` depuis ces valeurs validées et une ancre
  connue. Aucune URL libre de retour, donnée de formulaire ou identité de compte dans l'URL.
- Paramètres absents : conserver l'usage autonome actuel. Contexte partiel/invalide :
  ne pas prétendre le conserver ; expliquer le problème avant toute saisie contextualisée.
  Identifiant inaccessible : objet indisponible, aucune sélection de remplacement automatique.
- Date civile Europe/Paris ; ne jamais convertir une date de service en date du navigateur.
  Les liens directs, précédent/suivant navigateur et rechargement restaurent la sélection.
- Le bandeau « Service du … · midi/soir » et « Retour à la fiche de service » reste
  disponible dans les écrans concernés. Après succès, proposer ce retour sans redirection forcée.

### Brouillons et rafraîchissement

- Un petit contexte React spécifique, placé dans le périmètre authentifié au-dessus
  des routes, conserve uniquement les brouillons touchés. Clé : compte/espace actif,
  date, service, type de formulaire et objet éventuel. Pas de `localStorage` ni de mode hors ligne.
- Séparer données serveur, saisie éditable, révision de base, état modifié et
  identifiant d'opération. Conserver la saisie lors d'une navigation interne, d'un
  changement midi/soir et d'une erreur ; purger à la déconnexion/changement de compte.
- Rechargement complet/fermeture : seules les données enregistrées sont garanties.
  Avertissement natif uniquement si saisie non enregistrée ; aucun enregistrement implicite.
- Revenir d'une production/vente/perte recharge les faits, pas le brouillon. Une
  réponse tardive n'écrit jamais dans le service actuellement affiché si sa clé diffère.
- Carte modifiée : actualiser faits/prévisions sans remonter destructivement la fiche.
  Conserver les quantités saisies ; invalider la référence de prévision si nécessaire.
- Conflit `409` : garder la saisie, afficher la version serveur à relire, proposer
  abandon explicite ou reprise revue. Jamais remplacer `expectedRevision` puis réessayer en silence.
- Après échec réseau ambigu, conserver le payload en attente et rejouer le même contenu avec le même `operationId` ; lever cette ambiguïté avant une nouvelle mutation.
  Après succès confirmé, vider le formulaire concerné et créer un nouvel identifiant.
  Échec du rafraîchissement après POST réussi : « enregistré, affichage à recharger », pas « non enregistré ».

### Progression : guide, pas nouveau statut métier

| Situation observée | Action dominante proposée | Garde à conserver |
| --- | --- | --- |
| Lecture indisponible | Réessayer | Ne pas afficher vide, zéro ou clôturable |
| Horaires non renseignés / service prévu fermé | Renseigner les horaires / revoir l'ouverture | Fermeture planifiée ≠ fiche clôturée ; ne pas ouvrir implicitement |
| Carte absente | Préparer la carte | Conseil de parcours, pas nouvelle interdiction serveur du plan manuel |
| Plan non validé | Préparer puis valider le plan | Sans historique, saisie manuelle possible |
| Plan validé, aucune préparation attribuée | Enregistrer une préparation | Le plan n'est pas une production ; quantité à confirmer |
| Préparations présentes, données incomplètes | Compléter les opérations | Accès aux compléments toujours possible ; ne pas exiger de produire tout le plan |
| Données disponibles, rapprochement incomplet | Revoir les invendus / le motif précis | Absence de donnée ≠ zéro ; aucune perte déduite automatiquement |
| Plan validé et rapprochement enregistrable sans blocage | Revoir et clôturer | Contrôle transactionnel final côté serveur |
| Fiche clôturée | Consulter le constat | Corrections ultérieures signalées ; constat initial immuable |

Les sections restent accessibles : pas de tunnel bloquant. Incidents, détails de
calcul et historique sont secondaires, mais leurs limites utiles restent visibles.
Le client peut sélectionner un lien ; il ne décide jamais qu'une mutation est autorisée.
La météo reste secondaire : absente, périmée ou en erreur, elle ne bloque aucune étape.

## 4. Contrats techniques à préparer

### Motifs de rapprochement

Étendre de façon additive la réponse de `GET /workspace/services/sheet` avec une
projection `guidance` calculée : `issues` typés et `canClose` pour le dernier état
enregistré. Chaque motif a `code`, `message`, portée service/recette et identifiant
cible disponible ; la correspondance code → écran/ancre reste dans le frontend.
Ne pas analyser les phrases françaises pour en déduire une règle.

La politique qui produit les motifs doit aussi alimenter `serviceSheetClosureErrors` :
couverture, ventes/préparations non ventilées, ventilation périmée, article sans
correspondance, préparation sans recette, pertes sans service/d'un autre service,
simulation, substitutions excessives, ventes supérieures aux préparations,
invendus non rapprochés et pertes déclarées différentes des portions écartées.
La validation préalable du plan reste également nécessaire à `canClose`.

`guidance` n'entre ni dans le document stocké, ni dans `closureFacts`, ni dans la
comparaison `factsChangedSinceClosure`. Garder les messages existants compatibles,
les snapshots de décision et les résultats de rejeu inchangés. Après POST, le
client relit la projection ; une ancienne réponse sans `guidance` ne signifie pas
absence de blocage. Une saisie modifiée rend `canClose` affiché périmé : enregistrer
le rapprochement pour le recalculer, ou soumettre explicitement à la validation serveur.

### Production avec date conservée

Le POST production accepte déjà date/service et résout une version datée, mais
le catalogue UI montre la dernière version. Ajouter une lecture ciblée authentifiée
`GET /workspace/recipes/:id/production-context?date=YYYY-MM-DD` : version applicable,
dosages/rendement, disponibilité indicative actuelle à cette date et limites.
Réutiliser `findRecipeVersionForDate`, sans copier sa politique dans le client.

Le formulaire transmet cette version comme `expectedRecipeRevision`, la date
et le service affichés ; le POST revérifie tout atomiquement. Une version historique
à date inconnue reste signalée, pas transformée en preuve datée. Les refus n'ont
pas d'effet stock ; une simple note de préparation ne devient pas une production liée.

Avant d'exposer la saisie de production passée, exclure les lots reçus après le
jour déclaré, en plus des lots échus, dans le calcul et la mutation ; ce filtre
manque actuellement dans `recordLotMovement`. Conserver l'incertitude des lots
sans âge. Il s'agit du stock restant aujourd'hui utilisable pour une déclaration
tardive, pas d'une reconstitution du stock passé ; aucun rejeu des anciens mouvements.
Dates futures : préparation du plan possible, opération observée refusée selon
les contrôles serveur, jamais ramenée silencieusement à aujourd'hui.

### Périmètre des corrections

Les liens guident vers les corrections réellement disponibles : ventes/ventilation,
carte avant validation, saisie manquante, pertes à déclarer, rapprochement.
Les API inspectées n'offrent pas de réattribution générale des productions/pertes
déjà enregistrées. Ces cas et les changements de carte après gel du plan restent
explicitement bloqués avec accès à leur preuve ; aucun bouton ne promet leur résolution.
Ne jamais proposer de ressaisir une production/perte existante pour la « corriger ».
La rectification auditée de ces anciennes opérations constitue un lot distinct.

## 5. Incréments et critères de sortie

Ordre recommandé : **S0 → S1 → W0 → W1 → W2 → S2 → S3 → S4 → S5 → S6**.
W0–W2 n'est pas un prérequis métier de S2–S6 : un accès fournisseur manquant ne
bloque pas le parcours. Livrer sans lien vers un formulaire qui ignore encore le contexte.

### S0 — caractériser les parcours et figer les contrats

- Relever les cas nominaux et les échecs ci-dessous ; préparer la fixture opérationnelle
  isolée de la section 6 et caractériser clôture, dates et idempotence avant modification.
- Fixer les types URL, brouillon, motif et contexte de production. Inventorier les
  consommateurs POST/GET, y compris fiches imprimables et snapshots historiques.
- Sortie : écarts reproduits ou démontrés par le code, invariants actuels couverts,
  aucun nouveau comportement actif. Pas de campagne globale de tests répétitive.

### S1 — contexte commun et continuité des brouillons

- Créer `src/features/services/serviceNavigation.ts` et son test pour parser/construire
  les liens bornés ; utiliser les utilitaires dates et les paramètres existants.
- Ajouter le contexte de brouillons spécifique et brancher sélection URL, carte et
  fiche ; enlever le remontage destructif par `revision` dans `Services.tsx`.
- Préparer bandeau/retour réutilisable, sans formulaire parallèle ni changement de routeur.
- Sortie : aller-retour interne, deux services et conflit conservent la bonne saisie ;
  un autre compte n'en hérite pas ; rafraîchir n'écrit aucune donnée métier.

### W0–W2 — météo informative du service

- **W0** : commune/localisation confirmée, précision explicite et invalidation après modification.
- **W1** : adaptateur Open-Meteo serveur, cache, fraîcheur et repli sans dépendance bloquante.
- **W2** : résumé météo dans la barre du haut, modale de commune et prévisions de journée
  à la demande ; snapshot à la validation du plan.
- Contrats, fichiers, critères de sortie et tests dans [l'annexe météo](service-weather.md).
  Ne pas activer F2 prédictif, recalculer un achat ou inventer un effet sur les couverts.

### S2 — fiche guidée et motifs serveur

- Toucher `shared/serviceSheet.ts`, `serviceSheetPolicy.ts`, `serviceSheetService.ts`,
  `src/services/serviceSheetService.ts` et leurs tests ; ajouter la projection décrite.
- Extraire du panneau les seules responsabilités qui grossissent : résumé/progression,
  plan et rapprochement. Garder décisions et critères de clôture hors du JSX.
- Montrer un motif et son geste utile près de l'action bloquée ; après validation,
  indiquer « Plan validé » et proposer l'enregistrement des préparations.
- Sortie : aucun critère nouveau de clôture, aucune écriture en GET, pas de faux
  « prêt à clôturer », mêmes refus serveur en contournant les boutons.

### S3 — enregistrer une préparation sans perdre le service

- Ajouter la lecture datée, son client et ses tests ; adapter `ProductionConfirmModal`,
  `ReportRefusalModal` et les callbacks de Recettes. Réutiliser la modale existante.
- Préselectionner recette/date/service seulement après lecture valide ; portions du
  plan présentées comme aide à confirmer, jamais comme quantité déjà réalisée.
- `RecordProductionModal` reçoit aussi le contexte, tout en restant une note sans
  déduction ; ne pas la présenter comme une solution à un manque de production liée.
- Extraire le hook de cette orchestration avant de faire dépasser à `Recipes.tsx`
  ses 452 lignes actuelles ; pas de refonte du catalogue.
- Sortie : date passée avec ancienne recette, aujourd'hui, complément, refus, stock
  insuffisant et rejeu gardent le bon service ; une seule déduction lors du succès.

### S4 — ventes, pertes et retour au rapprochement

- Initialiser date/filtres dans Sales et date/service dans DatedServices ; sélectionner
  l'article concerné si connu. Conserver le contexte après succès, annulation et import.
- Garder la vente canonique quotidienne et l'attribution midi/soir explicitement
  confirmée dans SaleServiceAllocation. Aucune ventilation automatique depuis l'URL.
- Initialiser StockLotsAndWaste avec service, nature de perte et préparation si
  renseignés. Ne pas sélectionner la première préparation d'une liste par défaut ;
  en présence de plusieurs productions, laisser choisir la bonne pièce.
- Étendre les brouillons aux formulaires concernés ; réinitialiser uniquement après
  succès confirmé. Proposer retour à la fiche, relire faits et afficher le résultat.
- Sortie : vente corrigée puis reventilée, déclaration d'invendu et conservation des
  portions se rapprochent sans double saisie ni seconde sortie matière.

### S5 — Aujourd'hui et textes cohérents

- Ajouter un sélecteur midi/soir et l'état du service à l'unique bloc « À faire ».
  À défaut de sélection explicite, choisir le premier service planifié non clôturé
  du jour (midi puis soir) ; sélection toujours visible et modifiable. Aucun horaire
  connu : proposer de le renseigner, pas déclarer le restaurant fermé.
- Lire calendrier et fiches nécessaires via les endpoints existants, requêtes bornées
  à aujourd'hui, sans charger toutes les prévisions ni ajouter un endpoint de dashboard.
- Priorité proposée : erreur empêchant de connaître le service → prochain geste du
  service sélectionné → achats/stock existants si aucun service à traiter. Les alertes
  stocks et le panier restent visibles en cartes secondaires, jamais effacés.
- Une fois les services clôturés, montrer le constat et les achats éventuels ; ne pas
  lancer automatiquement le lendemain. Ne pas confondre « pas de ventes » et compte neuf.
- Corriger les 28 jours généralisés, ranger détails/révisions techniques et hypothèses
  en second niveau ; conserver sources, dates, unités, incertitude et confirmations.
- Intégrer le panneau météo W2 pour le service choisi, sans seconde action dominante,
  sans nouvelle requête fournisseur si le cache est frais et sans attente bloquant l'accueil.
- Sortie : un prochain geste clair et stable au chargement, absence de requêtes en
  boucle, accès autonome aux pages préservé, aucune nouvelle règle d'achat/prévision.

### S6 — recette transversale et documentation

- Exécuter la matrice ci-dessous et celle de W0–W2 ; corriger les blocages de ce parcours.
- Mettre à jour les guides opérationnels/restaurateur et la référence technique avec
  le comportement réellement livré, les limites de brouillons et de rectification.
- Consigner version, commandes, résultats, captures autorisées et limites dans le suivi
  de ce lot. Ne pas déclarer le lot validé visuellement sur la seule base de TypeScript/SSR.
- Sortie : preuves techniques et parcours utilisable réunis ; préproduction/pilote
  constituent l'étape suivante, pas un effet implicite de ce développement.

## 6. Matrice de validation

| Niveau | Cas minimal | Preuve attendue |
| --- | --- | --- |
| Unitaire navigation | Date invalide, 29 février, Paris/changement d'heure, contexte partiel, ancre inconnue | URL valide ou rejet explicite ; aucune cible externe |
| Unitaire brouillons | Midi/soir, autre date, compte déconnecté, réponse tardive, GET échoué, révision concurrente | Pas d'écrasement, fuite de saisie ou succès inventé |
| Unitaire politique | Tous les motifs et garde plan validé ; brouillon modifié | Motifs/clôture cohérents ; aucune analyse de texte français |
| API production | Version ancienne/future/inconnue, lot reçu plus tard/échu/sans âge, quantité insuffisante | Contexte et mutation cohérents ; échec atomique, pas de faux stock historique |
| API sûreté | Session absente, autre restaurant, double clic, rejeu identique/différent | Autorisation, idempotence et refus inchangés |
| API parcours complet | Carte → plan validé → vraie production via HTTP → vente → ventilation → perte → clôture | Stock déduit une fois ; ventes/pertes reliées ; constat immuable |
| API exceptions | Ventes partielles/corrigées, refus, substitution, portions fractionnelles, pertes d'un autre service | Inconnues visibles ; blocages expliqués ; aucun contournement |
| Météo W0–W2 | Position, journée civile/DST, cache, panne, snapshot et isolation | Source/fraîcheur explicites ; aucune quantité ni clôture dépendante de la météo |
| UI parcours | Aujourd'hui → service soir → Recettes → Ventes → Stocks → fiche | Date/service/objet conservés, retours clairs, saisies retrouvées |
| UI récupération | 503, réponse tardive, POST réussi/GET échoué, 409, rechargement, précédent/suivant | Saisie et focus préservés ; pas de double opération |
| UI accessibilité | 320/768/1280 px, clavier seul, modales, zoom 200 %, états non nominaux | Action accessible, focus visible/restauré, pas de débordement de page |
| Régression | Entrées directes, liens Bilan/Historique, périodes passées/futures, nouvelle session | Aucun contexte imposé hors du parcours ; pas de mutation automatique |

Étendre prioritairement `serviceSheetPolicy.test.ts`, `serviceSheet.integration.test.ts`,
`serviceCalendar.integration.test.ts`, `lotWaste.integration.test.ts` et `lotService.test.ts`.
Le test de fiche actuel prépare certaines productions directement en base : ajouter
un scénario utilisant réellement le POST production pour prouver ce raccord.
Les nouveaux tests purs/SSR utilisent Vitest existant ; ne pas installer un framework
E2E uniquement pour ce lot. Un rendu SSR ne prouve pas les interactions navigateur.

Contrôles ciblés pendant chaque incrément ; à la fin, `npm run verify:local-delivery`
sur PostgreSQL jetable couvre lint, builds web/API, tests unitaires/intégration,
migrations/parité et restauration témoin. Ne pas répéter séparément les mêmes suites
si cette recette a passé sur le même diff. Ajouter `git diff --check` et contrôle des liens.
Pour la recette UI, `npm run demo:fixtures` uniquement, sans corpus privé ni compte Kookia.
Préparer dès S0 une fixture permettant les opérations enregistrées et la clôture :
un tenant `demo` est explicitement bloqué par la politique de fiche ; adapter le seed
QA isolé à un compte opérationnel synthétique, jamais la règle métier ni le compte conservé.

Le mandat opérationnel précédent excluait les tests navigateur. Ce plan n'en exécute
aucun et ne lève pas cette contrainte : si elle reste applicable à l'implémentation,
livrer le code avec statut « recette visuelle/interactions en attente », pas « parcours validé ».
L'observation avec un restaurateur mesure ensuite compréhension, retours inutiles,
ressaisies et temps par tâche ; aucun objectif de durée ou gain n'est présenté comme acquis.

## 7. Livraison, retour arrière et définition de terminé

Livrer S1–S4 avant l'accès principal S5 ; API additive avant ses consommateurs.
W0–W2 se raccorde au même contexte et peut être désactivé sans retirer le parcours.
Les nouveaux modules restent petits et spécifiques ; extraire avant d'ajouter à un
fichier de plus de 500 lignes. Aucun renommage ni reformatage transversal.
En cas de retrait, enlever d'abord le nouveau point d'entrée UI, puis revenir aux
consommateurs précédents ; les champs de lecture supplémentaires sont tolérables.
Ne supprimer aucune opération, décision, version ou clôture enregistrée pour revenir
en arrière. Les contrôles de stock corrigés restent couverts et ne sont pas affaiblis.

Le lot complet est terminé lorsque S0–S6 et W0–W2 sont prouvés, qu'un nouveau service peut
être conduit à sa clôture sans ressaisir son contexte, que les blocages historiques
restent honnêtes et que les tests/limites sont consignés. Le choix d'un hébergeur,
la migration d'une base conservée, les sauvegardes d'exploitation et l'activation
d'un pilote relèvent ensuite de R1, avec leur autorisation distincte.
Consigner séparément « météo testée sur fixtures » et « Open-Meteo connecté et vérifié » ;
sans accès réel, ne pas déclarer l'intégration active ni le volet météo entièrement livré.
