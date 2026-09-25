# Journal de reprise du Goal Kookia

**Cadrage produit confirmé le 25/09/2026 :** le compte de travail est Kookia
uniquement. L'Historique n'a pas de limite produit à quatre ans ; les fenêtres
de requête peuvent être bornées sans restreindre les dates consultables. Les
dates de travail du corpus sont alignées sur 2026 et les dates d'origine ne
sont pas exposées dans l'interface. Les pièces sont des entrées d'achat, pas
des preuves de vente, service, production ou perte. Des sorties plausibles
peuvent être estimées à part depuis des entrées revues et des recettes
compatibles, avec hypothèses/provenance visibles, sans écriture d'opérations
ni présentation comme résultat observé. Les fixtures et captures synthétiques
restent une preuve de QA technique uniquement, hors compte Kookia. La revue
réelle n'écrit pas dans le compte.

**État du Goal :** travail en cours ; Q1, Q1b, C1, D1, D2, D3, D4, D5, D6, C2, F1, F3/F4, O1–O2, M1–M3, R0 et I1–I4 sont prouvés localement sur leurs portées et fixtures respectives ; aucun fournisseur OCR n'est activé.

**Reprise du 25/09/2026 :** les sorties sans tickets/données de service peuvent
être estimées séparément depuis des entrées de stock revues et des recettes
datées compatibles, avec hypothèses/provenance visibles ; elles ne deviennent
pas des opérations observées et n'écrivent pas dans ventes, pertes, production
ou stock. Le produit garde l'intitulé « Historique » et aucune borne totale de
quatre ans ; seules les dates de travail alignées sur 2026 sont exposées.
`GET /invoices` ne crée désormais plus la facture d'exemple pour tout compte
neuf ; la seed reste explicite. Lint, tests unitaires (29 fichiers/117 tests),
build web, build API et `git diff --check` passent. `verify:local-delivery` n'a
pas pu démarrer : accès Docker refusé au socket avant création du conteneur ;
nettoyage non vérifiable pour la même raison. CUA annonce `browsers: []` ; la
fenêtre existante vers un autre espace n'a pas été utilisée. Aucun compte ou
stock conservé n'a été consulté ou modifié. Le calcul des sorties estimées
est implémenté plus bas ; le rendu de cette révision reste à contrôler.

**Suite Q2/Bilan :** le Bilan opérationnel ne propose plus la disclosure de
graphiques d'exemple figés ni ne charge leur ancienne vue ; le CSS correspondant
est retiré et le guide restaurateur décrit maintenant le bilan sourcé. `npm run
lint`, `npm test` (29 fichiers/117 tests), `npm run build`, `npm run build:api`
et `git diff --check` passent. Aucun rendu n'a été capturé pour cette révision :
CUA reste sans navigateur contrôlable ; les preuves de captures déjà commitées
restent historiques/QA et ne sont pas revendiquées pour le Bilan actuel.

**Recette d'intégration relancée :** `npm run verify:local-delivery` a ensuite
passé sur PostgreSQL 16 tmpfs : lint, build web/API, 18/18 migrations, diff
Prisma vide, 29 fichiers/117 tests unitaires, 25 fichiers/39 tests
d'intégration et sauvegarde/restauration synthétique. Le processus s'est terminé
avec succès et a supprimé son conteneur. Aucun compte ou donnée Kookia n'a été
utilisé ; l'absence de rendu navigateur reste inchangée.

**Q2 — sorties estimées par recette (2026-09-25) :** le Bilan dispose maintenant
d'un endpoint GET et d'un panneau séparés des mesures observées. Le calcul lit
uniquement les réceptions positives avec `simulated=false` et provenance
`recorded`, puis associe la version de recette datée la plus récente à la date
de livraison, avec correspondance exacte produit/unité. Il expose rendement,
quantités de vente/perte estimées selon l'hypothèse initiale 90/10 et ingrédients
non contrôlés ; les recettes concurrentes sont des alternatives non additives.
L'endpoint ne crée aucune vente, perte ou mouvement. Un test demande une période
de cinq ans et vérifie l'isolation restaurant, l'exclusion d'une réception
simulée et l'absence d'écritures ventes/stock. Avant l'extension récente du
parcours O2, une exécution complète R0 a réussi : lint, build web/API, 18/18
migrations, parité Prisma, 30 fichiers/119 tests unitaires, 26 fichiers/40
tests d'intégration, sauvegarde/restauration synthétique. Les tests
d'intégration préexistants ont aussi échoué ponctuellement ailleurs (`socket
hang up` ou `401`) sur d'autres exécutions. Le PostgreSQL tmpfs a été supprimé
après chaque exécution.

**QA rendu/clavier Q2 (2026-09-25) :** Chrome headless isolé, compte de fixtures
et réponse estimative interceptée en mémoire ; aucune donnée persistante Kookia
ou écriture métier utilisée. Les rendus 320/768/1280 px n'ont pas de
débordement du document ; le tableau défile dans sa région nommée avec Tab puis
←/→ et conserve un focus visible. Les états chargement/vide/erreur sont rendus ;
Entrée sur « Recharger les estimations » récupère la ligne et rend le focus au
titre. Les captures [320 px](evidence/q2-estimated-outflows/estimated-outflows-320.png),
[768 px](evidence/q2-estimated-outflows/estimated-outflows-768.png),
[1280 px](evidence/q2-estimated-outflows/estimated-outflows-1280.png),
[chargement](evidence/q2-estimated-outflows/estimated-outflows-loading-320.png),
[vide](evidence/q2-estimated-outflows/estimated-outflows-empty-320.png),
[erreur](evidence/q2-estimated-outflows/estimated-outflows-error-320.png) et
[reprise](evidence/q2-estimated-outflows/estimated-outflows-recovered-320.png)
sont conservées comme preuves QA strictement techniques, sans valeur métier.
CUA natif annonce toujours `browsers: []` et `getApp("Google Chrome")` échoue
(`cgWindowNotFound`) ; le contrôle navigateur headless remplace ce point pour
le rendu et les interactions de ce panneau seulement.

**Raccord entrées → recettes → sorties estimées (2026-09-25) :** la candidate
de pizza de la fixture QA relie maintenant explicitement l'huile d'olive à sa
ligne source. `ingredientOutflowEstimate.integration.test.ts` vérifie le chemin
positif réception enregistrée → recette datée compatible → quantités de vente
et perte estimées, tout en excluant une réception simulée et en prouvant
l'absence d'écriture ventes/stock ; `demoStory.integration.test.ts` vérifie
qu'une réception simulée ne produit aucune estimation. Une exécution
intermédiaire a obtenu 39/40 intégrations, avec un 401 dans
`scenarioFixture.integration.test.ts` ; un R0 complet postérieur à l'extension
O2 est passé après un run intermédiaire à 37/40 (échecs variables dans
`demoStory`, `posSalesSync` et `sales.integration`, `socket hang up`/`401`).
Après le test multi-ingrédients ci-dessous, R0 passe à nouveau intégralement :
18/18 migrations, parité Prisma, 119 tests unitaires + 33 Node/CSS, 26/26
fichiers et 40/40 tests d'intégration, sauvegarde/restauration. Aucun échec
dans cette dernière exécution ; les intermittences précédentes restent sans
cause établie. Le conteneur tmpfs a été supprimé. Aucun compte Kookia persistant
n'a été utilisé.

**O2 — réception → sorties estimées (2026-09-25) :** le parcours d'intégration
de commande validée, facture liée et réceptions partielles (2 puis 1 kg)
vérifie maintenant une estimation distincte pour chaque entrée, rattachée à la
recette datée compatible, avec portions et quantités de vente/perte calculées
selon l'hypothèse 90/10. Le test compare aussi les nombres de ventes et de
mouvements avant/après pour prouver l'absence d'écriture ; une réception
simulée reste exclue. `purchaseSuggestions.integration.test.ts` passe seul
(1/1) sur PostgreSQL tmpfs. Le test pur `restaurantSimulationPlan` vérifie
également chaque mois de la période et la présence de jours de service en
2023–2026 (2/2). Lint, build web/API, `npm test` (119 Vitest + 33 Node/CSS) et
`git diff --check` passent ; aucune donnée du compte Kookia n'a été lue ni
modifiée.

Le test dédié relie aussi quatre réceptions distinctes (farine, tomates,
mozzarella et huile d'olive) à la recette datée Pizza Margherita. Chaque
ingrédient reçu obtient ses portions possibles et ses quantités de ventes/pertes
estimées selon dosage, rendement et hypothèse 90/10 ; la réception simulée
reste exclue. L'intégration vérifie également qu'aucune ligne de vente ou de
mouvement n'est créée. La recette R0 complète passe après cet ajout et supprime
son PostgreSQL tmpfs.

Audit Prisma/SQL hors D5 : un PostgreSQL 16 neuf sur tmpfs a appliqué 18/18
migrations, puis un diff direct vers `prisma/schema.prisma` a révélé cinq
écarts d'index restants après l'audit partiel `35c7a09` : deux index absents
(`StockMovement.stockCountId`, `SaleContribution.ticketBatchId`) et trois noms
physiques tronqués à refléter. Le modèle ajoute les deux index et mappe les
trois noms historiques sans toucher aux migrations. `migration_lock.toml`
verrouille le fournisseur PostgreSQL ; le diff depuis la base fraîche migrée et
le diff depuis l'historique de migrations sont tous deux vides. La recette R0
répète automatiquement le diff après les migrations fraîches et échoue en cas
de drift. `npx prisma validate`, `npm run build:api`, `git diff --check` ; les
conteneurs jetables ont été supprimés. Commits : schéma `53ff478`, verrou
`adf5efe`, garde R0 `0baebe6`.
Un lancement local interactif isolé des chapitres C2/C3 est maintenant
disponible et exercé via `npm run demo:local` (`5a51b39`). Le récit 2025 a
maintenant une version de recette effective, un surstock, une perte et un refus
de production sur manque mesurable (`818b1d5`), sans mouvement pour le refus.
La matrice Q2 existante reste rendue par Chrome headless. La page Recettes et sa
fiche candidate ont été rendues à 1440×1000 et 390×844, sans débordement ; un
parcours clavier ouvre/annule le formulaire et restaure le focus. Dans un bac
tmpfs neuf, l'UI a aussi créé deux hypothèses depuis deux pièces tomate
synthétiques, corrigé puis confirmé l'une, laissé l'autre en attente, rechargé
la page et retrouvé leurs états ainsi que la recette active ; quantité, révision
et nombre de mouvements de stock restent identiques. Après activation, le
connecteur garde `browsers: []` et `createBrowserTab("chrome", …)` refuse les
onglets, mais `getApp("Google Chrome")` a permis de contrôler la fenêtre native
sur le bac local. Accueil, Stocks et Ventes avaient été rendues au bureau ; cette
reprise ajoute Aujourd'hui, Stocks, Achats et Ventes en émulation mobile 390×750.
Les cartes/sections se réorganisent en lecture
verticale, sans débordement horizontal visible. Sur mobile, Échap ferme le menu
et rend le focus à son bouton ; Tab atteint Aujourd'hui puis Achats, et Entrée
ouvre cette route. Le focus visible est présent. Ventes conserve le jour courant
explicitement inconnu tant qu'il n'est pas enregistré et marque les jours
simulés. Cette revue native ne remplace pas la matrice headless : 768 px a
maintenant été observé sur Aujourd'hui, Achats, Stocks et Ventes ; un vrai zoom
Chrome à 200 %, sans émulation responsive, a aussi été revu sur ces quatre
routes dans leur état courant/vide. Les autres routes, les états non nominaux à
ce zoom et le lecteur d'écran restent à vérifier.
La revue à 320 px a aussi confirmé un défilement
horizontal interne du calendrier Ventes ; la découvrabilité de ce défilement
est indiquée par un texte mobile, et Tab/flèche droite permettent d'atteindre
la région puis les colonnes suivantes.
Un autre parcours UI confirme une production de Pizza Margherita : les quatre
déductions suivent exactement les quantités/version de recette et le journal
« Production réalisée — stock déduit » persiste après rechargement.
Les décisions de suggestion d'achat sont aussi renvoyées par l'API au rechargement ;
une exclusion reste visible, un ajout renvoie à la commande liée, et les
suggestions sont actualisées après validation/réception (`ab2e4df`). Une erreur
permet de recharger ces propositions sans conserver une quantité d'une clé
de besoin périmée (`2e25f75`).
Les erreurs de lecture sont maintenant aussi rejouables dans Fournisseurs et
Propositions (avec garde catalogue) et, en code, dans les KPI d'Impact, Ventes
et baseline test ; les retours de focus sont conditionnés au fait que la
personne n'ait pas déjà déplacé le sien. Ces reprises restent à vérifier sur
rendu natif, la fenêtre ouverte n'étant pas contrôlable par CUA.
L'archive des pièces est bien une section dédiée d'Achats ; son erreur GET
n'affiche plus un faux état vide et peut relancer liste ou détail sélectionné,
avec réponse périmée ignorée et focus rendu si nécessaire (`Q2 — reprise archive`).
L'historique de commandes reste présent pendant sa mise à jour, conserve le
contexte après réception et suspend les gestes de réception si son GET échoue ;
la revue des factures brouillon distingue aussi indisponible et vide.
La modale facture partage maintenant le catalogue d'Achats, permet de relire
catalogue et brouillons avec retour de focus, conserve le brouillon en mémoire
et bloque sa persistance manuelle tant que l'historique n'est pas connu.
La modale de production a aussi été vérifiée à 390×844 : aucun débordement,
dialogue/commandes nommés dans l'AXTree, piège Tab/Shift-Tab, fermeture Échap,
focus rendu au déclencheur et aucune mutation avant confirmation.
Le seed exécutable est réservé à ce runner, qui crée lui-même sa base tmpfs
neuve (`3dddd2e`) ; aucun utilitaire séparé ne cible une base locale par nom.
Le gestionnaire d'arrêt du runner est maintenant répétable (`6570815`) et une
nouvelle smoke test confirme que Ctrl-C retire serveurs, conteneur et identifiants.
Mise à jour C2/Q2 (2026-09-25) : `demo:local` charge les 431 transcriptions
suivies seulement dans son PostgreSQL tmpfs. Deux candidates hypothétiques
(pizza jambon-champignons, omelette champignons-jambon) référencent huit lignes
issues de six pièces retenues du corpus, toutes directement compatibles avec
l'unité catalogue. Les quantités et rendements restent éditables/hypothétiques ;
la date d'origine est séparée de la date décalée de démonstration. Les tests et
captures conservent uniquement des sources fictives. L'intégration corrige une
quantité hypothétique, confirme la pizza et laisse l'omelette en attente, sans
delta de stock/révision, mouvement ou production. Un rendu du vrai composant
avec données synthétiques couvre 320/768/1280 px et le focus clavier visible,
sans débordement horizontal. Aucun détail du corpus n'est consigné ici, dans
les logs ou les captures. La lecture des originaux, la validation métier et
l'audit de sensibilité/droit d'usage avant partage restent ouverts.
Ce fichier n'est pas une preuve que
les fonctionnalités cibles complètes sont livrées. À chaque reprise, relever
date, branche, `git status`, migrations et tests disponibles sans effacer les
modifications déjà présentes.

## Prochaine action démontrable

F2 est prouvé localement : contrat de sources contextuelles horodatées,
fraîcheur/couverture, repli F1 conditionnel et aucun ajustement ni gain annoncé
(`efd1308`). Son état non connecté est rendu en français ; Chrome headless/CDP
confirme le texte AX, Tab sur la région nommée, et aucune sortie horizontale à
320/768/1280 px (correction `1a92545`, captures ci-dessous).

**Prochaine preuve Q2 :** reprendre, dès qu'une fenêtre devient contrôlable,
le zoom Chrome natif à 200 % et une vérification avec technologie
d'assistance. La revue actuelle rend le vrai composant `RecipeCandidates` avec
réponses synthétiques à 320/768/1280 px et vérifie le focus clavier ; elle ne
remplace pas une revue native. L’utilisateur voit la page de connexion, mais
`cua.getState()` retourne encore `browsers: []` et `getApp("Google Chrome")`
échoue `cgWindowNotFound`. La reprise Connexions au clavier est vérifiée dans
un harnais isolé : 503 synthétique, activation Entrée, puis cinq sources
`not_connected`. Le parcours de liaison corpus → ligne → candidate est exercé
uniquement dans le bac tmpfs ; aucune donnée source n'apparaît dans les preuves
rendues. Poursuivre aussi les états C3 non encore revus, sans présenter les
transcriptions ou les plats hypothétiques comme validés. L'audit de sensibilité
et des droits reste requis avant partage.

Reprise Q2 (2026-09-25) : l’utilisateur confirme que `/login` apparaît sur le
bac tmpfs `127.0.0.1:56819`. Dans l’environnement de revue, CUA retourne encore
`browsers: []` et `getApp("Google Chrome")` échoue `cgWindowNotFound` ; le port
56819 ne répond plus non plus. La revue native 200 %/technologie d’assistance
reste donc à faire. Le port 52790 déjà identifié comme non isolé n’a pas été
consulté.

Reprise Q2 — connexion (2026-09-25) : un runner `demo:local` tmpfs neuf a servi
`/login` sur `127.0.0.1:59889`, puis son conteneur, ses ports et ses identifiants
temporaires ont été supprimés ; les anciens runners sont restés intacts. Chrome
154 headless/CDP, après le splash, a rendu 320×750, 390×844, 768×900, 1280×900
et 1440×1000 sans débordement horizontal ni contrôle hors viewport. À 320 px,
« Créer un compte » se coupait en deux ; `.auth-footer a { white-space: nowrap; }`
conserve maintenant le libellé entier sans réduire la carte. L’AXTree expose le
titre « Connexion », les champs « Email »/« Mot de passe », le bouton « Se
connecter » et le lien « Créer un compte ». Tab atteint ces quatre contrôles
dans cet ordre avec un contour visible de 3 px. Captures du seul écran de
connexion : [320 px](evidence/q2-login/login-320.png) et
[1440 px](evidence/q2-login/login-1440.png). CUA reste inaccessible (`browsers:
[]`, `cgWindowNotFound`, IAB indisponible) ; zoom natif 200 % et lecteur d’écran
réel ne sont pas vérifiés sur cet écran.

C2/C3, I1–I4, F1, M2–M3, O1 et R0 sont prouvés localement ; l'extraction de
facture reste limitée à la fixture PDF publique en `demo:local`, sans OCR
général ni fournisseur. L'original peut être ouvert depuis Achats ; comparaison
latérale reste à revoir. L'archive et l'aperçu I4 ont été rendus en headless,
avec contrôle clavier Tab/Espace et sans effet stock.
Q2 — parcours ciblé prouvé localement : la matrice
headless couvre sept routes/cinq largeurs et le focus du menu ; la fiche
candidate a été créée, corrigée, confirmée, laissée en attente puis rechargée
dans l'UI sans effet stock. L'archive I4 est aussi vérifiée à 320/375/390/768/1280 px,
sans débordement ; AX nomme son bouton, Tab le focalise avec focus visible,
Espace ouvre `Facture DEMO-2026-09-01`, son aperçu PDF et son unique ligne.
Dans un runner `demo:local` tmpfs neuf, Chrome natif a aussi rendu `/login` et `/history` à 200 % ; le clavier relie une entrée d'archive à sa pièce source déjà créditée une fois. Le connecteur natif est de nouveau indisponible (`browsers: []`, `cgWindowNotFound`), malgré la page de connexion visible côté utilisateur ; la suite ci-dessous a été revue dans Chrome headless/CDP temporaire, sans toucher à une base persistante.
Le GET du runner neuf a précisé la cause : les six ventes portent le suffixe « — démonstration », donc aucune candidate ne correspondait au nom brut des six recettes. La liste propose maintenant une candidate après retrait de ce suffixe et indique cette base dans l'UI. Dans le bac tmpfs recompilé, les six correspondances datées ont été explicitement confirmées dans Ventes. La projection passe ensuite à zéro blocage ; après un comptage synthétique de pommes de terre à 0 kg, l'UI autorise une proposition de 6 kg. La quantité a été ajoutée au panier et validée en commande simulée, puis rapprochée dans l'UI d'une facture manuelle synthétique et d'une réception de 6 kg. L'API confirme `simulated_received`, la facture liée, 3,60 € de coût simulé, stock inchangé à 0 kg et aucun mouvement de stock ajouté. Ventes et Achats sont rendus à 1440 et 390 px sans débordement horizontal. Tab et focus visible ont été observés ; l'activation clavier du formulaire de mapping n'est pas prouvée (repli clic) et aucun lecteur d'écran réel n'a été utilisé. Cette preuve démontre le flux synthétique, pas une commande réelle ni un comptage métier.
Après les corrections ci-dessous, le trajet complet Aujourd'hui→Ventes→Stocks→Achats
a été rejoué à 320×750 au clavier (Tab/Entrée) ; les états vides, les quantités
à vérifier et les simulations sont clairement annoncés, sans débordement
horizontal visible.
Le rejeu reste à 432 pièces. À l'ouverture du bac tmpfs, l'essai avait créé un
brouillon synthétique lié à la fixture publique, sans produit rapproché ni
mouvement. La suite a repris ce brouillon : après vérification du type et de la
date de démonstration, la ligne fictive « Tomates rondes » a été rapprochée de
« Tomates (kg) » et réceptionnée pour 2 kg à 3,50 €. Après rechargement, la
facture garde un seul mouvement lié, affiché en lecture seule ; le stock
théorique de Tomates est passé de 12 à 14 kg et reste à 14 kg. L'opération
reste dans le bac PostgreSQL tmpfs synthétique, sans achat réel ni message
fournisseur. À 320×750, l'AXTree avait révélé un libellé de quantité vide
lorsqu'aucun produit n'était rapproché ; le fallback affiche désormais
« unité du produit ». Le
parcours clavier Entrée→Échap a révélé une perte de focus, causée par la
désactivation native temporaire du déclencheur pendant l'ouverture asynchrone.
`aria-disabled` conserve ce bouton focalisable, avec le garde `opening` existant ;
le focus revient maintenant à « Reprendre le brouillon ». La modale est rendue
sans débordement horizontal visible et défile verticalement ; aucun lecteur
d'écran réel n'a été utilisé.
Point de reprise du 2026-09-24, branche `main`, base `e969ea8`, espace de
travail propre avant cette tranche ; aucune migration n'est concernée.
`npm run lint`, `npm run build`, `npm test -- --run` (33 contrôles scripts/CSS,
102 tests Vitest) et `git diff --check` passent.
Une production a aussi été confirmée dans l'UI : déductions
matière exactes puis journal visible après rechargement. La modale mobile
est nommée, contenue et clavier-opérable, sans lecteur d'écran réel. Chrome
natif couvre maintenant Aujourd'hui, Stocks, Achats et Ventes avec menu au
clavier et émulation 390×750. Cette reprise étend l'archive I4 à 320/375/390/
768/1280 px, au clavier natif Tab/Entrée/Espace et au zoom Chrome réel 200 % ;
aucun débordement horizontal n'apparaît sur cette page. Ventes et le tiroir
Stocks ont aussi été observés à 320 px, et Stocks/Ventes à 200 % ; le tiroir
reste lisible, Échap le ferme et rend le focus à son déclencheur. Les écrans
hors de ce parcours restent à vérifier à 320–375/768 px et à 200 %, ainsi que les états de
chargement/erreur/conflit/long et la technologie d'assistance. La navigation
Stocks→Ventes conservait l'ancien défilement ; Layout le remet désormais en haut
et préserve les ancres, vérifiés en cliquant depuis Aujourd'hui vers la saisie.
Le calendrier Ventes conserve un défilement horizontal interne ; à 320 px, un
texte indique ce geste, Tab focalise sa région et la flèche droite révèle les
colonnes suivantes. À 200 % de zoom Chrome natif, Aujourd'hui, Ventes, Stocks et
Achats gardent leurs contenus et actions lisibles, sans débordement horizontal
visible ; états vides, service inconnu et provenance de simulation restent
explicitement nommés. La navigation hors ligne vers une route différée a laissé
la zone principale vide. `RouteErrorBoundary` dans Layout affiche désormais une
alerte nommée, conserve la navigation et propose de recharger. Rejoué sur
`/history` avec l'émulation hors ligne, l'AXTree expose le message et le bouton ;
après reconnexion, ce bouton recharge correctement la route. Le rechargement
complet hors ligne n'affiche que l'erreur réseau native de Chrome. Les erreurs
API par section, conflits et états longs restent à contrôler ; aucun lecteur
d'écran réel n'a été utilisé. Les routes hors de ce parcours restent à vérifier
à 320–375/768 px et à 200 %. Le fournisseur CUA garde
`browsers: []` et `getBrowser` répond « No browser is available », mais
`getApp("com.google.Chrome")` permet maintenant la revue de la fenêtre native.
Après le correctif de chargement de route (`424c8f9`), `npm run lint`,
`npm run build`, `npm test -- --run` (33 contrôles scripts/CSS, 102 tests
Vitest) et `git diff --check` passent de nouveau.
Un conflit de révision
du calendrier des services ne masque plus silencieusement l'échec après
rechargement (`53968c6`). L'API et le contrat d'intégration Achats persistent
maintenant les exclusions et commandes liées ; les décisions d'ajout/exclusion
et le rendu au zoom restent à observer. Le parcours « pièces → idées
de recette » reste ouvert : le bac recette ne prouve pas que deux familles
d'ingrédients du corpus sont défendables.
Aucun POS/OCR fournisseur n'est activé. Le nouveau POST d'upload I4 est
authentifié, borné et tenant-scopé ; seul l'adaptateur local de fixture est
disponible dans `demo:local`, les autres fichiers retombent sur la saisie
manuelle. L'API ne conserve aucun octet source.
La revue Q2 headless/CDP de ce bac neuf confirme aussi le clavier du mapping
Ventes : Tab atteint le bouton avec focus visible et Entrée crée exactement une
correspondance active. Les sept routes principales gardent leur largeur à
320/375/640/768/1280 px ; six routes exposent 1 467 contrôles nommés, aucun
anonyme. Histoire a été parcourue de juin 2023 à septembre 2026, avec fenêtres
aux changements d'année et coupe « connu au » (23/24 septembre 2026). Les
captures inspectées sont conservées dans
[`evidence/q2-four-year-history`](evidence/q2-four-year-history/). CUA ne
contrôle toujours pas un onglet par son connecteur navigateur. La revue native
a néanmoins brièvement repris via `getApp("Google Chrome")` sur le runner isolé
53038 : Aujourd'hui, Ventes, Stocks (revue et inventaire complet), Achats, Plus,
Histoire (1 191 événements) et Recettes ont été inspectés à 1224×682 ; aucun
débordement horizontal n'était visible. La fenêtre a ensuite disparu de CUA
(`cgWindowNotFound`) ; `press_key` ne reconnaît pas `Tab`, donc la preuve
clavier reste headless. Lecteur d'écran réel et zoom natif restent à vérifier.

Depuis cette revue, `efa944b` réduit la première charge de l’Histoire à
20 événements, ajoute la recherche locale accent-insensible et conserve les
filtres de dates/provenance sans changer le contrat ni sa limite API. Le
composant réel a été rendu avec un GET synthétique, puis inspecté au clavier et
à 320/768/1280 px. Les états hors nominaux et leurs parcours clavier sont
maintenant prouvés à 320 px ci-dessous. Le premier aller-retour Histoire → objet
lié → Histoire et l'accès au bac de rejeu gardent maintenant la période et les
recherches, preuve synthétique ci-dessous. **Prochaine action démontrable :**
poursuivre les états hors nominaux Q2 des routes restantes en rendu/clavier
headless, sans déclarer de vérification par navigateur natif. Reprendre le zoom
200 % et la technologie d’assistance réelle si CUA redevient contrôlable. Le
corpus de pièces conservé n’a pas été lu pour cette reprise.

## Registre des incréments

Pour chaque ID du [plan](plan-execution.md), inscrire **deux axes** : preuve
locale (`à auditer`, `en cours`, `prouvé localement`, `préparé sur fixtures`) et
activation externe (`non applicable`, `non activé`, `activé/évalué sur données
autorisées`, `bloqué externe`). Ne pas remplacer une preuve par une case cochée.
Ajouter les tranches UX transverses en les rattachant au parcours qu'elles
servent. L'agent intégrateur principal édite ce journal ; les sous-agents lui
transmettent leurs preuves sans écrire ici simultanément.

| ID / parcours | Preuve locale | Activation externe | Preuve (tests, rendu, données, fichier) | Limite / suite |
| --- | --- | --- | --- | --- |
| Q1 — garde et base d'intégration isolée | Prouvé localement | Non applicable | Garde URL fail-closed ; `verify:local-delivery` frais : migrations 18/18, diff Prisma vide, lint, builds web/API, 33 tests Node/CSS, 119 tests unitaires, 40 tests d'intégration (26 fichiers) et restauration synthétique passent. Conteneur PostgreSQL tmpfs supprimé. | Workflow CI ajouté mais non exécuté sur GitHub ; aucune base conservée utilisée. |
| Q1b — bac de scénario jetable | Prouvé localement (fixture seulement) | Non applicable | Fixture synthétique 431 pièces ; plan quatre ans déterministe ; test PostgreSQL crée l'archive et le ledger dans un tenant, une pièce sans mouvement dans un second, et rejoue une réception avec delta unique dans un troisième ; vérifie isolation et suppression en cascade. `npm run demo:fixtures` amorce aussi une base tmpfs pour la revue UI sans lire les transcriptions locales ; preuve GET réelle plus bas. | Le rejeu est un helper de fixture, pas une garantie de C1 en production. La revue visuelle native reste indisponible (CUA). CI GitHub non déclenchée ; exclusion sparse-checkout configurée mais non observée à distance. |
| C1 — pièce fournisseur actionnable | Prouvé localement sur fixture synthétique | Non applicable | Revue dans Achats, brouillon lié/historisé, contrôle serveur hash/révision, réception simulée unique et source exposée dans l'historique produit ; preuves PostgreSQL jetables ci-dessous. Revue Q2 du détail et de la modale brouillon à 320 px, focus visible/piégé et Échap ; capture ci-dessous. | La revue Q2 utilise Chrome headless/CDP ; CUA garde `browsers: []`, aucun lecteur d'écran ni zoom réel n'a été testé. Source explicitement fictive, brouillon sans réception/mouvement dans cette passe. Pas d'OCR général, d'envoi fournisseur ni de rapprochement commande/livraison O2. |
| D1 — fiche produit | Prouvé localement | Non applicable | Édition serveur avec révision optimiste, fournisseur du tenant, unité non modifiable et snapshots de lignes de commande préservés ; migrations/intégration PostgreSQL jetables ci-dessous. À 320 px, l'UI permet de modifier le seuil ; Entrée soumet un `PATCH` 200, puis une autre fiche restée à l'ancienne révision reçoit un `PATCH` 409 avec alerte. Après rechargement, seul le seuil gagnant persiste ; preuves/captures Q2 ci-dessous. | Unité immuable avec explication visible ; une conversion éventuelle reste séparée. Entrée envoyée après focus programmatique ; Tab depuis le document, CUA native et lecteur d'écran non vérifiés. |
| D2 — comptage de stock | Prouvé localement | Non applicable | Relevé attribué et daté Europe/Paris, quantité physique séparée du solde théorique, écart atomique idempotent et état invalidé par les mouvements suivants ; preuves PostgreSQL jetables ci-dessous. UI `/stocks` sur tmpfs à 320 px : comptage égal au théorique, `POST` 201, carte persistée après rechargement, aucun mouvement ; Échap annule et Entrée valide un comptage identique. Voir les captures Q2 ci-dessous. | Comptage limité au jour courant ; pas d'antidatage ni de réconciliation des mouvements postérieurs. Focus posé programmatiquement avant Entrée ; Tab depuis le document, CUA native et lecteur d'écran non vérifiés. |
| D3 — recette maintenable | Prouvé localement | Non applicable | Création/édition versionnées, rendement de lot, validation d'ingrédients du tenant, production reliée à sa version ; migration et API/intégration PostgreSQL jetables ci-dessous. Revue UI `demo:local` tmpfs : création synthétique V1 (lot 2), Pizza Margherita V2→V3 datée du 25/09/2026 (rendement 4), production de 2 portions reliée à V3 ; les 24 portions du 23/09 restent V2/rendement 1. Déductions exactes : farine 0,100 kg, tomates 0,050 kg, mozzarella 0,060 kg, huile 0,010 L. Rendu 320/768/1440 px sans débordement, onglet d'historique et dialogue au clavier ; captures Q2 ci-dessous. | Les rendements/productions historiques inconnus ne sont pas reconstruits. Preuve headless/CDP, sans CUA native ni lecteur d'écran réel ; la fixture reste synthétique/tmpfs. |
| D4 — calendrier de service | Prouvé localement | Non applicable | `ServiceDay` daté, ouvert/fermé, couverture complète/partielle/manquante, révision/acteur ; ventes manuelles/CSV en jour partiel, ventes rejetées un jour fermé. Tests DST, conflit de révision, tenant, import fermé/partiel et métriques couverts ci-dessous. Revue UI tmpfs : fermeture ⇒ couverture complète désactivée et « Pas de service » ; réouverture partielle ⇒ 0 ligne reste distinct de l’inconnu. À 320/768/1440 px sans débordement de page ; la table défile au clavier. | Migration fraîche testée ; rétro-remplissage historique classé partiel sans preuve rétrospective de complétude. Revue Chrome headless/CDP ; CUA native et lecteur d’écran non disponibles. |
| D5 — réconciliation des ventes | Prouvé localement | Non activé (aucun POS/Ticket Z connecté) | `SaleContribution` conserve chaque ligne CSV (rejet/conflit compris) sans le CSV brut ; choix explicite remplacer/garder, corrections motivées, annulation distincte du remboursement. Revue UI tmpfs à 320 px : mappage explicite, création d’un article fictif, 2 ventes acceptées, 1 conflit et 2 rejets tracés. La vente existante de 24 reste intacte après « Garder » par Espace ; motif et événements persistés. Tableau défilant pilotable par ←/→ ; captures ci-dessous. | Aucun adaptateur POS/Ticket Z/OCR. Le premier audit de parité (`35c7a09`) était incomplet ; les diff depuis 18 migrations fraîches et depuis l'historique confirment désormais le modèle à jour, après ajout des index historiques `StockMovement`/`SaleContribution`, le mappage des noms PostgreSQL tronqués et le verrou fournisseur. Aucune migration existante n'a été modifiée. Revue headless/CDP ; CUA natif et lecteur d’écran indisponibles. |
| D6 — article vendu ↔ recette | Prouvé localement | Non applicable | `SaleItemRecipeMapping` append-only, tenant-scopé, daté et validé explicitement ; nom snapshoté, facteur portions/article, proposition par nom strictement identique. UI tmpfs : suggestion Pizza Margherita après retrait du suffixe démo, confirmation explicite par Espace, `POST` 201 et mapping actif révision 1 au 25/09/2026 (1 portion/article). À 320/768/1440 px sans débordement de page ; captures Q2 ci-dessous. | Aucun stock ni production déclenchés par l’association. Les correspondances historiques absentes ne sont pas rétro-inférées ; les versions recette legacy sans date restent inconnues. Revue headless/CDP ; CUA natif, lecteur d’écran et zoom réel non vérifiés. |
| F1 — baseline qualifiée | Prouvé localement (fenêtre fixe, baseline comparée) | Non activé / aucune précision terrain affirmée | Fenêtre déterministe de 28 jours complets ; backtest walk-forward sur les mêmes 7 dates pour moyenne mobile 7 jours et même jour J−7 ; EAM/WAPE, volume observé par article, horizon et exclusions publiés, absence de fuite vérifiée. Les exclusions/calendrier et l'étiquette de simulation sont conservés ; l'estimation reste expérimentale et aucun modèle n'est sélectionné automatiquement. Commits `3f59b00`, `66d9387`. | Vérification finale : PostgreSQL 16 tmpfs, migration fraîche 18/18, intégration 23 fichiers/33 tests, `npm test` 22 fichiers/96 tests + 30 Node/CSS, lint, build web/API, diff-check. Aucun jeu terrain qualifié, aucune précision affichée comme fiable ; rendu mobile/clavier non observé. |
| F2 — contexte facultatif | Prouvé localement (contrat fixture + repli) | Non activé (aucune position/source réelle ; droits et rétention à cadrer) | L’API baseline publie l’état position/météo/événements/émissions et la source retenue. Un contexte fixture étiqueté vérifie coordonnées, timestamps et périodes couvertes ; source contextuelle absente/périmée ⇒ F1 seulement si sa baseline est expérimentale et non vide, sinon aucune prévision. Même contexte valide : aucune modification de quantité ni gain revendiqué. Intégration F2 et tests unitaires dédiés. Commit `efd1308`. Rendu headless/CDP après localisation `1a92545` ; captures ci-dessous. | Aucun fournisseur, position réelle ou jeu d’émissions n’est connecté ; pas de mesure hors échantillon terrain. Pas de zoom natif ni lecteur d’écran réel (CUA non disponible). |
| C2 — chronologie continue | Prouvé localement (fixture synthétique) | Non applicable | `GET /workspace/timeline` en lecture seule, période/service sur 31 jours, coupe « connu au », provenance, pièces source sans contenu brut, état partiel, décisions et liens vers les espaces actuels ; snapshot stock optionnel, aucun backfill historique. `restaurantSimulationPlan.test.ts` compare maintenant le plan complet à un deuxième calcul depuis un corpus généré identique, en plus de l’empreinte/mouvements ; deux tests purs ciblés passent (`bc32737`). Le backtest D6 exclut aussi mappings/versions antidatés mais saisis après chaque service. `scenarioFixture` vérifie maintenant version Carbonara effective au 2025-06-16, anciennes/nouvelles productions liées, surstock compté, perte explicite, refus sans sortie de stock, stocks jamais négatifs et M2 sur comptage actuel. Commits `290d354`, `818b1d5`. | Épisodes 2025 synthétiques, non observés. Les états antérieurs des documents mutables sans journal restent inconnus ; rendu/clavier complet de C3 encore incomplet (voir Q2). |
| F3/F4 — besoin matière et achat suggéré | Prouvé localement (fixtures synthétiques) | Non activé / évaluation terrain en attente | Baseline de 28 services enregistrés complets projetée par mappings/versions datés ; stock retranché seulement après comptage courant ; suggestion explicable, écart/modification et décision serveur immuable ; commande simulée dans le tenant démo. Voir `b2bcfed` et la preuve finale ci-dessous. | Un service à venir seulement ; aucun délai fournisseur ni précision terrain évaluée, prix indicatif. Recette/unité/historique incomplets dégradent le résultat. CUA sans navigateur ; aucune suggestion `demo_simulation` ne devient achat réel. |
| O1 — fiche fournisseur non envoyée | Prouvé localement (commande opérationnelle validée) | Non activé (aucun envoi au fournisseur) | L'historique Achats propose une fiche imprimable distincte par identifiant fournisseur, limitée au statut `validated` et alimentée par les snapshots article/fournisseur/quantité/unité/prix. Total indicatif, taxes/frais non calculés ; impression locale sans mutation d'état. Test du groupement et `npm test` 24 Vitest/101 + 30 Node/CSS, lint, build web et diff-check. Commit `2c3a553`. | Aucun courriel, contact externe, état transmis/échec ni reprise ; le chef utilise son canal habituel. CUA sans navigateur : aperçu d'impression, rendu responsive et parcours clavier non observés. |
| O2 — réception rapprochée | Prouvé localement (fixtures synthétiques) | Non activé sur pilote | Facture brouillon, fournisseur, commande et référence/date de livraison liés par clés tenant ; réception partielle, écart de prix expliqué, snapshot prix/provenance, idempotence concurrente ; stock crédité uniquement en mode opérationnel et simulé sans mouvement dans le tenant démo. Revue UI `demo:local` : 3 kg commandés, facture manuelle liée, 2 kg puis 1 kg reçus ; commande/facture terminales, stock et mouvements inchangés. Rendu 320 px sans débordement, Tab/Entrée sur les actions, captures Q2. Corrige le masquage de `simulated_partially_received`. Commits `5c76e31`, `ca1a0a4`. | Aucun envoi fournisseur ni pilote réel ; champs préremplis par CDP, donc pas de preuve de saisie complète au clavier. Pas de CUA natif, zoom 200 % ni lecteur d'écran réel. L'ancien chemin de réception non liée reste disponible. |
| M1 — impact opérationnel | Prouvé localement (fixtures synthétiques) | Non activé / mesure terrain en attente | Comparaison de périodes de même durée ; pertes explicites et réceptions confirmées liées à leurs opérations, coût calculé depuis prix snapshotés ; unités incohérentes et simulation exclues des totaux enregistrés, espace démo séparé. Nouvelle réconciliation API mensuelle de janvier 2023 à décembre 2026 depuis les ventes, jours de service et pertes persistés ; elle a révélé puis corrigé le compteur des jours complets simulés. Voir `5c76e31` et la preuve du 2026-09-25 ci-dessous. | Ruptures et invendus ne sont pas enregistrés dans un ledger dédié et restent non mesurés ; mouvements sans prix historique restent non valorisés. Aucune économie réalisée calculée ; ruptures et invendus restent non mesurés et les mouvements sans prix historiques non valorisés. Le rendu détaillé du Bilan est maintenant vérifié sur fixture tmpfs à 320/390/768/1280 px, période janvier 2023–25 septembre 2026 (45 mois), sans débordement du document ; la réconciliation mensuelle reste défilable au clavier dans sa région nommée. Voir les captures et mesures Q2 ci-dessous. |
| M2 — surstock et menus | Prouvé localement (bac démo uniquement) | Non activé dans les espaces opérationnels / validation pilote en attente | `GET /menu/surplus-options` n'expose que les comptages positifs encore actuels ; `POST /menu/ideas` exige quantité explicitement désignée, verrouille les produits concernés, vérifie tenant/révision/unité et enregistre une décision rejouable `demo_simulation`. Le fixture C2 fournit aussi un comptage courant final de tomates et prouve sa présence dans les options ; dernière version datée applicable, seuil global ignoré, aucun mouvement/production implicite. Commits `9b474c1`, `818b1d5`. Revue Q2 de `MenuIdeasModal` (mock synthétique) à 320/768/1280 px : document à largeur viewport ; Tab/Entrée calculent puis appliquent une idée ; le focus reste sur les actions pendant les POST différés de calcul, brouillon et validation, sans POST en double. [Capture 320](evidence/q2-menu-ideas/menu-ideas-320.png). | Chaque recette utilise séparément toute la quantité désignée ; les portions maximales ne sont pas additives. Péremption inconnue ; seuil haut opérationnel et aide hors démo absents. Le choix du produit dans le select natif a été posé par DOM faute de popup pilotable en CDP. Zoom natif et lecteur d’écran réel non vérifiés. |
| Pièces → idées de recette | Prouvé localement dans le bac `demo:local` tmpfs | Non applicable | Le runner lit 431 transcriptions ; deux candidates hypothétiques référencent 8 lignes de 6 pièces retenues, avec unités catalogue directement compatibles. L’intégration corrige une quantité hypothétique, confirme la pizza et garde l’omelette en attente ; aucun delta de stock/révision, mouvement ou production. Tests/CI et captures utilisent uniquement des sources fictives. Rendu du composant réel à 320/768/1280 px, sans débordement horizontal ; Tab focalise « Nouvelle candidate », focus visible, AX nomme boutons et liens et distingue dates d’origine/démo. Captures [320](evidence/q2-recipe-candidates/recipe-candidates-320.png), [focus clavier](evidence/q2-recipe-candidates/recipe-candidates-320-focus.png), [768](evidence/q2-recipe-candidates/recipe-candidates-768.png), [1280](evidence/q2-recipe-candidates/recipe-candidates-1280.png). | Transcriptions non vérifiées sur originaux ; idées, quantités et rendements hypothétiques, sans preuve qu’un plat a été préparé. CUA `browsers: []`/`cgWindowNotFound` empêche zoom natif/lecteur d’écran réel. Droits et sensibilité avant partage à auditer. M2 part toujours d’un comptage courant, non des factures. |
| M3 — export des pertes déclarées | Prouvé localement (export opérationnel) | Non activé / aucune revendication AGEC | L'export existant ajoute les mouvements négatifs `loss` comme pertes séparées, quantité absolue, `createdAt` UTC, identifiant source, coût seulement si prix snapshoté. Nombre sans prix, unités incompatibles (lignes « à vérifier », hors total), simulations exclues et métriques indisponibles stockouts/invendus sont visibles dans CSV/Excel/PDF. Les tests antérieurs couvrent operation IDs, prix manquant, unité incompatible, simulation, tenant croisé et formats protégés. La fixture C2 ajoute un mouvement explicite de 10 kg `loss`, distinct des invendus estimés ; sa chronologie qualifie la perte de synthétique/non observée. | Ne mesure que les pertes explicitement déclarées ; pas de ledger de rupture/invendu, pas de causalité d'économie ni d'attestation réglementaire. Aucun événement du bac démo ne constitue une mesure terrain. |
| C3 — chaîne métier complète | Partiellement prouvé (fixtures QA uniquement) | Non activé — sorties terrain absentes | Les tests C3 antérieurs vérifient le câblage technique de sources, décisions, commandes, réceptions et calculs d'impact sur des fixtures isolées. Le test d'estimation couvre aussi une réception enregistrée reliée à une recette datée/unité compatible ; la réception simulée de `demoStory` reste exclue. Le parcours Historique reste en lecture seule ; le CTA, la page et l'API de rejeu sont retirés. Les fenêtres de juin 2023–2026 ont été rendues en Chrome headless sur le bac `demo:fixtures` tmpfs, avec 1 305–1 366 événements par fenêtre et pièces d'archive en 2025–2026. Les captures [2023](evidence/c3-history-2023-2026/history-2023-390.png), [2024](evidence/c3-history-2023-2026/history-2024-390.png), [2025](evidence/c3-history-2023-2026/history-2025-390.png) et [2026](evidence/c3-history-2023-2026/history-2026-390.png) restent des preuves QA uniquement. | Les transcriptions d'achat ne fournissent pas les ventes/services/productions/pertes enregistrées nécessaires pour prouver cette chaîne sur le compte Kookia. Les estimations depuis réceptions confirmées et recettes compatibles restent séparées du ledger et des KPI mesurés ; elles ne comblent pas les inconnues observées. L'inspection native du compte demeure à faire sur l'URL configurée si une fenêtre contrôlable est disponible. |
| UX Historique dense (Q2/C3) | Prouvé localement sur composant réel + réponses synthétiques | Non applicable | Recherche libellés/détails/précisions (casse/accents ignorés), 20 événements au départ puis lots progressifs ; Tab/Entrée, focus et transfert au statut au dernier lot. Chargement/503/reprise, troncature, recherche vide ; AXTree confirme `role=alert` assertif après correction. 320/360/768/1280 px sans débordement. `efa944b`, `b94da3f`; captures ci-dessous. | Réponses entièrement fictives ; aucun backend ni espace de restaurant n’est lu. CUA natif et lecteur d’écran réel toujours non vérifiés. |
| I1 — statuts des sources | Prouvé localement | Non activé (aucun adaptateur/fournisseur configuré) | `GET /workspace/sources` authentifié renvoie les cinq types en `not_connected` et `lastSuccessAt: null`; deux sessions isolées, tentative de `restaurantId` client ignorée, session absente refusée. Page Connexions rendue avec réponses synthétiques : libellés/icônes visibles à 320–768 px sans débordement ; Tab atteint « Connexions » (focus visible 3 px), AX nomme les quatre rubriques ; erreur 503 puis activation Entrée de « Réessayer » récupère les cinq sources `not_connected`. Captures Q2 ci-dessous. Commits `095d547`, `78d39f3`, `33fe03d`. | Aucun POS, OCR, géocodage, météo ou événement connecté ; zoom natif et lecteur d’écran réel non vérifiés. |
| I2 — POS générique | Prouvé localement sur fixture | Non activé (aucun fournisseur/droit pilote) | `PosAdapter` validé à sa frontière, fenêtre max 31 jours, curseur tenant/fournisseur lié à la fenêtre partielle, lots/contributions idempotents et événementiels ; mapping POS → article seulement à la revue, remboursement sans quantité négative, source fixture `demo_simulation` conservée. Jour POS reste partiel jusqu'à confirmation explicite ; routes ne connectent rien et Connexions reste `not_connected`. Commit `acd7702`. | PostgreSQL tmpfs jetable, sans volume ; 17 migrations fraîches, intégration 21 fichiers/31 tests, unitaires 19 fichiers/88 tests + 30 Node/CSS, lint, builds web/API, Prisma et diff-check. Aucun adaptateur réel ; rendu de la revue non observé (CUA sans navigateur). |
| I3 — Ticket Z candidat | Prouvé localement (transcription manuelle, sans OCR) | Non activé (aucun OCR/fournisseur configuré) | Upload PDF/JPEG/PNG borné à 4 Mio ; signature, dimensions d'image et métadonnées validées. Les octets ne sont pas persistés ni envoyés ; hash et transcription le sont. Une contribution attend revue, exige un article et ne devient vente qu'après décision ; ligne sans détail = aucune vente. Test API couvre auth/deux tenants, hash/rejeu, date ISO/FR, signatures/limites, suppression brouillon, conflits CSV/POS, projection KPI et absence de pièce brute. | PostgreSQL 16 tmpfs jetable sans volume : migration fraîche 18/18 ; intégration 22 fichiers/32 tests (un premier run frais a eu une coupure `socket hang up` dans le test CSV existant, non reproduite au run complet suivant) ; `npm test` 20 Vitest/90 + 30 Node/CSS ; lint, builds web/API, Prisma et diff-check. Aucun OCR réel ; nombre de pages PDF/décodage complet non contrôlés. Hash/transcription conservés jusqu'à suppression tenant, sans TTL ; rendu/responsive/clavier non prouvés (CUA sans navigateur contrôlable). |
| I4 — candidate facture depuis pièce | Prouvé localement sur fixture synthétique | Non activé (aucun OCR/fournisseur réel, accès et rétention non définis) | `POST /workspace/invoice-extractions` authentifié : validation signature/MIME/taille, SHA-256 serveur, candidat tenant-scopé/idempotent ; seul `demo:local` active l'adaptateur dont l'empreinte est fixée à la fixture PDF publique. UI Achats ouvre l'original depuis le navigateur, garde la saisie manuelle et passe le candidat dans C1. Tests HTTP : auth, MIME/signature, fallback non configuré, deux tenants, rejeu concurrent, aucun octet persisté/mouvement avant décision, correction, refus avant confirmation type/date, puis une réception simulée après confirmation. `npm run verify:local-delivery` : lint, builds web/API, 18 migrations fraîches, 24 Vitest/102 + 33 Node/CSS, intégration 25 fichiers/37 tests, dump/restore synthétique et Prisma à jour. PDF rendu/revu avec Quartz `sips`; `git diff --check`. Revue UI headless et Chrome natif via `getApp("com.google.Chrome")` : Achats à 320/375/390/768/1280 px, sans débordement horizontal visible ; AX nomme le bouton, Tab montre le focus, Entrée et Espace activent l'upload idempotent. Dans le tenant natif tmpfs jetable : 0→1 pièce puis reste à 1 après rejeux, candidate `Facture DEMO-2026-09-01` (une ligne, aucun brouillon/réception/mouvement), lien d'aperçu Blob visible ; saisie manuelle conservée. Zoom Chrome réel 200 % inspecté en onglet sans émulation : formulaire, détail et action restent dans la largeur. Le profil headless séparé passe de 431 à 432 pièces, puis reste à 432. Captures inspectées. | Ce n'est pas un OCR : seul le PDF synthétique exact produit une extraction ; les autres fichiers reçoivent `EXTRACTION_UNAVAILABLE`. Binaire non conservé ni envoyé, aucun fournisseur actif. Pas de lecteur d'écran réel. Le 503 GET de l’historique et le conflit de révision 409 de la modale sont contrôlés au clavier ; retour de focus et rechargement explicite vérifiés à 320/768/1280 px (`c5ac66c`, preuves ci-dessous). Les autres conflits propres aux pièces sources restent à vérifier. Le compte et la candidate natifs restent uniquement dans le PostgreSQL tmpfs de démo, aucune base retenue touchée ; le runner est gardé ouvert pour permettre l'inspection de la page. |
| UI/KPI/mobile/clavier | En cours | Non applicable | Chrome headless avec profil isolé sur `demo:local` synthétique : `/`, `/sales`, `/stocks`, `/orders`, `/recipes`, `/analytics`, `/history` à 320, 375, 640, 768 et 1280 px ; aucune page en chargement ni débordement horizontal. L'arbre AX donne un nom aux 1 452 contrôles des six routes examinées. Focus visible par Tab ; espace ouvre le menu mobile, focus initial dans le panneau, boucle Tab, Échap ferme et rend le focus ; Entrée suit le lien vers `/sales#sales-start`. La revue native (`0140a1e`) couvre Aujourd'hui, Stocks, Achats et Ventes à 390×750, focus visible, Échap, Tab/Entrée jusqu'à Achats. Les reprises ajoutent I4 à 320/375/390/768/1280, vrai zoom Chrome 200 % et Tab/Entrée/Espace natifs sur la fixture ; Aujourd'hui, Ventes, Stocks et Achats ont aussi été regardés en vrai zoom 200 % sur onglet ordinaire, sans émulation responsive, en état courant/vide (pas de débordement horizontal visible dans les zones capturées, défilement vertical requis). Nouvelle revue Chrome native 53038 à 200 % : Recettes, Aujourd'hui, Achats, Stocks, Ventes et Bilan ; `Tab` + `Return` parcourent Aujourd'hui → Achats → Stocks → Ventes, focus visible, contenu et avertissements repliés sans sortie horizontale visible. Le Bilan expose 30 jours calendaires, 28 complets/2 manquants, 0 enregistré, et séparément 3 328 unités/215 pertes/une réception simulées à 3,60 €. `getApp("com.google.Chrome")` contrôle la fenêtre même si CUA garde `browsers: []` ; commit focus `a22cc5a`. Le Bilan multiannuel est aussi rendu en headless à 1224×682 et 390×844 : statut explicatif et Impact sur 1 244 jours, simulations séparées, sans débordement de page ; comparaison en défilement interne, aide mobile et AX expose nom/description/focusable, avec contour visible au focus (`45dc44b`). Réglages → Établissement et Fournisseurs permettent maintenant de reprendre après échec initial du catalogue ; Achats partage le catalogue entre page et modale, et les propositions initialement indisponibles peuvent être rechargées. | Le CUA ne fournit toujours pas de fenêtre Chrome contrôlable. Le composant réel `ImpactSummary` est éprouvé dans un harnais isolé à 640 CSS px / DPR 2 (largeur utile équivalente à 200 % sur une base de 1280 px, pas le zoom natif) : Tab atteint l’alerte 503 et le bouton de reprise, Entrée relance la requête synthétique et le focus revient au titre. La réconciliation 48 mois se parcourt aussi par Tab/Entrée/flèche droite dans une région AX nommée ; défilement interne de 0 à 401 px, table de 1 000 px dans 535 px, aucune sortie horizontale (`document/body/clientWidth` 625 px, viewport 640). Captures : [erreur](evidence/q2-analytics/impact-error-640.png), [reprise](evidence/q2-analytics/impact-recovered-640.png), [table gauche](evidence/q2-analytics/impact-long-640.png), [table droite](evidence/q2-analytics/impact-long-640-right.png). `SourceInvoiceArchive` traite aussi le 409 `SOURCE_CHANGED` synthétique : Tab atteint « Reprendre le brouillon », Entrée produit un POST unique, la pièce est relue (3,50 → 3,65 €), le focus revient à son titre, `role=alert` est dans l’AXTree et « Brouillon périmé » est réellement désactivé. Aux viewports 640/320 CSS avec DPR 2, aucune sortie horizontale (document/body 640/305 px face à 640/320 px). Captures inspectées : [archive 640](evidence/q2-source-changed-archive/source-changed-archive-640.png), [archive 320](evidence/q2-source-changed-archive/source-changed-archive-320.png). Réponses entièrement synthétiques ; aucun backend, base ou tenant consulté. Le champ date de la modale ExportReportModal est vérifié au clavier sur fixture synthétique (voir la preuve Q2 ci-dessous) ; restent le zoom natif, le lecteur d’écran réel, l’ouverture du calendrier natif et les parcours clavier des autres routes. |
| R0 — préparation locale de livraison | Prouvé localement (données jetables) | Non applicable | `npm run verify:local-delivery` automatise lint, builds web/API, 18 migrations fraîches, diff Prisma/base en mode fail-closed, tests unitaires et intégration, puis dump/restore PostgreSQL avec témoin synthétique et statut Prisma. Conteneur au nom aléatoire, port loopback éphémère, data/tmp sur tmpfs, aucun volume ; suppression en fin de recette. `GET /api/health` testé comme liveness. Topologie/proxy/cookies/secrets/migrations/backup/observabilité décrits dans `docs/local-delivery.md`. Commits `d5904d3`, `0baebe6`. | Le test de sauvegarde porte uniquement sur une base synthétique tmpfs. L'endpoint de santé ne vérifie pas la base. Aucun hébergeur ni routage API distant n'est configuré. |
| R1 — activation préproduction | À auditer | Non activé | — | Hôte, domaine, proxy/API/DB, secrets, politique de sauvegarde/restauration, comptes consentants et accord de publication requis avant toute activation. |

## Journal de preuves (ajouter une ligne par incrément vérifié)

| Date | ID | Commit local | État avant → après | Commande/test ou scénario UI exécuté | Résultat et limite | Prochaine action |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-09-24 | C1 UI | `333cad9` | Avoir/BL affichaient « confirmer qu’il s’agit bien d’une facture » → confirmation réservée au type transcrit `invoice` | `npm run lint` (CSS OK, 35 fichiers), `npm run build`, `git diff --check` | Les avoirs/BL restent consultables avec avertissement non créditable ; aucune action stock ajoutée. Aucun rendu/clavier, CUA sans navigateur. | Reprendre Q2 sur navigateur contrôlable. |
| 2026-09-24 | C1 UI | `eed9282` | Brouillon source présenté avec le texte de saisie manuelle → contexte adapté à l’origine et à l’état (manuel, brouillon source, réception simulée) | `npm run lint` (CSS OK, 35 fichiers), `npm run build`, `git diff --check` | Libellé source confirme vérification du type/date/lignes et absence d’effet stock au brouillon ; reçu en lecture seule sans second crédit. Aucun contrôle rendu/clavier, CUA sans navigateur. | Reprendre Q2 dès qu’un navigateur contrôlable est disponible. |
| 2026-09-24 | Q1 | `361add3` (garde), `dd710de` (journal) | Runner direct sans garde → URL locale `kookia_test` obligatoire ; CI configurée sur PostgreSQL éphémère | `node --test scripts/integrationDatabaseGuard.test.mjs` (2/2) ; `npm run test:integration` avec `.env` développement (refus avant démarrage) ; PostgreSQL jetable sans volume : migrations 6/6 et intégration 13 fichiers/21 tests ; `npm run lint`, `npm run build`, `npm run build:api`, `npm test` | Réussite locale. Intégration n'a utilisé que le port aléatoire du conteneur temporaire, supprimé après usage. Action GitHub non exécutée ; cela ne prouve pas un run distant. | Q1b validé sur fixtures ci-dessous ; confirmer le workflow distant lors d'une exécution autorisée. |
| 2026-09-24 | Q1b | `6ea8a3f` (fixtures/tests/CI) | Tests lisant les transcriptions suivies → corpus synthétique déterministe et checkout CI sparse excluant `données restaurants/factures/**` | `npm test` (15 fichiers/74 tests Vitest ; 30 tests Node/CSS), `npm run lint`, `npm run build`, `npm run build:api` ; PostgreSQL jetable sans volume : migrations 6/6, intégration 14 fichiers/22 tests. Le test crée archive+ledger, archive seule et rejeu sur trois owners aléatoires ; le helper de fixture rejoué séquentiellement et concurremment crédite une seule fois ; couverture positive 2024–2026, isolation et suppression en cascade. | Un premier run complet a échoué une fois dans le test Notifications (404) ; son test isolé puis le run complet suivant passent. Résultat final local réussi, avec cette intermittence consignée. Aucun script Camille ni `--write` lancé ; GitHub Actions non exécutée. Le helper n'établit pas C1 en production ni le bac navigable C2/C3. | C1 : relier pièce source au brouillon/reçu sans doubler la pièce déjà créditée. |
| 2026-09-24 | C1 | `42c4fc4` | Archive source sans action → revue Achats liée à un brouillon serveur et à une réception simulée traçable | PostgreSQL jetable sans volume : `npx prisma migrate deploy` (7/7) ; `npm run test:integration` (15 fichiers/24 tests, dont 2 C1) ; `npm test` (15 Vitest/74 tests et 30 tests Node/CSS) ; `npm run lint`, `npm run build`, `npm run build:api`, `npx prisma validate`, `git diff --check`. Les tests C1 couvrent création concurrente, autre tenant, corrections/révisions append-only, hash/révision source, crédit simulé préalable exposé aussi dans l'historique des factures, réception concurrente et rejeu idempotents, avoir/BL, réception partielle, rollback, mouvement relié et API d'historique produit. | Un premier lancement d'intégration depuis la sandbox a échoué (loopback/socket) ; le run final a passé sur le conteneur jetable sans volume, puis le conteneur a été supprimé. L'application compile mais le contrôle visuel/clavier n'a pas pu être exécuté : la session CUA ne fournit aucun navigateur. Aucun document réel/Camille ni script `--write` n'a été utilisé. | Reprendre le contrôle navigateur C1 puis traiter les dépendances D2–D6 avant C2 selon le plan. |
| 2026-09-24 | D1 | `074f96d` | Fiche produit non éditable → édition validée par tenant avec conflit explicite ; anciennes lignes de commande restent figées | PostgreSQL jetable sans volume : `npx prisma migrate deploy` (8/8) et `npm run test:integration` (15 fichiers/24 tests) ; `npm test` (15 Vitest/74 tests, 30 tests Node/CSS) ; `npm run lint`, `npm run build`, `npm run build:api`, `npx prisma validate`, `git diff --check`. Le test D1 exerce deux edits concurrents (un seul gagne), fournisseur d'un autre tenant, produit d'un autre tenant, unité rejetée et snapshot nom/fournisseur/unité/prix d'une commande. | Un premier passage a révélé un identifiant de fournisseur seedé commun entre espaces et un test trop dépendant du volume global d'inscriptions ; le scénario a été isolé avec fournisseur distinct et réutilisation des comptes existants, puis toute l'intégration a passé. Pas de rendu/clavier : aucun navigateur accessible par CUA ; aucune donnée Camille ni transcription privée utilisée. Le conteneur PostgreSQL temporaire est conservé momentanément pour D2 puis supprimé. | D2 — enregistrer un comptage distinct du stock théorique, sans antidater le solde courant ; garder Q2 rendu en attente. |
| 2026-09-24 | D2 | `c0ceaa0` | Solde théorique seul → comptages immuables, écart lié au mouvement unique et étiquettes compté/théorique/à vérifier | PostgreSQL jetable sans volume : `npx prisma migrate deploy` (9/9) ; `npm run test:integration` (15 fichiers/24 tests) ; `npm test` (16 Vitest/76 tests, 30 tests Node/CSS) ; `npm run lint`, `npm run build`, `npm run build:api`, `npx prisma validate`, `git diff --check`. Cas couverts : rejeu même clé en concurrence, conflit de payload, comptage zéro écart sans mouvement, quantité nulle, mouvement d'écart unique, version/unité périmées, date antidatée refusée, autre tenant, historique attribué, et incrément de version pour ajustement, production et réception. | Le premier essai DB D1 avait été supprimé après validation ; le nouveau conteneur D2 sans volume a été supprimé après migration et intégration réussies. Le parcours UI compile mais reste sans contrôle rendu/clavier, faute de navigateur CUA. Aucun Camille, corpus privé ou script `--write` utilisé. | D4 → D5 pour préserver les jours manquants/partiels avant réconciliation ; D3 avant D6. Q2 reste à contrôler sur navigateur. |
| 2026-09-24 | D4 | `b14fc60` | Ventes par date sans état de service → calendrier explicite, jour fermé bloquant et couverture séparée des lignes enregistrées | PostgreSQL jetable sans volume : `npx prisma migrate deploy` (10/10) ; `npm run test:integration` (15 fichiers/24 tests) ; `npm test` (16 Vitest/78 tests, 30 tests Node/CSS) ; `npm run lint`, `npm run build`, `npm run build:api`, `npx prisma validate`, `git diff --check`. Tests : dates complètes/partielles, ligne absente imputée à zéro uniquement si date complète, fermeture et rejet vente/import, saisie/import créant une couverture partielle, stale revision, autre tenant, futur refusé, et aller-retour exact de 2026-03-29 (DST Paris). Baseline et moyenne KPI utilisent la couverture ; l'intégration a passé après correction d'une assertion placée avant commit CSV. | Première migration fraîche (pas de fixture de schéma pré-D4 contenant déjà des ventes) ; le SQL de migration classe les dates historiques en ouvert/partiel. Aucun rendu/clavier observé faute de surface navigateur CUA ; Q2 reste ouvert. Aucun Camille, transcription privée, script simulation `--write` ou écriture externe ; le conteneur temporaire a été supprimé. | D5 et D3 sont maintenant prouvés ; ouvrir D6 avant C2. Q2 rendu/clavier demeure en attente. |
| 2026-09-24 | D5 | `c7be8ea` | Vente unique par article/date sans filiation source → ledger borné et réconciliation explicite des apports concurrents | PostgreSQL 16 jetable sans volume : 10 migrations pré-D5, fixture héritée synthétique (une vente manuelle + une simulée), D5 appliquée 11/11 ; les deux ventes sont reliées chacune à une contribution acceptée et un événement, provenance jour `recorded`/`demo_simulation`, 0 vente non liée. `npm run test:integration` (15 fichiers/25 tests), `npm test` (16 Vitest/80 tests + 30 tests Node/CSS), `npm run lint`, `npm run build`, `npm run build:api`, `npx prisma validate`, `git diff --check`. Le test scénario appelle le helper uniquement sur tenant aléatoire et vérifie ledger + jours simulés. | Rejeu rollback CLI non lancé ; aucun `--write`, Camille, corpus privé ni POS/Ticket Z. Contrôle rendu/clavier impossible : aucun navigateur disponible via CUA. `migrate diff` relève trois écarts historiques hors D5 (index `StockMovement.stockCountId`, défaut `ServiceDay.updatedAt`, nom tronqué d'index des révisions facture) ; migration fresh/status sont réussis. | D3 maintenant prouvé ; ouvrir D6 avant C2. Rendu/clavier Q2 reste ouvert. |
| 2026-09-24 | D3 | `1b3aff3` | Recettes seedées non éditables, production sur recette mutable → création/édition optimiste et versions effectives immuables avec rendement de lot | PostgreSQL 16 jetable sans volume : 11 migrations pré-D3 puis recette/ingrédient/production legacy synthétiques, migration D3 12/12 ; version 1 `effectiveFrom=NULL`, nom/unité/quantité snapshotés, production legacy `recipeVersionId=NULL`. `npm run test:integration` (15 fichiers/25 tests), `npm test` (16 Vitest/82 tests + 30 tests Node/CSS), `npm run lint`, `npm run build`, `npm run build:api`, `npx prisma validate`. API : create/replay/conflict, tenant croisé, rendement, déduction atomique, unité `pcs` entière, fraction de pièce bloquée sans mouvement, édition future, concurrence et version historique figée. Scénario fixture : production synthétique liée à sa version. `migrate diff` conserve uniquement les trois écarts historiques déjà consignés sous D5, aucun nouvel écart D3. | Aucun rendu/clavier observé : surfaces CUA indiquent `browsers: []`. Aucun compte ou espace Camille, transcription privée, script de simulation `--write`, écriture fournisseur ou donnée conservée utilisés ; le conteneur PostgreSQL sans volume a été supprimé. | D6 — associer ventes et versions/recettes sans fuite temporelle, puis C2. |
| 2026-09-24 | D6 | `d4516ea` | Ventes par article sans recette datée → correspondance explicitement confirmée, révisée et effective-datée, puis projection matière par recette/version historique | PostgreSQL 16 jetable sans volume : migration fraîche 13/13 ; `npm run test:integration` (16 fichiers/26 tests) ; `npm test` (16 Vitest/83 tests + 30 tests Node/CSS) ; lint, builds web/API, `npx prisma validate`, `git diff --check`. Tests mapping : suggestion exacte non activée, isolation tenant, article ou recette inconnu, version non datée, rejeu, conflit/révision périmée, changement de carte, nom snapshoté après renommage, stock inchangé. Baseline : portion par article × recette/rendement, chaque service utilise mapping et version à date ; mapping futur et version future ne contaminent pas le backtest. | Une première intégration a exposé la contrainte erronée `recipeId=UUID` alors que le seed utilise aussi des IDs texte ; le contrat a été corrigé, puis le test ciblé et toute la suite sont repassés. Aucun rendu/clavier observé (`browsers: []`), aucune donnée Camille, transcription privée, script `--write`, commande, stock ou service externe modifié ; PostgreSQL supprimé après preuve. | C2 — construire la chronologie 2023–2026 sur tenant isolé ; garder rendu/clavier Q2 et D1–D6 en attente du navigateur. |
| 2026-09-24 | C2 | `0293939` | La démonstration 2023–2026 devient consultable par période et date de connaissance sans rejouer les écritures | PostgreSQL 16 jetable sans volume : migration fraîche 14/14 ; `npm run test:integration` (16 fichiers/26 tests), `npm test` (17 Vitest/85 tests + 30 Node/CSS), lint, builds web/API, `prisma validate`, `git diff --check`. Fixture : pièce d'archive 2023 séparée de toute réception sourcée, stock d'ouverture étiqueté hypothèse, pertes/ventes/productions/recettes/services/correspondance/décision reliés, date d'enregistrement future exclue du point historique, autre tenant isolé et solde stock inchangé par GET. Le backtest n'applique plus les mappings/versions qu'après leur saisie, même s'ils sont antidatés ; les bornes Europe/Paris passent le test de changement d'heure. | Aucun rendu/clavier observé (`browsers: []`). Transcriptions et lignes brutes non servies ; les `WorkspaceDocument` n'ayant pas de journal de versions, le premier enregistrement et les états antérieurs sont inconnus. Aucun espace Camille, corpus privé, script `--write`, donnée persistante ou service externe utilisé ; conteneur sans volume supprimé. | F3/F4, O2 et M1 maintenant prouvés localement ; rester prudent sur états historiques mutables et passer à l'audit C3. |
| 2026-09-24 | F3/F4 | `b2bcfed` | Baseline vente seule → suggestion matière explicable et revue/commande persistées, avec séparation démonstration/opérationnel | Dans la preuve finale après O2/M1 : PostgreSQL 16 tmpfs, migration fraîche 16/16 ; `npm run test:integration` (18 fichiers/28 tests), `npm test` (18 Vitest/86 tests + 30 Node/CSS), lint, builds web/API, `prisma validate`, `git diff --check`. Le test de suggestions vérifie historique incomplet, mapping/stock, décision immuable et rejeu concurrent, tenant croisé, vente simulée refusée comme achat réel, commande et réception démo simulées. | F3 vise un seul service à venir avec prix de catalogue indicatif, sans délai fournisseur ni précision pilote ; il n'existe pas d'évaluation terrain. Aucun rendu/clavier observé (`browsers: []`), aucun envoi, compte Camille ou source brute consultés. | O2 et M1 prouvés localement ; prochaine porte : C3 et contrôle UI accessible. |
| 2026-09-24 | O2 | `5c76e31` | Commande validée sans rapprochement → ledger facture/livraison tenant-scopé, réception partielle et stock atomiques | PostgreSQL 16 sur `/var/lib/postgresql/data` en tmpfs (aucun mount persistant) : migrations fraîches 16/16 ; intégration 18 fichiers/28 tests. Cas : 2/3 puis 1/3, facture brouillon jusqu'au cumul complet, stock + quantité effectivement livrée, snapshots nom/unité/prix et mouvement lié, motif obligatoire d'écart, rejeu simultané sans double mouvement, référence livraison dupliquée refusée, autre tenant 404 et réception démo sans mouvement de stock. Builds/tests/lint/Prisma/diff-check de la ligne M1 exécutés sur ce même commit. | Le premier run complet a rencontré `socket hang up` sur la fixture scénario préexistante ; celle-ci passe isolément et le run complet suivant passe. Aucun envoi, Camille, transcription privée ou donnée persistante ; le conteneur tmpfs a été arrêté/supprimé. Rendu/clavier impossible (`browsers: []`). | Relier les réceptions mesurées au bilan, sans transformer simulation, ruptures ou invendus inconnus en résultats terrain. |
| 2026-09-24 | M1 | `5c76e31` | Exports d'opérations sans comparaison d'impact → bilan de périodes égales, pertes et coûts sourcés, simulations séparées | `/workspace/impact` et la page Bilan : pertes déclarées regroupées par produit/unité, coût connu depuis prix snapshoté, reçus calculés depuis lignes de réceptions confirmées et prix facture, IDs sources repliables, services complets/partiels/manquants, période vide et intervalle précédent de même nombre de jours. PostgreSQL intègre l'exclusion des ventes/mouvements/réceptions simulés, le bac démo séparé, l'écart d'unité ignoré, la perte non valorisée et l'export opérationnel sans lignes de démo. Validation finale commune : migration 16/16, intégration 18/18 fichiers (28 tests), unitaires 18/18 fichiers (86 tests) + 30 Node/CSS, lint, build web/API, Prisma et diff-check. | Le schéma n'enregistre pas les ruptures ou les quantités invendues : affichées « non mesurées », non inférées d'un seuil ou d'une production. Pas de coût historique si absent, pas d'économie réalisée ; aucune mesure terrain activée. Aucun rendu/clavier observé faute de navigateur CUA. | C3 — parcourir et vérifier la chaîne narrative quatre ans, suggestions, commande, réception et bilan sur tenant démo isolé. |
| 2026-09-24 | C3 | `290d354` | Chronologie avec décisions génériques → chaîne d'achat et réception démonstrative traçable reliée à l'impact calculé | PostgreSQL 16 tmpfs uniquement, 2 Gio, aucun montage persistant ; migrations fraîches 16/16. `npm run test:integration` : 19 fichiers/29 tests. `npm test` : 18 fichiers/86 tests Vitest + 30 tests Node/CSS ; `npm run lint`, builds web/API, `npx prisma validate`, `git diff --check`. Test C3 : quatre chapitres synthétiques ; pièce 2023 consultable mais sans mouvement source ; en 2024–2026, pièce et crédit simulé reliés par identifiant ; dernier historique de 28 jours complet, comptage, suggestion, décision, commande simulée, facture source revue, réception simulée, absence de mouvement achat/stock modifié, impact calculé avec ventes et réception dans le compartiment simulation, séparation des totaux enregistrés et coupe `asOf`. Après un dernier ajustement d'affichage fournisseur, test C3 ciblé, build API, lint et diff-check repassés. | Un premier run à 512 Mio a saturé le tmpfs lorsque les deux parcours quatre ans coexistaient ; C3 a été isolé avec des chapitres légers à IDs aléatoires, puis la suite complète a passé sur tmpfs 2 Gio. Aucun Camille, corpus/transcription privée, script `--write`, fournisseur ou service externe utilisé. Rendu/clavier C3 impossible (`browsers: []`) ; résultats de simulation non terrain. | Contrôle rendu, responsive et clavier de C3 lorsqu'un navigateur sera disponible ; garder le Goal en cours jusque-là et ne rien publier. |
| 2026-09-24 | I1 | `095d547` | Rubrique de fournisseurs envisagés sans état serveur → état authentifié des cinq sources, toutes `not_connected` jusqu'à configuration réelle | PostgreSQL 16 tmpfs, 2 Gio, aucun montage persistant ; migrations fraîches 16/16. `npm run test:integration` : 20 fichiers/30 tests, dont `sources.integration.test.ts` (sessions de deux restaurants, paramètre de tenant forgé sans effet, absence de session 401). `npm test` : 18 fichiers/86 tests Vitest + 30 tests Node/CSS ; lint, build web/API et `git diff --check`. La page n'affiche une date de dernière réussite que si l'API en fournit une et laisse visibles les replis manuels. | Conteneur de test supprimé après usage. Aucun adaptateur ni service externe interrogé ; aucun statut « prêt » inventé. CUA ne fournit aucun navigateur et Chrome n'a aucune fenêtre contrôlable : rendu/responsive/clavier non prouvés. | I2 — port POS générique et lot borné sur fixture, sans connexion fournisseur ; Q2 reste ouvert pour rendu et clavier. |
| 2026-09-24 | I2 | `acd7702` | Port POS absent → ingestion générique paginée et revue explicite reliée aux ventes/KPI sans activation fournisseur | PostgreSQL 16 tmpfs (2 Gio, aucun montage/volume), migrations fraîches 17/17 ; `npm run test:integration` : 21 fichiers/31 tests, dont reprise/coupure, refus de changer la fenêtre d'un curseur partiel, rejeu concurrent, doublon inter-lots, remboursement, article inconnu/mapping, deux tenants, couverture manuelle et repli de saisie. `npm test` : 19 Vitest/88 tests + 30 Node/CSS ; `npm run lint`, `npm run build`, `npm run build:api`, `npx prisma validate`, `git diff --check`. | Fixture uniquement ; la route POS non configurée renvoie 503 `not_connected`, la route sans session 401 et l'état I1 ne passe jamais à prêt. Le jour ne devient complet qu'après revue du responsable. Conteneur tmpfs arrêté et supprimé. Rendu/responsive/clavier de la nouvelle revue non vérifiés, CUA expose `browsers: []`. | I3 — candidat Ticket Z synthétique et revue, sans OCR réel ; Q2 reste ouvert. |
| 2026-09-24 | I3 | `e30239e` | Aucun import Ticket Z → transcription manuelle candidate, revue croisée et KPI, sans OCR ni stockage du fichier | PostgreSQL 16 tmpfs (2 Gio, sans volume), migration fraîche 18/18. Intégration complète 22 fichiers/32 tests ; test I3 : signature/type/taille, date future, isolement de deux tenants, doublon par hash et rejeu de transcription, ISO/FR, absence de `DailySale` avant décision, décisions garder/remplacer face au manuel/CSV/POS, KPI, ticket sans détail et suppression du brouillon. Le premier run sur la base fraîche a eu un `socket hang up` ponctuel dans le test CSV historique ; le run complet suivant passe. `npm test` : 20 Vitest/90 + 30 Node/CSS ; lint, build web/API, `prisma validate`, `git diff --check`. | Le binaire n'est lu qu'en mémoire, aucun `WorkspaceDocument`/contenu brut n'est créé ; hash/transcription/ledger restent jusqu'à suppression du tenant, sans TTL. Pas d'OCR ni de pages PDF/full decode côté serveur. CUA `browsers: []`, Chrome `cgWindowNotFound` : rendu/mobile/clavier non prouvés. Serveurs temporaires arrêtés, configuration supprimée et conteneur tmpfs supprimé. Aucun POS/OCR fournisseur, document réel, Camille, script `--write` ni service externe touché. | I4 — auditer un candidat facture distinct de sa réception sur fixtures synthétiques, sans OCR réel ; Q2 reste à vérifier sur navigateur accessible. |
| 2026-09-24 | F1 | `3f59b00` | Backtest moyenne mobile seule → comparaison walk-forward avec même jour de semaine précédent | Tests figés vérifient les deux méthodes sur les mêmes sept dates, les mesures EAM/WAPE et que la projection du jour suivant reste sur l'historique antérieur ; calendrier incomplet et fenêtre mixte toujours bloquent la publication. Vérification finale : PostgreSQL 16 tmpfs sans volume, migration fraîche 18/18, `npm run test:integration` (22 fichiers/32 tests), `npm test` (20 fichiers/91 tests Vitest + 30 Node/CSS), lint, build web, build API, diff-check. | Comparaison interne, sans restauration d'état terrain ni réglage sur cette fenêtre ; une fenêtre de 28 jours complète reste requise. Provenance démo reste explicite, aucun score de fiabilité/claim terrain. Conteneur jetable arrêté/supprimé ; aucun espace conservé ou service externe utilisé. Aucun rendu/mobile/clavier (CUA sans navigateur). | I4 : définir/prouver seulement le contrat d'extraction candidate sur fixtures synthétiques si le flux C1 le consomme déjà ; aucun OCR réel/stockage/fournisseur sans politique et provider. |
| 2026-09-24 | I4 | `dd497b5` | Aucun port d'extraction → payload borné/validé transformé en candidat C1, OCR inactif | Unitaires de port/mapper : MIME/taille/date/lignes, doublons, extra, hash et ID tenant. Intégration appelle un fixture synthétique en mémoire, crée le brouillon via l'API C1, rejoue sans nouvelle révision, vérifie correction humaine, refus avant confirmation type/date, tenant croisé, zéro mouvement avant réception puis un mouvement simulé unique après confirmation. PostgreSQL 16 tmpfs sans volume, migrations 18/18, intégration 23 fichiers/33 tests, `npm test` 22 fichiers/96 tests Vitest + 30 Node/CSS, lint, build API et diff-check. | Le fichier est synthétique, non gardé en DB ni envoyé ; le candidat transcrit de test n'existe que dans la base tmpfs détruite. Aucun routeur ne branche le port et l'original n'est pas comparable visuellement. Aucune politique de conservation, aucun fournisseur ni OCR actif. CUA n'offre pas de navigateur. | Continuer les tranches locales sans fournisseur : M2, puis M3/O1/R0 ; garder l'activation I4 séparée. |
| 2026-09-24 | F1 | `66d9387` | Erreurs et calendrier publiés → volume d'unités réellement servi ajouté à la même fenêtre de test | Tests unitaires fixent les volumes (175 unités pour l'exemple linéaire, 253 avec une valeur atypique), test API vérifie 70 unités pour 7 dates constantes. Intégration complète sur PostgreSQL 16 tmpfs : migration fraîche 18/18, 23 fichiers/33 tests ; `npm test` 22 fichiers/96 tests Vitest + 30 Node/CSS, lint, build web/API, diff-check. | Volume de test affiché par article, sans modifier la baseline ou son horizon ; mesure toujours interne/expérimentale. Conteneur arrêté/supprimé, aucune base conservée. Rendu/clavier indisponible. | M2 — menus uniquement depuis surstock compté et étiqueté dans le bac démo. |
| 2026-09-24 | M2 | `9b474c1` | Menu statique sans lien aux comptages → idées démonstratives à partir d'une quantité explicitement étiquetée | PostgreSQL 16 tmpfs sans volume : migrations fraîches 18/18 ; `npm run test:integration` 24 fichiers/34 tests ; `npm test` 23 Vitest/100 + 30 Node/CSS ; lint, build web/API, `prisma validate`, `git diff --check`. Intégration : comptage périmé refusé puis recompté, seuil `minThreshold` élevé sans effet, recettes faisable/non faisable, version actuelle qui a cessé d'utiliser le surplus, unités/dates, rejeu concurrent et conflit de clé, autre tenant, aucun mouvement/production. Un premier run a aussi révélé une assertion M2 trop stricte et un 404 Ticket Z historique ; le test Ticket Z isolé puis deux runs complets ultérieurs passent. | Décision isolée dans le tenant démo ; idées concurrentes évaluées séparément, péremption inconnue et aucun seuil global. Pas de schéma modifié. Conteneur tmpfs supprimé après vérification. Aucune observation rendue/responsive/clavier (CUA sans navigateur). | M3 — export opérationnel des pertes sourcées ; Q2 reste à vérifier sur navigateur accessible. |
| 2026-09-24 | M3 | `d15d53f` | Export générique d'opérations sans définition de perte ni résumé des données manquantes → section « Pertes déclarées » sourcée et limites explicites | Migrations fraîches 18/18 sur PostgreSQL 16 tmpfs ; intégration complète 24 fichiers/34 tests. Le test M1/M3 couvre mouvement négatif avec prix snapshoté, coût calculé, perte non valorisée, unité incompatible exposée à vérifier/exclue, perte simulée exclue, provenance par operationId, période, deux métriques non mesurées et autre tenant. `npm test` 23 Vitest/100 + 30 Node/CSS, lint, build web/API, `prisma validate`, `git diff --check`; tests CSV/XML vérifient formules/échappement et préambule M3. | Export opérationnel des seuls mouvements négatifs dont le motif est explicitement `loss`; pas de pertes déduites de ventes/productions/seuils. Ruptures/invendus et économies restent non mesurés ; aucun label AGEC. Le conteneur tmpfs a été supprimé. Pas de rendu du PDF/responsive/clavier (CUA sans navigateur accessible). | O1 — auditer et livrer une fiche fournisseur locale non envoyée ; Q2 rendu/clavier reste en attente du navigateur. |
| 2026-09-24 | O1 | `2c3a553` | Commande validée uniquement visible dans l'historique → une fiche imprimable locale par fournisseur | Fonction unitaire vérifie un groupe par fournisseur et conserve les snapshots des lignes ; `npm test` 24 Vitest/101 + 30 Node/CSS, `npm run lint`, `npm run build`, `git diff --check`. Aucun contrat API ni schéma modifié. CUA retourne `browsers: []`. | Statut `validated` seulement ; simulation et autres statuts ne proposent pas de fiche. Fiche non envoyée, sans email ni statut d'envoi ; montants issus du snapshot, taxes/frais non calculés. Aperçu d'impression/rendu/clavier non vérifiés faute de navigateur. | R0 — vérifier/documenter l'architecture locale de livraison et sa recette jetable ; Q2 reste en attente d'un navigateur. |
| 2026-09-24 | R0 | `d5904d3` | Vérifications locales possibles seulement sur `kookia_test` manuel et sauvegarde non exercée → recette complète sur PostgreSQL jetable, topologie documentée et port Compose borné à loopback | `npm run verify:local-delivery` : lint, build web/API, 18/18 migrations fraîches, `npm test` 24 Vitest/101 + 32 Node/CSS, intégration 24 fichiers/35 tests, dump custom restauré dans une base distincte, témoin synthétique retrouvé et `prisma migrate status` à jour. `docker compose config --quiet`. Conteneur sans volume supprimé ; `git diff --check`. | Aucun dump ou compte conservé. Vérifie seulement un format/restore synthétique, pas de données réelles ni RPO/RTO. `vercel.json` ne route pas `/api`, l'origine mutatrice était alors limitée à localhost/5173 et `/api/health` ne teste pas la DB ; aucun déploiement ni backup opérationnel. | Q2 rendu/responsive/clavier dès qu'un navigateur est accessible ; R1 attend un hôte, configuration et accord explicites. |
| 2026-09-24 | C2/C3 — session locale | `5a51b39` | Scénario continu prouvé en intégration mais sans démarrage opérateur sûr → `npm run demo:local` lance l'API et Vite sur ports libres loopback, avec PostgreSQL 16 tmpfs sans volume et sans lire la base `.env` | `npm run verify:local-delivery` après les changements : lint, build web/API, 18 migrations fraîches, `npm test` 24 Vitest/101 + 33 Node/CSS, intégration PostgreSQL 24 fichiers/35 tests, restauration synthétique, état Prisma à jour. Un premier run a eu un 404 isolé dans `workspace.integration`; la relance intégrale passe. Exécution réelle de `demo:local` : migrations fraîches ; création de compte par `/api` via Vite avec origine loopback dédiée ; endpoint `/login` HTTP 200 ; seed isolé de 431 pièces synthétiques, 946 jours, 5 026 ventes et productions, 137 réceptions sourcées, 2 646 réapprovisionnements synthétiques. Ctrl-C → conteneur, processus, compte et fichier 0600 supprimés ; les processus préexistants sur 3001/5173 sont restés actifs. `git diff --check`. | Jeu entièrement synthétique ; 2023 conserve 3 pièces sans ligne ni réception sourcée. La fixture ne couvre que la tomate et n'étaye pas deux recettes candidates. Le navigateur CUA retourne toujours `browsers: []` : aucun rendu, responsive ou clavier observé ; aucune donnée privée, Camille, commande fournisseur ou base conservée touchée. | Q2 revue navigateur rendue/clavier ; obtenir une fixture anonymisée multi-familles autorisée pour les deux candidates ; garder R1 externe et non activé. |
| 2026-09-24 | Q2 — actions du panneau Stocks | `2a7cbce` | Pied du drawer produit sans retour à la ligne → `flex-wrap` et espacement pour éviter la contrainte de deux actions sur une seule ligne étroite | `npm run lint` (dont CSS OK, 35 fichiers), `npm run build`, `git diff --check`. Une nouvelle session démo a démarré correctement ; CUA renvoie toujours `browsers: []` et `createBrowserTab("iab", …)` échoue « Browser is not available ». La session a été nettoyée. | Correction structurelle prudente, pas une validation rendue : largeur 320 px, clavier et autres étapes Aujourd'hui → Ventes → Stocks → Achats restent à contrôler visuellement. | Refaire le même parcours sur navigateur mobile/desktop et clavier, corriger seulement les blocages constatés. |
| 2026-09-24 | Q2 — annonce sélection Achats | `d674e4c` | Nombre d'articles du panier était du texte statique côté accessibilité → compteur `role="status"` et `aria-busy` pendant la synchronisation, pour annoncer la valeur connue après mise à jour | `npm run lint`, `npm run build`, `git diff --check`. Le contexte panier met à jour sa liste avant de retirer `loading`; le compteur reste un live region stable. | Vérification sémantique par code et compilation seulement ; aucune annonce de lecteur d'écran ni interaction clavier observée faute de navigateur contrôlable. | Rejouer retrait/ajout/erreur de panier avec lecteur d'écran lors de Q2 rendu. |
| 2026-09-24 | Q2 — annulation fournisseur | `3f7d218` | Bouton « Annuler » dans le formulaire fournisseur sans `type` → bouton explicitement `type="button"`, séparé de l’unique soumission `type="submit"` | Audit du JSX a croisé les formulaires et les callsites `Button` ; les autres boutons des formulaires sont explicitement typés `submit` ou `button`. `npm run lint`, `npm run build`, `git diff --check`. | Le défaut HTML est corrigé au code ; absence de navigateur contrôlable pour observer l’annulation sans persistance côté UI. | Rejouer créer/modifier puis annuler/enregistrer un fournisseur dans la revue Q2 clavier/rendue. |
| 2026-09-24 | Q1b/C2/C3 — seed démo borné | `3dddd2e` | Ancien utilitaire de seed acceptait une base locale `kookia_demo` par son seul nom et nombre d'utilisateurs → suppression du point d'entrée autonome ; le runner crée le PostgreSQL tmpfs neuf puis exécute le seed avec l'ID de son compte | `npm run verify:local-delivery` passe (lint, builds web/API, migrations fraîches, intégration 24 fichiers/35 tests, restauration synthétique). Exécution réelle `npm run demo:local` : migrations, seed 431 pièces/946 jours/5 026 ventes et productions, `/login` HTTP 200. Après Ctrl-C : conteneur, processus et fichier d'identifiants absents ; aucun seed vers la base `.env`. `git diff --check`. | La session reste une simulation synthétique à famille tomate ; ce durcissement ne remplace ni la revue navigateur Q2 ni la fixture multi-familles pour les candidates. | Maintenir le seed lié au runner tmpfs ; poursuivre Q2 sur navigateur contrôlable et obtenir une fixture autorisée multi-familles. |
| 2026-09-24 | Q2 — revue rendue et focus menu | `a22cc5a` | Menu mobile n'entrait pas au focus après ouverture ; focus reporté jusqu'à visibilité, retour vers le déclencheur après fermeture. Chrome headless/CDP, profil neuf : 7 routes × 5 largeurs, aucun splash/débordement ; AX nommé sur six routes ; Tab/espace/Échap et lien clavier `/sales#sales-start` exercés. Captures synthétiques conservées sous `/var/folders/wx/tn89h3f53j3f2d44zpvtxnp00000gn/T/kookia-ui-review-vwEJXb`. | `npm run lint`, `npm run build`. Démo tmpfs et fichier d'identifiants supprimés. CUA reste à `browsers: []` ; pas de lecteur d'écran, zoom page réel 200 %, état erreur/conflit/chargement. CDP ne déclenche pas Entrée sur un bouton HTML témoin ; le contrôle Entrée du menu reste à confirmer sur vrai navigateur. | Continuer Q2 rendu avec technologie d'assistance et états non nominaux ; reprendre le scénario C3 et la fixture multi-familles. |
| 2026-09-24 | C2/C3/M2/M3 — épisode 2025 | `818b1d5` | Plan de démo sans version de recette effective, comptage d'overstock, perte distincte ni refus → épisodes synthétiques datés et reliés au ledger | `npm run verify:local-delivery` : lint, build web/API, migrations fraîches 18/18, `npm test` 24 fichiers/102 Vitest + 33 Node/CSS, intégration 24 fichiers/35 tests, dump/restore synthétique avec témoin retrouvé. Le test de fixture vérifie Carbonara v1/v2 effective au 2025-06-16 et productions liées à leur version ; comptage de tomates 60 kg supérieur au théorique le 2025-06-13, perte explicite 10 kg ce jour, comptage de crème 0,05 L bloquant une demande de 35 portions le 2025-12-26 sans mouvement de sortie, puis réassort et production planifiée. Comptage courant final expose la tomate dans les options M2 ; le journal reste non négatif. Plan total : 5 027 écritures de production (dont 1 refus), 31 554 mouvements ; en 2025 : 1 427 ventes et 1 428 écritures de production. Après le dernier ajustement d'heure du comptage courant : plan 2/2, build API, diff-check. | Valeurs et événements entièrement synthétiques, non observés et non recommandés ; aucun script `--write`, Camille, base conservée ou service externe. Étiquettes timeline précisent simulation/non-observation. Conteneur de test tmpfs supprimé. | Maintenir Q2 ouvert ; ne pas confondre cette fixture narrative avec une preuve terrain ou deux candidates justifiées par les pièces. |
| 2026-09-24 | Q2 — tentative native après activation | — (vérification) | Tentative antérieure : `getApp("Google Chrome")` a permis un onglet local séparé, connexion synthétique et accueil ; redimensionnement ensuite impossible (`windowNotFoundAtPosition`, puis `cgWindowNotFound`). Après activation annoncée : `getState()` conserve `browsers: []`, `getApp()` expose une fenêtre Chrome native sur une page d'erreur `127.0.0.1:62419`; `createBrowserTab("chrome", …)` et `createBrowserTab("iab", …)` répondent tous deux « Browser is not available ». L'ouverture directe de l'application sur l'URL locale échoue aussi (`kLSNoExecutableErr`), donc les démos tmpfs relancées pour cet essai ne sont pas naviguées. | Les comptes et bases tmpfs des deux essais sont supprimés après Ctrl-C ; vérification en lecture seule : aucun processus de démo, conteneur ni dossier d'identifiants résiduel. Largeurs natives, clavier et états d'erreur/conflit restent non vérifiés ; la matrice Chrome headless n'est pas remplacée. | Continuer les vérifications headless reproductibles et reprendre la revue native complète dès qu'un onglet contrôlable peut être ouvert. |
| 2026-09-24 | Pièces → candidates de recette | 13f1010 | Nouveau flux bac démo : créer/éditer une fiche hypothétique à partir de lignes de factures, garder l'une en attente, confirmer l'autre en recette versionnée ou l'écarter. L'intégration PostgreSQL exerce deux factures artificielles champignons/crème, source périmée, autre tenant, replay simultané et zéro mouvement/production. npm run verify:local-delivery passe : lint, build web/API, 18 migrations fraîches, 24 fichiers/102 tests Vitest + 33 Node/CSS, intégration 25 fichiers/36 tests, restauration synthétique. | Les deux familles et factures d'intégration sont fabriquées ; aucune preuve de couverture du corpus ni création de candidate terrain. Aucune mutation de stock ou production. | Obtenir une fixture multi-familles anonymisée autorisée, puis exercer les deux sources sans inférer qu'un plat a été cuisiné. |
| 2026-09-24 | Q2 — page Recettes candidate | 13f1010 | Chrome headless, profil temporaire, bac isolé : 1440×1000 et 390×844 ; aucun descendant plus large que son conteneur après correction des onglets mobiles. Espace ouvre la fiche, le titre reçoit le focus, Tab atteint « Annuler », puis Espace annule et rend le focus à « Nouvelle candidate ». Aucun formulaire n'a été enregistré. | Ce sous-parcours seulement ; le connecteur CUA reste browsers: [] / cgWindowNotFound. Autres routes/états, lecteur d'écran et vrai zoom 200 % non couverts. | Réexposer Chrome au contrôle CUA puis compléter le parcours et les états Q2. |
| 2026-09-24 | Q2 — I4 archive/rendu/clavier/zoom | — (vérification) | Bac `demo:local` tmpfs. Chrome natif via `getApp("com.google.Chrome")` sur Achats : 320/375/390/768/1280 px, captures vérifiées sans débordement horizontal ; à 320/375 les textes s'empilent et les actions restent séparées, à 1280 elles sont en ligne. AX nomme « Essayer la fixture fictive » ; Tab donne un focus visible, Entrée et Espace déclenchent chacun l'upload sur le bouton réel. Compte de revue synthétique nouvellement créé dans le tmpfs : 0→1 pièce puis reste à 1 après les deux rejeux ; candidate `Facture DEMO-2026-09-01`, une ligne, aucun mouvement, brouillon ou réception ; le Blob est ouvert dans le lecteur PDF natif Chrome, dont la page 1/1 confirme le chargement et affiche les mentions fictives ; saisie manuelle conservée. Onglet Chrome ordinaire au zoom réel 200 % : formulaire, détail et action observés sans défilement horizontal. Vérification headless indépendante : 431→432 pièces puis 432 au rejeu, `scrollWidth` exactement égal au viewport à 320/375/390/768/1280. Zoom revenu à 90 %, device toolbar restaurée à 1440×750, onglet secondaire remis à la page vide. | L'utilisateur a confirmé que `/login` était visible. `getState()` conserve `browsers: []` et `getBrowser` n'a pas de surface, mais l'app native est accessible par bundle ID. Aucun lecteur d'écran ni états I4 de chargement/erreur/conflit vérifiés. Aucune réception/action stock ; nouveau compte et son workspace catalogue sont uniquement temporaires dans le PostgreSQL tmpfs de démo, aucun compte/base retenu touché. | Étendre la revue native aux autres routes Q2, états non nominaux et technologie d'assistance ; conserver Q2 ouvert. |
| 2026-09-24 | Pièces → candidate — parcours UI | 13f1010 | Chrome headless sur un bac tmpfs neuf : deux hypothèses créées depuis deux factures tomates synthétiques ; quantité de la première corrigée de 0,1 à 0,2, puis confirmée comme recette active ; seconde conservée en attente. Après rechargement, états et recette active visibles dans l'interface. Snapshot tomate avant/après identique : 25,2 kg, révision 2, 3 525 mouvements. | Parcours technique seulement ; les deux pièces sont synthétiques et de même famille tomate. Ne prouve pas les deux familles réclamées par le corpus. | Obtenir une fixture multi-familles anonymisée autorisée avant d'affirmer la couverture métier. |
| 2026-09-24 | R0 — arrêt du runner démo | 6570815 | Deux arrêts Ctrl-C précédents avaient laissé conteneurs tmpfs et répertoires d'identifiants ; artefacts exacts vérifiés puis supprimés. Gestionnaires SIGINT/SIGTERM passés de once à on avec garde de répétition. Nouvelle exécution réelle : Ctrl-C, code 130, aucun processus API/Vite, conteneur disposable-local-demo ou dossier d'identifiants restant. npm run lint, npm test (24 fichiers/102 Vitest + 33 Node/CSS) et git diff --check passent. | Test uniquement local, base neuve et données synthétiques ; aucune base conservée, aucun script --write. | Conserver l'arrêt idempotent et vérifier le nettoyage si le runner change. |
| 2026-09-24 | Pièces → candidates / provenance C3 | `e9611a9` | Les deux sources fictives étaient archivées mais le runner ne préremplissait pas le parcours candidate ; les événements décision/version n'étaient pas tous qualifiés démo. `demo:local` crée maintenant deux hypothèses éditables liées aux lignes source ; décisions et versions de recette ressortent comme simulées, avec route `/recipes` et mention explicite qu'aucune cuisson n'est déclarée. Intégration séquentielle configurée après des coupures `socket hang up` intermittentes dans plusieurs suites non liées sous parallélisme. | `npm run verify:local-delivery` réussi : lint, builds web/API, 18 migrations fraîches, 105 tests Vitest + 33 Node/CSS, intégration PostgreSQL tmpfs 25 fichiers/37 tests, sauvegarde/restauration synthétique et migrations à jour. La page `/login` est visible selon l'utilisateur, mais CUA conserve `browsers: []` et `getApp("com.google.Chrome")` retourne `cgWindowNotFound`; aucune nouvelle capture, vérification responsive ou clavier possible dans cette reprise. Le bac vérifié est jetable, sans base conservée ni donnée réelle. | Reprendre la revue CUA depuis cette fenêtre quand le connecteur l'expose ; garder Q2/global mobile-clavier incomplet et la validité métier des candidates non acquise. |
| 2026-09-24 | Q2 — recette → production UI | — (vérification) | Chrome headless sur bac tmpfs neuf : confirmation UI d'1 portion de Pizza Margherita, rendement/version active 1. Farine T55 0,2 kg, tomates 0,1 kg, mozzarella 0,12 kg et huile d'olive 0,02 L déduits exactement ; chaque stockRevision progresse de 1. Après rechargement, le journal affiche « Production réalisée — stock déduit ». L'arrêt Ctrl-C nettoie le bac. | Validation synthétique et sur ce seul parcours ; pas de CUA natif, lecteur d'écran, zoom réel ou états conflit/erreur. Aucun chiffre terrain. | Continuer les autres tâches UI du mandat et le parcours chronologique complet. |
| 2026-09-24 | Q2 — modale de production mobile | — (vérification) | Chrome headless/CDP à 390×844 : boîte de dialogue 366×799, largeur du contenu égale au viewport (390 px), commandes nommées dans l'AXTree. Focus initial, Tab et Shift-Tab bouclent entre fermer/confirmer ; Échap ferme et rend le focus à « Produire cette recette ». Snapshot de stock avant/après ouverture/fermeture identique : aucune déduction sans confirmation. | Vérification synthétique ; pas de lecteur d'écran réel ni de zoom de navigateur 200 %. Démo tmpfs, profil et captures temporaires nettoyés. | Rejouer avec Chrome natif/technologie d'assistance lorsque l'onglet contrôlable est disponible. |
| 2026-09-24 | Q2 — conflit du calendrier des services | `53968c6` | Après un 409 de `saveServiceDay`, l'erreur était immédiatement effacée par `load()` et l'état serveur réinitialisait les choix sans explication. Le rechargement retourne maintenant son résultat ; l'alerte reste visible avec l'échec initial et indique si l'état a été rechargé (changements non enregistrés abandonnés) ou si ce rechargement a aussi échoué. | `npm run lint`, `npm run build`, `npm test` (24 fichiers/102 tests Vitest + 33 Node/CSS), `git diff --check`. Le test d'intégration existant couvre le 409 serveur. Pas de harnais de test composant installé ; revue UI native impossible à ce stade. | Rejouer le conflit depuis le formulaire, vérifier le focus/annonce et la conservation des données affichées avec Chrome/AT quand un onglet contrôlable sera disponible. |
| 2026-09-24 | Q2 — décision de suggestion → commande | `ab2e4df` | `GET /orders/suggestions` renvoie la dernière décision correspondant au `suggestionKey` courant, y compris son lien de commande après validation. L'UI garde les exclusions après rechargement, pointe vers la commande exacte, distingue une décision ajoutée d'un panier présent et peut retenter l'ajout si la décision a été sauvée mais pas le panier ; rafraîchit après validation/réception. `OrderHistory` expose l'ancre cible. | `npm run verify:local-delivery` : lint, builds web/API, migrations fraîches 18/18, tests 24 fichiers/102 Vitest + 33 Node/CSS, intégration 25 fichiers/36 tests (dont exclusion persistée, décision liée à la commande et isolation), sauvegarde/restauration. Après l'ajout de la cible d'ancre : `npm run lint`, `npm run build`, `npm test`, `git diff --check`. | API/intégration et compilation vérifiées ; le passage UI ne peut pas être rejoué dans le Chrome natif (CUA `browsers: []`, `createBrowserTab` refusé). Aucun achat réel, envoi ou mouvement de stock ajouté. | Rejouer exclusion, ajout, validation, rechargement et lien direct sur téléphone/clavier/AT quand un onglet contrôlable est disponible. |
| 2026-09-24 | Q2 — recharger une proposition périmée | `2e25f75` | Après erreur de décision, un bouton relance le calcul ; le champ quantité n'est conservé que si le `suggestionKey` n'a pas changé. Le test d'intégration confirme qu'une réception incrémente la révision stock, invalide le comptage, et ne réapplique donc pas l'ancienne décision à la nouvelle proposition. | `npm run verify:local-delivery` passe : lint, build web/API, 18 migrations fraîches, 24 fichiers/102 Vitest + 33 Node/CSS, 25 fichiers/36 intégrations et sauvegarde/restauration synthétique. | Le résultat est couvert par contrat et intégration ; interaction visuelle/clavier/AT non rejouée faute d'onglet accessible. | Vérifier en rendu que le message d'erreur/rechargement et la quantité remise à l'estimation courante restent lisibles sur mobile et au clavier. |
| 2026-09-24 | Q2 — revue Chrome natif après activation | — (vérification) | Bac `demo:local` isolé sur loopback ; captures bureau de l'accueil, Stocks et Ventes. Depuis l'accueil, Tab révèle un focus visible, Tab atteint Stocks et Entrée ouvre cette route. Stocks affiche l'avertissement de données simulées et de revue humaine ; Ventes montre 2026-09-24 non renseigné/manquant/inconnu, et les jours démo comme simulés. Aucune donnée n'a été modifiée. | CUA `getState()` garde `browsers: []` et `createBrowserTab` refuse les onglets, mais `getApp("Google Chrome")` contrôle la fenêtre native. Vérification visuelle à environ 1224×768 (zoom Chrome 90 %), et clavier sur l'accueil/Stocks. | Pas de largeur mobile native, vrai zoom 200 %, état erreur/conflit/chargement, annonce lecteur d'écran ou parcours Achats confirmé ; cette preuve desktop ne clôt pas Q2. Démo arrêtée par Ctrl-C (code 130), ports 63240/63241 et répertoire d'identifiants absents après l'arrêt. | Reprendre Q2 pour mobile/zoom/états/AT ; ne marquer le parcours complet qu'après ces contrôles. |
| 2026-09-24 | Q2 — navigation native mobile | — (vérification) | Bac `demo:local` tmpfs sur loopback : Aujourd'hui, Stocks, Achats et Ventes observés en Chrome natif, émulation responsive 390×750 (Ventes aussi au préréglage iPhone 16, 393×852). Cartes/sections en lecture verticale, sans débordement horizontal visible. Sur Stocks, l'avertissement démo reste lisible ; Achats expose un panier vide et « besoin incomplet », sans proposition, avec avertissement sans envoi réel ; Ventes montre la provenance simulée. Au clavier, Échap ferme le menu et rend le focus au déclencheur ; Tab atteint Aujourd'hui/Achats et Entrée ouvre Achats. Aucune action métier n'a été déclenchée. | CUA `browsers: []`, contrôle natif via `getApp`. Largeur 320–375 px et tablette non vérifiées en raison du contrôle de largeur de l'émulateur ; le bac reste synthétique et temporaire. | Compléter la matrice native à 320–375/768/1280 px, zoom 200 %, états chargement/erreur/conflit/long et technologie d'assistance ; cette revue partielle ne clôt pas Q2. |
| 2026-09-24 | R0 — recette locale répétée | — (vérification) | `npm run verify:local-delivery` sur le worktree courant : lint, builds web/API, migrations fraîches 18/18, `npm test` réussi (24 fichiers/102 tests Vitest), intégration 25 fichiers/36 tests, restauration d'un témoin synthétique dans `kookia_restore` et statut Prisma à jour. Docker confirme ensuite l'absence du conteneur étiqueté `disposable-local-delivery` et du port 55435. | Recette exécutée avec accès local Docker après refus du bac sandbox ; conteneur PostgreSQL 16 loopback/tmpfs, aucun volume ni donnée conservée. Aucun nouveau rendu UI ; Q2 reste ouvert. | Continuer les contrôles rendus/manquants Q2 ; ne pas assimiler cette preuve backend à une validation de l'interface. |

| 2026-09-24 | I4 — upload fixture → C1 | `0c011de` | Port préparé en mémoire → route d'upload authentifiée avec validation PDF/JPEG/PNG, adaptateur synthétique activé uniquement par `demo:local`, persistance idempotente d'un candidat tenant-scopé et aperçu original depuis le navigateur ; les autres pièces gardent la saisie manuelle. Aucun octet original n'est persisté. | `npm run verify:local-delivery` : lint, builds web/API, migrations 18/18, `npm test` (24 Vitest/102 + 33 Node/CSS), intégration (25 fichiers/37 tests), dump/restore synthétique et Prisma à jour. Le scénario d'intégration envoie le PDF public via HTTP, rejoue deux uploads concurrents, vérifie auth/MIME/signature/fallback, deux tenants, aucun mouvement avant C1, correction, refus sans confirmation type/date et une seule réception simulée après confirmation. Le PDF a été rendu en PNG par Quartz `sips` et visuellement inspecté ; `git diff --check`. | Fixture publique fictive seulement ; aucun OCR générique, fournisseur ou document réel. L'UI I4 compile mais attend encore son rendu/clavier/responsive natif. Le conteneur PostgreSQL tmpfs et son port ont été retirés par la recette. | Continuer Q2 en navigateur accessible et compléter les états/clavier/mobile/zoom ; garder OCR externe inactif sans politique d'accès/rétention. |
| 2026-09-24 | Q2 — Ventes mobile | — (vérification) | Chrome natif sur `/sales` à 390 et 320 px : en-tête visible depuis le haut, état vide (« absence de donnée » distincte de zéro), actions et formulaire de vente empilés avec libellés visibles ; Tab affiche un focus net sur « Importer un CSV Kookia ». Le tableau du calendrier garde un défilement horizontal interne : plusieurs valeurs/colonnes sont tronquées avant balayage, sans débordement de page visible. Aucune action métier ni donnée modifiée. | Rendu observé en émulation responsive dans Chrome. Aucun lecteur d'écran ni parcours clavier complet des contrôles du calendrier. Après passage au zoom Chrome 200 %, CUA renvoie `cgWindowNotFound` bien que `getState()` indique Chrome actif ; fenêtre/zoom/emulation n'ont pas pu être restaurés via CUA. | Reprendre le contrôle natif, restaurer zoom 90 % et 1440×750 ; décider si le tableau mobile doit être remplacé par des cartes ou si son défilement est suffisamment découvrable, puis continuer les routes/états restants de Q2. |
| 2026-09-24 | Q2 — tiroir Stocks, navigation et calendrier Ventes mobile | — (vérification + correctifs) | À 320 px, la fiche Tomates affichait « Stock théorique » au mauvais corps car `block`/`text-xs` n'existent pas dans le catalogue CSS ; remplacement par un label sémantique avec style local et empilement de la bannière au petit écran. Le rendu natif montre le libellé réduit et `12 kg` entier ; Tab focalise « Compter », Échap ferme le dialogue et rend le focus à « Voir la fiche ». Stocks/Ventes testés à 200 % sans coupe des contenus observés. Défaut séparé reproduit : après défilement Stocks, Ventes s'ouvrait au milieu du calendrier ; `Layout` remet maintenant le conteneur principal en haut et garde les ancres (`#sales-entry-title` testé depuis Ventes et Aujourd'hui). Le tableau calendrier reste défilable horizontalement, mais une consigne mobile explicite ce geste ; Tab focalise la région et la flèche droite révèle les colonnes suivantes. Aucune action métier ni donnée modifiée. | `npm run lint`, `npm run build`, `npm test` (24 fichiers/102 Vitest + 33 Node/CSS), `git diff --check`. Chrome natif, zoom réel 200 %, responsive 320×750, clavier Tab/flèche droite/Échap ; zoom revenu à 90 % et largeur responsive restaurée à 1440×750. | Pas de tablette 768 px sur ces routes, de technologie d'assistance réelle ni d'états non nominaux. | Continuer les routes et états Q2 manquants avant clôture. |
| 2026-09-24 | Q2 — parcours natif au clavier, 320/768/200 % | — (vérification) | Chrome natif sur le bac `demo:local` tmpfs, zoom 90 %. À 320×750, Aujourd'hui → Ventes → Stocks → Achats parcouru avec le menu, Tab et Entrée ; captures et AXTree confirment les états vides, les actions et les libellés. Le calendrier Ventes annonce son défilement horizontal interne ; cartes Stocks et Achats restent en colonne, sans débordement horizontal de page visible. À 768×750, Aujourd'hui/Achats, Stocks et Ventes observés : les cartes Stocks restent lisibles en colonne, l’avertissement de données d’exemple reste entier, et Ventes montre l’état de service non renseigné ainsi que l’instruction de défilement horizontal du calendrier ; captures visuelles sans débordement de page apparent. À 200 % de zoom Chrome natif, sur onglet ordinaire sans émulation responsive, Aujourd'hui, Ventes, Stocks et Achats vérifiés en état courant/vide ; les textes se replient et les actions restent lisibles, sans débordement horizontal visible dans les zones capturées, avec défilement vertical requis. Aucune fixture lancée, vente, commande ou autre donnée modifiée. | CUA conserve `browsers: []`, mais `getApp("com.google.Chrome")` a contrôlé l'onglet natif. Largeur responsive restaurée à 1440×750 et zoom Chrome revenu à 90 %. | 200 % ne couvre encore que les quatre routes principales et leurs zones visibles en état courant/vide ; erreurs, chargement, conflit, contenus longs et lecteur d'écran réel restent à vérifier ; Q2 reste ouvert. |
| 2026-09-24 | Q2 — réception simulée persistée | — (vérification) | Dans le bac `demo:local` tmpfs, brouillon de `Facture DEMO-2026-09-01` repris après relevé du stock initial de Tomates (12 kg). Type facture et date de démonstration 2026-09-20 confirmés ; ligne fictive rapprochée de `Tomates (kg)`, 2 kg à 3,50 €, puis réception simulée enregistrée. Après navigation et rechargement, le stock reste à 14 kg et l'archive indique exactement `1 mouvement(s)` lié ; « Voir la réception » présente les champs en lecture seule et prévient qu'aucun second crédit n'a lieu. | Contrôle Chrome natif sur `127.0.0.1:52790` ; aucun fournisseur réel, achat réel ni message envoyé. État limité aux données synthétiques en tmpfs. | Q2 reste ouvert pour les routes/états, largeurs et vérifications AT restant listés ci-dessus. |
| 2026-09-24 | Q2 — erreurs réseau Ventes | `deb233c` | Lectures API hors ligne sans reprise, avec parfois un vide trompeur → message de connexion en français, reprise locale par section, enregistrement calendrier bloqué tant que la lecture échoue et aucun compte « 0 » affiché avant lecture réussie. | Chrome natif sur le bac tmpfs `127.0.0.1:52790`, largeur responsive 768 × 750, zoom Chrome 90 % : mode hors ligne puis normal, sortie et retour sur Ventes. Résumé, calendrier, historique Ticket Z, réconciliation et correspondances de recettes montrent une erreur compréhensible et `Réessayer`; l’historique/les contrôles indisponibles ne prétendent pas être vides et l’enregistrement du service est désactivé. Après retour en ligne, chaque reprise GET récupère les données et place le focus sur le titre de section. `rtk npm run lint`, `rtk npm run build`, `rtk npm test -- --run` (24 fichiers Vitest/103 tests ; 33 tests Node/CSS) et `rtk git diff --check` passent. | Seulement des lectures GET/reprises ; aucun enregistrement métier ni changement de fixture. Vérification via l’arbre de Chrome à 768 px, pas de lecteur d’écran réel ni audit visuel complet. | Continuer les autres routes Q2, tailles/zoom et états de chargement, conflit et contenu long ; le contrôle AT reste à faire, Q2 n’est pas clos. |
| 2026-09-24 | Q2 — fiche Stocks tablette | — (vérification) | À 768 × 750, l’inventaire conserve ses six cartes « à vérifier » avec quantité, seuil, source et fournisseur ; le détail Tomates présente 14 kg théoriques, l’absence de comptage, le mouvement de facture simulée et le lien vers la pièce. La fermeture du détail retourne le focus à `Voir la fiche`. Cette reprise confirme visuellement la carte Tomates et la mise en colonne des cartes, sans débordement apparent. | Chrome natif dans le bac tmpfs, zoom 90 %. Lecture de l’arbre accessible avant/après ouverture et fermeture de la fiche ; capture visuelle de la liste ; aucune commande, correction, comptage ou modification enregistrée. | Les états longs/erreur/conflit sur les routes restantes et une technologie d'assistance réelle restent à vérifier. |
| 2026-09-24 | Q2 — erreur de lecture du panier | `b591b35` | Le contexte expose l’erreur du GET panier séparément de `[]` ; Aujourd’hui et Achats affichent une indisponibilité et permettent une nouvelle lecture, sans faux état vide ni compteur trompeur. L’action ne modifie pas la sélection. | `npm run lint`, `npm run build`, `npm test -- --run` (24 fichiers Vitest/103 tests ; 33 tests Node/CSS) et `git diff --check` passent après le correctif. Dans Chrome natif sur `demo:local` tmpfs, blocage DevTools limité à `*://127.0.0.1:52790/api/workspace/cart*` : Aujourd’hui puis Achats affichent l’erreur et `Réessayer`, sans faux vide/compteur à 1440×750 et 768×750 ; la requête apparaît `bloquée : outils de développement` et les reprises restent en erreur. Après suppression du schéma, le GET réussit et Achats affiche le vrai état `0 article` / `Aucun article sélectionné`. Largeur responsive remise à 1440×750, zoom Chrome 90 %, aucune mutation métier. | Le rendu erreur/reprise du panier est maintenant prouvé visuellement à bureau et tablette ; les autres routes/états, contenu long, zoom 200 % restant et technologie d’assistance réelle restent à vérifier. Q2 n’est pas clos. |
| 2026-09-24 | Q2 — Historique responsive/clavier/200 % | — (vérification) | Chrome natif sur `/history` dans le bac « Revue Q2 » : captures à 1440×750, 768×750 et 320×750 ; filtres à deux colonnes puis empilés, badges de provenance repliés, textes lisibles et défilement vertical sans débordement horizontal visible. Sept pressions Tab atteignent KookiA, Aujourd’hui, Achats, Stocks, Ventes, Plus et Besoin d’aide. Onglet ordinaire sans émulation à zoom Chrome 200 % : titre, filtres et contenu visible restent dans la largeur et lisibles ; défilement vertical requis. | La légende distingue Archive source, Enregistré, Simulation, Hypothèse et Inconnu ; les filtres annoncent une fenêtre de 31 jours et une coupe « Connu au ». Dans ce bac, mai 2023 et janvier 2024 n’affichent que 15 versions de recette à effet inconnu quand elles sont connues en 2026 ; avec « Connu au » au 31 janvier 2024, zéro événement. Le compte affiché est « Revue Q2 », pas le runner C2/C3 `demo:local` : cela ne prouve ni ne réfute son récit annuel. Filtres et focus seulement, aucune mutation métier ; zoom 90 %, largeur 1440×750 et onglet Ventes restaurés. Pas de lecteur d’écran réel. | Rejouer la chronologie sur le runner C2/C3 `demo:local` contrôlable et poursuivre les routes/états Q2 restants ; ne pas assimiler ce bac de revue à la fixture de quatre ans. |
| 2026-09-24 | Q2 — zoom natif Recettes/Achats/Bilan | — (vérification) | Onglet Chrome ordinaire sans émulation, zoom réel 200 %. Recettes : titre, action et début du catalogue lisibles ; l’arbre expose 15 cartes, sans débordement horizontal visible. Achats : panier « 0 article », besoin non fiable et pièce fictive visibles, sans commande enregistrée. Bilan : dates, indicateurs et tableau restent dans la largeur ; l’absence de jours complets, les 30 dates manquantes/partielles et « Aucune donnée » sont explicites. Le chargement global aperçu après navigation s’est résolu en environ 2 à 3 secondes ; défilement vertical requis. | Captures visuelles et AXTree après stabilisation ; aucune action métier ni donnée modifiée. La preuve porte sur les premiers écrans/états courants, pas sur les contenus plus bas, les conflits ni toutes les erreurs à 200 %, et aucun lecteur d’écran n’a été utilisé. L’onglet ordinaire est revenu à Stocks, zoom 90 % ; l’onglet responsive reste à Ventes, 1440×750, sans limitation réseau. | Continuer les autres routes Q2, les états non nominaux au zoom élevé et une technologie d’assistance réelle ; Q2 reste ouvert. |
| 2026-09-24 | Q2 — rubrique Plus mobile | — (vérification) | Chrome natif sur `/more` à 320×750 : les cartes secondaires s’empilent en une colonne, leurs intitulés, descriptions et liens restent visibles, sans débordement horizontal apparent. L’arbre expose Recettes, Bilan, Restaurant, Fournisseurs, Connexions, Mon compte, Scénarios d’exemple et Histoire sur quatre années ; le défilement vertical donne accès aux dernières cartes. | Capture après résolution du chargement ; route purement consultée, aucune action ni donnée modifiée. Largeur responsive 1440×750, zoom Chrome 90 %, Ventes restaurées après le contrôle. | Le premier écran ne montre que les trois premières cartes ; le clavier complet, les autres largeurs et un lecteur d’écran réel restent à couvrir. Q2 reste ouvert. |
| 2026-09-24 | Q2 — reprise d’erreur GET Historique | `fix: add retry for timeline load errors` | Une panne réseau GET sur `/history` affichait « réessayez » sans action. `Timeline` rend maintenant un bouton `Réessayer` accessible seulement après une erreur de requête ; son activation relance le GET en conservant les filtres. Le statut et l’action se replient sur plusieurs lignes aux petites largeurs. | `rtk npm run lint`, `rtk npm run build` et `rtk git diff --check` passent. Dans Chrome sur le bac tmpfs « Revue Q2 », DevTools hors ligne a reproduit l’erreur ; le bouton apparaît dans l’arbre accessible et reçoit le focus par Tab. Après retour en ligne, l’activation du bouton réussit et affiche la réponse correspondant au filtre courant ; le filtre restauré à 2026-09-24 affiche 18 événements. Onglets remis sur Stocks et Ventes, largeur responsive 1440×750, zoom 90 %, réseau sans limitation. Lectures GET uniquement, aucun enregistrement métier ni changement de données. | Pas de lecteur d’écran réel ni d’essai de toutes les erreurs/routes à 200 %. Le bac est « Revue Q2 », pas le runner de récit annuel C2/C3 ; Q2 reste ouvert. |
| 2026-09-24 | Q2 — Aujourd’hui, Réglages, Scénarios à 320/768 px | — (vérification) | Aujourd’hui à 320 px : Tab atteint le menu, Entrée l’ouvre, Échap le ferme et rend le focus au déclencheur ; les ventes absentes et stocks à confirmer restent explicites. Réglages Restaurant/Compte exposent les libellés de champs aux largeurs 320 et 768 ; Fournisseurs et Connexions montrent les replis manuels et les statuts `Non connecté`. Scénarios : la semaine répond aux flèches gauche/droite ; le mois à 320 px expose les 20 exemples passés, huit achats illustrés, puis cinq scénarios du 12 septembre. Le détail Tomates précise qu’il s’agit d’un exemple passé, sans commande à préparer ; Échap ferme la modale et rend le focus à son bouton d’ouverture. | Dans Chrome sur le bac tmpfs « Revue Q2 », uniquement lecture et navigation. Le GET des sources échoue hors ligne sur Réglages Connexions ; après reconnexion, `Réessayer` restaure les cinq états `Non connecté`. Aucun formulaire enregistré, scénario lancé ou achat préparé. Contrôle par arbre accessible et clavier, pas de capture visuelle enregistrée pour cette passe. Onglets restaurés à Stocks et Ventes, largeur responsive 1440×750, zoom 90 %, réseau sans limitation. | Les tests visuels par capture de ces deux routes, leur état 200 % et le lecteur d’écran réel restent à faire ; les autres états/routes Q2 manquent également. Q2 reste ouvert. |
| 2026-09-24 | Q2 — fenêtre native après activation CUA | — (vérification) | Après ouverture demandée par l’utilisateur, Chrome a fourni un instantané AX initial sur `/sales` (1440×750, barre de navigation et formulaires accessibles ; DevTools en mode Réactivité). | `getScreenshot`, rafraîchissement AX et clic échouent ensuite avec `cgWindowNotFound`, bien que Chrome reste listé comme actif. Aucun clic, clavier, capture visuelle ou changement de données n’a été réalisé durant cet essai. | Le rendu visuel, le responsive et le clavier ne sont pas vérifiés par cette tentative ; poursuivre Q2 dès que les commandes natives restent contrôlables. |
| 2026-09-24 | Pièces → idées de recette (sources fictives) | `61f2b53` | Corpus de simulation limité à la tomate → ajout au bac démo de deux sources pédagogiques explicitement fictives, sans entrée dans le plan stock ; le test scénario confirme 433 documents archivés pour 431 pièces de simulation. L'intégration recette crée les deux candidates sur ces sources, en corrige une et la confirme, garde l'autre en attente. | `npm run verify:local-delivery` passe : lint, builds web/API, 18 migrations, `npm test` (104 Vitest + 33 Node/CSS), 37 tests d'intégration, sauvegarde/restauration synthétique et diff-check. Une exécution intermédiaire a eu un 404 intermittent dans `salesImport`; ses 3 tests isolés sur base jetable puis la recette intégrale finale passent. | Flux démonstratif seulement : aucun achat, plat ou production réelle attesté ; stock et ledger inchangés. Q2 visuel/clavier demeure incomplet après `cgWindowNotFound`. Obtenir une fixture autorisée multi-familles ou des données terrain consenties pour une preuve métier. |
| 2026-09-24 | Q2 — reprise du GET Établissement | `48400b0` | Échec du chargement initial bloquait Réglages → Établissement sur une alerte sans reprise → bouton natif `Réessayer`, lecture relancée, puis focus rendu au bouton en cas de nouvel échec ou au premier champ si la réponse réussit et que l'utilisateur n'a pas déplacé son focus. | `npm run lint`, `npm run build`, `npm test` (26 fichiers/105 tests Vitest + 33 tests Node/CSS), `git diff --check` passent. Le test de build a d'abord révélé l'absence de forwarding de ref dans `Button`, corrigée avec `forwardRef`. | Correction code-only : CUA conserve `browsers: []` et `getApp("com.google.Chrome")` échoue `cgWindowNotFound`; rendu et interaction clavier de ce retry non observés, aucun appel API/base de données exécuté. | Vérifier la reprise rendue et le retour de focus sous Chrome lorsque la fenêtre est contrôlable ; continuer les routes/états Q2 sans clore la matrice. |
| 2026-09-24 | Q2 — chargement catalogue dans la validation Achats | `84df5ee` | La validation de commande partage l'état catalogue de la route Achats au lieu de refaire un GET ; un bouton de reprise est proposé dans la modale et le focus revient au bouton ou premier champ après réponse, sans détourner un focus déplacé. La modale de facture avait encore sa propre lecture catalogue ; celle-ci a été supprimée au profit du même état dans `47b5f6e`. | `npm run lint`, `npm run build`, `npm test` (26 fichiers/105 tests Vitest + 33 tests Node/CSS), `git diff --check` passent. La route Achats ne conserve plus qu'un appel `useInventoryCatalog`, partagé entre ses modales. | Code compilé/tests globaux passés, mais CUA reste sans navigateur contrôlable (`browsers: []`, `cgWindowNotFound`) : aucune nouvelle capture, preuve visuelle responsive ou interaction clavier de la modale. Aucun appel métier ni changement de base. | Rejouer l'état de panne/reprise et la validation de commande au clavier/rendu ; poursuivre la matrice Q2. |
| 2026-09-24 | Q2 — reprise Fournisseurs et besoins à revoir | `40fce24` | Fournisseurs n'offrait pas de reprise après échec catalogue et pouvait autoriser une création quand la liste était encore inconnue ; propositions d'achat en échec initial n'offraient qu'une alerte. Réessai natif ajouté ; erreur et succès de sauvegarde fournisseur distingués même si le rafraîchissement échoue ; création bloquée tant que le catalogue n'est pas connu ; propositions rejouables avec focus rendu au bouton/au titre selon résultat. | `npm run lint`, `npm run build`, `npm test` (26 fichiers/105 tests Vitest + 33 tests Node/CSS), `git diff --check` passent. Aucun contrat API, persistance ou migration modifié. | Code seulement : CUA reste `browsers: []` / `cgWindowNotFound`; la panne, le succès de reprise et le parcours clavier/rendu n'ont pas été observés sur écran. Tests du dépôt non configurés pour monter les composants React. | Vérifier les reprises et focus sous Chrome/AT lorsque contrôlable ; poursuivre Q2, sans déclarer les états UI prouvés sur la seule compilation. |
| 2026-09-24 | Q2 — reprises des lectures Impact/Ventes | `c0e39f4` | Impact, indicateurs de ventes et baseline test affichaient une erreur sans action de reprise. Boutons de relecture ajoutés ; le chargement est dérivé de la clé de requête pour les filtres/reprises, et un succès replace le focus au titre (échec répété au bouton) seulement si le focus est resté sur le déclencheur. | `rtk npm run lint`, `rtk npm run build`, `rtk npm test` (26 fichiers/105 Vitest + 33 Node/CSS), `rtk git diff --check` passent. Aucun contrat API, données ou migration modifiés. | La personne indique que `/login` est visible sur `127.0.0.1:52790`, mais `getState()` retourne encore `browsers: []` et `getApp("com.google.Chrome")` échoue `cgWindowNotFound` ; pas de preuve rendue/clavier dans cette reprise. Le dépôt ne monte pas ces composants dans les tests React. | Vérifier ces états et retours de focus dans Chrome contrôlable, puis poursuivre les routes/états Q2 restants ; garder Q2 ouvert. |
| 2026-09-24 | Q2 — reprise archive factures et pièces | `a39358e` | Dans Achats, l'échec du GET des pièces pouvait être suivi de « 0 pièce »/« Aucune pièce importée », sans action de reprise ; l'échec du détail n'était pas distinct. La section indique maintenant `Indisponible`, masque l'état vide, relance la liste ou le détail, ignore les réponses de détail périmées et rend le focus à l'action échouée ou au titre si le focus était resté sur le bouton. | `rtk npm run lint`, `rtk npm run build`, `rtk npm test` (26 fichiers/105 Vitest + 33 Node/CSS), `rtk git diff --check` passent. Aucun contrat API, données ou migration modifiés. | Contrôle rendu/clavier non possible : le serveur synthétique utilisateur est sur `127.0.0.1:52790`, mais CUA renvoie encore `browsers: []` et `getApp("com.google.Chrome")` échoue `cgWindowNotFound`. Le dépôt n'a pas de DOM/E2E ni de test de montage React. | Vérifier l'erreur, la reprise et le focus en navigateur contrôlable ; continuer les écrans/états Q2 restants sans fermer la matrice. |
| 2026-09-24 | Q2 — historique commandes et revue réception | `58c7855` | Le GET brouillons en erreur pouvait être annoncé comme « aucune facture » ; l'historique perdait le focus au retry et démontait le contexte après réception. Erreur GET séparée avec bouton de reprise/focus, état vide masqué à l'échec, doublon d'action désactivé si la commande ou facture est périmée, commandes déjà chargées gardées pendant relecture et détails non démontés ; focus du geste réussi revient au résumé de la commande. | `rtk npm run lint`, `rtk npm run build`, `rtk npm test` (26 fichiers/105 Vitest + 33 Node/CSS), `rtk git diff --check` passent. Aucun contrat API, données ou migration modifiés. | Pas de rendu/clavier réel : CUA expose encore `browsers: []` / `cgWindowNotFound`. Aucun harness DOM/E2E ou test de montage React dans le dépôt. | Vérifier les reprises, la suspension et le focus à l'écran quand Chrome est contrôlable ; poursuivre la matrice Q2 et garder le Goal ouvert. |
| 2026-09-24 | Q2 — reprises de la modale facture | `47b5f6e` | La modale pouvait perdre l'accès aux brouillons après erreur GET et relisait produits/fournisseurs malgré l'état déjà chargé dans Achats. Catalogue désormais partagé route/modales ; reprises séparées du catalogue et de l'historique avec focus conditionnel ; brouillon local préservé au retry. La persistance manuelle est suspendue tant que l'historique reste inconnu ; les brouillons source conservent leur identité/idempotence serveur. | `rtk npm run lint`, `rtk npm run build`, `rtk npm test` (26 fichiers/105 Vitest + 33 Node/CSS), `rtk git diff --check` passent. Un seul `useInventoryCatalog()` sur la route Achats. Aucun contrat API, base ou migration modifiés. | Revue visuelle/clavier impossible : `getState()` donne encore `browsers: []`, `getApp("com.google.Chrome")` échoue `cgWindowNotFound`. Pas de harnais DOM/E2E ni test React de montage dans le dépôt. | Rejouer les erreurs de catalogue/historique et la correction/réception sous Chrome contrôlable ; conserver Q2 ouvert et poursuivre les états restants. |
| 2026-09-24 | Q2 — rattachement navigateur après ouverture utilisateur | — | L’utilisateur confirme voir la page ; CUA ne détecte toujours aucun navigateur (`browsers: []`) et `getApp("Google Chrome")` comme par bundle ID échoue `cgWindowNotFound`. Nouvel essai sur le runner dédié : PostgreSQL tmpfs sain, 18 migrations terminées, compte et espace synthétiques créés (`Restaurant.mode=demo`), mais URL/processus web non récupérables dans cette session ; arrêt du runner puis suppression vérifiée de son conteneur temporaire. | Vérifications lecture seule ciblées ; aucun fichier de données ni conteneur utilisateur consulté ou modifié. Pas de capture rendue, contrôle responsive ou interaction clavier effectués. | Q2 visuel/clavier reste non vérifié ; reprendre lorsque CUA expose effectivement Chrome ou une session isolée dont l’URL est contrôlable. |
| 2026-09-24 | Q2 — reprises Réglages/Établissement/Fournisseurs | — (revue rendue + correction CSS) | Sur l’URL démo `demo:local` visible par l’utilisateur, Chrome headless/CDP avec profil isolé et pannes GET ponctuelles de `/api/workspace/restaurant` et `/api/workspace/catalog` : alertes explicites à 390 px, largeur document 390/390 ; Tab atteint « Réessayer » avec focus visible, Entrée relance ; après panne répétée le focus revient au bouton, puis après succès à `#restaurant-name` / au premier bouton fournisseur. « Ajouter un fournisseur » était `disabled=true` mais gardait l’apparence primaire active ; `Brand.css` donne désormais un état neutre visible (fond/bordure/text secondaire, curseur interdit). Reflow 720×450 CSS/DPR 2 : largeur document 720/720, contenu 662 px, alerte et reprise visibles après défilement vertical, sans débordement horizontal. Captures inspectées : [Fournisseurs 390](evidence/q2-settings-retry/suppliers-error-mobile-390.png), [Établissement reflow DPR 2](evidence/q2-settings-retry/restaurant-error-reflow-dpr2.png). | `rtk npm run build`, `rtk npm test` (26 fichiers/105 Vitest + 33 Node/CSS), lint CSS/ESLint final et `rtk git diff --check` passent. Échec GET et retries seulement ; login de session démo, 0 écriture métier. Aucun conteneur/base ni donnée conservée consultés ou modifiés. | Le CUA natif reste inaccessible (`browsers: []`, `createBrowserTab` refuse Chrome) ; DPR 2 est un reflow effectif, pas une preuve du zoom natif. Pas de lecteur d’écran. Poursuivre les routes/états restants et garder Q2/Goal ouverts. |

| 2026-09-24 | Q2 — reprises Indicateurs/Impact | — (revue headless) | Sur le tenant `demo:local`, des échecs GET ponctuels de `/api/workspace/sales/metrics` et `/api/workspace/impact`, puis un nouvel échec et une reprise réussie. À 390 px, les deux alertes et boutons sont lisibles, document 390/390 ; Tab atteint chaque action avec focus visible, Entrée relance, un nouvel échec rend le focus au bouton et le succès le place sur le titre du panneau. Après reprise des indicateurs, le texte qualifie les ventes de simulées et non observées. Reflow 720×450 CSS/DPR 2 : document 720/720, panneau Impact 660 px ; alerte et reprise visibles après défilement vertical, sans débordement horizontal. Captures inspectées : [indicateurs 390](evidence/q2-analytics-retry/sales-metrics-error-mobile-390.png), [Impact 390](evidence/q2-analytics-retry/impact-error-mobile-390.png), [Impact reflow DPR 2](evidence/q2-analytics-retry/impact-error-reflow-dpr2.png). | Chrome headless/CDP, profil isolé ; 0 POST métier (seule création de session d’auth démo), aucun comptage, vente, commande ni stock modifié. | Pas de CUA natif, lecteur d’écran réel ou zoom natif prouvé ; DPR 2 reste une émulation de géométrie de reflow. Poursuivre baseline et autres routes/états, garder Q2 et le Goal ouverts. |

| 2026-09-24 | Q2 — accès clavier à l’estimation test | — (correction locale) | La disclosure en bas de Ventes demandait 392 pressions Tab à cause des actions de l’historique. Un lien « Estimation test (non utilisée pour les achats) » est ajouté dans le groupe d’accès initial et cible le résumé de la disclosure. À 390 px, Tab l’atteint après 5 pressions, Entrée y place le focus visible puis une seconde Entrée ouvre la disclosure. L’erreur GET est annoncée, Tab/Entrée atteignent et relancent l’action ; après échec répété le focus revient au bouton, après succès au titre du panneau. Reflow 720×450 CSS/DPR 2 : document 720/720, panneau 660 px sans débordement horizontal. Captures inspectées : [liens Ventes 390](evidence/q2-sales-baseline/sales-baseline-shortcut-mobile-390.png), [erreur 390](evidence/q2-sales-baseline/sales-baseline-error-mobile-390.png), [reflow DPR 2](evidence/q2-sales-baseline/sales-baseline-error-reflow-dpr2.png). | `rtk npm run lint`, `rtk npm run build`, `rtk npm test` (26 fichiers/105 Vitest + 33 Node/CSS), `rtk git diff --check` passent. Pannes de GET uniquement, 0 POST métier ; seule session de login démo. | CUA natif reste inaccessible ; reflow DPR 2 n’est pas le zoom natif et aucun lecteur d’écran réel n’a été exercé. Continuer les autres routes/états et garder Q2/Goal ouverts. |

| 2026-09-24 | Q2 — conflit du calendrier des services | — (revue rendue + focus) | Sur `/sales`, un PUT de jour service est intercepté côté navigateur puis répondu en 409 avant d’atteindre le serveur. L’UI recharge le calendrier, affiche que les changements non enregistrés ont été abandonnés et restaure les valeurs serveur (« ouvert / partielle » au lieu de la saisie « fermé / complète »). À 390 px : document 390/390 ; après soumission clavier, le focus visible revient à « Réessayer », Entrée relance le GET et place le focus au titre. Reflow 720×450 CSS/DPR 2 : document 720/720, panneau 660 px ; colonnes du tableau défilables dans leur région comme annoncé, sans débordement de page. Captures inspectées : [conflit 390](evidence/q2-service-conflict/service-conflict-mobile-390.png), [reflow DPR 2](evidence/q2-service-conflict/service-conflict-reflow-dpr2.png). | `rtk npm run lint`, `rtk npm run build`, `rtk npm test` (26 fichiers/105 Vitest + 33 Node/CSS), `rtk git diff --check` passent. 1 PUT 409 synthétique servi par CDP avant l’API ; aucun enregistrement DB, seule session d’auth démo. | Chrome natif/AT reste inaccessible ; DPR 2 ne prouve pas le zoom natif. Continuer les états/routes restants, garder Q2 et le Goal ouverts. |

| 2026-09-24 | Q2 — reflow Histoire et pages hors parcours court | — (revue Chrome natif + correction CSS) | L’émulation `/history` à 320 px a montré un contenu collé au bord gauche : `.timeline-page` n’était pas inclus dans le style commun des pages workspace. Son ajout rétablit le retrait et le fond de page ; Histoire reste lisible à 320/768 px et au zoom Chrome natif 200 %, sans débordement horizontal visible. Tab atteint les filtres de date avec focus visible. Recettes et Scénarios d’exemple sont aussi revus à 320/768 px, sans débordement visible ; Tab atteint la vue Liste avec focus visible. Captures rendues et inspectées dans Chrome natif, non conservées dans le dépôt. | `rtk npm run lint`, `rtk npm run build`, `rtk npm test` (26 fichiers/105 Vitest + 33 Node/CSS) et `rtk git diff --check` passent. Aucun clic métier ni écriture ; navigation et réglage de zoom seulement. | Q2/Goal restent ouverts : autres routes/états et lecteurs d’écran restent à vérifier. Aucun lecteur d’écran réel n’a été exercé. |
| 2026-09-24 | Q2 — zoom Chrome natif 200 %, sans émulation | — (vérification rendue + clavier) | Dans un onglet ordinaire du bac `demo:local`, Chrome natif à 200 % : `/analytics`, `/history`, `/recipes` et `/predictions` restent lisibles dans la fenêtre et sans débordement horizontal visible. Sur Indicateurs, Tab atteint « Exporter un rapport » avec focus visible. Sur Scénarios d’exemple, Tab atteint « Liste », puis Tab + Entrée active « Calendrier » ; le focus reste visible et la vue calendrier s’ouvre. Captures inspectées mais non conservées. | Contrôle par CUA natif après ouverture utilisateur de `127.0.0.1:52790`; navigation de routes et bascule d’une vue en lecture seule uniquement. | Contrôle limité au viewport observé et aux routes citées ; aucun lecteur d’écran réel ni état d’erreur/chargement sur ces quatre routes. Q2/Goal restent ouverts. |
| 2026-09-24 | Q2 — Connexions et Plus au zoom natif | — (vérification rendue + clavier) | Sans émulation responsive, `/settings?section=connections` à 200 % réorganise les rubriques en grille ; l’AX expose les cinq sources « Non connecté » et les replis manuels. Pas de débordement horizontal visible, défilement vertical requis ; Tab atteint « Connexions » avec focus net. `/more` à 200 % conserve deux colonnes et replie les textes sans débordement visible ; Tab atteint « Ouvrir recettes réalisables » avec focus visible. | Chrome natif, bac `demo:local`, viewport de la fenêtre observée ; uniquement des GET, réglage temporaire du zoom rétabli à 90 %, aucun geste métier. Captures inspectées mais non conservées. | Vérification limitée aux états nominaux et à ce viewport ; aucune technologie d’assistance réelle. Q2/Goal restent ouverts. |
| 2026-09-24 | Q2 — Plus/Connexions, 320/768 CSS px | — (vérification responsive + clavier) | Émulation responsive Chrome à zoom de site 100 %, dimensions confirmées par DevTools : 320×750 et 768×750. `/more` passe d’une colonne à deux ; les textes se replient, défilement vertical requis, sans débordement horizontal visible. `Connexions` garde ses quatre rubriques verticales à 320 et en ligne à 768 ; les cinq statuts et replis manuels restent exposés par l’AXTree, les sources défilent verticalement. Tab atteint le lien Recettes à 320/768 et la rubrique Connexions à 320, avec focus visible. | Navigation et lectures uniquement dans le bac `demo:local`, aucune écriture métier. Zoom Chrome restauré à 90 % ensuite ; émulation laissée à 768×750 comme trouvée. Captures inspectées mais non conservées. | Deux routes et leurs états nominaux seulement ; pas de lecteur d’écran réel ni d’états de chargement/erreur. Q2/Goal restent ouverts. |
| 2026-09-24 | Q2 — alertes de stock et comptage courant | `729636e` | La fiche Tomates (14 kg théoriques pour un seuil de 20 kg, sans comptage) présentait d'abord « Critique » rouge. Le statut exige désormais un comptage dont la révision est courante ; un zéro compté devient « Rupture confirmée », tandis que le stock non compté est « À vérifier ». Au rendu suivant à 320×750, le badge était neutre mais les 15 produits sans comptage entraient dans la revue, y compris 150 kg de pommes de terre pour un seuil de 80 kg avec une action de réassort. `needsStockReview` limite maintenant la liste aux comptages faibles/ruptures et aux valeurs théoriques sous seuil ; le détail annonce le caractère indicatif. Régressions ajoutées pour les statuts, libellés et sélection de revue. | `rtk npm run lint`, `rtk npm run build`, `rtk npm test` (26 fichiers/107 tests Vitest + 33 contrôles Node/CSS), test ciblé (4 tests + 33 contrôles CSS/scripts) et `rtk git diff --check` passent. Aucune donnée métier modifiée. | CUA ne détecte toujours aucun navigateur et Chrome retourne `cgWindowNotFound` après que l’utilisateur a ouvert la page ; le rendu 320 précède le dernier filtre `needsStockReview`. Le nombre final de cartes et le dashboard ne sont donc pas visuellement revus. Pas de lecteur d’écran réel. Reprendre ce contrôle avant de fermer Q2/Goal. |
| 2026-09-24 | Q2 — inventaire compact et cartes mobiles | `72bc063` | Le tableau imposait une largeur minimale de 450–500 px aux petits viewports, contrairement à l’exigence de reflow mobile/tablette. À ≤1100 px CSS, la vue complète utilise maintenant des cartes sémantiques ; le tableau demeure au bureau. Profil Chrome headless isolé sur le bac synthétique aux largeurs 320/375/768/1280 : pas de débordement de page, cartes sous 1100 px, tableau conservé à 1280 px. Captures inspectées : [revue 320](evidence/q2-stock-mobile/stocks-review-320.png), [focus du toggle 320](evidence/q2-stock-mobile/stocks-all-toggle-focus-320.png), [inventaire 320](evidence/q2-stock-mobile/stocks-all-320.png), [375](evidence/q2-stock-mobile/stocks-all-375.png), [768](evidence/q2-stock-mobile/stocks-all-768.png), [bureau 1280](evidence/q2-stock-mobile/stocks-all-1280.png), [dashboard 320](evidence/q2-stock-mobile/dashboard-320.png). Tab atteint le toggle puis les actions de carte avec noms propres au produit ; Espace active la vue et l’arbre AX expose la liste inventaire. | `rtk npm run lint`, `rtk npm run build`, `rtk npm test` (26 fichiers/107 tests Vitest + 33 contrôles Node/CSS) et `rtk git diff --check` passent. Le CUA natif a révélé que l’onglet ouvert ne correspondait pas à la fixture isolée ; cette revue a été interrompue sans mutation métier et aucune preuve n’en est retenue. Le profil headless isolé n’a effectué que l’authentification, aucune écriture métier. | Captures et clavier sont validés sur le profil headless isolé ; pas de lecteur d’écran réel ni de comparaison métier au Chrome ouvert. Poursuivre les autres routes/états Q2 et garder le Goal ouvert. |

| 2026-09-24 | Q2 — Aujourd’hui → Ventes → Stocks → Achats | `86b81bd` | Bac `demo:local` neuf sur tmpfs : les documents et le corps restent à la largeur du viewport sur les quatre routes, à 320/375/768/1280 px. Captures inspectées à 320 et 768 : [Aujourd’hui 320](evidence/q2-core-routes/today-320.png), [Ventes 320](evidence/q2-core-routes/sales-320.png), [Stocks 320](evidence/q2-core-routes/stocks-320.png), [Achats 320](evidence/q2-core-routes/orders-320.png), [Aujourd’hui 768](evidence/q2-core-routes/today-768.png), [Ventes 768](evidence/q2-core-routes/sales-768.png), [Stocks 768](evidence/q2-core-routes/stocks-768.png), [Achats 768](evidence/q2-core-routes/orders-768.png). Les écrans distinguent les données de démonstration, la provenance simulée, l’inventaire à confirmer et l’absence de commande ; à 320, Achats expose aussi l’état vide et le lien vers Stocks. | `rtk npm run lint`, `rtk npm run build`, `rtk npm test` (26 fichiers/107 tests Vitest + 33 contrôles Node/CSS) passent. Chrome headless dans un profil isolé : Tab atteint le menu, son bouton de fermeture et le raccourci « Estimation test » avec focus visible ; Échap revient au bouton du menu après le correctif ; sur Stocks, Tab/Espace active « Tout l’inventaire » et affiche 18 cartes sans débordement ; sur Achats, Tab atteint « Choisir dans les stocks ». Émulation headless, les transitions visuelles du tiroir de navigation ne sont pas retenues comme preuve. POST d’authentification uniquement (login/logout), zéro écriture métier ; le Chrome CUA reste sur la page de connexion du bac neuf. | Nominal lecture/clavier et captures 320/768 seulement ; pas de lecteur d’écran réel, ni d’état erreur/conflit/donnée longue sur ces quatre routes. Le zoom natif 200 % et d’autres états restent à reprendre ; Q2/Goal ouverts. |

| 2026-09-24 | Q2 — routes complémentaires | — (Chrome headless/CDP, profil jetable) | Dans un nouveau `demo:local` tmpfs, dix routes (`/`, `/sales`, `/stocks`, `/orders`, `/recipes`, `/predictions`, `/analytics`, `/settings`, `/more`, `/history`) rendues à 320/375/768/1280 px ; largeur `document` et `body` égale au viewport partout, splash terminé avant mesure. Sur chaque route montée à 320 px, les six premiers Tab atteignent des contrôles nommés avec focus visible ; le menu latéral fermé ne reçoit pas le focus. Captures synthétiques retenues : [Achats](evidence/q2-extended/kookia-q2-orders-320.png), [Scénarios](evidence/q2-extended/kookia-q2-predictions-320.png), [Bilan](evidence/q2-extended/kookia-q2-analytics-320.png), [Histoire](evidence/q2-extended/kookia-q2-history-320.png). | Une authentification démo seulement, aucun POST métier ; les routes ont utilisé leurs lectures du tenant synthétique. | La fenêtre CUA native s’est terminée en `cgWindowNotFound`, donc contrôle headless uniquement ; pas de lecteur d’écran réel ni de validation Entrée en fenêtre native. Histoire affiche 1 186 événements sur la période testée (1 189 contrôles interactifs dans le contenu, filtres et liens compris) ; la vérification de cette même date ci-dessous confirme le Tab sur les 1 191 contrôles uniques, jusqu’au retour du focus au menu. Q2 et le Goal restent ouverts. |

| 2026-09-24 | Q2 — erreur de lecture de l’historique Achats | — (Chrome headless/CDP, profil jetable) | Sur `/orders` à 320 px, deux GET initiaux de `/api/workspace/orders` sont interceptés en 503 ; l’alerte « Historique des commandes indisponible » reste distincte du vide. Tab atteint « Réessayer » au 8e arrêt avec focus visible. Après clic de reprise (réponse GET suivante laissée à l’API), l’alerte disparaît, le vrai état vide s’affiche et le focus revient au titre « Commandes enregistrées ». Capture inspectée : [erreur commandes 320](evidence/q2-extended/kookia-q2-orders-error-320.png). | `document` 320/320 ; authentification démo uniquement, aucun POST métier ni écriture de commande. Un premier essai avec un seul 503 a été suivi d’un second GET réussi en mode développement ; le scénario final maintient deux 503 avant la reprise. | La reprise est activée par clic programmatique après avoir atteint le bouton au clavier ; Entrée au navigateur natif, zoom 200 % de cet état et lecteur d’écran réel restent non vérifiés. Q2 et le Goal restent ouverts. |
| 2026-09-24 | Q2 — Histoire dense, parcours clavier à 320 px | — (vérification rendue + clavier CDP) | Sur le bac `demo:local` tmpfs, `/history` à 320×750 affiche 1 186 événements. Document, corps et contenu principal font 320 px ; l’arbre AX expose 1 191 contrôles nommés, zéro sans nom. Tab atteint les 1 191 cibles uniques (dont les 1 189 du contenu), avec indication `:focus-visible` sur chaque cible, puis boucle vers « Ouvrir le menu » après 1 201 arrêts clavier (les champs date ont des segments internes). Capture inspectée : [liste Histoire longue à 320 px](evidence/q2-extended/kookia-q2-history-long-320.png). | Authentification démo seulement ; aucune activation de lien ni opération métier. Chrome headless/CDP et PostgreSQL tmpfs neuf ; journal/source de données en lecture seule. | L’AXTree ne remplace pas un lecteur d’écran réel ; zoom 200 % de cet état et revue native restent à confirmer. Q2 et le Goal restent ouverts. |
| 2026-09-24 | Q2 — cibles tactiles Histoire | `1563e5e` | Inspection du même contenu long : les 1 186 liens mesuraient 21 px de haut. `Timeline.css` leur donne maintenant 44 px aux largeurs compactes/tablette. Rejeu `/history` à 320 px puis reflow équivalent à 200 % (640 CSS px, DPR 2) : les hauteurs min/médiane/max des 1 186 liens sont de 44 px, et document/corps/contenu restent sans débordement. Après CSS, Tab atteint les 1 191 cibles uniques avec focus visible sur chacune, revient au menu en 1 201 arrêts ; AX : 1 191 contrôles, zéro sans nom. Captures inspectées : [liste 320 px](evidence/q2-extended/kookia-q2-history-long-320.png), [reflow 640 CSS/DPR 2](evidence/q2-extended/kookia-q2-history-zoom-equivalent-640css-dpr2.png). | `npm run lint` (36 fichiers CSS), `npm run build`, `git diff --check` passent. Chrome headless/CDP sur PostgreSQL tmpfs neuf ; aucun lien ou geste métier activé. | Le DPR 2 / viewport 640 CSS vérifie le reflow équivalent, pas le zoom navigateur natif. Lecteur d’écran réel et zoom natif restent à contrôler ; Q2 et le Goal restent ouverts. |
| 2026-09-24 | Q2 — erreur GET et reprise Histoire | `2045d4a` | À 320×750, une réponse 503 synthétique du GET `/api/workspace/timeline` affiche l’alerte et `Réessayer`. AX expose le rôle `alert` et le nom du bouton ; Tab l’atteint au 15ᵉ arrêt avec focus visible. Espace relance le GET ; après succès, les 1 186 événements apparaissent et le focus revient au titre avec `:focus-visible`. Une nouvelle panne simulée sur une tentative réaffiche le bouton en lui rendant le focus visible. Capture inspectée : [état erreur et reprise Histoire à 320 px](evidence/q2-extended/kookia-q2-history-error-retry-320.png). | `npm run lint`, `npm run build`, `npm test` (33 tests CSS/Node + 26 fichiers/107 Vitest), `git diff --check` passent. Chrome headless/CDP, profil et PostgreSQL tmpfs neufs ; interception limitée à ces GET, aucune écriture métier. | Preuve headless seulement ; ni lecteur d’écran réel, ni zoom navigateur natif. Le retour de focus après la seconde panne est observé, mais la réactivation suivante n’est pas revendiquée ici. Q2 et le Goal restent ouverts. |
| 2026-09-24 | F3 — candidate recette après suffixe de démonstration | — (correctif + recette locale) | Les six articles vendus du runner ajoutent ` — démonstration` à leur nom, ce qui laissait `suggestedRecipeId` nul malgré les recettes de mêmes noms. Le service propose maintenant une candidate en ignorant uniquement ce suffixe connu et renvoie `suggestionBasis`; l’UI explique le retrait. Le GET du runner recompilé retourne les six bonnes recettes, toutes datées, sans mapping actif ; la projection achat reste correctement bloquée tant qu’elles ne sont pas confirmées. Le bouton de validation reste explicite, sans effet de stock à cette étape. | `rtk npm run verify:local-delivery` passe : lint (36 fichiers CSS), builds web/API, migrations fraîches 18/18, `npm test` (26 fichiers/107 tests), intégration (25 fichiers/37 tests, dont l’affirmation de la candidate exacte et suffixée sans mapping), sauvegarde/restauration synthétique et `git diff --check`. GET authentifiés au runner tmpfs : `28` jours complets, `6` blocages, `0` suggestion avant validation. | Aucun mapping, achat ni mouvement enregistré. Le runner antérieur a été arrêté proprement ; le runner neuf répond sur loopback. `getState()` expose toujours `browsers: []`, sans fenêtre Chrome contrôlable ; aucun rendu natif post-correctif n’est revendiqué. | Reprendre le rendu natif du mapping candidat, confirmer les associations dans l’espace tmpfs puis vérifier la projection, décision d’achat et réception simulées ; Q2/C3 restent ouverts. |
| 2026-09-24 | Q2 — candidat vente→recette→commande→réception | — (revue headless/CDP + GET authentifiés) | Dans le runner `demo:local` tmpfs recompilé, les six suggestions de recette ont été confirmées dans l’UI. Après comptage synthétique 0 kg des pommes de terre (delta nul), l’achat propose 6 kg ; ajout au panier puis validation donnent une commande `simulated`. Une facture manuelle synthétique de 6 kg à 0,60 € et une réception simulée de 6 kg ont été rapprochées depuis l’UI. GET authentifiés : commande `simulated_received`, facture `received`, réception liée simulée, impact de 3,60 € exclu du coût réel ; stock à 0 kg et 1 433 mouvements avant/après, aucun comptage ou mouvement de réception créé. Ventes/Achats rendus et inspectés à 1440 px et 390 px, `documentElement.scrollWidth === innerWidth`. Tab/focus visible observés dans le mapping ; activation clavier du bouton de validation non établie (repli clic). | Authentification uniquement sur le tenant synthétique tmpfs ; mappings, comptage, décision, commande, facture et rapprochement saisis dans les écrans UI. Aucun achat réel, email, variation de stock ou donnée persistante. Le runner actif n’a pas été arrêté. CUA natif reste `browsers: []` et `getApp` échoue `cgWindowNotFound`; Chrome headless/CDP utilisé pour l’inspection. Captures de cette tranche dans `/private/tmp/kookia-*.png`, non conservées dans le dépôt. | Flux simulé de bout en bout prouvé ; Q2/Goal restent ouverts pour activation clavier complète du mapping, lecteur d’écran réel, zoom natif et portes restantes de la matrice. |
| 2026-09-24 | Q2 — confirmation clavier du mapping + Histoire 2023–2026 | — (Chrome headless/CDP, profil jetable) | Sur un runner `demo:local` tmpfs neuf, Tab parcourt les champs du mapping Pizza Margherita jusqu’au bouton focalisé ; Entrée produit exactement un `POST /api/workspace/sales/recipe-mappings`, puis le succès et la correspondance active apparaissent dans l’UI. Le menu mobile s’ouvre avec Entrée/Espace, se ferme avec Échap en restaurant le focus ; les liens de navigation sont atteints avec Tab/Entrée. Sept routes (`/`, `/sales`, `/stocks`, `/orders`, `/recipes`, `/analytics`, `/history`) restent à la largeur du viewport aux cinq tailles 320/375/640/768/1280 px. AXTree de six routes : 1 467 contrôles nommés, zéro sans nom. Histoire rendue à 320 px, sans débordement ni troncature, sur 2023–2026 : les fenêtres couvrent chaque année et trois changements d'année ; septembre 2026 à « connu au » 23 exclut les entrées connues le 24 (1 143 contre 1 187 événements au 24). La pièce d'archive 2023 dont la date effective est inconnue reste étiquetée « Inconnu », sans lignes ni preuve de livraison. Captures inspectées : [focus mapping](evidence/q2-four-year-history/sales-mapping-enter-focus.png), [confirmation](evidence/q2-four-year-history/sales-mapping-enter-confirmed.png), [archive sans date 2023](evidence/q2-four-year-history/history-2023-unknown-source.png), [pièce 2026](evidence/q2-four-year-history/history-2026-source.png), [coupe au 24 septembre](evidence/q2-four-year-history/history-asof-2026-09-24.png), [coupe au 23 septembre](evidence/q2-four-year-history/history-asof-2026-09-23.png). | Le POST de mapping modifie uniquement le tenant synthétique tmpfs ; aucun stock, production, achat ou donnée persistante touchés. CUA ne fournit toujours aucun navigateur contrôlable (`browsers: []`, `cgWindowNotFound`) ; les vues sont headless/CDP. Le lecteur d'écran réel, le zoom Chrome natif et les états non nominaux hors de ces parcours restent à revoir ; Q2 et le Goal restent ouverts. |
| 2026-09-25 | Q2 — revue visuelle Chrome native complémentaire | — (lecture seule sur Chrome natif, runner tmpfs `53038`) | Après authentification sur `demo@kookia.local`, la fenêtre native a rendu `/`, `/sales`, `/stocks`, `/orders`, `/more`, `/history` et `/recipes` à 1224×682. Captures inspectées à l’écran (non conservées : la capture complète inclut onglets et favoris personnels). Les statuts distinguent quantité à vérifier, rupture, simulation/hypothèse et absence de commande ; Histoire expose ses filtres et 1 191 événements ; Recettes marque les deux candidates « EXEMPLE FICTIF » et « hypothèse non validée ». La vue « Tout l’inventaire » a été activée puis la navigation poursuivie. Aucun débordement horizontal visible ; défilement vertical normal. | Connexion, navigation et bascule locale d’affichage seulement ; aucune écriture métier. Le runner tmpfs préexistant est laissé actif. Le lancement d’un runner neuf a échoué avant démarrage sur `listen EPERM`. Le premier essai CUA utilisait `press_key("TAB")` et échouait ; la reprise ci-dessous réussit avec les noms `Tab` et `Return`. | Confirme un rendu natif bureau supplémentaire, pas la matrice responsive ni les états d’erreur. Les preuves headless 320–1280 px et clavier restent la référence ; Q2 et le Goal restent ouverts. |
| 2026-09-25 | M1 — réconciliation mensuelle Impact 2023–2026 | `0761db5` | `scenarioFixture.integration.test.ts` compare chaque mois civil janvier 2023–décembre 2026 aux opérations persistées et au GET `/workspace/impact` : ventes/opérations, pertes/valorisation, couverture, données simulées, jours non enregistrés et séparation des buckets. Le contrôle a révélé que le service ne comptait pas les jours complets/partiels simulés bien qu'il les retirât des jours non enregistrés ; `impactService` classe maintenant les jours complets, partiels, sans couverture et fermés dans le bucket simulation. `impact.integration.test.ts` couvre ces quatre états sur un espace opérationnel. | `npm run verify:local-delivery` réussi sur PostgreSQL jetable tmpfs : lint, builds web/API, migrations fraîches 18/18, `npm test` (26 fichiers/107 tests; 33 contrôles Node/CSS), intégration (25 fichiers/37 tests, dont les 48 mois et les quatre états), dump/restore synthétique et état Prisma à jour. `git diff --check` réussi. Aucun tenant persistant touché. | Les volumes sont de scénario, pas une mesure terrain ; poursuivre les preuves visuelles/keyboard/accessibilité hors des vues observées. Reprendre la suite Q2/C3 sur le runner tmpfs identifié `53038`. |
| 2026-09-25 | Q2 — clavier natif et Bilan à 200 % | — (lecture seule, Chrome natif, runner tmpfs `53038`) | À 200 % réels (sans émulation responsive), Recettes, Aujourd'hui, Achats, Stocks et Ventes restent lisibles dans le viewport de bureau ; descriptions longues et carte candidate se replient, colonnes du calendrier passent sur plusieurs lignes, sans débordement horizontal visible dans les vues inspectées. `Tab` puis `Return` ouvrent Aujourd'hui → Achats → Stocks → Ventes avec focus visible. `Plus → Bilan` révèle l'espace opérationnel actuel (30 jours calendaires, 0 unité/0 service enregistré, 30 sans fiche) distinct des opérations simulées : 3 328 unités, 215 pertes, une réception à 3,60 € ; les ventes complètes sont marquées simulées, deux dates restent incomplètes et pertes/ruptures/invendus non mesurés restent explicitement séparés. Le zoom est ensuite revenu à 100 %. | Navigation, disclosure, scroll et zoom seulement ; aucune écriture métier. Captures non conservées car elles incluent onglets/favoris personnels. Le port neuf `56819`, pourtant annoncé visible, refusait la connexion et n'avait aucun listener au contrôle ; le runner connu `53038` est le seul utilisé et demeure tmpfs. Aucun lecteur d'écran réel, états d'erreur/conflit, ni clavier dateur Bilan vérifiés. | Q2 reste ouvert pour petit viewport/tablette au navigateur natif, erreurs/chargement/conflit/contenu long et technologie d'assistance ; la matrice headless et les parcours de fixtures restent la preuve de complément. Continuer le rendu et corriger seulement les défauts observés. |
| 2026-09-25 | Q2 — Bilan multiannuel et table mobile | `45dc44b` | Sur le runner `53038`, le filtre 01/05/2023–25/09/2026 reproduisait l'erreur Zod générique de `/sales/metrics` (borne serveur : 366 jours d'écart ; sélecteur plus large). Le raccourci au 25/09/2023 répondait avec 118 services complets, 30 dates manquantes et 13 603 ventes simulées, mais aucune comparaison faute de jours précédents suffisants. `SalesMetrics` évite maintenant la requête trop longue et affiche une explication ; `ImpactSummary` reste consultable. Une seconde vérification Chrome headless/CDP sur un `demo:local` tmpfs neuf a rendu 1 244 jours (01/05/2023–25/09/2026) à 1224×682 et 390×844 : indicateurs avec `role=status`, Impact chargé et simulations séparées (aucune donnée enregistrée, 5 026 lignes de ventes simulées exclues, 6 734 pertes simulées exclues, 100 431 unités de simulation). Les tableaux Impact ont une largeur interne minimale de 600 px, une aide mobile visible et restent dans une région défilante de 308 px ; AX expose la région « Comparaison des périodes », sa description, focusable, avec contour visible au focus. Captures inspectées et versionnées : [indicateurs bureau](evidence/q2-long-range-bilan/bilan-long-desktop.png), [impact bureau](evidence/q2-long-range-bilan/impact-long-desktop.png), [indicateurs mobile](evidence/q2-long-range-bilan/bilan-long-mobile.png), [impact mobile](evidence/q2-long-range-bilan/impact-long-mobile.png). | `npm run lint`, `npm run build`, `npm test` (26 fichiers/107 tests Vitest + 33 contrôles Node/CSS), `git diff --check` passent. Le runner tmpfs headless et son profil ont été arrêtés/supprimés ; le runner 53038 n'a pas été modifié. | CUA native reste `browsers: []` / `cgWindowNotFound`; le rendu est headless, pas un contrôle d'écran natif. Tab clavier du sélecteur, lecteur d'écran réel et états chargement/erreur/conflit ne sont pas prouvés. L'UI ne présente pas encore un tableau des KPI par mois sur les quatre années : la réconciliation mensuelle existe dans les tests/API, mais reste à rendre exploratoire dans le Bilan. Aucun tenant conservé touché. | Continuer Q2 (clavier natif si CUA revient et états non nominaux), puis rendre accessibles les KPI mensuels 2023–2026 sans lever les bornes API des listes de ventes ; garder le Goal ouvert. |
| 2026-09-25 | O2 / Q2 — réception partielle rendue | `ca1a0a4` | Sur `demo:local` tmpfs, commande démo 3 kg + facture manuelle liée 3 kg ; 2 kg reçus puis le formulaire a disparu à cause de `endsWith("received")`. Le correctif exact expose le reliquat, puis Entrée sur action atteinte par Tab enregistre 1 kg ; GET confirme commande `simulated_received`, facture `received`, deux réceptions, stock 25,2 kg et mouvements 3 525 inchangés. | Lint, build, `npm test -- --run` (26 fichiers/107 Vitest + 33 Node/CSS), diff-check ; quatre captures 320×840 sous `evidence/q2-partial-receipt/`. | Fixture entièrement synthétique ; saisie des champs automatisée, contrôle visuel headless/CDP. Pas de navigateur CUA, lecteur d'écran ou zoom natif. | Continuer la preuve UI C3/Histoire et les états clavier/accessibilité manquants. |
| 2026-09-25 | Q2 / C3 — filtres Histoire et source liée | — (Chrome headless/CDP, `demo:local` tmpfs) | Les fenêtres de juin 2023–2026 rendent respectivement 1 366/1 347/1 305/1 329 événements simulés. « Connu au » 15/06/2024 réduit juin 2024 de 1 347 à 652 événements, sans événement connu après la coupe ; une coupe future affiche une alerte sans nouvel appel timeline. Tab depuis les filtres atteint en quatre étapes le lien de la pièce source, focus visible ; Entrée ouvre l'archive déjà liée à la réception simulée. La pièce 408 montre le mouvement existant et interdit un nouveau crédit. À 320/768/1280 px, pas de débordement horizontal. | 38 GET espace, zéro écriture espace ; neuf captures inspectées sous `evidence/q2-history-trace/`. | Fixture synthétique/tmpfs. Headless/CDP uniquement malgré la page visible côté utilisateur ; aucun lecteur d'écran réel ni saisie clavier du dateur natif. La première vue dense a maintenant recherche et lots de 20 (preuve Q2 suivante) ; les périodes au-delà de la limite API et l’accessibilité assistive restent à vérifier. | C3/Q2 restent ouverts pour contrôle natif/technologie d'assistance et états non nominaux ; ne pas considérer cette preuve ciblée comme un parcours UI complet. |
| 2026-09-25 | Q2 — navigation Histoire dense | `efa944b` | Le composant React réel `Timeline` a été rendu via Vite/Chrome headless avec une réponse interceptée et entièrement synthétique de 1 366 événements. Vingt cartes s’affichent initialement ; Tab atteint « Afficher les 20 événements suivants » avec focus visible (contour 3 px), Entrée en montre 40. `CREME` trouve l’événement « Crème fraîche » malgré la casse et l’accent ; Effacer remet la première tranche et le focus au champ. Sur une recherche limitée à 41 entrées, le dernier lot retire le bouton et transfère le focus au statut. L’AXTree expose « Rechercher dans l’historique » comme `searchbox`. Pas de débordement à 320/768/1280 px ; input et boutons mesurent 44 px. | `npm run lint`, `npm run build`, `npm test -- --run` (27 fichiers/110 tests Vitest + 33 contrôles Node/CSS), `git diff --check`. Cinq captures inspectées sous `evidence/q2-history-browse/`. Aucun backend/DB appelé. | Réponse de test entièrement synthétique ; rendu headless/CDP, pas le Chrome natif, et aucun lecteur d’écran réel. | Q2/C3 restent ouverts : parcours complet par chapitre, lecteur d’écran, dateur au clavier et états non nominaux. |
| 2026-09-25 | Q2 — Bilan erreur, reprise et contenu long | — (Chrome headless/CDP, harnais temporaire) | Le composant réel `ImpactSummary` est rendu à 640 CSS px / DPR 2 avec une API interceptée : première réponse 503, puis succès. Tab atteint « Recharger le bilan », Entrée émet la seconde requête et le focus revient à `h2#impact-summary-title`. Sur la période sélectionnable du 01/10/2022 au 25/09/2026, 48 mois : Tab atteint la comparaison nommée (focus 3 px), Tab/Entrée ouvre la disclosure, Tab focalise la région AX nommée, puis → fait défiler `scrollLeft` de 0 à 401 px. La table fait 1 000 px dans une région de 535 px ; page 625 px de large pour un viewport de 640, hauteur 9 307 px. | AXTree expose `role=alert` et la région mensuelle. Captures inspectées : [503](evidence/q2-analytics/impact-error-640.png), [succès/focus rendu](evidence/q2-analytics/impact-recovered-640.png), [table gauche](evidence/q2-analytics/impact-long-640.png), [table après défilement](evidence/q2-analytics/impact-long-640-right.png). Harnais Vite/CDP et réponse entièrement synthétique ; ni API, tenant, ni bac démo consultés. DPR 2 à 640 CSS donne seulement une mise en page similaire à 200 % depuis 1280 px : ce n’est pas un zoom natif. | CUA ne contrôle toujours pas la fenêtre Chrome pourtant visible pour l’utilisateur ; pas de zoom natif, dateur vérifié, ni lecteur d’écran réel. Continuer avec `SOURCE_CHANGED` en zoom natif/technologie d’assistance puis les parcours clavier restants. |
| 2026-09-25 | Q2 — archive SOURCE_CHANGED au clavier | — (Chrome headless/CDP, réponses synthétiques) | `SourceInvoiceArchive` réel affiche le brouillon lié à la pièce fictive. Tab traverse Saisir, recherche, sélecteur natif, disclosure, puis « Reprendre le brouillon » ; Entrée émet un seul POST qui reçoit 409 `SOURCE_CHANGED`, suivi d’un GET du détail courant. Le prix synthétique se met à jour de 3,50 à 3,65 €, l’alerte avertit qu’aucune réception n’a été créée, le focus rejoint le titre rechargé et « Brouillon périmé » est désactivé. Aucun deuxième POST. | AXTree contient `role=alert`. À 640 CSS/DPR2, document/body/client = 640 px ; à 320 CSS/DPR2, document/body/client = 305 px dans le viewport de 320, sans débordement horizontal. Captures inspectées : [640](evidence/q2-source-changed-archive/source-changed-archive-640.png), [320](evidence/q2-source-changed-archive/source-changed-archive-320.png). `git diff --check` après consignation. | API, base et tenant non consultés ; données et réponses entièrement synthétiques. Chrome natif/lecteur d’écran restent non vérifiés (`browsers: []`, `cgWindowNotFound`). Poursuivre Q2 sur le zoom natif/AT et les parcours clavier restants. |

| 2026-09-25 | Audit schéma/migrations | `53ff478`, `adf5efe` | PostgreSQL 16 tmpfs neuf, migrations 18/18, puis `prisma migrate diff --from-url <base-jetable> --to-schema-datamodel prisma/schema.prisma --exit-code` et `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <shadow-tmpfs> --exit-code` : ajout des index déjà créés par les migrations (`StockMovement`/`SaleContribution`), mappage de trois noms tronqués et verrou fournisseur PostgreSQL. Les deux comparaisons finales sont vides. `npx prisma validate`, `npm run build:api`, `git diff --check`. | Aucun SQL de migration modifié ; les bases jetables ont été supprimées. | Reprendre le premier manque local non bloqué dans la matrice. |
| 2026-09-25 | R0 — parité Prisma intégrée à la recette | `0baebe6` | `npm run verify:local-delivery` : lint (37 CSS), builds web/API, migrations fraîches 18/18, diff Prisma/base (`No difference detected`), `npm test` (33 Node/CSS + 29 fichiers/119 Vitest), intégration PostgreSQL (26 fichiers/39 tests), dump/restauration synthétique et `migrate status` à jour. | PostgreSQL 16 loopback/tmpfs sans volume ; conteneur supprimé. Aucun compte, corpus ou service conservé utilisé. | Continuer Q2 rendu/clavier et garder natif/200 %/technologie d’assistance non revendiqués tant que la fenêtre CUA manque. |
| 2026-09-25 | Q1b/C3 — runner UI sans corpus | `bd8d60f`, `5435eb5` | `npm run demo:fixtures` amorce les seules fixtures synthétiques dans le PostgreSQL tmpfs ; `demo:local` reste inchangé. Un compte, 437 pièces/sources, 946 journées et 5 026 ventes simulées. Frontend React + API réels rendus dans Chrome headless/CDP à 390×844 : en juin 2023/24/25/26, 1 366/1 347/1 305/1 329 événements, 20 cartes initiales et source/production étiquetées ; largeur document = viewport. Bilan : 45 mois, aucune donnée enregistrée, 100 431 unités simulées, 5 026 ventes simulées exclues ; table interne 1 000 px dans une région de 293 px, sans débordement de page. | Captures inspectées : [2023](evidence/c3-fixture-ui/history-2023-390.png), [2024](evidence/c3-fixture-ui/history-2024-390.png), [2025](evidence/c3-fixture-ui/history-2025-390.png), [2026](evidence/c3-fixture-ui/history-2026-390.png), [Bilan — mai 2023](evidence/c3-fixture-ui/impact-may-2023-390.png). Lint, build web, 29 fichiers/119 tests Vitest + 33 contrôles Node/CSS, diff-check passent. Conteneur, ports, profil Chrome et mot de passe temporaire supprimés ; aucun autre bac touché. | Aucune transcription locale lue. CUA `browsers: []`/`cgWindowNotFound` persiste ; captures headless, non Chrome natif/lecteur d’écran. Parcours métier intégré en lecture seule ; les mutations restent couvertes par les tests API et preuves clavier distinctes. | Continuer uniquement les parcours UI encore manquants ; garder l’écran natif/technologie d’assistance comme limites ouvertes. |
| 2026-09-25 | Q2 — connexion responsive et clavier | `a5ee418`, `17aadfd` | Sur `/login`, le pied de formulaire coupait le lien à 320 px → lien maintenu entier ; le test narratif C3 aligne maintenant chaque ligne source 2024–26 sur son mouvement simulé lié, sans ligne/mouvement 2023. | Chrome 154 headless/CDP après splash : 320/390/768/1280/1440 px, document/body sans débordement, contrôles dans le viewport ; AX noms/roles corrects ; Tab Email → Mot de passe → Se connecter → Créer un compte, contour visible 3 px. Captures : [320](evidence/q2-login/login-320.png), [1440](evidence/q2-login/login-1440.png). `npm run lint` et `npm run verify:local-delivery` passent (18 migrations, diff Prisma vide, 33 Node/CSS, 119 tests, 26 fichiers/40 intégrations, dump/restore) ; `demoStory` passe. | Connexion seulement ; aucun essai d’identifiants ni mutation. CUA natif/IAB indisponibles ; pas de zoom natif à 200 % ni lecteur d’écran réel sur `/login`. Conteneurs et identifiants de cette passe tmpfs supprimés ; aucun autre runner touché. | Poursuivre les états Q2 hors nominaux et les parcours encore absents ; réserver le rendu natif/AT aux fenêtres effectivement contrôlables. |

| 2026-09-25 | O2 — sorties estimées depuis réceptions partielles | `d56fa89` | `purchaseSuggestions.integration.test.ts` vérifie les reçus de 2 puis 1 kg, la recette compatible et les estimations 90/10 distinctes ; ventes/mouvements restent inchangés et le reçu simulé n'est pas estimé. `restaurantSimulationPlan.test.ts` vérifie la couverture de chaque mois et des jours de service 2023–2026. | Intégration O2 ciblée 1/1 sur PostgreSQL tmpfs ; tests purs 2/2 ; lint, builds web/API, npm test (119 + 33) passent. Le R0 antérieur a échoué à 37/40 ; le suivant a passé 40/40 et restauré la base synthétique. | Poursuivre les parcours Q2 encore ouverts ; garder visible que les montants sont estimés et non observés. |
| 2026-09-25 | Sorties estimées — recette multi-ingrédients | `4b84685` | `ingredientOutflowEstimate.integration.test.ts` relie farine, tomates, mozzarella et huile reçues séparément à Pizza Margherita datée ; chaque entrée donne une ligne d'estimation selon le dosage/rendement. Une réception simulée n'est pas estimée, aucune vente/mouvement n'est créé, l'isolation par compte et la fenêtre cinq ans restent vérifiées. | R0 vert sur PostgreSQL 16 tmpfs : lint, builds web/API, migrations 18/18, diff Prisma vide, 119 Vitest + 33 Node/CSS, 26 fichiers/40 intégrations et sauvegarde/restauration ; suppression auto du conteneur. | Continuer les parcours C3/Q2 encore ouverts ; conserver les estimations à part des opérations enregistrées. |

### Q2 — Réconciliation mensuelle du Bilan (2026-09-25)

`645bcd7` ajoute `monthly=true` en opt-in sur `/workspace/impact`, limité à 48 mois calendaires ; le JSON par défaut et les bornes des endpoints de ventes ne changent pas. Le service réutilise les lectures déjà scoppées au restaurant et les règles de provenance existantes, puis projette des buckets mensuels compacts. L’UI affiche une disclosure de 2 à 48 mois avec dates de début/fin ajustées, ventes, services renseignés, pertes déclarées et réceptions, chaque indicateur distinguant enregistré et simulation ; un zéro de vente n’est confirmé que si un service est complet. Au-delà de 48 mois, un statut invite à réduire la période.

`scenarioFixture.integration.test.ts` compare les 48 lignes de 2023–2026 au calcul mensuel indépendant et aux opérations de la fixture ; `impact.integration.test.ts` accepte 48 mois et refuse 49. `npm run verify:local-delivery` a passé sur PostgreSQL jetable tmpfs (18 migrations, 25 fichiers/37 tests d’intégration et restauration synthétique). Après les derniers ajustements UI, `npm run lint`, `npm run build`, `npm run build:api`, `npm test` (26 fichiers/107 tests Vitest et 33 contrôles Node/CSS) et `git diff --check` passent.

Rendu headless/CDP du composant React réel via un harnais Vite temporaire et une réponse **entièrement synthétique**, sans base ni tenant : 45 mois du 01/01/2023 au 25/09/2026 à 1440, 768, 390 et 320 px, sans débordement de page ; la table de 1000 px défile dans sa propre région. Captures inspectées : [bureau](evidence/q2-monthly-impact/impact-monthly-desktop.png), [tablette](evidence/q2-monthly-impact/impact-monthly-tablet.png), [mobile](evidence/q2-monthly-impact/impact-monthly-mobile.png), [étroit](evidence/q2-monthly-impact/impact-monthly-narrow.png). CDP confirme la disclosure par Espace, Tab jusqu’à la région, focus visible (contour 3 px), flèche droite (219 px défilés à 390 px), et AX `region` nommée/décrite/focusable. Ce rendu ne constitue ni une lecture des données de démo réelles, ni une validation par lecteur d’écran.

**Limite d’outil / périmètre :** CUA native expose toujours `browsers: []` et `getApp("Google Chrome")` échoue `cgWindowNotFound` ; le port isolé 56819 annoncé visible n’avait pas de listener lors du contrôle en lecture seule. Un essai headless a aussi ciblé par erreur le port 52790, précédemment écarté comme non isolé : l’authentification a été rejetée et est restée sur `/login` ; aucune session métier ni écriture n’a eu lieu, ce port n’a pas été réutilisé, et le runner 53038 est resté intact. Le contrôle natif/CUA, le lecteur d’écran réel et les autres états non nominaux restent ouverts ; poursuivre Q2 sans clore le Goal.

### Q2 — reprise du Bilan, erreur et chargement (2026-09-25)

`bd3b91e` porte le bouton « Recharger le bilan » à 44 px minimum. Rendu headless/CDP à 320 px sur `ImpactSummary` réel avec un GET 503 puis un GET réussi **synthétiques** : l’alerte d’erreur reste distincte du chargement et du vide, Tab atteint le bouton (44 px, contour 3 px), Espace relance le GET, l’état « Calcul de l’impact… » apparaît, puis le focus revient au titre après succès. `documentElement.scrollWidth` reste à 320 px. Captures inspectées : [erreur](evidence/q2-impact-retry/impact-error-320.png), [chargement](evidence/q2-impact-retry/impact-retry-loading-320.png), [succès et focus rendu](evidence/q2-impact-retry/impact-retry-success-320.png). Le harnais intercepte uniquement la route Impact ; aucun tenant ni backend n’est consulté. `npm run lint`, `npm run build` et `git diff --check` passent.

Le rendu d’erreur/reprise est prouvé sur fixture synthétique, pas sur écran natif ni au lecteur d’écran. La matrice Q2 et le Goal restent ouverts.

`0fe225a` renforce la preuve API : le plafond de 48 mois est exercé avec les deux mois de bord partiels (15–31 janvier 2020, 17 jours ; 1–15 décembre 2023, 15 jours), et le parcours C3 vérifie la réception simulée non nulle dans son mois (compte 1, coût rapproché du prix × quantité). `npm run verify:local-delivery` repasse sur PostgreSQL tmpfs : lint, builds web/API, 18 migrations, 33 contrôles Node/CSS, 107 tests Vitest, 25 fichiers/37 tests d’intégration et dump/restore synthétique. `git diff --check` passe ; aucun tenant conservé touché.

Après confirmation utilisateur que `/login` apparaît sur le port isolé 56819, `cua.getState()` voit Chrome comme application mais garde `browsers: []`, et `getApp("Google Chrome")` échoue encore `cgWindowNotFound`. Cette ouverture ne donne donc pas accès à un onglet contrôlable. Les nouvelles captures ci-dessous viennent d’un Chrome headless/CDP distinct sur un tenant démo jetable, pas du navigateur natif ni de données terrain ; elles ne remplacent ni le contrôle CUA natif ni un lecteur d’écran. Aucun accès au runner métier 53038 n’a été fait.

### Q2 — Bilan réel sur fixture `demo:local` jetable (2026-09-25)

Un `npm run demo:local` neuf a créé son compte synthétique, sa base PostgreSQL tmpfs sans volume et sa fixture 2023–2026. Dans Chrome 154 headless/CDP séparé, la route `/analytics` a chargé son vrai backend ; la période réglée du 01/01/2023 au 25/09/2026 a déclenché `GET /api/workspace/impact?from=2023-01-01&to=2026-09-25&monthly=true` et rendu 45 lignes. Le message ventes indique explicitement que sa fenêtre est limitée à environ un an tout en gardant Impact disponible ; le bilan précise qu’aucune donnée opérationnelle n’est mesurable et sépare les opérations simulées.

À 320, 768 et 1440 px, `documentElement.scrollWidth` est exactement égal au viewport. La table de 1000 px défile dans sa région (largeurs mesurées 238/657 px à 320/768 ; elle tient dans 1029 px à 1440). La disclosure s’ouvre par Espace après focus explicite ; la flèche droite défile effectivement la région (0 → 354 px). L’arbre d’accessibilité expose la région nommée « Réconciliation mensuelle des indicateurs opérationnels ». Captures inspectées : [table mobile 320](evidence/q2-monthly-impact/impact-demo-live-fixture-320.png), [table tablette 768](evidence/q2-monthly-impact/impact-demo-live-fixture-768.png), [table bureau 1440](evidence/q2-monthly-impact/impact-demo-live-fixture-1440.png).

**Limite de preuve :** dates sélectionnées par script DOM, et focus posé programmatiquement avant Espace/flèche ; le déplacement Tab depuis le document n’est donc pas prouvé dans cette passe. Pas d’écran Chrome natif, de lecteur d’écran réel, de mutation métier ou de données terrain. La session headless, le runner temporaire, son conteneur, ses identifiants et son port DevTools ont été arrêtés/supprimés ; les ports/runner préexistants n’ont pas été utilisés.

### Q2 — vérification du comptage de stock sur `demo:local` isolé (2026-09-25)

Dans un nouveau runner `demo:local` PostgreSQL tmpfs, l’interface `/stocks` a chargé 18 produits. La fiche Parmesan (5.04 kg théoriques, aucun comptage) rappelle que le seuil est indicatif et qu’il faut compter avant de décider d’un réassort. À 320 px, la boîte nommée « Compter Parmesan » expose le stock théorique, une date serveur Europe/Paris, le label de quantité, et les bornes 0–1 000 000 avec pas 0,001. Un comptage égal à 5.04 kg a reçu HTTP 201 ; après rechargement, la carte affiche « Compté : 5.04 kg », la fiche « Compté · inchangé depuis » et aucun mouvement depuis le comptage. Le stock théorique n’a pas changé. Échap ferme la modale sans enregistrer ; Entrée depuis le champ de quantité focalisé valide un second comptage identique, toujours sans mouvement.

Aux viewports 320/768/1440 px, `documentElement.scrollWidth === innerWidth` ; cartes visibles à 320/768, table à 1440. La modale fait 294 px dans le viewport 320 px. Captures inspectées : [fiche avant comptage](evidence/q2-stock-verification/stock-verification-drawer-320.png), [modale](evidence/q2-stock-verification/stock-count-modal-320.png), [carte persistée après rechargement](evidence/q2-stock-verification/stock-counted-card-320.png).

**Limite de preuve :** compte et données synthétiques dans un bac jetable, quantité volontairement identique au théorique ; aucun mouvement ni tenant conservé touché. Chrome 154 headless/CDP utilisé car CUA expose encore `browsers: []` malgré la page native annoncée visible sur 56819 ; ni cette page ni le runner 53038 n’ont été utilisés. Le focus a été posé programmatiquement avant Entrée ; Tab depuis le document, lecteur d’écran et contrôle Chrome natif restent à vérifier. Runner, conteneur, ports, identifiants et profil temporaire ont été supprimés après la revue.

### Q2 — fiche produit D1 et conflit de révision (2026-09-25)

Dans un nouveau runner `demo:local` PostgreSQL tmpfs, deux onglets ont chargé la fiche synthétique Basilic Frais à la même révision serveur. Le dialogue « Modifier Basilic Frais » est nommé et, à 320 px, garde ses champs dans le viewport ; nom, catégorie, fournisseur, seuil et prix sont étiquetés, avec pas/bornes sur le seuil. Aucune entrée d’unité n’est proposée et le texte explique son immutabilité. Le premier onglet enregistre 0.16 kg par `PATCH` 200. Le second, resté sur la révision précédente, tente 0.17 kg : `PATCH` 409, le dialogue reste ouvert et annonce « La fiche produit a changé. Rechargez-la avant de réessayer. » Après rechargement, la carte garde le gagnant 0.16 kg, pas 0.17 kg, avec le stock théorique à 0.016 kg. Captures inspectées : [dialogue d’édition](evidence/q2-product-edit/product-edit-modal-320.png), [conflit explicite](evidence/q2-product-edit/product-edit-conflict-320.png), [valeur gagnante rechargée](evidence/q2-product-edit/product-edit-persisted-320.png).

Aux viewports 320/768/1440 px, `documentElement.scrollWidth === innerWidth` ; cartes aux deux largeurs étroites, table à 1440. Le dialogue tient dans le viewport à 768 et 1440 px (largeurs internes 718 et 598 px). Entrée est vérifiée après focus programmatique et mise à jour de la valeur contrôlée ; Tab depuis le document et activation au vrai clavier restent à prouver. Données uniquement synthétiques/tmpfs ; aucun prix, stock, autre tenant ou espace conservé n’a été modifié. CUA ne fournit toujours aucun onglet contrôlable et aucun lecteur d’écran n’a été utilisé.

### Q2 — recette et production D3 (2026-09-25)

Dans le runner `demo:local` PostgreSQL tmpfs neuf, le formulaire a créé `Q2 démo jetable — recette` en version 1, effet 25/09/2026, rendement 2 portions et 0,2 kg de tomates par lot. L’éditeur de Pizza Margherita a ensuite produit V3 à effet 25/09/2026 et rendement 4 ; V2 (effet 03/05/2023, rendement 1) reste dans l’historique. Le journal contient une production antérieure de 24 portions au 23/09, toujours attachée à V2/rendement 1, puis la nouvelle production de 2 portions au 25/09 attachée à V3/rendement 4.

La validation UI a reçu `POST /api/workspace/productions` 201 (5 027→5 028 entrées). Les soldes ont varié conformément au rendement V3 : farine 2,200→2,100 kg, tomates 25,200→25,150 kg, mozzarella 3,630→3,570 kg et huile 1,490→1,480 L. Le correctif responsive empile le sélecteur et son maximum à 320 px (champ 222 px au lieu de 22 px) ; les largeurs 320/768/1440 gardent `documentElement.scrollWidth === innerWidth`. Le rendu a révélé puis corrigé le retour intempestif de l’onglet « Produites cette semaine » vers l’onglet réalisable. Espace active le bouton d’onglet et le bouton de production ; la boîte de dialogue nommée boucle Tab, se ferme avec Échap et rend le focus à son déclencheur. Captures inspectées : [formulaire de création](evidence/q2-recipes/recipe-create-form-320.png), [éditeur](evidence/q2-recipes/recipe-edit-form-320.png), [rendement V3](evidence/q2-recipes/recipe-edit-yield-320.png), [confirmation de production](evidence/q2-recipes/production-confirm-320.png), [journal V3](evidence/q2-recipes/production-journal-new-320.png), [production historique V2](evidence/q2-recipes/production-journal-prior-320.png).

`npm run lint`, `npm run build`, `npm test` (26 fichiers/107 tests Vitest + 33 contrôles Node/CSS) et `git diff --check` passent. La revue a utilisé Chrome headless/CDP car CUA conserve `browsers: []`; aucun lecteur d’écran réel ni zoom natif n’a été vérifié. La création et la production sont synthétiques, temporaires et isolées ; aucun tenant conservé n’a été touché.

### Q2 — calendrier de service D4 (2026-09-25)

Dans le bac `demo:local` PostgreSQL tmpfs, la journée du 25/09/2026 était absente du calendrier (`GET /api/workspace/sales/service-days` → `[]`), donc affichée inconnue plutôt que nulle. Enregistrée fermée, elle devient « Pas de service » et sa couverture complète est imposée/désactivée (`PUT` 200, révision 1). Réouverte avec couverture partielle, la sauvegarde suivante (`PUT` 200, révision 2) affiche `0 ligne(s)` mais précise que les absences restent inconnues ; seule une couverture complète autorise « 0 observé ».

À 320/768/1440 px, le document reste à la largeur du viewport (tableau interne 401 px dans une région de 238 px à 320 ; il tient à 768/1440). Tab depuis la sauvegarde focalise la région nommée du calendrier ; ←/→ déplacent son défilement sans perdre le focus. Captures inspectées : [jour manquant](evidence/q2-service-calendar/service-calendar-missing-320.png), [fermeture et couverture contrainte](evidence/q2-service-calendar/service-calendar-closed-form-320.png), [jour ouvert partiel, début de table](evidence/q2-service-calendar/service-calendar-open-partial-left-320.png), [même table défilée à droite](evidence/q2-service-calendar/service-calendar-open-partial-right-320.png).

`npm run lint`, `npm run build`, `npm test` (26 fichiers/107 tests Vitest + 33 contrôles Node/CSS) et `git diff --check` passent. CUA voit l’application Chrome mais retourne toujours `browsers: []`, et `getApp("Google Chrome")` échoue `cgWindowNotFound` malgré la page de connexion visible signalée ; le rendu vient donc de Chrome headless/CDP. Pas de lecteur d’écran réel ni de zoom natif. Données synthétiques/tmpfs seulement ; aucun tenant conservé n’a été modifié.

### Q2 — import CSV et réconciliation D5 (2026-09-25)

Dans le même tenant `demo:local` PostgreSQL tmpfs, un CSV fictif de cinq lignes a été prévisualisé à 320 px. L’article n’est jamais associé implicitement : après mappage/création, l’aperçu distingue une vente existante (24 unités face à un apport de 21), deux lignes prêtes, une quantité nulle invalide et un doublon interne au fichier. La page reste à 320 px ; le tableau occupe une région de 238 px avec 670 px de contenu. La région reçoit le focus visible et ←/→ défilent de 0 à 178 puis reviennent à 0. L’aide visible annonce ces touches.

Tab depuis la première correspondance atteint le bouton d’association puis le bouton d’import ; Espace active chacun. L’import accepte deux ventes du 25/09 (Pizza Reine : 3 ; Plat Q2 temporaire : 2), maintient la Margherita à 24, et enregistre le conflit en attente plus les deux lignes rejetées avec empreinte CSV/numéro de ligne. Dans « Réconciliation et provenance », Tab depuis le motif passe par « Remplacer » puis « Garder » ; Espace garde la vente existante. La contribution devient rejetée avec les événements `conflict_detected` puis `rejected` et le motif synthétique ; la vente 24 reste inchangée, aucune carte ne reste en attente. La disclosure d’historique s’ouvre par Espace et le focus demeure visible. Captures inspectées : [import et résultats à 320 px](evidence/q2-sales-reconciliation/sales-csv-imported-320.png), [conflit avant décision à 320 px](evidence/q2-sales-reconciliation/sales-csv-conflict-pending-320.png).

`npm run lint`, `npm run build`, `npm test` (26 fichiers/107 tests Vitest + 33 contrôles Node/CSS) et `git diff --check` passent. La page de connexion native est déclarée visible, mais CUA garde `browsers: []` et `getApp("Google Chrome")` échoue `cgWindowNotFound` ; preuve issue de Chrome headless/CDP. Pas de lecteur d’écran réel, zoom natif ni essais à 768/1440 pour cette tranche. Seul le bac synthétique/tmpfs a été modifié ; l’adaptateur POS/Ticket Z n’est pas activé.

### Q2 — correspondance article vendu/recette D6 (2026-09-25)

Dans le même tenant `demo:local` tmpfs, Pizza Margherita — démonstration n’avait encore aucune correspondance active. Le formulaire propose « Pizza Margherita » après retrait du suffixe de démonstration et demande de vérifier la suggestion ; la version recette V3, datée du 25/09/2026, existe. À 320 px, les champs Article vendu, Recette proposée, Portions par article vendu (1), Date d’effet et le bouton restent visibles sans débordement (section 288 px dans une page de 320 px).

Depuis le sélecteur d’article, Tab parcourt recette, portions, date (contrôle natif) puis le bouton avec focus visible ; Espace valide. `POST /api/workspace/sales/recipe-mappings` répond 201, puis `GET` 200 montre une correspondance active, révision 1, au 25/09/2026, une portion par article. Le texte confirme qu’une association sert à une estimation et ne crée ni production ni mouvement. Largeurs 320/768/1440 : page et contenu principal restent à la largeur du viewport. Captures inspectées : [suggestion avant validation](evidence/q2-sale-recipe-mapping/sale-recipe-suggestion-320.png), [correspondance active](evidence/q2-sale-recipe-mapping/sale-recipe-mapping-active-320.png).

La revue emploie Chrome headless/CDP : la page de connexion visible signalée ne rend pas l'onglet pilotable par CUA (`browsers: []`, `cgWindowNotFound`). Pas de lecteur d'écran réel ni de zoom natif. La fixture et la correspondance sont synthétiques/tmpfs ; aucune production, commande ou donnée conservée n’a été modifiée.

### Q2 — revue rendue/clavier de la pièce source C1 (2026-09-25)

Dans le tenant `demo:local` PostgreSQL tmpfs, l'archive Achats expose la pièce explicitement fictive « EXEMPLE FICTIF — produits laitiers » (une ligne de crème fraîche, 6 L, 4,50 €). La commande « Créer un brouillon corrigible » ouvre une modale liée à la source ; le brouillon reste au statut `draft` avec une ligne, sans réception ni mouvement de stock/production. À 320×750 px, la modale nommée « Revoir une facture » mesure 296 px de large dans une page de 320 px ; son contenu défile verticalement et le focus initial visible reste dans la boîte. Le piège Tab/Shift+Tab boucle entre ses 14 contrôles ; une pression Tab après placement du focus hors de la boîte est récupérée vers le premier contrôle ; Échap ferme la modale et rend le focus visible au bouton déclencheur. Captures inspectées : [modale de brouillon liée à la source à 320 px](evidence/q2-source-invoice/source-invoice-draft-320.png).

La même modale avait été mesurée à 720 px dans le viewport de 768 px et 800 px dans celui de 1440 px, sans débordement horizontal de page. Revue réalisée par Chrome headless/CDP, car le connecteur CUA continue de retourner `browsers: []` malgré la page native signalée visible. Pas de lecteur d'écran réel ni de zoom natif ; le contrôle de sortie de focus a utilisé un focus extérieur posé par script avant Tab. Fixture entièrement synthétique/tmpfs, brouillon non reçu et aucun tenant conservé touché.

L’échec réseau simulé des GET liste/détail à 320 px affiche deux alertes de lecture et ne se transforme pas en archive vide (`documentElement.scrollWidth` reste à 320 px). « Recharger les pièces » reçoit le focus visible après placement programmatique ; Espace émet un nouveau GET, laisse l’erreur visible et conserve le bouton de reprise. Une fois l’interception retirée, l’archive recharge 434 pièces et le brouillon lié reste visible. Capture inspectée : [alertes archive/détail avec focus sur la reprise à 320 px](evidence/q2-invoice-recovery/archive-error-mobile-320.png). Le Tab naturel jusqu’au bouton d’erreur n’a pas été démontré dans cette passe. Le CDP utilisé ne déclenche pas le clic natif d’un bouton HTML de contrôle avec Entrée (Espace le déclenche) ; l’activation Entrée de ces boutons reste donc non vérifiée faute d’accès CUA natif.

`npm run lint`, `npm run build`, `npm test` (26 fichiers/107 tests Vitest + 33 contrôles Node/CSS) et `git diff --check` passent après le correctif du focus initial et du piège clavier de `Modal`.

### Q2 — original PDF I4 ouvert depuis Achats (2026-09-25)

Dans le même runner `demo:local` tmpfs, le bouton « Essayer la fixture fictive » relit le PDF public synthétique et l’archive atteint 434 pièces. La candidate « Facture DEMO-2026-09-01 » reste marquée comme démonstration, avec une seule ligne et zéro mouvement lié ; aucun brouillon n’a été reçu. À 320 px, la page Achats ne déborde pas horizontalement. Tab atteint le lien nommé « Consulter l’original fictif (PDF) » avec focus visible ; Entrée l’ouvre dans un onglet `blob:` séparé. Captures : [archive et lien à 320 px](evidence/q2-invoice-original/invoice-archive-original-link-320.png), [PDF à 320 px](evidence/q2-invoice-original/invoice-original-pdf-320.png).

Un échec réseau simulé du `POST /workspace/invoice-extractions` à 320 px affiche une alerte sans nouvel enregistrement : l’archive reste à 434 pièces, la pièce sélectionnée garde son brouillon sans mouvement et le lien Blob vers l’original fictif reste disponible. Pendant le POST, le bouton garde le focus visible avec `aria-disabled=true` tout en restant DOM-focusable ; après l’échec, son libellé revient, l’alerte reste et le focus visible est conservé. Espace déclenche cette action après focus programmatique. Captures inspectées : [état de lecture](evidence/q2-invoice-recovery/extraction-loading-mobile-320.png), [échec et repli](evidence/q2-invoice-recovery/extraction-error-mobile-320.png). Après retrait de l’interception, l’état normal et les 434 pièces sont rechargés.

Après ce correctif, `npm run lint`, `npm run build`, `npm test` (26 fichiers/107 tests Vitest + 33 contrôles Node/CSS) et `git diff --check` passent.

Le visualiseur Chrome natif affiche une page de PDF. À 320 px et 768 px, le réglage initial 100 % montre une barre de défilement horizontal interne ; à 768 px, masquer les vignettes puis réduire à 90 % rend toute la page visible ; à 1440 px, elle tient à 100 %. Captures inspectées : [100 % avec vignettes à 768 px](evidence/q2-invoice-original/invoice-original-pdf-100-768.png), [100 % sans vignettes](evidence/q2-invoice-original/invoice-original-pdf-sidebar-closed-768.png), [90 % ajusté à 768 px](evidence/q2-invoice-original/invoice-original-pdf-zoom-90-768.png), [100 % à 1440 px](evidence/q2-invoice-original/invoice-original-pdf-1440.png).

Cette navigation prouve le lien et son ouverture au clavier, pas les commandes internes du lecteur PDF : l’arbre AX CDP de cet onglet ne renvoie aucun contrôle, CUA ne contrôle toujours aucun onglet, et aucun lecteur d’écran réel n’est disponible pour la passe. La comparaison côte à côte avec les lignes transcrites n’existe pas dans ce parcours (le PDF s’ouvre dans un onglet distinct) et reste à revoir. Le PDF, sa candidate et l’archive appartiennent uniquement au scénario explicitement fictif/tmpfs ; aucune réception ni donnée conservée n’a été créée.

### Q2 — tentative de rendu Connexions (2026-09-25)

Reprise sur `main`, arbre propre à `7b75bab`, sans migration ni changement de code. L’utilisateur a confirmé voir une page de connexion locale, sans rattachement observable de cet onglet à notre session ; de notre côté, le runner isolé courant sert `/login` sur `127.0.0.1:57615`. Le connecteur CUA retourne toujours `browsers: []`, `getApp("Google Chrome")` et `getApp("com.google.Chrome")` échouent `cgWindowNotFound`, et l’IAB répond « Browser is not available ». Le port CDP isolé `57800` accepte la connexion TCP mais ne répond pas à `GET /json/list` avant expiration. Aucune capture, mesure de largeur, inspection AX ou interaction clavier de Connexions n’a donc été réalisée dans cette reprise ; la page et son parcours restent non prouvés. Aucun geste métier, fichier de données ou tenant conservé n’a été touché.

**Suite :** rétablir un onglet contrôlable du bac isolé puis refaire Connexions à 320/768/1440 px et au clavier. Ne pas clore Q2 sur le seul rendu statique ou la page de connexion visible côté utilisateur.

## Portes externes

| Sujet | Ce qui est possible sans accès | Preuve requise pour « activé » | État |
| --- | --- | --- | --- |
| POS | Port, fixtures, mapping, repli manuel | Contrat/droits et tests fournisseur/pilote | À confirmer |
| OCR de nouveaux documents | Revue des transcriptions existantes, flux candidat | Prestataire, sécurité, conservation, consentement et évaluation | À confirmer |
| Météo/événements | Contrat et comparaison sur fixtures | Position confirmée, accès et gain évalué | À confirmer |
| Précision/gain réel | Calculs/backtests reproductibles | Historique pilote qualifié et mesure comparée | À confirmer |
| Envoi/EDI, conformité | Fiche à transmettre, export opérationnel | Destinataire/accord ou obligations vérifiées | À confirmer |
| Préproduction/publication | Environnement isolé, smoke tests jetables | API/DB/backup/cookies/accès vérifiés, approbation de publication | À confirmer |

## Critique indépendante et dette restante

Noter ici les retours des sous-agents/relecteurs : constat, gravité, preuve,
responsable, correction et nouveau test. Une remarque importante non résolue
empêche de marquer le parcours concerné comme terminé. Les tickets externes
restent distincts des défauts locaux corrigeables.

- **Pièces → idées de recette — lien technique réel, validité métier restante** :
  le seed local sélectionne maintenant des lignes directement compatibles parmi
  les transcriptions suivies et relie deux candidates à six pièces (`1f12c0a`).
  Cette liaison est limitée à `demo:local`/tmpfs ; tests et captures gardent les
  fixtures synthétiques. Le flux prouve la traçabilité et la neutralité de stock,
  pas l'exactitude d'une transcription, une recette préparée ni une provenance
  fournisseur vérifiée : les originaux n'ont pas été ouverts. L'audit de
  sensibilité et droit d'usage avant partage reste ouvert. M2 demeure distinct,
  fondé sur un surplus explicitement compté. Aucun plat n'est inféré de la seule
  présence d'ingrédients.

- **Q1b — isolation des données de test (corrigée localement)** :
  `sourceInvoices.test.ts` utilise maintenant un répertoire temporaire de textes
  synthétiques ; `restaurantSimulationPlan.test.ts` utilise un corpus généré
  sans pièces fournisseur. Le workflow sparse-checkout exclut
  `données restaurants/factures/**`. Revue : le premier test d'intégration ne
  rejouait que le calcul pur, et son libellé « restaure » surestimait une
  suppression en cascade ; corrigé par un helper idempotent de fixture (rejeu
  séquentiel et concurrent) et un libellé exact. Il ne prouve pas l'idempotence
  de production C1. L'exécution GitHub n'a pas été déclenchée ; le résultat
  local ne prouve pas le comportement du runner distant.

## Avancée technique — provenance du bac démo (2026-09-25)

La lecture de la chronologie classait encore comme « enregistrés » les
mouvements de stock et déclarations de production créés par le restaurateur
dans un espace `demo`, car ces écritures portent son identité et non l'acteur de
simulation du seed. Le mapper reçoit maintenant le mode du workspace : ces
événements sont explicitement simulés, et leurs libellés/qualificatifs indiquent
qu'ils ne décrivent pas une production ou un stock réel. Le comportement
opérationnel reste inchangé ; le comptage simulé garde la précision « non
observé ».

La régression C3 couvre un ajustement manuel et une déclaration de production
dans un tenant démo isolé. Vérification finale : `npm run verify:local-delivery`
réussit (lint, build web/API, migrations fraîches, 107 tests unitaires, 37 tests
d'intégration, sauvegarde/restauration synthétique) dans PostgreSQL jetable en
tmpfs, supprimé à la fin. Une première passe a détecté puis conduit à préserver
les libellés précis du comptage et du refus synthétiques ; la suite complète a
ensuite passé. Aucun tenant conservé ni document source réel n'a été utilisé.

Q2 Connexions reste ouvert : l'utilisateur a confirmé voir la page login
locale, mais CUA continue de retourner `browsers: []` ; `getApp("Google
Chrome")` échoue `cgWindowNotFound` et `createBrowserTab("chrome", …)` répond
`Browser is not available`. Aucun rendu, responsive ou parcours clavier de
Connexions n'a été observé dans cette reprise.

### Reprise de Connexions — état de nouvelle tentative

Le bouton de reprise reste maintenant monté pendant les chargements, expose
l'état occupé et protège contre un second déclenchement ; une région `status`
annonce le chargement puis le résultat. Ainsi, le focus clavier ne disparaît
plus quand la liste ou l'alerte remplace l'état précédent. Validation code :
`npm run lint`, `npm run build`, `npm test` (107 tests) et `git diff --check`
passent. L'inspection de la page rendue et le parcours clavier réel restent
non vérifiés, CUA ne pouvant toujours pas s'attacher à Chrome.

### Candidate confirmée — retour vers la pièce source

La fiche candidate confirmée reste conservée avec son hash, sa révision et ses
lignes de preuve. Son résumé recette propose maintenant un lien explicite vers
Achats, qui ouvre la pièce et sa section d'archive ; la régression d'intégration
vérifie que ces éléments source restent exposés après confirmation. La recette
`npm run verify:local-delivery` a réussi sur nouveau PostgreSQL tmpfs : 107 tests
unitaires, 37 tests d'intégration et sauvegarde/restauration synthétique. Une
première passe avait eu un `socket hang up` isolé dans SalesMetrics ; la
répétition complète a passé. Le rendu du lien n'a pas été observé faute d'accès
browser CUA.

### Q2 — Connexions : rendu, responsive et clavier (2026-09-25)

Dans un nouveau `demo:local` (PostgreSQL tmpfs, loopback, profil Chromium privé),
`/settings?section=connections` a été rendu après disparition du splash. À
320/375/640/768/1280 px, `documentElement` et `body` restent exactement à la
largeur du viewport ; les quatre onglets gardent leur libellé, les cinq sources
synthétiques sont présentes et affichées « Non connecté ». Captures inspectées :
[320 px](evidence/q2-connections/connections-320.png),
[375 px](evidence/q2-connections/connections-375.png),
[640 CSS px](evidence/q2-connections/connections-640-css-viewport.png),
[768 px](evidence/q2-connections/connections-768.png) et
[1280 px](evidence/q2-connections/connections-1280.png). La largeur de 640 CSS
px est un contrôle de reflow seulement, pas un zoom navigateur à 200 %.

Depuis Restaurant (focus placé au démarrage du test), Tab atteint
Fournisseurs, Connexions, Compte puis « Actualiser l’état » ; les cibles
exposent `:focus-visible` et le focus se voit sur la capture
[clavier à 320 px](evidence/q2-connections/connections-keyboard-focus-320.png).
Entrée lance un seul GET de sources malgré une seconde activation durant le
chargement ; le bouton reste focalisé et annonce `aria-disabled=true`.
Une réponse 503 ciblée sur ce GET expose une alerte et « Réessayer », en gardant
le focus ; après retrait de l’interception, Entrée relance le GET et l’état
« à jour » revient. Captures des états
[chargement](evidence/q2-connections/connections-loading-320.png) et
[erreur/reprise](evidence/q2-connections/connections-error-320.png). L’AXTree
expose neuf boutons/liens nommés ; le rôle `status` est également présent.

Aucune écriture métier : authentification de démonstration uniquement, GET des
sources et un GET intercepté en 503 ; le runner et ses identifiants tmpfs ont
été supprimés après la revue. CUA continue de lister `browsers: []`, malgré la
page visible dans Chrome côté utilisateur : ces observations sont headless/CDP,
pas une revue dans la fenêtre native. Le zoom navigateur natif à 200 % et un
lecteur d’écran réel restent à faire ; Q2 et le Goal restent ouverts.

### Q2 / O2 — réception partielle en UI (2026-09-25)

Dans le bac `demo:local` PostgreSQL tmpfs, l'UI a créé une commande simulée de
3 kg, un brouillon de facture manuelle lié (3 kg, 2,50 €/kg contre 2,25 €/kg
commandé), puis rapproché une première livraison de 2 kg avec motif explicite
d'écart. Ce premier rendu a révélé que `status.endsWith("received")` retirait
aussi le formulaire pour `simulated_partially_received`, empêchant la seconde
livraison. `OrderHistory` ne masque maintenant le formulaire que pour les deux
états terminaux exacts (`received`, `simulated_received`). Le rejeu depuis ce
reliquat a ensuite enregistré le dernier kilogramme : commande
`simulated_received`, facture `received`, deux bons de livraison distincts et
reliquat nul. Le stock est resté à 25,2 kg et l'historique des mouvements à
3 525 avant/après le second enregistrement ; le contrôle du premier partiel
avait également confirmé stock et mouvements inchangés.

À 320×840 CSS px, les captures montrent le premier rapprochement, le formulaire
du reliquat et l'état final ([formulaire partiel](evidence/q2-partial-receipt/receipt-partial-review-320.png),
[après 2 kg](evidence/q2-partial-receipt/receipt-partial-saved-320.png),
[reliquat 1 kg](evidence/q2-partial-receipt/receipt-final-review-320.png),
[terminé](evidence/q2-partial-receipt/receipt-complete-320.png)). Le document
et le body font 320 px, sans débordement horizontal. Tab atteint chacun des
boutons de validation (22 étapes sur le second rapprochement), avec
`:focus-visible`, puis Entrée enregistre ; les champs de formulaire ont été
préremplis par le harnais, donc la saisie complète exclusivement clavier
n'est pas revendiquée. Vérification visuelle headless/CDP uniquement : CUA
reste indisponible, sans revue native à 200 % ni lecteur d'écran réel. Runner,
session navigateur et identifiants tmpfs supprimés après la revue.

### Q2 / C3 — filtres Histoire et source archivée liée (2026-09-25)

Sur un bac `demo:local` synthétique et isolé, l'Histoire a été rendue pour les
fenêtres de juin de 2023 à 2026 : 1 366, 1 347, 1 305 et 1 329 événements
simulés. À 320 px, `Connu au = 15/06/2024` sur juin 2024 fait passer la liste de
1 347 à 652 événements, sans fuite d'événement connu après la coupe ; une date
future produit une alerte sans nouvel appel à la timeline. À la largeur
courante, l'événement d'archive et la réception simulée correspondante exposent
la même provenance : Tab atteint le lien de pièce source en quatre étapes avec
focus visible, puis Entrée ouvre le détail archivé. Celui-ci affiche le
mouvement simulé déjà créé et précise qu'aucun nouveau crédit ne sera accepté.

Les vues 320, 768 et 1280 px n'ont pas de débordement horizontal. Les captures
inspectées conservent les quatre fenêtres, la coupe historique, l'événement
focalisé et son détail
([2023](evidence/q2-history-trace/timeline-2023-june-320.png),
[2024](evidence/q2-history-trace/timeline-2024-june-320.png),
[2025](evidence/q2-history-trace/timeline-2025-june-320.png),
[2026](evidence/q2-history-trace/timeline-2026-june-320.png),
[coupe au 15/06/2024](evidence/q2-history-trace/timeline-as-of-2024-06-15-320.png),
[lien focalisé](evidence/q2-history-trace/timeline-source-event-320.png),
[archive liée](evidence/q2-history-trace/timeline-linked-source-detail-320.png),
[tablette](evidence/q2-history-trace/timeline-current-768.png),
[bureau](evidence/q2-history-trace/timeline-current-1280.png)). L'inspection
du bac a utilisé 38 GET d'espace et aucune écriture d'espace.

La liste mensuelle dense (plus de 1 300 éléments dans ces fenêtres) mérite
encore une revue UX. Le contrôle a été headless/CDP : CUA continue de renvoyer
`browsers: []` et `getApp("Google Chrome")` échoue `cgWindowNotFound`, bien que
la page de connexion soit visible côté utilisateur. La saisie au clavier du
dateur, le lecteur d'écran réel et les états non nominaux restent à vérifier ;
cette preuve ciblée ne clôt ni C3 ni Q2. Runner, profil et identifiants de ce
bac tmpfs ont été supprimés après l'audit.

### Q2 — navigation de l’Histoire à forte densité (2026-09-25)

Le vrai composant React `Timeline` a été rendu sous Chrome headless/CDP dans un
harnais Vite temporaire. Son seul appel API était intercepté par une réponse
entièrement synthétique de 1 366 événements ; ni backend ni base de données
n’ont été contactés. Vingt cartes sont montrées au départ, puis « Afficher les
20 événements suivants » déplie la suite dans l’ordre chronologique. Depuis le
document, Tab traverse les champs date (dont les sous-contrôles natifs), atteint
le bouton avec focus visible de 3 px et Entrée affiche 40 cartes. Le filtre
`CREME` trouve « Crème fraîche » (casse et accents ignorés) ; Effacer restaure
les 20 premières cartes et rend le focus au champ de recherche. Une recherche
synthétique de 41 événements montre le dernier lot ; le bouton ciblé par le
harnais puis activé avec Entrée disparaît à la fin et le focus est transféré au
statut annonçant les 41 événements.

L’AXTree nomme le champ `searchbox` « Rechercher dans l’historique » ainsi que
les boutons. À 320, 768 et 1280 px, `scrollWidth` ne dépasse pas le viewport
(le layout viewport headless laisse 15 px au scrollbar vertical à chacune de
ces largeurs). Le champ et les boutons font 44 px de haut. Captures inspectées :
[étroit](evidence/q2-history-browse/history-browse-top-320.png),
[recherche accent-insensible](evidence/q2-history-browse/history-browse-search-320.png),
[lot ouvert au clavier](evidence/q2-history-browse/history-browse-expanded-320.png),
[tablette](evidence/q2-history-browse/history-browse-responsive-768.png),
[bureau](evidence/q2-history-browse/history-browse-responsive-1280.png).

`npm run lint`, `npm run build`, `npm test -- --run` (27 fichiers/110 tests
Vitest + 33 contrôles Node/CSS) et `git diff --check` passent. Le serveur Vite,
le profil Chrome headless, le harnais mock et les captures brutes temporaires
ont été supprimés après copie des cinq images conservées. CUA natif ne permet
toujours pas d’atteindre la fenêtre visible côté utilisateur ; aucun lecteur
d’écran réel n’a été utilisé. Cette tranche réduit la charge de la première
vue, mais ne prouve pas le parcours C3 complet ni les périodes au-delà du plafond
API ; Q2 et le Goal restent ouverts.

### Q2 — états hors nominaux de l’Histoire (2026-09-25)

Le composant React `Timeline` a été monté dans un petit harnais Vite temporaire
qui interceptait uniquement `/api/workspace/timeline` : premier GET retardé de
450 ms puis 503 synthétique, reprise clavier suivie de 21 événements fictifs
avec `count: 5000` et `truncated: true`. Chrome headless a montré le statut de
chargement, l’alerte et son bouton. Tab atteint « Réessayer » et Entrée relance
la lecture ; la réussite rend le focus au titre, expose l’avertissement de
troncature, les 20 cartes initiales et le bouton du lot restant. La saisie
clavier `AUCUN-MATCH` annonce le zéro résultat et garde l’action « Effacer ».

L’AXTree exposait auparavant `role=alert` avec `aria-live="polite"`. Le composant
utilise maintenant `assertive` pour l’erreur et garde `polite` pour les statuts
ordinaires (`b94da3f`). À 360 px, `scrollWidth` vaut 360 px ; captures inspectées :
[chargement](evidence/q2-history-states/timeline-loading.png),
[erreur 503](evidence/q2-history-states/timeline-error.png),
[troncature](evidence/q2-history-states/timeline-truncated.png),
[aucun résultat](evidence/q2-history-states/timeline-no-results.png),
[mobile](evidence/q2-history-states/timeline-mobile.png).

Revue complémentaire du composant réel à 320 × 900 avec `fetch` intercepté
uniquement dans Chrome headless : premier GET retardé de 600 ms puis 503,
seconde activation clavier suivie d’un GET retardé de 350 ms puis 21 événements
fictifs (`count: 5000`, `truncated: true`). Tab atteint « Réessayer », Entrée
relance la lecture ; le chargement est annoncé et le focus revient au titre.
L’avertissement de période dense précède 20 cartes visibles et le bouton du
dernier événement restant. La recherche clavier `AUCUN-MATCH` annonce l’absence
de résultats, garde le focus dans le champ et offre « Effacer ». `scrollWidth`
vaut 320 px durant chargement, erreur, reprise, troncature et zéro résultat.
Captures inspectées : [chargement](evidence/q2-history-states/timeline-loading-320.png),
[erreur et focus](evidence/q2-history-states/timeline-error-320.png),
[chargement de reprise](evidence/q2-history-states/timeline-retry-loading-320.png),
[période tronquée](evidence/q2-history-states/timeline-truncated-320.png),
[aucun résultat](evidence/q2-history-states/timeline-no-results-320.png).
Le mock réseau n’a appelé ni API, ni backend, ni base.

`npm run lint`, `npm run build`, `npm test -- --run` (27 fichiers/110 tests
Vitest + 33 contrôles Node/CSS) et `git diff --check` passent. Le mock n’a fait
appel ni au backend ni à PostgreSQL ; serveur Vite, Chrome headless et fichiers
temporaires ont été arrêtés/supprimés. CUA voit toujours `browsers: []` et
`getApp("Google Chrome")` échoue `cgWindowNotFound`, même si `/login` est visible
côté utilisateur ; pas de revue dans la fenêtre native ni de lecteur d’écran.
Q2 et le Goal restent ouverts.

### Q2/C3 — retour depuis un objet lié et le bac de rejeu (2026-09-25)

Les filtres Histoire (`from`, `to`, `asOf`), le filtre appliqué (`q`) et le
brouillon de recherche (`qDraft`) sont maintenant portés par la query URL ; les
changements de dates et de brouillon remplacent l’entrée courante. Le vrai
composant `Timeline` a été traversé au clavier à 320 × 900 avec un seul GET
fictif : Entrée ouvre le lien d’objet `/orders?source=synthetic-source#invoices`,
puis le retour navigateur restaure les trois dates, le filtre appliqué et le
brouillon non soumis. Entrée sur « Rejouer ce geste » conserve la même query sur
`TimelineReplay` ; son lien retour conserve également la query, et Entrée
restaure de nouveau l’Histoire. `scrollWidth` reste 320 px dans l’Histoire,
l’objet synthétique et le bac de rejeu.

Le bac n’a intercepté que `fetch` : trois GET de chronologie, un POST de rejeu
et un GET de rejeu entièrement synthétiques ; aucune API réelle, base ou mutation
de stock n’a été atteinte. La route Achats du harnais est un écran de destination
minimal, pas une revue du vrai écran Factures. Captures inspectées :
[Histoire avec dates](evidence/q2-history-return/timeline-return-initial-320.png),
[rejeu isolé](evidence/q2-history-return/timeline-replay-320.png),
[retour avec brouillon conservé](evidence/q2-history-return/timeline-return-search-320.png).
Correctif commité localement dans e828b82 ; aucun push.

### Q2/C3 — événement de réception vers Achats et retour aux filtres (2026-09-25)

Les vrais composants Timeline et Orders ont été rendus dans un harnais Vite
temporaire avec un routeur HashRouter, un événement de réception du 12/06/2026
et une pièce source C3 entièrement fictifs. La query Histoire distingue le
filtre appliqué « Tomates » du brouillon non soumis « Tomates en cours ». Tab
atteint le lien de réception ; Entrée ouvre l’écran Achats réel sur la section
Factures de la pièce liée. Achats montre la réception de démonstration, un
mouvement de source existant et le refus d’un second crédit. Tous les GET
nécessaires (Histoire, panier, catalogue, propositions, commandes, archive,
détail source et mode de lecture) ont été servis par le mock ; aucun POST,
backend, base ni corpus conservé n’a été atteint.

Les raccourcis Alt+← et Meta+[ ne déclenchent pas l’historique navigateur dans
ce Chrome headless ; le retour a donc utilisé l’entrée précédente via CDP.
Histoire revient avec from=2026-06-01, to=2026-06-30,
asOf=2026-06-20, le filtre appliqué et le brouillon distinct restaurés.
scrollWidth égale clientWidth à 320, 768 et 1280 px (le viewport headless
réserve 15 px à la barre de défilement). Captures inspectées :
[Histoire 320](evidence/q2-history-object-return/history-320.png),
[Achats et pièce liée 320](evidence/q2-history-object-return/orders-source-320.png),
[Achats 768](evidence/q2-history-object-return/orders-source-768.png),
[Achats 1280](evidence/q2-history-object-return/orders-source-1280.png),
[retour Histoire 320](evidence/q2-history-object-return/history-return-320.png).
La destination utilise le composant Orders sans Layout/sidebar et la quantité
de mouvement affichée vient du fixture ; ce n’est pas une preuve d’écriture
PostgreSQL ni de stock réel. Preuve locale committée dans `78a2be1` ; aucun
push. CUA natif et lecteur d’écran restent indisponibles.

### Q2/C3 — pièce d’archive 2023 sans réception, transition vers 2026 (2026-09-25)

Les vrais composants Timeline et Orders ont été montés dans un second harnais
Vite temporaire, avec uniquement des réponses GET synthétiques. La période
2023 montre une pièce consultée, zéro ligne exploitable, zéro mouvement et
« Aucun brouillon ni réception liée » ; elle ne la présente pas comme une
livraison. Tab atteint son lien et Entrée ouvre sa pièce dans Achats. Le retour
par historique CDP restaure les trois dates, la recherche appliquée et le
brouillon de recherche distinct. En changeant séparément les filtres Du, Au et
Connu au, la chronologie passe ensuite à l’épisode 2026 ; Tab/Entrée ouvre la
réception synthétique déjà liée à un mouvement et affiche le blocage d’un
second crédit.

Les mesures `scrollWidth === clientWidth` ne montrent aucun débordement à
320/768/1280 px ; le viewport headless réserve 15 px au scrollbar vertical
lorsque la page défile. Captures inspectées : [Histoire 2023 320](evidence/q2-history-2023/q2-c3-2023-history-320.png),
[Achats, archive sans réception 320](evidence/q2-history-2023/q2-c3-2023-archive-320.png),
[Achats 768](evidence/q2-history-2023/q2-c3-2023-archive-768.png),
[Achats 1280](evidence/q2-history-2023/q2-c3-2023-archive-1280.png),
[Histoire 2026 320](evidence/q2-history-2023/q2-c3-2023-history-2026-320.png),
[Achats, réception déjà liée 320](evidence/q2-history-2023/q2-c3-2023-archive-2026-320.png).

Le retour a été conduit avec `Page.navigateToHistoryEntry`, les raccourcis de
retour n’étant pas fiables en headless ; les champs date ont été changés via le
setter DOM natif et les événements React input/change, mais chaque changement a
été laissé finir avant le suivant. Seul `fetch` était intercepté ; les requêtes
observées étaient GET, sans backend, base, corpus, POST métier ni mutation.
Orders était monté sans Layout/sidebar et le mouvement 2026 est une fixture,
non une preuve de stock réel. CUA natif et lecteur d’écran restent indisponibles.

### Q2/C3 — version de recette et service partiel vers leurs pages actuelles (2026-09-25)

Un troisième harnais Vite temporaire a rendu Timeline, Recipes et Sales réels
sur un épisode fictif daté du 16/06/2025 : version 2 d’une hypothèse de recette,
puis service ouvert à couverture partielle et deux lignes simulées. Recherche
appliquée « démo » et brouillon distinct « démo en cours » ; Tab/Entrée depuis
chaque événement ouvre la page actuelle Recettes ou Ventes. Les retours par
historique CDP restaurent dates, coupe « Connu au » et recherches ; dans Ventes,
les filtres ont été posés sur le service daté et la table expose les deux ventes
de démonstration ainsi que « Partielle · provenance simulée ». Le focus du
tableau nommé a ensuite reçu Flèche droite : défilement interne 0 → 138 px.

Cette inspection a révélé dans le résumé Ventes la fuite du code brut
`partial`. Le libellé français (complète/partielle/manquante) est maintenant
partagé entre le résumé et le calendrier ; la capture après correction affiche
« couverture partielle ». Aux viewports 320/768/1280 px, `scrollWidth` et
`clientWidth` sont égaux sur Histoire, Recettes et Ventes. À 320, la page
défilante garde un scrollbar vertical de 15 px dans le viewport headless ; le
calendrier de service reste défilable à part. Captures inspectées :
[Histoire](evidence/q2-history-recipe-service/q2-c3-recipe-service-history-320.png),
[Recettes](evidence/q2-history-recipe-service/q2-c3-recipe-service-recipes-320.png),
[Ventes avec dernier service](evidence/q2-history-recipe-service/q2-c3-recipe-service-sales-latest-320.png),
[table de service 320](evidence/q2-history-recipe-service/q2-c3-recipe-service-sales-service-320.png),
[table après Flèche droite](evidence/q2-history-recipe-service/q2-c3-recipe-service-sales-service-keyboard-320.png),
[Ventes 768](evidence/q2-history-recipe-service/q2-c3-recipe-service-sales-service-768.png),
[Ventes 1280](evidence/q2-history-recipe-service/q2-c3-recipe-service-sales-service-1280.png),
[retour Histoire](evidence/q2-history-recipe-service/q2-c3-recipe-service-history-return-320.png).

Seul `fetch` était intercepté ; toutes les requêtes enregistrées sont des GET,
sans API, base, corpus, POST métier ni mutation. La recette et les deux ventes
sont des mocks synthétiques ; la page de destination est le catalogue actuel et
non un rejeu historique. Les retours ont utilisé `Page.navigateToHistoryEntry`
et les dates de Ventes ont été posées via setters DOM natifs suivis d’événements
React ; le tableau a reçu un focus programmatique avant Flèche droite. Chrome
headless/CDP seulement, sans CUA natif ni lecteur d’écran réel.

La coupe « Connu au » a également été rejouée dans Timeline avec une réponse
synthétique filtrée par `knownAt` : au 15/06/2025, les deux événements du 16/06
sont masqués avec l’état vide ; au 20/06, version de recette et service partiel
réapparaissent. Le retour 15 → 20 → 15 → 20 répète la transition, en gardant
from/to, `q=démo` et `qDraft=démo en cours` dans l’URL. Tous les appels observés
sont des GET mockés ; aucun backend n’est utilisé. `scrollWidth === clientWidth`
aux largeurs 320/768/1280 px. [Connu au avant saisie, 320](evidence/q2-history-recipe-service/q2-c3-asof-before-320.png),
[après saisie, 320](evidence/q2-history-recipe-service/q2-c3-asof-visible-320.png).
Le changement du champ a utilisé le setter DOM natif et les événements React
input/change ; pas de clavier natif, CUA ni lecteur d’écran réel.

### Q2 — erreur et conflit dans la modale facture (2026-09-25)

`Modal` et `InvoiceModal` ont été montés dans Chrome headless avec uniquement
`/api/workspace/invoices` simulé : le premier GET attend puis renvoie 503, la
reprise renvoie une révision serveur plus récente, et le POST fictif répond
409 `REVISION_CONFLICT`. Tab/Entrée atteignent « Recharger les factures » ; le
brouillon initial reste préservé pendant le GET en échec, puis le focus revient
à la liste au succès. Ce parcours a révélé que la liste actualisée coexistait
avec le formulaire périmé et qu’aucune action ne permettait de résoudre le
message « Rechargez-la avant de poursuivre » ; en outre, la désactivation du
bouton pendant l’enregistrement abandonnait le focus.

La modale propose maintenant « Charger la version enregistrée » pour les
conflits de révision/état rechargeables, prévient que cette action remplace les
modifications locales, recharge l’historique puis sélectionne la dernière
facture du même identifiant. Après un 409 soumis au clavier, le focus revient
au bouton d’enregistrement si la personne ne l’a pas déplacé. Tab/Entrée
activent la relecture, qui restitue le focus à la liste et affiche la version
serveur. À 320/768/1280 px le défilement horizontal vaut zéro ; l’état conflictuel
à 320 px conserve son bouton de relecture et son texte sans débordement. Captures
inspectées :
[chargement](evidence/q2-invoice-modal-history/invoice-modal-loading.png),
[GET 503](evidence/q2-invoice-modal-history/invoice-modal-error.png),
[conflit 409](evidence/q2-invoice-modal-history/invoice-modal-conflict.png),
[conflit à 320 px](evidence/q2-invoice-modal-history/invoice-modal-conflict-320.png),
[relecture](evidence/q2-invoice-modal-history/invoice-modal-reloaded.png),
[320 px](evidence/q2-invoice-modal-history/invoice-modal-responsive-320.png),
[768 px](evidence/q2-invoice-modal-history/invoice-modal-responsive-768.png),
[1280 px](evidence/q2-invoice-modal-history/invoice-modal-responsive-1280.png).

`npm run lint`, `npm run build`, `npm test -- --run` (27 fichiers/110 tests
Vitest + 33 contrôles Node/CSS) et `git diff --check` passent. Le scénario est
entièrement synthétique, sans backend ni PostgreSQL ; Vite, Chrome headless,
harnais et profil temporaires ont été arrêtés/supprimés. CUA continue de
renvoyer `browsers: []` et `cgWindowNotFound` malgré `/login` visible côté
utilisateur ; aucun lecteur d’écran réel n’a été employé. Les conflits
spécifiques aux pièces source et Q2 restent ouverts (`c5ac66c`).

### Q2 — refus de second crédit d’une pièce source (2026-09-25)

`Modal`, `InvoiceModal` et `SourceInvoiceArchive` ont été montés ensemble dans
Chrome headless, avec réponses synthétiques uniquement : un brouillon source
confirmé et complet, puis un POST simulé refusé en 409
`SOURCE_ALREADY_CREDITED`. Avant correction, ce refus laissait « Réceptionner
dans le scénario » activé, et l’archive restait périmée. Tab atteint le bouton,
Entrée reçoit le refus ; le nouveau rendu désactive la réception, conserve le
brouillon consultable, rend le focus au sélecteur de factures et recharge liste
et détail source via `onInvoiceDataChanged`. Échap ferme la modale ; l’archive
affiche alors le mouvement déjà existant et « Brouillon lié à cette pièce ».

L’AXTree n’expose plus deux alertes assertives derrière/sous la modale : le
refus reste `role=alert` dans la modale, tandis que l’état persistant de l’archive
est un `role=status` poli. À 320 px, le conflit et l’archive après fermeture
restent dans la largeur (`scrollWidth` = 320). Captures inspectées :
[conflit bureau](evidence/q2-source-credit-conflict/source-credit-conflict-1280.png),
[conflit mobile](evidence/q2-source-credit-conflict/source-credit-conflict-320.png),
[archive rafraîchie](evidence/q2-source-credit-conflict/source-credit-archive-320.png).

`npm run lint`, `npm run build`, `npm test -- --run` (27 fichiers/110 tests
Vitest + 33 contrôles Node/CSS) et `git diff --check` passent. Aucun backend,
PostgreSQL ou donnée conservée n’a été utilisé ; serveur Vite, Chrome headless,
harnais et profil ont été arrêtés/supprimés. CUA reste à `browsers: []` ; la
revue native et le lecteur d’écran restent à faire. Le contrôle API des conflits
est décrit ci-dessous ; leur rendu et le reste de Q2/C3 demeurent ouverts.

### Q2/C1 — parcours visuel continu de la pièce à la réception (2026-09-25)

Les vrais composants SourceInvoiceArchive, Modal et InvoiceModal ont été
montés dans une page Vite temporaire avec une seule facture fictive d’une ligne.
Seul fetch était intercepté : création/reprise du brouillon, historique,
actualisation de l’archive et réception ont tous répondu depuis cette fixture ;
ni l’API, ni le backend, ni PostgreSQL, ni les transcriptions conservées n’ont
été lus ou touchés. Le scénario mappe la ligne tomate sur un produit fictif,
confirme type/date, corrige la quantité à 2,5 kg et le prix à 3,20 €, enregistre
le brouillon, ferme avec Échap, puis le reprend avec Entrée. Les deux corrections
sont restaurées. La réception explicite avec Entrée enregistre une seule
conséquence synthétique de 2,5 kg ; la vue reçue devient lecture seule, masque
l’action de réception et annonce qu’aucun second crédit ne sera appliqué.

Le premier rendu a révélé que la pièce/action de reprise était démontée pendant
le GET de rafraîchissement et que le bouton natif désactivé durant l’ouverture
perdait le focus. SourceInvoiceArchive garde maintenant l’archive déjà chargée
montée pendant son actualisation ; l’action reste focalisable, signale l’attente
avec aria-disabled/aria-busy et ignore les activations concurrentes.
Échap rend désormais le focus au bouton source, avant comme après sauvegarde et
rafraîchissement. Correction committée localement dans 04a4551 ; aucun push.
Tab atteint l’action, Entrée ouvre/sauvegarde/reprend/reçoit,
Espace confirme les deux champs de revue, et Échap ferme. La sélection de la
pièce et les corrections de champs ont utilisé les setters DOM natifs suivis
d’événements React input/change, car CDP n’a pas piloté ces contrôles natifs
de façon fiable.

scrollWidth est exactement 320, 768 et 1280 px dans les vues mesurées ; les
captures inspectées montrent l’archive, la revue brouillon, sa reprise et l’état
reçu : [archive 320](evidence/q2-invoice-workflow/archive-320.png),
[revue 320](evidence/q2-invoice-workflow/modal-review-320.png),
[brouillon repris 320](evidence/q2-invoice-workflow/draft-resumed-320.png),
[réception 320](evidence/q2-invoice-workflow/received-320.png),
[réception 768](evidence/q2-invoice-workflow/received-768.png),
[réception 1280](evidence/q2-invoice-workflow/received-1280.png).
Le mock vérifie une seule réception de démonstration ; il ne prouve ni un
mouvement PostgreSQL/UI réel ni un crédit de stock hors de la fixture. Headless
CDP seulement : fenêtre native CUA et lecteur d’écran toujours indisponibles.

### Q2 — conflits de pièce source périmée (2026-09-25)

Les intégrations sur PostgreSQL tmpfs vérifient les deux gardes. Un brouillon
révisé puis une pièce synthétique dont hash/révision changent donnent 409
`SOURCE_CHANGED` à la reprise depuis l’archive et à l’enregistrement ; un numéro
de ligne absent donne 409 `SOURCE_LINE_CHANGED`. Dans les deux cas, la révision
du brouillon sauvegardé et son historique restent inchangés, sans mouvement de
stock. Si la pièce change après réception, reprise et nouvel envoi sont refusés
aussi : stock et mouvement unique restent inchangés. Tests renforcés dans
`1dc4493`.

Dans `5e9b3c8`, `InvoiceModal` traite ces réponses comme un conflit terminal
pour cette pièce ouverte : la saisie reste visible mais immuable, save/receive
et nouvelle facture manuelle sont désactivés, l’archive est rafraîchie, et un
bouton explicite permet de la consulter. Après activation clavier du geste
refusé, le code cible le focus sur cette action ; le comportement reste à
vérifier dans le navigateur. Le conflit reste mémorisé si la personne change
puis re-sélectionne une autre facture dans la modale. Aucun contrat serveur ni
règle de stock n’a changé.

`npm run verify:local-delivery` a réussi une exécution complète après les tests
API : lint, builds web/API, 18 migrations fraîches, 33 contrôles Node/CSS, 27
fichiers/110 tests Vitest, 25 fichiers/38 intégrations et sauvegarde/restauration
synthétique ; PostgreSQL et son tmpfs ont été supprimés. Après le correctif UI,
lint, builds et tests unitaires restent verts ; deux nouvelles exécutions ont
chacune rencontré un échec HTTP isolé et différent dans une intégration sans
lien avec les factures (GET panier 401, puis socket hang up sur un accès compte
non authentifié). La reprise du 2026-09-25 a reproduit deux échecs différents
sur le premier run isolé (`salesRecipeMapping` : 404, `sourceInvoiceWorkflow` :
socket hang up). L’assertion du mapping affiche maintenant le corps HTTP en cas
d’échec (`4f618c7`) ; le run tmpfs suivant passe intégralement, y compris ces deux
fichiers.
Le résultat complet est 18 migrations fraîches, 33 contrôles Node/CSS, 27
fichiers/110 tests Vitest, 25 fichiers/38 intégrations et sauvegarde/restauration
synthétique. Le runner supprime le conteneur tmpfs ; `docker ps` confirme qu’il
ne reste aucun conteneur portant son label.

Revue rendue du 409 périmé : le vrai `SourceInvoiceArchive` a été monté dans
Chrome headless/CDP avec fetch simulé uniquement, aucune API, base ou session
KookIA. Le sélecteur source a dû être changé synthétiquement car `ArrowDown`
n’a pas sélectionné l’option native dans cette session ; la reprise, elle, a été
atteinte par Tab puis soumise par Entrée réelle. Une tentative POST 409 entraîne
deux lectures du détail, prix synthétique mis à jour 3,50 → 3,65 €, bouton natif
désactivé, titre rechargé focalisé, aucun second POST. L’AXTree expose une alerte
et son texte descendant ainsi que le bouton disabled. Aucun lecteur d’écran.

À 1280/768/320 px, `document/body.scrollWidth` = 1280/753/305 face à
`innerWidth` = 1280/768/320 (15 px de barre de défilement verticale aux deux
petites largeurs), sans débordement horizontal. Le rendu chargé de `App`/Achats
montre le conflit en encart ambre, le focus visible et la reprise grisée ;
captures inspectées :
[conflit 1280](evidence/q2-source-changed/source-changed-1280.png),
[768](evidence/q2-source-changed/source-changed-768.png),
[320](evidence/q2-source-changed/source-changed-320.png).
Le zoom page natif 200 % et la technologie d’assistance restent à vérifier pour
cet état. Le harnais source, Vite, Chrome et le profil temporaire ont été
supprimés ; seules les captures fictives sont conservées.

Complément d’archive : `SourceInvoiceArchive` traite aussi le 409
`SOURCE_CHANGED` de reprise : recharge le détail courant, garde le brouillon
enregistré intact, annonce qu’aucune réception n’a été créée et désactive
réellement le bouton de reprise pour cette pièce. Si la tentative venait du
clavier, le focus rejoint le titre de la pièce rechargée. Cette vérification
était encore en attente à cette étape de l’historique ; le rendu headless/clavier
ciblé est consigné plus bas au 2026-09-25. La revue native et le lecteur d’écran
restent à faire : CUA renvoie toujours `browsers: []` et
`getApp("Google Chrome")` échoue `cgWindowNotFound`. Après le changement UI
précédent, `npm run lint`, `npm run build`, `npm test` (33 contrôles Node/CSS et
27 fichiers/110 tests Vitest) ainsi que `git diff --check` avaient passé ; les
intégrations API n’avaient pas été relancées après ce seul changement visuel.

Revalidation complète : l’appel sans privilège au runner R0 a échoué avant
création de base (`docker.sock` refusé), et la vérification du seul nom de
conteneur n’a rien trouvé. Avec l’accès local temporaire approuvé, la recette a
créé un bac PostgreSQL 16 en tmpfs, appliqué les 18 migrations fraîches, passé
lint/builds, 33 contrôles Node/CSS, 27 fichiers/110 tests Vitest, les 25 fichiers/
38 tests d’intégration, puis une sauvegarde/restauration synthétique. Une
exécution intermédiaire a exposé `salesRecipeMapping` en 404 et une coupure de
socket facture ; l’exécution isolée suivante a passé les 38 intégrations. Le
conteneur tmpfs et son label ont été vérifiés absents après nettoyage. La page
`127.0.0.1:56819/login` ne répondait pas au contrôle shell précédent ; depuis,
l’utilisateur confirme voir la page de connexion dans Chrome, mais CUA n’offre
toujours ni navigateur ni IAB contrôlable. Le rendu de conflit de cette reprise
a toutefois été effectué en Chrome headless/CDP, sans réutiliser ce bac.

## F2 — contrat de contexte facultatif (2026-09-25)

La baseline `/workspace/sales/baseline` renvoie maintenant l’état de la position,
de la météo, des événements et des émissions historiques. En production locale,
aucune position ni source n’étant configurée, ces états restent explicitement
`unverified`/`not_connected`. Le calcul pur accepte une fixture uniquement
étiquetée, rejette une position hors bornes ou future, compare les horodatages
aux fenêtres visées et marque les données absentes/périmées ; il sélectionne F1
seulement avec une baseline `experimental` non vide, sinon `none`. Même avec une
fixture valide, la quantité F1 reste inchangée : aucun modèle contextuel,
fournisseur ou gain de précision n’est introduit. L’écran Ventes explique ce
repli.

Rendu de l’état par défaut sur la fixture synthétique Ventes :
[320 px](evidence/q2-f2-context/f2-context-320.png),
[768 px](evidence/q2-f2-context/f2-context-768.png) et
[1280 px](evidence/q2-f2-context/f2-context-1280.png). Les mesures CDP sont
respectivement `320/320`, `753/768` (barre de défilement verticale), et
`1280/1280` pour largeur document/viewport, sans débordement horizontal. Le
texte n’expose aucun enum brut ; `Tab` focalise la région « Baseline
expérimentale par article » et l’AXTree contient le résumé F2. La capture à
320 px est limitée à la hauteur du viewport ; le contenu continue par
défilement vertical normal.

Tests dédiés : fixture valide, météo périmée avec et sans entrées F1, source
événementielle absente et position hors limites. La vérification locale complète
est passée : 18 migrations fraîches, lint et builds web/API, 33 contrôles
Node/CSS, 28 fichiers/113 tests Vitest, 25 fichiers/38 tests d’intégration,
sauvegarde/restauration synthétique. Le premier run a subi un `socket hang up`
dans un test ventes indépendant de F2 ; le rerun complet passe. Le conteneur
PostgreSQL tmpfs et son label ont été vérifiés absents après nettoyage. CUA reste
indisponible (`browsers: []`, `getApp` → `cgWindowNotFound`), donc le nouveau
libellé n’a pas été observé dans Chrome natif.

Après l’ajout du cas « événements absents » et la localisation des états source,
`npm test`, `npm run lint` et `npm run build` ont été rejoués : 33 contrôles
Node/CSS, 28 fichiers/114 tests Vitest, 36 feuilles CSS contrôlées et build web
réussi ; `git diff --check` passe aussi.

### Q2 — erreur, reprise et réconciliation longue du Bilan (2026-09-25)

Le composant réel `ImpactSummary` a été monté dans un harnais Vite jetable,
avec l’API entièrement interceptée et des données uniquement synthétiques. À
640 CSS px / DPR 2, la première requête de la période 27/08–25/09/2026 renvoie
503 et rend le message d’indisponibilité dans `role=alert`. Tab parcourt le
bouton Exporter, les segments natifs des deux dates et atteint « Recharger le
bilan » ; Entrée relance la requête (deux appels observés) et, après le succès,
le focus revient au titre Impact. La page et le corps restent à 640 px, sans
débordement horizontal.

Dans le même viewport, la période autorisée maximale du 01/10/2022 au
25/09/2026 contient 48 mois ; la période précédente équivalente est bien le
06/10/2018–30/09/2022 (1 456 jours calendaires chacune). Tab atteint d’abord
la région « Comparaison des périodes », avec contour de 3 px. Tab/Entrée ouvre
« Réconciliation mensuelle (48 mois) », Tab focalise la région nommée dans
l’AXTree, puis → déplace son défilement interne de 0 à 401 px. La table mesure
1 000 px et sa région visible 535 px ; largeur du document et du corps 625 px
pour un viewport de 640 px, sans débordement de page. Les quatre captures
inspectées sont liées dans la matrice Q2 ci-dessus.

Cette configuration (640 CSS px, DPR 2) vérifie la mise en page étroite, pas le
zoom Chrome natif à 200 %. Aucun tenant, serveur API ou runner `demo:local`
n’a été interrogé. Les fichiers du harnais, le profil Chrome temporaire et les
processus ont été supprimés après capture. CUA continue de ne pas exposer la
fenêtre Chrome à l’agent ; zoom natif, dateur et lecteur d’écran réel restent
à vérifier, et le Goal demeure ouvert.

### Q2 — reprise `SOURCE_CHANGED` depuis l’archive fournisseur (2026-09-25)

Le composant réel `SourceInvoiceArchive` a été monté seul dans un harnais Vite
jetable. L’API est interceptée : la lecture initiale présente un brouillon
lié à une pièce explicitement fictive (6 L de crème à 3,50 €), le POST de
reprise répond 409 `SOURCE_CHANGED`, puis le GET du détail renvoie une version
synthétique à 3,65 €. Aucun service API, base, runner ou tenant n’a été
consulté.

Après chargement, Tab atteint dans l’ordre « Saisir manuellement », recherche,
sélecteur natif, disclosure de transcription et « Reprendre le brouillon ».
Entrée produit exactement un POST ; après le 409, la pièce actuelle est rendue,
le prix actualisé est visible, le conflit annonce qu’aucune réception n’a été
créée, le focus rejoint le titre rechargé et le bouton passe réellement à
disabled « Brouillon périmé ». La trace contient ensuite un GET de détail et
aucun second POST. L’AXTree expose une alerte ; cela ne remplace pas un lecteur
d’écran réel.

À 640 CSS px / DPR 2, document/body/client restent à 640 px. À 320 CSS px /
DPR 2, document/body/client sont à 305 px dans un viewport de 320 px (barre de
défilement verticale de 15 px), sans débordement horizontal. Captures
inspectées : [640](evidence/q2-source-changed-archive/source-changed-archive-640.png)
et [320](evidence/q2-source-changed-archive/source-changed-archive-320.png).
Vite, Chrome headless, le harnais et le profil temporaire sont arrêtés et
supprimés. CUA demeure indisponible ; zoom natif 200 % et technologie
d’assistance restent à vérifier.

### C2/Q2 — candidates recette multi-ingrédients (2026-09-25)

Lecture locale en mémoire des 431 transcriptions Markdown suivies via le
parseur et le catalogue de scénario : 1 064 lignes parsées, dont 173 mappées.
Comptage de pièces contenant les familles sélectionnées : volaille 31, œufs
25, crème 16, farine 12, mozzarella 8, pâtes 6. Seuls ces agrégats ont été
conservés ; aucun original, nom détaillé de ligne, fournisseur, date ou prix
n’a été ajouté aux fixtures ou captures. Le résultat reste une classification
heuristique, sans vérification manuelle des originaux ni audit de droit d’usage.

Les deux candidates seedées en `demo:local` (quiche au poulet, gratin de pâtes
au fromage) ont chacune quatre ingrédients et un rendement de quatre portions,
tous les nombres restant éditables/hypothétiques. Leurs six documents d’appui
et lignes d’archive sont entièrement synthétiques et ne pointent pas vers les
431 pièces d’origine. `scenarioFixture.integration.test.ts` corrige la farine
de la première candidate de 0,25 à 0,30 kg puis la confirme ; la seconde reste
pending. L’API crée une recette et une décision, sans toucher au solde ni au
`stockRevision`, sans créer de mouvement ou production. La traçabilité vers
une ligne réelle du corpus reste une exigence ouverte.

Rendu du vrai composant `RecipeCandidates` dans Chrome headless avec seulement
des réponses interceptées : deux cartes, quatre lignes d’ingrédients chacune,
à 320/768/1280 px ; `documentElement.scrollWidth` = 320/753/1280, sans
débordement (barre verticale de 15 px à 768). Tab focalise « Nouvelle
candidate » avec contour visible de 3 px. L’AXTree nomme le bouton, les actions
et les huit liens vers pièces fictives. Captures inspectées :
[320](evidence/q2-recipe-candidates/recipe-candidates-320.png),
[focus](evidence/q2-recipe-candidates/recipe-candidates-320-focus.png),
[768](evidence/q2-recipe-candidates/recipe-candidates-768.png),
[1280](evidence/q2-recipe-candidates/recipe-candidates-1280.png).

`npm run verify:local-delivery` passe : lint, build web/API, 18 migrations
fraîches, 33 contrôles Node/CSS, 28 fichiers/114 tests Vitest, 25 fichiers/38
tests d’intégration, dump/restauration synthétique. Le PostgreSQL est en tmpfs
sans volume ; le conteneur, Vite, Chrome headless, le harnais et le profil ont
été arrêtés/supprimés. `git diff --check` passe. CUA conserve
`browsers: []` / `cgWindowNotFound` et le lecteur d’écran réel n’a pas été
employé ; ces captures ne constituent pas un zoom Chrome natif ni une preuve
assistive. Q2/C3 et le Goal restent ouverts.

Commit local : `6c00fc4` ; aucun push.

### Reprise C2/Q2 — candidates reliées aux transcriptions locales (2026-09-25)

Le parseur existant a lu en mémoire les 431 transcriptions Markdown suivies ;
les PDF et images originaux n'ont pas été ouverts. Le runner sélectionne une
ligne par ingrédient uniquement si elle se mappe directement à une unité du
catalogue, sans conversion implicite. Deux idées hypothétiques sont construites :
pizza jambon-champignons (5 ingrédients : farine, tomate, mozzarella, jambon,
champignon) et omelette champignons-jambon (3 : œuf, champignon, jambon). Les
huit références viennent de six pièces distinctes. Le choix est déterministe ;
si une famille/unité manque, le seed échoue avec un message générique. Les
quantités facturées ne sont pas reprises comme quantités de recette. Dates
d'origine et dates décalées du scénario restent explicitement séparées.

Seul `demo:local` lit le corpus et l'insère dans un PostgreSQL neuf sur tmpfs ;
le runner a été vérifié à 431 documents source et 2 candidates, puis arrêté et
supprimé. Tests et CI utilisent des lignes entièrement synthétiques.
L'intégration corrige la quantité hypothétique de farine de 0,20 à 0,30 kg,
confirme la pizza et laisse l'omelette pending ; aucun delta de stock/révision,
aucun mouvement ni production. Cette édition ne prétend pas qu'une recette a
été préparée ou validée.

Dans le harnais isolé, seules des réponses API synthétiques alimentent le vrai
composant `RecipeCandidates`. Les viewports 320, 768 et 1280 px gardent la
largeur de document égale au viewport. AX nomme commandes et liens ; Tab met en
évidence « Nouvelle candidate » (contour 3 px). Les liens affichent séparément
date d'origine et date de démo. Captures inspectées : [320](evidence/q2-recipe-candidates/recipe-candidates-320.png),
[focus](evidence/q2-recipe-candidates/recipe-candidates-320-focus.png),
[768](evidence/q2-recipe-candidates/recipe-candidates-768.png),
[1280](evidence/q2-recipe-candidates/recipe-candidates-1280.png). CUA voit
Chrome comme application mais ne trouve pas la fenêtre (`cgWindowNotFound`) ;
zoom natif et lecteur d'écran réel ne sont pas revendiqués. Aucun détail du
corpus n'est inclus dans les captures, le harnais ou les logs.

`npm run verify:local-delivery` passe après les changements : lint, builds
web/API, 18 migrations fraîches, 33 contrôles Node/CSS, 28 fichiers Vitest
(115 tests), 25 fichiers d'intégration (38 tests) et dump/restauration
synthétiques. Le premier run a eu une coupure `socket hang up` dans le test de
reconnexion ; la recette complète suivante passe, y compris ce test.
`git diff --check` passe. Limites restantes :
transcriptions non vérifiées sur leurs originaux, recettes non validées et
droits d'usage/sensibilité à auditer avant tout partage. Commit local du code :
`1f12c0a` ; aucun push.

### Q2/I1 — rubriques Connexions sur mobile (2026-09-25)

La revue du code a corrigé un défaut de découvrabilité visuelle : en largeur
mobile, les quatre labels de Réglages étaient masqués et ne restaient visibles
que comme noms accessibles des icônes. Ils sont maintenant affichés dans une
grille à deux colonnes jusqu’à 768 px ; à 480 px et moins, icône et label sont
empilés afin de préserver l’icône à la largeur minimale. À 320 px, les boutons
mesurent 70 px de haut.

Rendu du composant `Settings` réel dans un harnais isolé ; la seule réponse
interceptée est synthétique et renvoie les cinq sources `not_connected`, toute
autre requête échoue. À 320/375/480/481/600/601/640/768 px, la page n’a pas de
débordement horizontal, les quatre icônes gardent 18 px et les libellés restent
dans leurs cellules ; la vérification 1280 px précédente reste inchangée. Tab parcourt les rubriques ;
après trois pressions il atteint « Connexions » avec un contour de 3 px. L’AX
expose les quatre noms « Restaurant », « Fournisseurs », « Connexions » et
« Compte ». Le 503 synthétique s’affiche avec alerte, bouton « Réessayer » et
replis manuels. Un harnais temporaire séparé a ensuite renvoyé un 503
synthétique, puis cinq sources `not_connected` ; le focus sur « Réessayer » et
la séquence clavier CDP Entrée ont fait passer l’interface à « État des
sources à jour », sans clic souris. Toute requête hors endpoint synthétique
était refusée.

Captures inspectées : [320](evidence/q2-connections/connections-320.png),
[focus](evidence/q2-connections/connections-320-focus.png),
[erreur](evidence/q2-connections/connections-320-error.png),
[375](evidence/q2-connections/connections-375.png),
[480](evidence/q2-connections/connections-480.png),
[481](evidence/q2-connections/connections-481.png),
[640](evidence/q2-connections/connections-640.png),
[768](evidence/q2-connections/connections-768.png),
[1280](evidence/q2-connections/connections-1280.png). `npm run lint` (36
fichiers CSS), `npm run build` et `git diff --check` passent après la correction.
Le serveur, Chrome headless, profils temporaires et harnais ont été supprimés.
CUA natif, zoom 200 % et technologie d’assistance réelle restent indisponibles.
Commits locaux du code : `78d39f3`, `33fe03d` ; aucun push.

## Reprise C3 — rejeu d’une décision d’achat isolé (2026-09-25)

`decisionEvent` ne rend le geste rejouable que pour une décision d’ajout ou
d’exclusion dont le snapshot d’achat est complet et cohérent. « Rejouer ce
geste » crée, sous la session authentifiée et le tenant courant, un seul
document `timeline-replay:v1:<decisionId>` distinct des objets métier ; un
rejeu répété/concurrent retrouve la même copie. La route de bac n’utilise que
le snapshot historique : elle montre la ligne hypothétique ou l’exclusion, sans
relire ni modifier le stock courant, créer de commande/réception/mouvement, ni
transmettre quoi que ce soit. L’accès au bac est refusé depuis un autre tenant.

`timelineReplay.integration.test.ts` vérifie le contrat inter-tenant,
l’idempotence concurrente et l’égalité avant/après des produits (stock et
révision), mouvements, commandes et réceptions. Dans Chrome headless et un
harness à fixture synthétique, Tab atteint « Rejouer ce geste » avec contour
visible 3 px, Entrée ouvre `/history/replay/:id`, puis le focus rejoint le titre.
À 320, 375, 480, 768 et 1280 px, le document ne déborde pas horizontalement ;
l’AXTree contient les liens, titres de sections et la note d’isolation. Capture,
harness, profil Chrome et serveur temporaire ont été supprimés.

`npm run verify:local-delivery` passe sur PostgreSQL tmpfs : lint, builds web/API,
18 migrations fraîches, tests unitaires, 26 fichiers d’intégration/39 tests et
sauvegarde-restauration synthétique. Un premier rejeu complet a échoué sur un
`socket hang up` non lié dans `ticketZ.integration.test.ts` (38/39) ; la recette
entière suivante passe. Aucun bac persistant, tenant conservé, port 52790 ou
script `--write` n’a été touché. La revue Chrome native, le zoom 200 % et un
lecteur d’écran réel restent à vérifier ; aucun droit métier sur les recettes
ou transcriptions n’est inféré.
Commit local de la tranche : `f6950c9`. Aucun push.

### Q2 — date du modal d’export du Bilan au clavier (2026-09-25)

Le vrai composant `ExportReportModal` est rendu dans un harnais Vite temporaire
avec des dates synthétiques (01/08/2026–25/09/2026), sans authentification,
API, base ni bac démo. Tab atteint le déclencheur et Entrée ouvre la modale ;
son nom accessible est « Exporter le bilan ». Tab reste dans la modale,
Shift+Tab depuis le premier contrôle rejoint le dernier contrôle activé,
Échap ferme et rend le focus au déclencheur. Le champ `type=date` change par
Flèche haut du 01/08/2026 au 01/08/2027 ; la plage inversée désactive
« Télécharger ». Flèche bas restaure le 01/08/2026 et réactive l’export. Le
focus reste visible sur le champ ; l’AXTree expose la modale et les boutons
« Fermer »/« Télécharger ». Aucune ressource `/api/` n’est requise.

À 320×680 px, le document reste à 320 px, la feuille fait 304 px de large
à x=8 px et son contenu (626 px) défile dans 531 px disponibles ; à 768 px,
elle fait 736 px à x=16 ; à 1280 px, 600 px centrés à x=340. La capture
[modale à 320 px](evidence/q2-export-modal/export-report-modal-320.png) a été
inspectée : le premier champ date a un focus visible et le contenu long défile
verticalement sans débordement horizontal.

Limite : le contrôle des segments date au clavier dans Chrome headless est
établi, pas l’ouverture du popover natif, le zoom Chrome natif ni un lecteur
d’écran réel. Malgré la page de connexion déclarée visible au port 56819,
`cua.getState()` retourne encore `browsers: []` et
`getApp("Google Chrome")` échoue avec `cgWindowNotFound` ; ce port refusait
la connexion au contrôle. Harnais, serveur Vite, profil Chrome et capture
intermédiaire supprimés ; seules les données synthétiques de cette preuve ont
été utilisées.


### Q2 — M2, idées depuis un surstock compté (2026-09-25)

Le composant réel `MenuIdeasModal` et la `Modal` partagée sont rendus dans un
harnais temporaire. Son seul `window.fetch` renvoie trois routes synthétiques :
menu brouillon, comptage positif de 60 kg de tomates (révision 3) et deux idées
au 13/06/2026 — Pizza Margherita faisable, gratin bloqué faute de mozzarella.
La quantité 10 kg saisie au champ numérique produit un seul POST mock contenant
l'identifiant de comptage, la révision attendue et la quantité choisie.
L’interface montre que les idées restent simulées, les portions séparées et la
péremption inconnue ; Entrée sur « Utiliser comme le plat » modifie seulement
le champ du menu brouillon. Aucun endpoint de stock ou de production n’est
appelé, aucun état métier n’est persisté.

Le parcours au clavier atteint le déclencheur avec Tab et ouvre par Entrée ;
après choix synthétique du produit, Tab atteint la quantité, saisit « 10 »,
puis atteint « Calculer les idées ». Le POST mock a été retardé de 300 ms afin
d’observer le chargement. Le rendu initial désactivait le bouton Calculer et perdait le focus ; Tab
était alors récupéré sur le bouton de fermeture supérieur. Le correctif garde
les actions focalisables en `aria-disabled=true` pendant calcul, enregistrement
et validation, avec leur libellé de chargement et le garde anti-double-soumission.
Pendant le POST mock retardé, le focus reste dans la modale ; Entrée répétée ne
double ni le calcul ni les POST du brouillon/validation. Après le calcul, Tab
atteint l’idée faisable et Entrée l’applique au brouillon ; après sauvegarde,
Tab atteint Validation, puis Imprimer après validation. Les annonces de succès
restent dans `role=status`. Le piège Shift+Tab/Échap boucle et rend le focus au
déclencheur. L’AXTree expose
« Préparer le menu », la région « Idées depuis un surstock compté », la région
de résultats et les commandes nommées.

À 320/768/1280 px, le document correspond au viewport ; la modale mesure
304/736/600 px (x=8/16/340). À 320 px, son contenu de 2 020 px défile dans
497 px utiles. Capture inspectée : [modale M2 à 320 px](evidence/q2-menu-ideas/menu-ideas-320.png).

Dans Chrome headless/CDP, une panne 503 synthétique de
`GET /workspace/menu/surplus-options` ne bloque plus le GET du menu : le
brouillon enregistré et ses champs restent visibles.
Entrée sur « Réessayer » garde le focus pendant la requête (`aria-disabled`,
non désactivé nativement) ; après réponse 200, les comptages réapparaissent,
Tab poursuit vers le premier champ du menu et Échap rend le focus au déclencheur.
Le document reste à 320/768/1280 px sans débordement horizontal. Captures :
[erreur à 320 px](evidence/q2-menu-recovery/menu-recovery-error-320.png),
[reprise à 320 px](evidence/q2-menu-recovery/menu-recovery-restored-320.png).
Après correction, `npm run lint` (37 CSS), `npm run build`, `npm test`
(33 contrôles Node/CSS et 29 fichiers/119 tests Vitest) et
`git diff --check` passent.

Limite : l’option `<select>` native a été sélectionnée par DOM ; les flèches
CDP ne pilotaient pas son popup dans Chrome headless. Le clavier sur le champ,
le calcul, l’application, le focus pendant le chargement et la fermeture sont
vérifiés ; cette passe ne prouve pas l’usage clavier natif du popup, un lecteur
d’écran réel ni le zoom Chrome natif. Tout le réseau API était mocké, sans base,
compte ni tenant consulté ; CUA restait indisponible.

### Q2 — calendrier Ventes, espacement responsive (2026-09-25)

La capture mobile a révélé que l’aide au défilement du tableau commençait au
bord du bouton de sauvegarde. La marge supérieure mobile de `.sales-table-hint`
est maintenant de `var(--spacing-sm)`. Capture inspectée à 390×844 :
[calendrier service ouvert/complet](evidence/q2-service-calendar/service-calendar-open-complete-390.png).

Le vrai écran React `/sales`, authentifié dans un bac `demo:fixtures` à
PostgreSQL tmpfs, a été rendu à 320/390/768/1280 px. Le document ne déborde pas
à ces quatre largeurs ; à 320/390 px, la table de 401 px reste dans son
conteneur défilant de 223/293 px. Le contour de focus est visible sur la capture,
mais le focus a été posé par script et ne constitue pas une preuve clavier.
Limite clavier : CDP rapporte Tab non empêché mais ne déplace pas le focus de la
date au select ; Entrée et les commandes souris CDP n'émettent aucun clic DOM,
aucun PUT n'est envoyé et aucune complétion n'a donc été persistée dans cette
passe. `cua.getState()` retourne toujours `browsers: []` et
`getApp("Google Chrome")` échoue `cgWindowNotFound`. Les tests API existants
couvrent la persistance, la révision et l'isolation ; la confirmation depuis
l'écran avec un navigateur réellement contrôlable reste à obtenir.

`npm run lint`, `npm run build` et `git diff --check` passent. Toutes les
données utilisées viennent du nouveau bac de fixtures tmpfs ; aucune écriture
sur un tenant conservé n'a été effectuée.

### Q2 — Ventes, soumission et persistance du service (2026-09-25)

Sur un bac neuf `demo:fixtures`/PostgreSQL tmpfs, le formulaire réel `/sales`
est sélectionné sur le jour courant `2026-09-25`, état ouvert et couverture
complète. Une invocation de harnais `form.requestSubmit(button)` — **pas** une
action clavier ou un geste manuel — passe par le `onSubmit` React : un unique
`PUT` avec révision attendue 0, `open/complete`, un message de succès apparaît,
et le `GET` renvoie `recorded`, révision 1, zéro vente. Après navigation complète
et rechargement des données, le formulaire garde `open/complete` et la ligne
affiche « Ouvert », « Complète · provenance enregistrée » et « 0 observé ».
Capture inspectée :
[service confirmé et persistant à 390 px](evidence/q2-service-calendar/service-calendar-persisted-390.png).

Les largeurs 320/390/768/1280 px restent sans débordement de document ; à
320/390 px, le tableau de 401 px défile dans sa région de 223/293 px. Le pilote
Chrome headless reçoit `Tab` (`defaultPrevented: false`), mais le focus reste sur
la date ; le parcours d'édition/enregistrement au clavier n'est donc pas prouvé.
`requestSubmit()` prouve le traitement du formulaire et l'aller-retour serveur,
pas l'activation humaine demandée par la matrice Q2. CUA doit encore fournir une
fenêtre réellement contrôlable ; cette séparation reste explicite.

Le bac tmpfs, son compte, Chrome headless, le profil et les harnais temporaires
ont été arrêtés/nettoyés. Aucun corpus conservé ou autre tenant n'a été utilisé.

### D4 → M1 — contrat service confirmé vers KPI (2026-09-25)

`sales.integration.test.ts` vérifie maintenant qu'après l'enregistrement API d'un
service ouvert/complet à zéro vente, le Bilan renvoie un jour calendaire,
`recorded.serviceDays.complete = 1`, `unregistered = 0`, zéro unité, et aucune
complétude dans le bucket simulation. Cette assertion relie le statut revu au
KPI sans transformer un jour absent en zéro.

Les deux premières exécutions de `npm run verify:local-delivery` ont eu chacune
38/39 intégrations et 25/26 fichiers : coupure `socket hang up` dans
`workspace.integration.test.ts`, puis dans `scenarioFixture.integration.test.ts`.
Le test `sales.integration.test.ts` ajouté passait dans les deux. Un troisième
passage complet a ensuite réussi : lint, builds web/API, 18 migrations fraîches,
diff Prisma vide, `npm test` (29 fichiers/119 Vitest et 33 contrôles Node/CSS),
intégrations (26 fichiers/39 tests) et restauration synthétique vérifiée, puis
`migrate status` à jour. `git diff --check` passe. Le conteneur PostgreSQL tmpfs
a été supprimé ; aucune base conservée ni donnée Camille n'a été utilisée.

### C3 — rendu des chapitres et état incomplet des achats (2026-09-25)

L’URL de connexion annoncée visible par l’utilisateur (`127.0.0.1:56819`) ne
répondait plus à la reprise. CUA renvoie toujours `browsers: []`, l’IAB est
indisponible et `getApp("Google Chrome")` échoue `cgWindowNotFound`. Un nouveau
`demo:fixtures` sur PostgreSQL tmpfs (fixtures uniquement, sans `demo:local`)
a donc été rendu dans un profil Chrome headless/CDP temporaire ; aucun secret
ou donnée conservée n’est inclus dans les preuves.

Dans Histoire, chaque plage du 1er au 30 juin 2023, 2024, 2025 et 2026 affiche
20 cartes initiales sur respectivement 1 366, 1 347, 1 305 et 1 329 événements.
Les rendus à 390×844 n’ont pas de débordement horizontal. Les cartes rendent la
provenance Simulation ou Archive source et rappellent qu’une transcription ne
prouve pas une livraison. Captures inspectées :
[2023](evidence/c3-fixture-ui/history-2023-390.png),
[2024](evidence/c3-fixture-ui/history-2024-390.png),
[2025](evidence/c3-fixture-ui/history-2025-390.png),
[2026](evidence/c3-fixture-ui/history-2026-390.png).

Dans Achats, le vrai composant `/orders` rend « Pas de quantité fiable »,
« Complétez les 28 jours de services… » et la note « toute commande validée
reste simulée, sans envoi ni mouvement de stock » ; le jour manquant du
2026-09-24 est donc bloqué, pas transformé en achat. À 390×844 le document ne
déborde pas : [état incomplet](evidence/c3-fixture-ui/orders-insufficient-history-390.png).
Dans Bilan, le bucket opérationnel reste « Aucune donnée » ; la revue expose
168 ventes simulées et 215 mouvements de perte simulés comme exclus, puis
3 328 unités et 215 pertes sous « opérations de démonstration » ; aucune
réception simulée n’existe dans ce runner. Le document reste contenu à 390 px :
[détail de simulation](evidence/c3-fixture-ui/impact-simulation-390.png).

Cette passe n’a effectué aucun geste de confirmation dans le parcours Achats.
Le parcours décision → commande → réception → Impact demeure prouvé par le
test d’intégration `demoStory.integration.test.ts`, mais pas encore rejoué
visuellement sur ce runner `demo:fixtures`. Les captures headless valident un
rendu, pas une activation clavier native, un lecteur d’écran ou le zoom à
200 % ; ces preuves Q2 restent ouvertes tant que CUA ne donne pas de fenêtre
contrôlable. Aucun état métier du runner n’a été modifié pendant cette revue.
Commit local des captures et de cette preuve : `ba20204`.

### Q2 — Reprise clavier/rendu headless et provenance calendrier (2026-09-25)

La page native signalée sur `127.0.0.1:56819` n’était plus servie et CUA
continue de retourner `browsers: []`. Un bac neuf `demo:fixtures` (PostgreSQL
tmpfs) a été contrôlé dans Chrome headless/CDP temporaire. À 320×750, le vrai
formulaire Connexion s’affiche après le splash ; Tab atteint le mot de passe,
puis le bouton, et Entrée ouvre la session. Sur `/sales`, les rendus à
320×750, 768×900 et 1280×900 ont été inspectés visuellement : aucun
débordement horizontal du document (`scrollWidth` égal à la largeur viewport)
et les états/provenances synthétiques restent lisibles. Les huit premiers
arrêts Tab sur la route Ventes sont visibles et ont un `:focus-visible` avec
contour solide. Captures : [Connexion 320](evidence/c3-fixture-ui/q2-login-320.png),
[Ventes 320](evidence/c3-fixture-ui/q2-sales-320.png),
[Ventes 768](evidence/c3-fixture-ui/q2-sales-768.png),
[Ventes 1280](evidence/c3-fixture-ui/q2-sales-1280.png). C’est une revue
rendu/clavier automatisée, pas une interaction humaine dans Chrome natif ; le
zoom natif à 200 % et un vrai lecteur d’écran restent ouverts.

Cette revue a aussi révélé que `PUT /sales/service-days/:date` laissait le
défaut Prisma `recorded` sur une journée saisie en mode démo. `saveServiceDay`
lit maintenant le mode de l’espace côté serveur dans la transaction verrouillée,
étiquette les créations/éditions démo `demo_simulation`, conserve la source des
journées opérationnelles existantes et garde `recorded` pour une nouvelle
journée opérationnelle. Le test HTTP vérifie création démo, correction d’une
ancienne journée mal étiquetée et régression opérationnelle. Commit :
`470d57c`.

`npm run verify:local-delivery` a été relancé deux fois après ce changement :
lint, builds web/API, migrations fraîches, parité Prisma et les 119 tests
unitaires plus 33 contrôles Node/CSS passent à chaque fois ;
`sales.integration.test.ts` passe (2 tests). Chaque lot global d’intégration
avait 39/40 tests passants, avec un échec différent et non lié à ce patch :
`app.integration.test.ts` (`socket hang up`), puis `scenarioFixture.integration.test.ts`
(`404` sur `/api/workspace/catalog` pour son compte de rejeu). Le signal CI
intégration complet reste donc non vert après cette modification. Le bac
`demo:fixtures` exact a ensuite été arrêté ; son conteneur tmpfs et ses
identifiants temporaires ont été supprimés, et le port web 64620 est fermé.
Commit des captures et de cette entrée de reprise : `a9e27ca`.

### C3 — décision → commande → réception → Bilan sur fixture (2026-09-25)

Sur le runner `demo:fixtures` actif (PostgreSQL tmpfs, fixtures synthétiques
seulement), la journée de service manquante du 24/09/2026 a été explicitement
marquée ouverte et complète en provenance de démonstration. Six associations
ventes-recettes ont été revues dans l’UI. Un comptage de scénario de mozzarella
à 0,5 kg (au lieu de 3,63 kg théoriques) a permis de revoir une proposition de
5,555 kg à 47,22 €, puis une commande simulée. Ces valeurs ne sont pas des
observations de restaurant.

L’archive visible contient 437 pièces synthétiques, sans facture associée à
Fromages Dupont. Le parcours a donc utilisé la saisie manuelle, clairement
marquée comme telle : brouillon `SIM-C3-2026-09-25`, Fromages Dupont, Mozzarella,
5,555 kg à 8,50 €. Le brouillon a été enregistré depuis le formulaire réel.
Après revue de la correspondance facture/commande et de la référence de
livraison synthétique `LIVRAISON-SIM-C3-2026-09-25`, la réception est
`simulated_received`, facture rapprochée et ligne reçue complète (5,555 kg).
Le serveur confirme `provenance=demo_simulation`, un stock mozzarella inchangé
à 0,5 kg (révision 3) et aucun achat/envoi/mouvement réel.

Pour le 24–25/09/2026, l’API Impact renvoie le ledger enregistré à 0,00 € et
0 réception ; la simulation séparée contient 1 réception à 47,2175 € et
`excluded.simulatedReceiptLines=1` (47,22 € à l’affichage). À 390×844, les
pages Achats, détail de commande et Bilan ont une largeur de document égale à
390 px. Le tableau Impact (600 px dans une région de 308 px) défile sans
débordement de page ; le focus clavier puis `→` déplace la région à 231/292 px.
Dans les formulaires, Tab atteint le bouton de brouillon puis le bouton de
réception simulée avec `:focus-visible`; Entrée a enregistré ces deux actions.
Les valeurs de facture et de livraison ont été entrées par setters DOM dans le
navigateur headless ; la preuve clavier porte sur la navigation et la
confirmation, pas sur une saisie humaine complète.
Captures inspectées : [proposition](evidence/c3-fixture-ui/suggestion-review-390.png),
[commande](evidence/c3-fixture-ui/order-review-390.png),
[brouillon et focus clavier](evidence/c3-fixture-ui/invoice-draft-review-390.png),
[revue de réception](evidence/c3-fixture-ui/receipt-review-keyboard-390.png),
[commande réceptionnée](evidence/c3-fixture-ui/order-simulated-received-390.png),
[tableau Impact au clavier](evidence/c3-fixture-ui/impact-table-arrowkey-390.png),
[détail Impact de simulation](evidence/c3-fixture-ui/impact-simulation-receipt-390.png).

L’UI n’a pas exposé le message de succès de réception attendu dans la session
CDP après Entrée ; aucune nouvelle tentative n’a été faite avant réconciliation.
Les lectures API et l’historique UI montrent une réception unique complète et
le stock inchangé. Chrome natif/CUA reste indisponible (`browsers: []`,
`cgWindowNotFound`) ; ces captures et interactions sont headless, pas une
revue humaine dans Chrome, VoiceOver/lecteur d’écran ou zoom natif à 200 %.
Aucun code applicatif n’a changé ; ces vérifications ciblées remplacent ici une
relance des tests applicatifs.

### M1 — Impact détaillé, responsive et clavier (2026-09-25)

Sur un bac `demo:fixtures` neuf à PostgreSQL tmpfs, le vrai parcours Bilan a été
rendu pour la période du 01/01/2023 au 25/09/2026. L’API renvoie 45 périodes
mensuelles ; les activités simulées couvrent mai 2023–septembre 2026. La période
de comparaison de même durée est 08/04/2019–31/12/2022 et ne contient pas de
donnée enregistrée. Ce bac n’a aucun fait opérationnel enregistré : l’API
conserve 100 431 unités de vente et 6 734 pertes dans la simulation, et exclut
5 026 lignes de vente et les 6 734 pertes des totaux enregistrés. Il n’y a pas
de réception simulée. Les économies restent « non mesurées » ; ruptures et
invendus ne sont pas inférés.

`ImpactSummary` a été observé après chargement à 320, 390, 768 et 1280 px. Aux
quatre largeurs, le `scrollWidth` du document, du body et du contenu Bilan égale
le viewport ; la table mensuelle de 1000 px reste dans sa région à défilement
interne (238, 308, 672 et 893 px visibles respectivement). Tab depuis le résumé
mensuel atteint cette région focusable ; son nom accessible et sa description
sont renseignés, le contour clavier est visible, et → fait avancer `scrollLeft`
de 0 à 178 px sans déborder la page. Captures inspectées : [320](evidence/q2-impact-responsive/impact-320.png), [390](evidence/q2-impact-responsive/impact-390.png), [768](evidence/q2-impact-responsive/impact-768.png) et [1280](evidence/q2-impact-responsive/impact-1280.png).

Aucune donnée métier n’a été écrite. C’est une preuve headless/CDP sur fixtures
synthétiques, pas une revue humaine dans Chrome natif, un lecteur d’écran ou un
zoom natif à 200 % ; CUA retourne toujours `browsers: []`. Le contenu enregistré
de ce bac est vide et la période précédente est sans données : ces captures
valident la présentation des états vides, simulés et de réconciliation, pas des
KPI restaurant réels. Aucun test applicatif n’a été relancé, le changement
portant uniquement sur rendu et documentation.

### C3 — fenêtres Histoire des quatre années sur fixtures (2026-09-25)

Sur le même bac synthétique, le vrai écran Histoire a été rendu pour chaque
fenêtre du 1er au 30 juin 2023, 2024, 2025 et 2026, avec « Connu au » fixé au
25/09/2026. Les quatre réponses API sont non tronquées. Les périodes 2023 et
2024 montrent des événements `simulation`/`assumption` mais aucun événement de
provenance `source`; 2025 et 2026 montrent chacune 30 documents `Archive source`
et des opérations `simulation`. Le document lui-même indique qu’une archive
transcrite n’est pas une preuve de livraison. Aux quatre fenêtres, l’UI affiche
20 cartes au premier lot et garde document/body à 390 px sans débordement.

Captures inspectées : [2023](evidence/q2-c3-chapters/history-2023-390.png),
[2024](evidence/q2-c3-chapters/history-2024-390.png),
[2025](evidence/q2-c3-chapters/history-2025-390.png) et
[2026](evidence/q2-c3-chapters/history-2026-390.png). Elles décrivent le seed
`demo:fixtures`, où il n’existe aucune opération enregistrée ; elles ne sont
pas la fixture isolée de `demoStory.integration.test.ts`, qui construit
explicitement quatre pièces 2023–2026 et vérifie le lien commande/réception en
2026. La lecture visuelle des transitions métier à partir de cette fixture
dédiée reste donc ouverte ; ces captures prouvent seulement les états
chronologiques rendus sur le seed consulté. Aucun état métier n’a été modifié.

### Q2 — libellé du fil d’Ariane Histoire (2026-09-25)

La revue précédente montrait « Aujourd’hui » dans la barre haute de `/history`.
`TopNav` ne connaissait pas cette route et utilisait son libellé par défaut ; la
route Histoire et son sous-parcours `/history/replay/:id` portent maintenant le
libellé « Histoire ». Après `npm run build`, Chrome headless/CDP confirme le
libellé sur ces deux chemins à 390×844 ; `/history` reste à 390 px sans
débordement du document. Capture :
[Histoire avec fil d’Ariane corrigé](evidence/q2-c3-chapters/history-breadcrumb-390.png).
Le contrôle est visuel automatisé ; CUA natif et lecteur d’écran ne sont pas
disponibles dans cette session.

### C3 — source d’archive Histoire → Achats, responsive/clavier (2026-09-25)

Sur un nouveau bac `demo:fixtures` (PostgreSQL tmpfs), quatre fenêtres ont été
rendues à 390×900 avec « Connu au » au 25/09/2026 : 02–31/05/2023,
01–31/01/2024, 01–30/06/2025 et 01–25/09/2026. L’API des pièces fournit,
pour ces fenêtres, respectivement 3, 15, 30 et 29 factures de type `invoice`,
dont 0, 5, 10 et 14 avec lignes transcrites. Les pièces retenues sont datées
du 05/05/2023 (aucune ligne), du 30/01/2024, du 29/06/2025 et du 22/09/2026.
Les trois dernières ont chacune une ligne et un mouvement source de simulation
déjà lié ; elles affichent « déjà crédité par simulation », tout en indiquant
qu’aucun brouillon ni réception n’est lié. L’archive et Histoire qualifient
explicitement une transcription comme source, pas comme preuve de livraison.

À 390 px, les quatre pages Histoire et leurs détails Achats gardent le
`scrollWidth` du document et du body à 390 px. Depuis la recherche, trois Tab
atteignent le lien source avec `:focus-visible`; Entrée ouvre la pièce dans
Achats. Le retour navigateur par raccourci n’a pas pu être vérifié : les
événements Meta+← et Alt+← envoyés à Chrome headless ne restaurent pas la page,
et CUA ne fournit toujours aucun navigateur contrôlable. Aucune pièce n’a été
ouverte en brouillon et aucune mutation métier n’a été faite.

Captures inspectées : Histoire [2023-05](evidence/q2-c3-chapters/source-2023-05-history-390.png),
[2024-01](evidence/q2-c3-chapters/source-2024-01-history-390.png),
[2025-06](evidence/q2-c3-chapters/source-2025-06-history-390.png),
[2026-09](evidence/q2-c3-chapters/source-2026-09-history-390.png) ; détail
Achats [2023-05](evidence/q2-c3-chapters/source-2023-05-piece-390.png),
[2024-01](evidence/q2-c3-chapters/source-2024-01-piece-390.png),
[2025-06](evidence/q2-c3-chapters/source-2025-06-piece-390.png),
[2026-09](evidence/q2-c3-chapters/source-2026-09-piece-390.png). Cette trace
partielle utilise le seed `demo:fixtures`, pas la fixture narrative dédiée de
`demoStory.integration.test.ts` ; elle ne démontre pas encore correction,
recette/production, service, impact et rejeu dans une chaîne C3 unique. Chrome
natif/CUA, lecteur d’écran et zoom natif à 200 % restent hors vérification.

### R0 — recette locale et lot d’intégration complet (2026-09-25)

`npm run verify:local-delivery` passe au complet sur un PostgreSQL 16 neuf,
loopback + tmpfs sans volume : lint, build web, build API, 18 migrations
fraîches, diff Prisma/migrations sans différence, `npm test` (33 contrôles
Node/CSS et 119 tests Vitest), puis `npm run test:integration` (26 fichiers,
40 tests, dont `scenarioFixture` et `demoStory`). La table témoin synthétique
survit au dump/restore et Prisma confirme les migrations sur la copie restaurée.
Les deux erreurs isolées précédemment notées (`socket hang up`, puis 404) ne se
reproduisent pas ; aucune correction de code n’était justifiée par cette passe.
Le conteneur exact a été supprimé (inspect : objet absent) et aucun conteneur
avec le label de la recette ne reste. La CI GitHub n’a pas été déclenchée.

Nouvelle passe après `17aadfd` (fixture narrative C3 cohérente) et `a5ee418`
(lien d'inscription mobile) : la même recette tmpfs repasse, avec `demoStory`
et les 40 intégrations au vert ; le conteneur exact est absent après nettoyage.

### Q2 — transition clavier Histoire → archive du chapitre 2024 (2026-09-25)

Dans un runner `demo:fixtures` neuf sur loopback/tmpfs, l’historique 2024 de la pièce synthétique « Pièce synthétique 33 » est ouvert par clavier : Tab atteint « Ouvrir la rubrique actuelle » au 18e arrêt à 320 px et au 25e à 1280 px ; Entrée ouvre Achats avec la source sélectionnée. Après les deux chargements indépendants (archive et détail), le titre du détail reçoit le focus clavier visible et est centré dans la zone consultable. `document`, `body` et viewport ont la même largeur aux deux tailles. Le détail indique qu’un mouvement simulé existe déjà ; aucune action de brouillon/réception n’a été activée. Captures : [Historique 320](evidence/q2-c3-chapters/history-2024-keyboard-320.png), [détail 320](evidence/q2-c3-chapters/source-2024-focused-320.png), [Historique 1280](evidence/q2-c3-chapters/history-2024-keyboard-1280.png), [détail 1280](evidence/q2-c3-chapters/source-2024-focused-1280.png).

Correction ciblée de `SourceInvoiceArchive` : le transfert attend maintenant que le titre existe réellement, y compris si le détail arrive avant la liste de l’archive, puis évite de voler le focus si l’utilisateur l’a déplacé. Vérifications : `npm run lint`, `npm run build`, `npm test` (33 Node/CSS, 119 Vitest) et rendu Chrome 154/CDP passent. Le runner, son compte temporaire, ses ports et son conteneur PostgreSQL ont été nettoyés ; seuls les cinq anciens conteneurs démo ont été observés et laissés intacts. CUA voit une fenêtre Chrome native existante mais n’expose toujours aucun navigateur/onglet contrôlable ; le zoom Chrome natif et le lecteur d’écran réel restent à faire. Le contrôle direct Histoire → archive est désormais répété pour 2023, 2025 et 2026 sur le même seed synthétique ; la couverture clavier consolidée figure ci-dessous. La vérification du scénario C3 dédié reste distincte et ouverte.

### Q2 — transitions clavier Histoire → archive, chapitres 2023/2025/2026 (2026-09-25)

Sur un runner `demo:fixtures` neuf (PostgreSQL tmpfs), la recherche Histoire de chaque pièce synthétique a été rendue à 320×1000 et 1280×1000. Tab atteint le lien source au 18e arrêt à 320 px et au 25e à 1280 px ; Entrée ouvre `/orders?source=…#invoices`. Après chargements de la liste et du détail, le titre `h3` reçoit le focus visible (`outline: solid 3px`) et se trouve entièrement dans le viewport. `document` et `body` restent à la largeur exacte du viewport. Les requêtes observées après activation sont toutes GET ; aucun brouillon, reçu ou mouvement n’a été créé. La pièce 2023 a zéro ligne et aucun mouvement associé ; les pièces 2025 et 2026 indiquent qu’un mouvement de simulation préexistant est lié.

Captures inspectées : 2023 — Histoire [320](evidence/q2-c3-chapters/history-2023-keyboard-320.png), [1280](evidence/q2-c3-chapters/history-2023-keyboard-1280.png), archive [320](evidence/q2-c3-chapters/source-2023-focused-320.png), [1280](evidence/q2-c3-chapters/source-2023-focused-1280.png) ; 2025 — Histoire [320](evidence/q2-c3-chapters/history-2025-keyboard-320.png), [1280](evidence/q2-c3-chapters/history-2025-keyboard-1280.png), archive [320](evidence/q2-c3-chapters/source-2025-focused-320.png), [1280](evidence/q2-c3-chapters/source-2025-focused-1280.png) ; 2026 — Histoire [320](evidence/q2-c3-chapters/history-2026-keyboard-320.png), [1280](evidence/q2-c3-chapters/history-2026-keyboard-1280.png), archive [320](evidence/q2-c3-chapters/source-2026-focused-320.png), [1280](evidence/q2-c3-chapters/source-2026-focused-1280.png).

Il s’agit du seed UI synthétique `demo:fixtures`, pas de la fixture narrative `demoStory.integration.test.ts` : cette preuve couvre la découverte et l’ouverture clavier des pièces par année, pas la chaîne complète suggestion → décision → commande → réception → KPI/rejeu. Aucun état métier n’a été écrit. L’utilisateur confirme que la page de connexion apparaît, mais le contrôle natif échoue encore (`browsers: []`, `getApp("Google Chrome")` → `cgWindowNotFound`). Zoom natif à 200 % et lecteur d’écran réel restent non vérifiés.

### Q2/C3 — confirmation de réception conservée après actualisation (2026-09-25)

La revue C3 précédente n'exposait pas son annonce de succès après réception :
`PurchaseReceiptReview` la stockait localement, puis disparaissait quand
`OrderHistory` rechargeait une commande arrivée au statut terminal. La notice
est maintenant conservée et rendue avec `role="status"` par l'historique parent.

Sur un `demo:fixtures` neuf à PostgreSQL tmpfs, une commande et sa facture de
fixture ont été préparées dans le seul compte jetable. Dans Chrome headless à
390×1000, la notice « Réception simulée enregistrée; facture rapprochée. Aucun
stock réel n’a changé. » reste visible après démontage du formulaire et lecture
actualisée : la commande est `simulated_received`, avec une seule réception
simulée. Le stock et sa révision sont identiques avant/après ; `document` et
`body` restent à 390 px ; le focus revient au résumé de la commande. Entrée a
soumis la réception depuis le vrai bouton. Sélection de facture et référence
de livraison ont été posées par le harnais DOM : ce n'est pas une preuve de
saisie complète au clavier. Capture inspectée :
[confirmation après réception](evidence/c3-receipt-success/receipt-success-390.png).

`npm run lint`, `npm run build`, `npm test` (33 contrôles Node/CSS, 119 tests
Vitest) et `git diff --check` passent. Le runner, ses identifiants temporaires,
son profil Chrome et ses ports ont été supprimés/fermés ; aucune donnée
persistante Kookia n'a été utilisée. CUA natif, lecteur d'écran réel et zoom
natif 200 % restent non vérifiés. Commit local `2af8b44`, sans push.


### Q2/C3 — Historique multiannuel rendu sur fixtures isolées (2026-09-25)

Chrome headless 154 a rendu les fenêtres du 1er au 30 juin 2023, 2024, 2025
et 2026, chacune avec une date « Connu au » du 25/09/2026. Les réponses
comptaient respectivement 1 366, 1 347, 1 305 et 1 329 événements ; 20 cartes
sont visibles au premier lot. Les cartes montrées couvrent des productions et
ventes de scénario étiquetées simulation, des pièces d’archive en 2025–2026,
et des mouvements d’hypothèse identifiés séparément. Il s’agit du compte unique
`demo:fixtures` sur PostgreSQL tmpfs avec sources anonymisées, jamais d’activité
du compte Kookia.

À 390×844, les quatre rendus d’événements n’ont aucun débordement horizontal.
Le fil d’Ariane expose désormais « Historique » (plus « Histoire ») pour
`/history` et ses routes imbriquées. Tab atteint le bouton de menu, le compte,
les trois filtres de dates, la recherche et son bouton ; les champs date ont un
focus visible de 3 px, y compris pendant leur navigation segmentée. Aux
largeurs 320, 360, 390, 768 et 1280 px, le document reste exactement à la
largeur du viewport. Captures QA inspectées ci-dessus.

`npm run lint`, `npm run build` et `git diff --check` passent. Le runner
`demo:fixtures`, son conteneur identifié `kookia-demo-223745cf-bde`, le profil
Chrome jetable, les ports et le fichier d’identifiants ont été arrêtés ou
supprimés ; aucun compte ni stock Kookia conservé n’a été consulté ou modifié.
CUA natif reste indisponible (`browsers: []`), donc lecteur d’écran natif et
zoom Chrome réel à 200 % non vérifiés. Cette preuve améliore le rendu des
chapitres par année, mais ne constitue pas encore un unique parcours UI allant
de la correction d’une pièce à l’impact ; C3 demeure partiel.

### Complément Q2/C3 — réception rapprochée et navigation clavier du Bilan (2026-09-25)

Dans le bac local isolé `demo:fixtures` sur PostgreSQL tmpfs, la réception déjà
soumise a été vérifiée en lecture seule : la commande passe à
`simulated_received`, sa ligne de 1 L est entièrement reçue et reliée au brouillon
source, dont l’état devient `received`. La réception porte la provenance
`demo_simulation`. Le stock d’huile reste à 0,35 L, révision 2, et aucun mouvement
de stock n’est créé au 25/09. Aucun compte Kookia persistant n’a été consulté ou
modifié ; aucune seconde soumission n’a été tentée. Cela prouve le rapprochement
dans le bac QA, pas une activité restaurant.

La revue Chrome/CDP du Bilan a révélé que les deux tableaux de `SalesMetrics`
étaient tabulables, mais que celui par date et article ne répondait pas à ←/→.
Les deux régions réutilisent maintenant le gestionnaire de défilement clavier et
un texte d’aide accessible. À 390 px, la zone du tableau passe de `scrollLeft`
0 à 71 après ArrowRight, sans débordement du document (`document` et `body`
restent à 390 px). À 320 px, Tab atteint « Ventes par date et article » avec un
focus visible de 3 px ; la page reste à 320 px et la capture QA est
[conservée ici](evidence/q2-analytics-keyboard/sales-date-region-keyboard-320.png).
Le rendu a aussi été inspecté à 1280 px. Ces données d’écran restent une preuve
QA technique, sans valeur métier.

Vérifications : `npm run lint`, `npm run build`, les deux tests ciblés de
simulation (4 tests) et `git diff --check` passent. La soumission C3 n’a pas été
rejouée au clavier et l’impact ultérieur n’a pas été vérifié dans ce même parcours ;
C3 demeure partiel. CUA natif (`browsers: []`), lecteur d’écran et zoom natif
200 % restent indisponibles/non vérifiés.
