# Alignement Figma : suivi initial

État au 2 novembre 2026. Cet inventaire est provisoire : les parcours protégés
et la plupart des états n'ont pas encore été comparés ou testés. La présence
d'une page dans le code ne prouve pas sa conformité.

## Routes

Le routeur est défini dans `src/app/router/AppRouter.tsx`. Les correspondances
entre les routes et les frames restent à vérifier. Pour chaque ligne, la fidélité
et le fonctionnement complet restent à vérifier ; aucune ligne n'est validée.

| Écran | Route | Implémentation | Couverture constatée | Priorité | Validation |
| --- | --- | --- | --- | --- | --- |
| Connexion | `/login` | `src/features/auth/pages/Login.tsx` | Page présente | P0 | Rendu local observé ; parcours à tester |
| Inscription | `/register` | `src/features/auth/pages/Register.tsx` | Page présente | P0 | Rendu local observé ; parcours à tester |
| Invitation | `/invite` | `src/features/invitations/InvitationAccept.tsx` | Connexion, acceptation et erreurs | P0 | États principaux ajoutés dans B ; revue visuelle et parcours à compléter |
| Configuration restaurant | `/setup` | `src/features/setup/SetupPage.tsx` | Création explicite sans catalogue initial | P0 | Parcours synthétique Firefox et tests locaux ; étapes Figma restantes |
| Aujourd'hui | `/` | `src/pages/Dashboard.tsx` | Page présente ; démarrage et panneaux conditionnels | P0 | À faire |
| Stocks | `/stocks` | `src/pages/Stocks.tsx` | Liste, ruptures, revue et comptage dans le code | P0 | À faire |
| Prévisions | `/predictions` | `src/pages/Predictions.tsx` | Page présente | P1 | À faire |
| Recettes | `/recipes` | `src/pages/Recipes.tsx` | Catalogue, anti-gaspillage, fiches et historique dans le code | P1 | À faire |
| Commandes et réceptions | `/orders` | `src/pages/Orders.tsx` | Préparation, commandes, factures et réceptions dans le code | P0 | À faire |
| Paramètres | `/settings` | `src/pages/Settings.tsx` | Restaurant, compte, fournisseurs et connexions dans le code | P1 | À faire |
| Bilan | `/analytics` | `src/pages/Analytics.tsx` | Bilan, ventes et estimations dans le code | P1 | À faire |
| Ventes | `/sales` | `src/pages/Sales.tsx` | Import, saisie, calendrier et rapprochement dans le code | P0 | À faire |
| Services | `/services` | `src/pages/Services.tsx` | Carte, prévision, fiche et incidents dans le code | P1 | À faire |
| Plus | `/more` | `src/pages/More.tsx` | Page présente | P2 | À faire |
| Historique | `/history` | `src/pages/Timeline.tsx` | Page présente | P1 | À faire |
| Ancien lien historique | `/history/replay/:id` | `src/app/router/AppRouter.tsx` | Redirection vers `/history`, query conservée | P2 | Vérifiée dans Firefox sur démo synthétique |
| Route inconnue | `*` | `src/app/router/AppRouter.tsx` | Redirection vers `/` | P2 | Vérifiée dans Firefox sur démo synthétique |

Les routes privées passent par `RequireAuth` ; les pages publiques par
`PublicOnly`. Les sous-vues et états de chaque page restent à inventorier et
valider individuellement. La matrice des composants transversaux utilisés figure ci-dessous ; leurs états restent à confronter aux maquettes.

### Correspondances à vérifier

Les références ci-dessous sont des candidats par intitulé ou rôle, pas des
correspondances validées. « À vérifier » signifie qu'aucune conclusion de
conformité n'est établie dans la dimension indiquée. Les chemins et priorités
figurent dans le tableau précédent ; les sous-vues demandent des lignes propres.

| Écran / route | Référence candidate | Structure | Informations | Fonctionnalités | Visuel | Interactions | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Connexion `/login` | A `673:43390` | Panneau de présentation et formulaire côte à côte | Textes adaptés aux capacités réelles | Souvenir de session et mot de passe oublié non disponibles | Comparaison Firefox partielle : structure et éléments principaux proches ; détails et proportions à affiner | Connexion factice vérifiée ; récupération de mot de passe absente | Écart métier |
| Inscription `/register` | B `128:232` ; A `673:43390` pour la direction visuelle | Présentation et formulaire à quatre champs | Nom, email, mot de passe et confirmation | Création de compte avant configuration ; invitations par lien manuel distinctes | Application et écran B comparés dans Firefox ; détails et états d’erreur à vérifier | Inscription factice vérifiée ; autres états à tester | En cours |
| Configuration `/setup` | A `673:43437` à `673:43559` | Quatre étapes avec progression et reprise | Jours d’ouverture distincts des horaires de service, utilisés pour les livraisons hebdomadaires ; exceptions non intégrées | Fournisseurs, récapitulatif et invitations manuelles disponibles | Rapprochement partiel ; comparaison précise à faire | Création, reprise, ajout fournisseur et retour testés sur données synthétiques | En cours |
| Aujourd'hui `/` | A `673:43621`, `673:43793` ; B `29:2` | Tâches regroupées ; autres écarts à vérifier | Indicateurs indisponibles explicités | Planning et notifications à confronter | Comparaison partielle | Firefox bureau et mobile ; autres états à vérifier | En cours |
| Stocks `/stocks` | A `673:44425`, `673:44584` | Inventaire groupé avec brouillon et validation | Dernier comptage distinct du stock théorique ; Ticket Z et OCR divergents | Contrôle des écarts et conflits ; reprise réseau | Comparaison partielle | Firefox synthétique : saisie, conflit, reprise et mobile ; accès local vérifié | En cours |
| Prévisions `/predictions` | A `673:46361` | Prévision des ventes avant besoins des sept prochains jours ; sorties estimées regroupées dans Bilan | Limites, provenance et météo appliquée distinguées ; stock non déduit | Calcul opérationnel existant ; couverts horaires et confiance absents | Comparaison Firefox : ordre et textes secondaires rapprochés ; graphique et colonnes de A absents | État partiel, méthode et mobile 390 px vérifiés ; autres états à vérifier | En cours |
| Recettes `/recipes` | A `673:45740`, `673:45766`, `673:45809` | Fiche détail ajoutée ; comparaison à poursuivre | Ingrédients ajustés aux portions, durée et étapes disponibles ; historique conservé | Import CSV avec association et revue | Rapprochement partiel | Firefox synthétique : portions, confirmation, fraction de pièce, mobile et historique des étapes | En cours |
| Commandes `/orders` | A `673:43938`, `673:44035`, `673:44142`, `673:44242`, `673:44919` | Tableau unique, sélection séparée ; réceptions regroupées | Compteurs hebdomadaires et dates dépassées ; priorités sans source fiable | Rapprochement à comparer | Alignement partiel | Firefox : réceptions bureau/mobile, planning et livraison synthétique ; autres états à vérifier | En cours |
| Paramètres `/settings` | A `673:46642`, `673:46754`, `673:46843` ; B `25:2`, `26:2` | Restaurant comparé : grille à deux colonnes ; autres rubriques à comparer | Champs supplémentaires pour contact, terrasse et horaires | Équipe et rôles disponibles ; invitations par lien manuel | Restaurant : comparaison Firefox partielle, jours d’ouverture harmonisés | Sélection des jours et focus vérifiés à 390 px sans enregistrer ; météo : erreur différée vérifiée | En cours |
| Bilan `/analytics` | A `673:46262`, `673:46361` | Vue d’ensemble : quatre indicateurs et navigation ; impact et raccourcis de A différents | Données absentes, valorisation partielle et exclusions distinguées | Export et sélection de période disponibles | Vue d’ensemble comparée dans Firefox ; cartes compactées | Période mensuelle, ouverture et fermeture de l’export, mobile 390 px vérifiés | En cours |
| Ventes `/sales` | B `8:2` ; A `673:44664`, `673:44732` | Sections principales rapprochées de B ; revue Ticket Z à poursuivre | Couverture et provenance explicitées | Transcription manuelle ; OCR absent | Firefox : vue d’ensemble comparée, grille des services alignée | Changement de service et mobile 390 px vérifiés ; brouillon Ticket Z protégé testé précédemment | En cours |
| Services `/services` | B `16:2` | À vérifier | Saisies de fiche protégées avant départ | Navigation interne et retour demandent confirmation | À vérifier | Firefox synthétique : lien, retour, changement de service et annulation vérifiés | En cours |
| Plus `/more` | B `22:2` | Cinq destinations et aide regroupées | Descriptions à confronter aux fonctions réelles | Destinations présentes | Espacements et titres rapprochés de B ; fil d’Ariane encore différent | Firefox : lien Recettes et mobile 390 px vérifiés ; autres liens à tester | En cours |
| Historique `/history` | B `18:2`, `21:2` | Filtres, légende, recherche et chronologie présents | Provenance et dates distinguées | Lecture seule ; date maximale actualisée | Comparaison partielle | Firefox : accès et mobile sans débordement ; autres états à vérifier | En cours |
| Ancien historique `/history/replay/:id` | Sans écran propre | Redirection vers Historique | Paramètre de recherche conservé | Ancien lien maintenu | Sans écran propre | Firefox : `/history/replay/ancien?type=stock` redirige vers `/history?type=stock` | Conforme pour la redirection |
| Route inconnue `*` | Sans écran propre | Redirection vers le tableau de bord | Sans contenu propre | Repli vers `/` | Sans écran propre | Firefox : `/route-inexistante` redirige vers `/` et affiche le tableau de bord | Conforme pour la redirection |

Le 3 novembre 2026, une inscription fictive complète dans Firefox a confirmé la séquence `/register` → restaurant → équipe → fournisseurs → finalisation → tableau de bord. Les frames A `673:43437` et `673:43467` montrent bien que ces étapes font partie du parcours d’inscription. L’étape Équipe a été espacée et son indicateur rapproché de A. Écarts restants : A prévoit des invitations par adresse et un envoi en fin de configuration ; l’application produit un lien à transmettre manuellement. Le retour depuis Équipe vers Restaurant n’est pas disponible après création de l’établissement ; sa prise en charge exige une modification du parcours enregistré. Les frames Fournisseurs `673:43514` et Finalisation `673:43559` ont été comparées dans Firefox à la démo : suppression de la carte Fournisseurs imbriquée, indicateur des étapes terminées et récapitulatif en cartes Restaurant, Équipe et Fournisseurs. Le formulaire fournisseur s’ouvre et bloque la progression pendant l’édition ; aucun débordement horizontal à 390 px. La maquette liste les membres et propose des modifications directes depuis le récapitulatif ; l’application n’affiche ici que le propriétaire et nécessite de revenir aux étapes précédentes.

Les cartes de configuration possèdent maintenant un en-tête explicatif séparé, conformément à A ; l’étape Équipe est intitulée « Invitez votre équipe ». Firefox a parcouru les quatre étapes jusqu’au tableau de bord sur base jetable et vérifié l’absence de débordement de Restaurant à 320 px. Les deux états Équipe de B ont été actualisés et contrôlés par capture Figma.

L’en-tête commun des quatre étapes affiche le numéro et une aide encadrée, comme dans A ; sur mobile, le numéro reste dans le sous-titre. Firefox a vérifié les étapes Restaurant et Équipe et le bouton d’aide à 320 px. Les deux écrans Équipe de B ont reçu le même en-tête ; leur rendu a été contrôlé par capture Figma.

Le 3 novembre 2026, les traits reliant les étapes de configuration ont été ajoutés sur bureau, comme sur A `673:43437`. Ils disparaissent sur mobile pour conserver la grille sur deux lignes. Firefox a confirmé l’affichage à 1280, 390 et 320 px, puis le passage Restaurant → Équipe sur un établissement fictif ; les étapes terminée et courante restent identifiées.

L’étape Équipe présente désormais le propriétaire avec identité et rôle dans une ligne dédiée, dans l’esprit de A `673:43467` ; le trait suivant une étape terminée est noir. Firefox a vérifié le passage depuis Restaurant, le rendu mobile à 320 px et les informations du compte fictif. Le mode d’invitation reste un lien manuel, contrairement à l’envoi par adresse montré dans A.

La première étape Restaurant a été rapprochée de A `673:43437` : couverts et adresse suivent les deux premiers champs, et les jours d’ouverture sont présentés sous forme de choix visibles. La distinction entre jours non renseignés et aucun jour ouvert est conservée. Sur données fictives, Firefox a vérifié la sélection, l’absence de débordement à 390 px et le passage à Équipe. Le brouillon est conservé en mémoire pendant la session de l’application, mais pas après un rechargement complet.

La frame A `673:46642` a été comparée aux paramètres Restaurant sur la démo : la grille et les champs gris correspondent, mais A montre aussi des préférences de notifications, langue et devise absentes de cette rubrique ; leur comportement doit être défini avant de proposer des contrôles fonctionnels. Le sélecteur des jours d’ouverture utilise désormais le même style dans la configuration initiale et les paramètres.

La frame A `673:46843` a été comparée à la rubrique Équipe dans Firefox : la liste des membres précède désormais les invitations, regroupées dans des cartes. Sur base jetable, création d’un lien, blocage des autres rubriques jusqu’à « J’ai terminé » et affichage à 390 px ont été vérifiés. Différences : A présente le propriétaire, les activités, un tableau des permissions et des invitations envoyées par email ; l’application liste les membres ajoutés et utilise des liens manuels, sans ces informations ni ces actions.

La frame Compte A `673:46754` a été comparée dans Firefox à la démo : la carte Profil affiche désormais une identité avec initiales issues du nom enregistré. La modification d’un nom fictif a actualisé ce repère ; aucun débordement à 390 px. La maquette prévoit photo, champs prénom/nom distincts, téléphone, fuseau, double authentification, gestion des sessions et abonnement ; ces fonctions ne figurent pas dans la rubrique actuelle. Le changement d’email et de mot de passe reste accessible dans des cartes distinctes.

La vue Bilan a été comparée à A `673:46262` dans Firefox : les textes secondaires des quatre indicateurs sont maintenant plus compacts. Les mesures affichées restent celles des opérations enregistrées ; économies, marge et impact environnemental de A nécessitent des données et méthodes fiables avant affichage. Les états détaillés et les autres vues restent à comparer.

La frame Prévisions A `673:46361` a été comparée à la démo Firefox : la prévision des ventes précède désormais les besoins, et les explications ont été compactées. A montre des couverts par heure, une confiance et des besoins rapprochés du stock ; les données actuelles fournissent des ventes par article et des besoins bruts. Une source de couverts et des règles fiables de disponibilité sont nécessaires pour reproduire ces mesures.

Dans Recettes, les fiches candidates issues de pièces sont désormais regroupées dans un panneau replié avec leur nombre : le catalogue est visible dès l’ouverture. Firefox sur démo synthétique a vérifié ouverture et fermeture au clavier, ouverture de l’éditeur et focus ; aucun débordement à 390 px. La frame A Recettes n’a pas pu être comparée lors de ce contrôle : son canevas est resté noir. Les états fermé et ouvert figurent dans B (`159:423` et `159:425`) ; leur comparaison visuelle dans Firefox reste à faire.

La vue Ventes B `8:2` a été comparée à la démo dans Firefox : les cinq champs de service sont regroupés sur grand écran et passent en colonne sur mobile. Changement midi/soir et absence de débordement à 390 px vérifiés sans enregistrement. La maquette A de Ticket Z montre une extraction automatique ; le parcours actuel reste une transcription manuelle à vérifier.

La revue Ticket Z B `35:143` a été comparée dans Firefox à un ticket image fictif : aperçu local et transcription restent côte à côte sur bureau ; le formulaire est désormais espacé et sans bordure native parasite. Une ligne fictive a été ajoutée puis enregistrée pour rapprochement ; affichage sans débordement à 390 px. L’extraction automatique reste absente, conformément au fonctionnement actuel.

## Vérification du workspace et de Firefox

Le 2 novembre 2026, VS Code affichait le dépôt `~/Documents/KookIA/kookia`
sur `main`. Le dépôt était propre et son dernier commit local correspondait
à `origin/main` (`101c693`). La copie du projet dans le workspace Codex
contient des modifications distinctes préexistantes ; elle ne constitue pas
le workspace VS Code identifié.

La source A a été ouverte en lecture seule avec Firefox MCP. La planche
présente les composants et les écrans desktop, notamment les parcours
commandes, réceptions, stocks, recettes et analytics. La consultation
visuelle est possible ; les propriétés structurées et les interactions
des maquettes restent à vérifier. Aucune comparaison avec l’application
locale ne découle de cette seule observation.

## Références Figma

La source A a été consultée en lecture seule dans le navigateur, sans MCP. La
page « Interface » présente les ensembles « KOOK.IA v2 — Écrans desktop » et
« KOOK.IA v2 — Composants ». Les écrans visibles couvrent notamment connexion,
tableau de bord, commandes, réceptions, stocks, recettes, fiches techniques,
analytics et paramètres. La vue d'ensemble du tableau de bord indique
1440 × 1507 px. Une session connectée dans Arc permet désormais de consulter
les propriétés visibles sans utiliser le MCP pour A. Les valeurs fines et les
correspondances de nœuds restent à vérifier. Les nœuds
suivants ont été identifiés dans l'arborescence ; ils ne constituent pas encore
une validation de correspondance avec le rendu applicatif.

Une nouvelle consultation anonyme confirme aussi des groupes consacrés aux
notifications, au rapport AGEC, aux fiches techniques et à l'import CSV. Les
libellés de groupes ne constituent pas un inventaire exhaustif des écrans.

| Maquette A | Nœud |
| --- | --- |
| Ensemble des écrans desktop | `673:43388` |
| Connexion et inscription (1440 × 1024) | `673:43390` |
| Configuration du restaurant | `673:43437` |
| Configuration — Équipe | `673:43467` |
| Configuration — Fournisseurs | `673:43514` |
| Configuration — Finalisation | `673:43559` |
| Tableau de bord — Vue d'ensemble | `673:43621` |
| Tableau de bord — Planning du jour | `673:43793` |
| Commandes — Recommandations | `673:43938` |
| Commandes — Panier | `673:44035` |
| Commandes — Commande confirmée | `673:44115` |
| Réceptions — Semaine | `673:44142` |
| Réceptions — Mois | `673:44242` |
| Stocks — Liste des produits | `673:44425` |
| Stocks — Inventaire mensuel | `673:44584` |
| Import — Validation des données extraites | `673:44664` |
| Import — Analyse en cours | `673:44732` |
| Commandes — Prévision et recommandations | `673:44765` |
| Commandes — Contrôle de réception | `673:44919` |
| Mes recettes — Toutes les recettes | `673:45740` |
| Mes recettes — Anti-gaspillage | `673:45766` |
| Recette — Velouté de fanes de carottes | `673:45809` |
| Recette — Pain perdu salé aux légumes | `673:45922` |
| Recette — Pesto de tiges d'herbes | `673:46035` |
| Recette — Suprême de volaille rôti | `673:46148` |
| Fiches techniques — Liste | `673:45044` |
| Fiches techniques — Choix de création | `673:45095` |
| Fiches techniques — Saisie manuelle | `673:45172` |
| Fiches techniques — Import CSV | `673:45326` |
| Fiches techniques — Association CSV | `673:45368` |
| Fiches techniques — Validation CSV | `673:45427` |
| Fiches techniques — Brouillon enregistré | `673:45582` |
| Analytics — Vue d'ensemble | `673:46262` |
| Analytics — Prévisions | `673:46361` |
| Paramètres | `673:46642` |
| Notifications et alertes | `673:46700` |
| Paramètres — Compte | `673:46754` |
| Paramètres — Équipe | `673:46843` |
| Tableau de bord — Notifications ouvertes | `673:46996` |
| Overlay — Notifications | `673:47169` |

Le nœud `673:43938`, sélectionné dans Arc le 2 novembre 2026, est intitulé
« Commandes — Recommandations » : largeur fixe 1440 px, hauteur 1024 px,
fond `bg/app` `#F7F9FB`. Il montre un tableau de recommandations, des filtres,
des quantités modifiables et un accès au panier. Ces propriétés constituent
une référence, pas une comparaison avec le rendu de l'application.
La frame A `673:43621`, consultée visuellement le 2 novembre 2026, présente
quatre indicateurs (couverts prévus, chiffre d'affaires estimé, alertes de
stock, commandes suggérées), un graphique de couverts, un contexte du jour,
des recommandations, des tâches et un bloc de stock critique. Le code de
`Dashboard.tsx` organise actuellement d'autres indicateurs autour d'une action
prioritaire, des besoins d'achat et de cartes Stocks/Ventes/Commande/Menu :
la structure et les informations divergent. Les valeurs de la maquette sont
des exemples ; leur affichage nécessite des sources réelles et qualifiées.
Un rendu isolé de `Dashboard` à 1440 × 900, avec données et services
synthétiques, confirme sa composition actuelle ; il ne reproduit pas le shell
complet et ne constitue pas une comparaison pixel à pixel. États vide,
chargement et erreur observés ; navigation réelle et données remplies restent
à vérifier. Le catalogue vide ne présente plus les indicateurs de stock comme
des zéros rassurants : tests ciblés et rendu synthétique confirment le message
et la priorité d'une commande existante.
L'audit des contrats ne trouve ni prévision de nombre de couverts ni chiffre
d'affaires estimé fiable : les couverts disponibles sont observés et les
prévisions portent sur des quantités d'articles. Les indicateurs du service
`insightsService` sont étiquetés `demo`. Les stocks à vérifier et suggestions
d'achat peuvent être issus respectivement du catalogue et du service de
suggestions, avec leurs limites, leur provenance et validation humaine. La
météo exige une commune confirmée et des données fraîches ; les événements ne
sont pas connectés. Ne pas confondre articles au panier et suggestions.
Le 2 novembre 2026, la carte « Contexte du jour » de A `673:43621` a été
observée dans Firefox : météo, événement et avis y sont regroupés. Le tableau
de bord réutilise désormais la météo partagée, indique les données partielles,
anciennes ou de test, et signale les événements et avis indisponibles. Les
impacts chiffrés et le badge IA de la maquette ne sont pas affichés : aucune
source opérationnelle ne les établit. Un rendu à données synthétiques a été
observé dans Firefox ; ouverture clavier des réglages, fermeture par Échap et
retour du focus vérifiés. Comparaison géométrique et états météo réels restent
à vérifier.
Le 3 novembre 2026, comparaison Firefox de la frame A `673:43621` et du tableau de bord connecté à la démo synthétique : les pictogrammes du contexte retrouvent leur fond gris et leur format carré. La grille générale est présente, mais le graphique des couverts manque faute de prévisions horaires et les cartes de recommandations et de tâches diffèrent encore de la maquette.
Le bloc « Tâches du jour » présente désormais des lignes compactes avec pictogrammes sur fond gris, dans l’esprit de A. Firefox sur données synthétiques a confirmé l’ouverture du menu et l’absence de débordement à 390 px ; les tâches affichées restent différentes de celles de la maquette, faute de sources équivalentes.
La liste Stocks a été comparée à A `673:44425` dans Firefox : les actions du titre sont regroupées et la pagination rejoint les filtres lorsque la largeur le permet. Sur démo synthétique, le passage à la page suivante et la recherche ont été vérifiés ; aucun débordement horizontal à 390 px. La colonne Valeur et le panneau de synthèse d’inventaire restent différents de A ; les garanties sur la provenance des stocks et les actions existantes sont conservées.

La maquette Stocks `673:44425` prévoit une valeur par produit. Le prix actuel
ne conserve ni base fiscale ni provenance ; le détail indique désormais que
son calcul à partir du stock théorique est indicatif. La colonne de liste reste
à définir avec un contrat de prix fiable, sans présenter une somme mélangée
comme une valorisation comptable. Le libellé du détail a été vérifié dans
Firefox sur mobile, en lecture seule.
La carte « Stock critique » de A `673:43621` montre trois produits, leurs
quantités, seuils et besoins estimés. Le tableau de bord présente maintenant
jusqu’à trois produits à vérifier, classés selon les statuts métier existants,
avec stock théorique, seuil et accès à leur fiche. Une quantité non comptée
reste « À vérifier », sans être qualifiée de rupture. Aucun besoin d’achat
n’est affiché sans source. Firefox a vérifié le détail d’un produit et le
rendu à 390 px sur des données synthétiques ; comparaison géométrique à faire.
Le 2 novembre 2026, une session du compte local autorisé a également permis
un contrôle Firefox sur la base restaurée : quatre indicateurs, contexte et
liens vers les produits présents ; aucun débordement horizontal détecté à
1440 et 390 px. Les dialogues météo et menu s’ouvrent au clavier et Échap rend
le focus. Aucune opération métier n’a été enregistrée ; la météo externe était
désactivée. Ces contrôles ne constituent pas une comparaison pixel à pixel.
La frame A `673:43793` ajoute une vue « Planning du jour » : indicateurs,
graphique par service, prochaines revues avec créneaux et participants, action
prioritaire et raccourcis. L’application propose maintenant `/?view=planning`,
avec horaires de service et réceptions datées issus des données enregistrées ;
elles distinguent les simulations et les lignes sans date. Les réunions,
participants et prévisions du visuel restent absents faute de sources. Les
états d’erreur sont indépendants ; le jour suit le fuseau de Paris. Firefox a
vérifié l’ouverture, le focus et l’absence de débordement mobile sur le compte
local, en lecture seule. Cette vue n’est pas encore conforme à la maquette.
Le nœud `673:44425` « Stocks — Liste des produits » mesure 1440 × 1374 px
et utilise le même fond `bg/app` `#F7F9FB`.
Le nœud `673:45326` « Fiches techniques — Import CSV » mesure 1440 × 1024 px.
Il présente trois étapes : dépôt, association des colonnes, puis vérification
et enregistrement. Les colonnes affichées sont article, fournisseur, unité,
prix unitaire HT et quantité. L'association, la validation et le brouillon
mesurent respectivement 1440 × 1326, 1440 × 2125 et 1440 × 2010 px. Le parcours d’import permet maintenant de choisir les colonnes, d’associer
chaque ingrédient à un produit du catalogue et de vérifier les quantités et
unités avant de préremplir l’éditeur. La création reste une action explicite ;
les prix et fournisseurs du fichier ne modifient pas le catalogue. Firefox a
vérifié le parcours jusqu’à l’éditeur puis son annulation, sans enregistrement.
La comparaison visuelle détaillée avec les maquettes reste à faire.

L'arborescence de la section desktop affiche les groupes suivants. Les nombres
sont les libellés Figma, non un décompte indépendant des variantes :

| Groupe A | Écrans annoncés | Contenu repéré |
| --- | ---: | --- |
| Connexion et onboarding | 5 | Connexion et quatre étapes de configuration du restaurant |
| Tableau de bord | 2 | Vue d'ensemble et planning du jour |
| Commandes et réceptions | 5 | Recommandations, panier, confirmation, calendriers semaine et mois |
| Stocks et import des ventes | 4 | Liste, inventaire mensuel, analyse et validation de l'import |
| Achats et contrôle des réceptions | 2 | Prévision et recommandations, contrôle de réception |
| Fiches techniques | 7 | Liste, choix, saisie manuelle, import, association et validation CSV, brouillon |
| Recettes et anti-gaspillage | 6 | Deux listes et quatre fiches de recette |
| Analytics et AGEC | 4 | Vue d'ensemble, prévisions, historique des prédictions, rapport AGEC |
| Paramètres et notifications | 4 | Paramètres, compte, équipe et notifications ; un overlay et un tableau de bord avec notifications apparaissent aussi dans l'arborescence |

Les identifiants, états, dimensions et correspondances des éléments non listés
dans le tableau des nœuds ci-dessus restent à relever. Les fonctions figurant
sur une maquette ne prouvent pas leur disponibilité technique.

Sur la frame Stocks, la zone Ticket Z affirme que les ventes mettent les stocks à
jour automatiquement et propose une lecture OCR. Le parcours actuel demande
une transcription puis une revue humaine (`SalesTicketImport.tsx` et
`ticketZService.ts`) ; aucun OCR n'est connecté. La maquette ne suffit pas à
justifier l'invention d'un fournisseur OCR ou d'une déduction automatique de
stock. Conserver une formulation et un parcours conformes aux capacités réelles
et aux invariants, puis documenter l'écart dans la recette de cette vue.

La source B (`zEnZ9HLwjcw2D5PUw9Phk0`), consultée et complétée via MCP,
contient une page « Dev Jerem Manquant » (`0:1`) et les écrans suivants :

| Écran | Nœud | Dimensions |
| --- | --- | --- |
| Ventes | `8:2` | 1440 × 2500 |
| Services et carte | `16:2` | 1440 × 2000 |
| Services — déclaration d’incident ouverte | `144:342` | 1440 × 2000 |
| Services — incident : lot écarté ; livraison reportée | `147:364`, `147:484` | 1440 × 2000 chacun |
| Historique vide | `18:2` | 1440 × 1250 |
| Historique avec événements | `21:2` | 1440 × 1450 |
| Plus | `22:2` | 1440 × 1250 |
| Fournisseurs | `25:2` | 1440 × 1100 |
| Nouveau fournisseur | `25:77` | 1440 × 1450 |
| Connexions | `26:2` | 1440 × 1450 |
| Tableau de bord première utilisation | `29:2` | 1440 × 1500 |
| Menu — préparation et surstock | `149:396` | 600 × 999 |
| Revue Ticket Z fictif | `35:143` | 1440 × 1600 |
| Réception partielle fictive | `36:2` | 1440 × 1500 |
| Inventaire — saisies à comparer (exemple fictif) | `62:2` | 1440 × 1500 |
| Inventaire — validation à vérifier (exemple fictif) | `62:109` | 1440 × 1500 |
| Équipe — lien d’invitation créé (exemple fictif) | `65:2` | 1440 × 1500 |
| Équipe — confirmer la révocation (exemple fictif) | `65:101` | 1440 × 1500 |
| Réceptions — ligne sans correspondance (exemple fictif) | `78:16` | 1440 × 1500 |
| Réceptions — écart de prix à justifier (exemple fictif) | `78:115` | 1440 × 1500 |
| Réceptions — rapprocher un avoir (exemple fictif) | `83:88` | 1440 × 1500 |
| Réceptions — pièces indisponibles (exemple fictif) | `90:22` | 1440 × 1500 |
| Réceptions — avoir rapproché (exemple fictif) | `96:23` | 1440 × 1500 |
| Réceptions — avoir : enregistrement à vérifier (exemple fictif) | `99:27` | 1440 × 1500 |
| Bouton moyen — variantes et aperçu | `73:10`, `73:11` | 430 × 190 ; 580 × 290 |
| Champ de saisie — normal, focus, erreur | `86:28` | 360 × 172 |
| Sélecteur — normal, focus, erreur et aperçu | `146:365`, `146:378` | 360 × 172 chacun |
| Présentation authentification — panneau réutilisable | `126:47` | 600 × 900 |
| Recettes — fiches candidates : panneau fermé, ouvert et confirmation d’écartement | `159:423`, `159:425`, `164:426` | 900 × 71 ; 900 × 492 ; 900 × 600 |
| Configuration — équipe : lien créé et lien masqué | `152:408`, `153:416` | 1440 × 1420 chacun |
| Invitation — connexion, inscription, acceptation, confirmation, lien invalide, session indisponible | `120:30`, `123:33`, `117:29`, `120:56`, `117:45`, `123:63` | 1440 × 900 chacun |

Le 3 novembre 2026, les éléments de B ont été regroupés en dix sections numérotées : composants, tableau de bord, ventes, services, historique et navigation, stocks, réceptions, avoirs, paramètres et équipe, invitations. Les cadres conservent leurs identifiants ; aucun dépassement des limites de section détecté. Les sections Réceptions, Avoirs et Invitations ont été observées dans Firefox ; les autres états et les liens du prototype d’invitation restent à vérifier. Le rangement reste à compléter avec les nouveaux éléments à créer.

Le 3 novembre 2026, la frame A `673:43390` observée dans Firefox montre la connexion, pas un formulaire d’inscription autonome. B comporte désormais la section « 11 · Inscription — accès » et la frame `128:232`, créée à partir du formulaire réel et des composants d’authentification existants. Le rendu et la police Poppins ont été contrôlés. La frame `130:268` représente l’erreur de confirmation différente, observée dans Firefox sur la démo avec données fictives ; les autres erreurs et liens de prototype restent à compléter.

Le 3 novembre 2026, l’état d’inscription « serveur indisponible » a été ajouté dans B (`138:305`). Placé initialement hors de sa section par erreur, il a été déplacé sous les deux états existants dans « 11 · Inscription — accès ». Le contrôle structurel ne détecte aucun débordement ni chevauchement entre sections ou entre leurs éléments directs. Le texte correspond au repli de l’application ; le rendu a été contrôlé par capture Figma. Dans Firefox, le canevas Figma est resté noir : le contrôle visuel dans ce navigateur reste à refaire.

La section B « 13 · Recettes — fiches candidates » présente le panneau fermé (`159:423`) et ouvert (`159:425`) avec une hypothèse fictive à revoir. Les deux états sont constitués de calques modifiables et utilisent les boutons existants. Le rendu ouvert a été contrôlé par capture Figma ; dans Firefox, le canevas est resté noir. L’état de confirmation d’écartement (`164:426`) reprend le texte et les actions de l’application. Les boutons Écarter et Annuler sont reliés aux deux états dans les propriétés du prototype ; le rendu a été contrôlé par capture Figma. Les clics du prototype restent à vérifier dans Firefox, dont le canevas demeure noir.

La section B « 12 · Configuration — invitations » contient l’état Équipe avec lien créé (`152:408`), absent de A. Il reprend le propriétaire, le rôle, la copie du lien et le blocage de la progression observés dans Firefox sur base jetable ; le lien représenté est fictif. La capture Figma montre des calques modifiables et sept instances, sans image intégrée ; aucun chevauchement de sections détecté. L’état suivant (`153:416`) masque le lien et réactive les actions ; « J’ai terminé » y est relié dans les propriétés du prototype. Cela ne prouve pas que le lien a été transmis. Le clic et la comparaison visuelle de B dans Firefox restent à vérifier.

La fenêtre B « Menu — préparation et surstock » (`149:396`) représente le brouillon, le choix d’un produit compté et les actions du menu, après observation de l’application dans Firefox sur démo synthétique. La fenêtre est rangée dans Tableau de bord, en calques modifiables avec neuf instances, sans image intégrée ; ses textes utilisent Poppins. Le rendu a été contrôlé par capture Figma. Le texte complet sur les limites du surstock est conservé ; l’ouverture depuis le tableau de bord et les deux fermetures sont reliées dans les propriétés du prototype. Les états de calcul, de résultat et d’erreur, le test des clics et le contrôle visuel du fichier B dans Firefox restent à compléter.

La vue B « Services — déclaration d’incident ouverte » (`144:342`) a été ajoutée après observation du formulaire réel dans Firefox sur démo synthétique. Elle présente la situation, le produit, la recette, la quantité facultative et le constat, sans prétendre modifier stocks ou achats. Les états ouvert et fermé sont reliés dans le prototype ; les réactions sont vérifiées dans Figma, mais pas les clics. Le rendu a été contrôlé par capture Figma : police Poppins, calques modifiables, sept instances et aucune image intégrée. Les trois sélecteurs utilisent maintenant le composant `146:365` : valeur éditable, chevron et états normal, focus et erreur ; couleurs et rayon reprennent les variables existantes. Aperçu et formulaire contrôlés par captures Figma. Les variantes « lot écarté » et « livraison reportée » ont été ajoutées après contrôle de leurs champs dans Firefox sur démo synthétique ; elles ont été vérifiées par captures Figma et restent à relier à une sélection interactive. Le contrôle visuel du fichier B dans Firefox reste à compléter.

Dans le prototype d’invitation de B, le bouton « Changer de compte » (`117:43`) mène maintenant à la connexion (`120:30`), comme la déconnexion du parcours réel. Les liens connexion, création de compte et acceptation ont aussi été relus dans les propriétés du prototype. Leurs clics restent à vérifier dans Firefox : le canevas y est actuellement noir.

Dans le prototype B, la validation de `83:88` pointe vers la confirmation `96:23` ; le bouton « Réessayer » de l’état `90:22` pointe vers l’exemple chargé `83:88` ; la réaction est vérifiée dans Figma, mais le clic reste à tester dans Firefox. Le 3 novembre 2026, Firefox sur base jetable a permis d’enregistrer un avoir fictif après réception : message de succès et rappel que le stock reste inchangé. Une réponse POST perdue a été simulée après acceptation serveur : après rechargement, l’avoir en attente est repris dans un second onglet avec la même opération et un seul avoir affiché ; le premier onglet détecte que la reprise est terminée. Le stockage local et Web Locks sont nécessaires : sans eux, l’envoi est bloqué. Le formulaire a été espacé et son sélecteur aligné sur les champs ; à 390 px, aucun débordement horizontal du formulaire ni de la page. Le code le place dans le détail d’une commande, alors que B le représente sur une vue dédiée ; la structure reste à rapprocher. L’état `99:27` a été contrôlé visuellement dans Firefox ; son lien vers la confirmation reste à tester par clic. La bibliothèque B comprend un bouton moyen à quatre variantes et un champ de saisie à trois états, liés aux variables. Trois instances du champ sont utilisées dans la maquette d’avoir ; libellés et messages restent séparés. Les écrans et l’aperçu sont constitués de calques modifiables et ont été contrôlés visuellement dans Firefox. Les liens de prototype, les autres composants, les états manquants et la fidélité complète à A restent à vérifier.

Sur l'écran Ventes (`8:2`), l'inspection relève notamment une navigation de
240 px, une barre supérieure de 61 px, un fond `#F7F9FB`, du texte principal
`#111111`, la police Poppins et des cartes blanches de rayon 8 px. Ces valeurs
proviennent de B et ne remplacent pas une vérification de la référence A ni une
comparaison avec l'application.

## Socle existant et premiers constats

- Tokens actifs : `src/styles/index.css` ; contrôle des valeurs CSS par
  `npm run check:css`. Les styles des pages sont principalement des fichiers CSS
  locaux, pas des CSS Modules.
- Primitives présentes : `src/components/common/Button.tsx`, `Input.tsx`,
  `Card.tsx`, `Badge.tsx` et `Modal.tsx`. Leur couverture, leurs variantes et
  leurs usages doivent être confrontés aux références.
- Navigation et structure : `src/components/layout/Layout.tsx`, `Sidebar.tsx`
  et `TopNav.tsx`. Le code ne déplace pas explicitement le focus vers le contenu
  après changement de route ; vérifier au clavier et avec lecteur d'écran avant
  de qualifier l'incident et sa correction.
- `Input` conserve désormais les descriptions fournies et leur ajoute le message
  d’erreur. Les indications de mot de passe sont reliées aux champs d’inscription
  et de compte ; association vérifiée dans Firefox, sans lecteur d’écran réel.

### Composants transversaux utilisés

Inventaire des composants `common` et `layout`, établi par recherche d'imports
de production. Leurs correspondances Figma et états rendus restent à vérifier.

| Composant | Usages de production et états repérés | Tests directs repérés dans `src` |
| --- | --- | --- |
| `Button` | Authentification, pages et composants métier ; cinq variantes, trois tailles, icône et attributs natifs | Aucun fichier direct repéré |
| `Input` | Authentification, configuration, stocks, compte et fournisseurs ; libellé, icône, aide et erreur | `common/Input.test.ts` : association de l’aide et de l’erreur, `aria-invalid` (rendu statique) |
| `Card` | Recettes, paramètres et composants analytics ; titre et action facultatifs | Aucun fichier direct repéré |
| `Badge` | Tableau de bord, recettes, stocks et connexions ; statut, libellé et couleur | Aucun fichier direct repéré |
| `Modal` | Compte, stocks, recettes, analytics, tableau de bord et réglages météo ; ouverture, largeurs, focus, Échap, défilement et fermeture bloquée | `common/Modal.test.ts` : bouton de fermeture désactivé ou actif (rendu statique) |
| `SplashScreen` | `App.tsx` ; attend la disponibilité et une durée minimale, puis disparaît | Aucun fichier direct repéré |
| `Layout` | `features/members/WorkspaceLayout.tsx` ; structure, menu mobile, zone de contenu et météo | Aucun fichier direct repéré ; `WorkspaceLayout.test.ts` substitue `Layout` par un mock |
| `Sidebar` | `Layout` ; navigation, sous-navigation, menu mobile et déconnexion | `layout/Sidebar.test.ts` : succès et échec de déconnexion avec dépendances simulées |
| `TopNav` | `Layout` ; fil d’Ariane, recherche produit, menu mobile et météo | `layout/TopNav.test.ts` : fil d’Ariane du tableau de bord selon l’URL (rendu statique) |
| `SidebarSubnav` | `Sidebar` ; sous-navigation et état actif | `layout/SidebarSubnav.test.ts` : liens, contexte et état actif pour plusieurs sections (rendu statique) |
| `RouteErrorBoundary` | `Layout` ; affichage d'erreur et rechargement | Aucun fichier direct repéré |
| `WeatherNavButton` | `TopNav` ; résumé météo et ouverture des réglages | `layout/WeatherNavButton.test.ts` : résumé, états et attributs du bouton (rendu statique) |
| `WeatherSettingsModal`, `WeatherSettingsContent` | `Layout` et modale météo ; réglage de commune et prévisions à la demande | `layout/WeatherNavButton.test.ts` vérifie aussi le rendu du contenu ; aucun test direct de la modale repéré |
| `ToastContext` / `Toast.css` | Messages temporaires et fermeture ; fournisseur de contexte partagé | Aucun fichier direct `ToastContext.test` repéré |

La recherche couvre les imports de production et les fichiers de tests directs ;
elle n'exclut pas les tests indirects. Les tests de rendu statique ne démontrent
pas le comportement dans un navigateur, le focus ou l'accessibilité réelle.

## Sous-vues et parcours identifiés dans le code

Inventaire statique, sans validation du rendu ni des interactions. Les états
conditionnels et composants indiqués restent à confronter aux maquettes.

| Écran | Sous-vues, actions et états | Implémentation principale |
| --- | --- | --- |
| Commandes | Préparer, suivi, pièces fournisseurs et calendrier des réceptions ; suggestions, sélection, quantités et validation ; recherche, filtres, date prévue et rapprochement | `src/pages/Orders.tsx`, `src/components/orders/` |
| Stocks | Tous, ruptures et à traiter ; recherche, filtres, ajout, détail, sélection pour commande et comptage ; ajustement et déclaration de perte | `src/pages/Stocks.tsx`, `src/components/stocks/` |
| Recettes | Catalogue, recettes réalisables, fiches techniques et productions ; recherche et tri ; édition, versions, production, refus et propositions issues de pièces | `src/pages/Recipes.tsx`, `src/components/recipes/` |
| Ventes | Services, saisie et correction ; import CSV, transcription Ticket Z, rapprochement, association article-recette et calendrier | `src/pages/Sales.tsx`, `src/components/sales/` |
| Services | Sélection du service, carte, prévisions, fiche et incidents ; plan, substitutions, validation et clôture | `src/pages/Services.tsx`, `src/components/services/` |
| Prévisions | Sorties estimées et prévisions de ventes ; filtres, détails, pagination, hypothèses et états sans données | `src/pages/Predictions.tsx`, `src/components/analytics/EstimatedOutflows.tsx`, `src/components/sales/SalesBaseline.tsx` |
| Bilan | Vue d'ensemble, ventes, sorties estimées et prévisions ; périodes, détails et export | `src/pages/Analytics.tsx`, `src/components/analytics/` |
| Tableau de bord | Indicateurs, action prioritaire, mise en route, prévision d'achat et idées de menu ; chargement, erreurs et données absentes | `src/pages/Dashboard.tsx`, `src/components/dashboard/` |
| Paramètres | Restaurant et horaires, compte, fournisseurs, connexions ; météo partagée dans une modale | `src/pages/Settings.tsx`, `src/components/settings/`, `src/features/account/` |

Les écrans de notifications existent dans A. Aucun client ni panneau de
notifications n'a été repéré dans `src/` ; le serveur expose une lecture et un
marquage comme lu. Une lecture sans document retourne désormais une liste vide ;
des alertes d’exemple déjà enregistrées peuvent subsister. Vérifier leur
provenance et leur actualité avant de les présenter comme opérationnelles. Les messages temporaires `ToastContext` ont un autre rôle.
La frame A `673:46700` prévoit des filtres Stocks, Recommandations et Livraisons
et une action « Tout marquer comme lu ». Le contrat actuel classe les alertes
en `warning`, `alert` et `info`, sans catégorie métier équivalente ; le marquage
accepte une liste d'identifiants. Un alignement nécessite donc d'établir des
sources et catégories fiables, sans transformer les alertes seedées en faits.

### Cohérence fonctionnelle à examiner

- Les lectures et mutations `/api/workspace` vérifient désormais que le compte
  associé au document correspond à la session, avant tout accès à l’espace.
  L’identité reste fixée pendant la vie du document pour protéger les actions
  différées ; une transition vers un autre compte recharge le document. Dans
  Firefox sur base synthétique, une saisie commencée sous A puis soumise après
  passage à B a été refusée, et les données de B sont restées intactes. Les
  mutations de compte et la déconnexion vérifient aussi cette identité avant
  de modifier la session ou les données. Firefox a vérifié qu’une déconnexion
  refusée préserve le brouillon et la session du second compte. Des réponses
  d’authentification `Set-Cookie` retardées peuvent encore arriver dans un ordre
  différent entre onglets ; la protection ne résout pas cette course. Le
  rechargement efface le brouillon en mémoire.
- Le contrôle d’origine serveur couvre désormais les requêtes `PUT` en plus de
  `POST`, `PATCH` et `DELETE` ; il ne remplace pas la vérification de session.

- Le calendrier des réceptions et le suivi des commandes présentent des vues
  différentes des mêmes commandes ; le calendrier renvoie au suivi pour agir.
  Cette réutilisation contextualisée ne démontre pas un doublon à supprimer.
- La réception directe d'une facture et le rapprochement d'une commande avec
  facture peuvent tous deux alimenter le stock. Le rapprochement enregistre en
  plus les lignes de réception et l'état de commande. Le serveur vérifie les
  réceptions existantes et les quantités. Pour deux factures manuelles de même
  fournisseur et référence, une confirmation explicite est désormais demandée
  avant crédit, sans bloquer les livraisons distinctes. La vérification est
  atomique et couvre réception directe et rapprochement. Si un fournisseur
  manque, les références identiques sont signalées par prudence ; deux
  fournisseurs connus différents restent distincts. Tests d’intégration et
  parcours Firefox synthétique vérifiés.
- Une correction locale vérifie l’unité explicitement renseignée sur une facture
  manuelle avant crédit du stock. Un test d’intégration a été ajouté pour le
  refus d’une unité incompatible et l’acceptation d’une unité compatible ; il a
  réussi dans `npm run verify:local-delivery` (75 tests d’intégration, dont ceux
  des factures). Une unité absente reste admise pour ce parcours.
- Le détail produit permet un ajustement négatif motivé par une perte ; la
  déclaration de perte structurée recueille davantage de contexte et utilise
  un autre service. Les effets et besoins diffèrent : comparer les parcours
  avant de décider s'ils doivent converger.
- Les modales de facture, commande, idées de menu, export, ajout ou modification
  de produit et suppression de compte bloquent désormais localement leur
  fermeture pendant l'opération. La croix est désactivée ; un test navigateur
  sur une modale isolée vérifie Échap et clic sur le fond pendant l'attente,
  puis Échap après reprise. Les parcours métier complets et la restauration du
  focus restent à vérifier. La modale météo bloque également la fermeture lors
  de la confirmation de commune : un test navigateur avec réponse différée a
  vérifié Échap, clic sur le fond et affichage de l'erreur. Le succès reste à
  vérifier en interaction. Le rapprochement de réception bloque le repli pendant
  l'enregistrement et conserve la commande lors d'un filtrage ; un test
  navigateur synthétique a vérifié ces cas, l'erreur et la notification après
  navigation. Un second banc synthétique a vérifié le succès différé, le retour
  du focus au résumé de commande, puis la notification après navigation pendant
  le rechargement. Lecteur d'écran réel et backend de ce scénario restent à
  vérifier.
- `SalesMetrics` est utilisé dans Ventes et dans Bilan : même composant et
  service, donc pas de règle dupliquée. Examiner si ces accès répondent à des
  besoins distincts avant de modifier la navigation. Les totaux du bilan et
  des métriques ne sont pas systématiquement interchangeables : ils distinguent
  différemment les données simulées et leur provenance.
- La prévision de ventes par article et la prévision d'un service utilisent
  des contextes et hypothèses distincts. La fiche de service conserve un
  instantané de la prévision validée. Les sorties estimées à partir des
  réceptions ne sont pas des ventes ; ne pas les fusionner par ressemblance.
- Après accès à une route protégée, la redirection après authentification a été
  corrigée localement pour préserver chemin, paramètres et fragment, y compris
  lors du passage entre connexion et inscription. Tests ciblés et TypeScript
  réussis ; en navigateur avec une API factice isolée, le passage connexion →
  inscription → connexion puis la connexion conservent l'URL complète. Une
  inscription soumise à la même API factice conserve aussi l'URL complète ;
  une session réelle reste à tester. Une correction locale distingue désormais
  session absente et erreur de vérification, avec réessai. Avec une API factice,
  le navigateur affiche l'erreur sur une route protégée puis ouvre la connexion
  après réessai et réponse 401. Tests ciblés réussis ; session réelle à vérifier.
- `Layout.tsx` cherche les ancres au changement d'URL alors que les pages sont
  chargées à la demande. Vérifier au chargement à froid si une cible absente au
  premier rendu empêche le défilement ; ce risque n'est pas encore confirmé.
- La première connexion sans établissement mène maintenant à `/setup` : les
  informations du restaurant sont saisies avant création, sans catalogue
  fictif. La progression restaurant, équipe, fournisseurs et récapitulatif est
  enregistrée sans migration et peut reprendre après rechargement. L’étape
  équipe propose des liens d’invitation à usage unique, à transmettre par le
  propriétaire ; aucun e-mail n’est envoyé automatiquement. Les rôles chef et
  cuisine sont contrôlés côté serveur et le propriétaire peut retirer un accès.
  Les fournisseurs utilisent les données réelles.
  Les établissements existants sans progression restent accessibles. Dans Firefox
  sur base jetable : reprise à l’étape équipe après rechargement, ajout d’un
  fournisseur, récapitulatif, retour à la route demandée et catalogue sans
  produit fictif vérifiés ; aucun débordement horizontal observé à 390 px.
  Les brouillons restaurant et fournisseur non enregistrés sont perdus au
  rechargement ; retour navigateur peut aussi effacer une saisie fournisseur.
- La consultation du menu sans document enregistré ne crée plus de plats
  d’exemple : un brouillon vide de révision 0 est affiché. La sauvegarde exige
  les trois plats et crée le document sous verrou ; les menus existants restent
  inchangés. Les nouveaux établissements ne reçoivent plus de catalogue initial.
  Le contrat et ses valeurs nulles sont précisés dans `docs/technical-development.md`.
- Une lecture des notifications sans document existant retourne désormais une
  liste vide, sans injecter les alertes d’exemple. Les notifications déjà
  enregistrées restent intactes. Le script de peuplement exige désormais une
  base locale `kookia_demo` et un compte temporaire unique explicitement ciblé ;
  cette vérification ne démontre pas à elle seule que la base est jetable.
- La lecture des indicateurs de démonstration retourne maintenant `null` en
  l’absence de document, sans création implicite. Les documents existants sont
  conservés ; les nouveaux établissements ne reçoivent plus de catalogue initial.
- Les lectures analytics et activity renvoient maintenant `null` si leur
  document manque ; elles ne créent pas de statistiques et les consommateurs
  concernés acceptent explicitement cette absence.
- Le risque d’injection automatique du catalogue est corrigé pour les nouveaux
  comptes : les routes workspace exigent un établissement créé par son
  propriétaire et ne lancent plus le seed. L’ancien peuplement reste réservé à
  la démo et aux fixtures explicites. Aucun espace existant n’a été vidé ou
  remplacé ; les données d’exemple déjà persistées doivent encore être
  identifiées au cas par cas avant toute intervention.

## Équipe : limites et validation

- La migration additive `20261102000000_invitations` a été appliquée à la base
  locale restaurée après accord explicite et sauvegarde vérifiée. Elle ajoute
  les tables d’invitations et d’appartenance sans modifier les données existantes.
- Sur base synthétique dans Firefox, les parcours chef et cuisine, leur accès
  aux stocks et la révocation ont été vérifiés ; les requêtes interdites sont
  refusées. Une opération déjà en cours lors d’une révocation peut encore
  aboutir. Les droits restants de la matrice Figma sont à préciser.
- Le lien est transférable et expire après sept jours ; l’adresse du compte
  n’est pas vérifiée et aucun envoi automatique n’est effectué. Une facture
  brouillon correspondant à une commande est visible en entier pendant sa
  réception. Un lien perdu avant copie doit être révoqué et recréé ; la
  navigation interne n’avertit pas systématiquement avant sa perte.

## Recette et dépendances

- Sur l'arbre local incluant les modifications préexistantes, la recette
  `npm run verify:local-delivery` a réussi le 2 novembre 2026 avec une base
  PostgreSQL temporaire : lint, builds web et API, 20 migrations, parité du
  schéma, 35 tests de scripts, 358 tests Vitest et 61 tests d'intégration.
  La sauvegarde et la restauration d'une donnée synthétique ont aussi réussi.
- Nouvelle exécution de `npm test` le 2 novembre 2026 : 35 tests de scripts
  réussis et 357 tests Vitest réussis sur 358. Un test de l'atelier documentaire
  a dépassé son délai de 5 secondes sous charge ; relancé seul, le fichier a
  réussi ses 6 tests. La suite complète n'est donc pas validée par cette exécution.
- La CI `.github/workflows/ci.yml` est déclenchée uniquement manuellement :
  aucun contrôle automatique sur push ou pull request n'est configuré dans ce
  fichier. Elle comprend notamment une base PostgreSQL isolée et les tests
  d'intégration. Son exécution sur le commit livré reste à vérifier.
- Vitest utilise un environnement Node ; les tests de composants par rendu HTML
  statique ne valident pas les interactions réelles, le focus ou le clavier.
- Le 2 novembre 2026, `npm run lint`, `npm run build` et `npm test` ont réussi
  sur l'arbre local contenant des modifications préexistantes. La première
  exécution simultanée des contrôles a dépassé le délai d'un test de l'atelier
  documentaire ; la suite complète relancée seule a réussi (358 tests Vitest
  et 35 tests de scripts).
- Le navigateur local a affiché les pages de connexion et d'inscription et le
  lien de l'une vers l'autre. Des parcours ciblés, dont l'authentification avec
  API factice, ont été vérifiés comme indiqué plus haut ; les sessions réelles,
  l'ensemble des parcours, le responsive et le lecteur d'écran restent à valider.
- Les tests d'intégration PostgreSQL et la démo isolée exigent Docker ; le
  daemon était inaccessible sans permissions supplémentaires lors du premier
  audit. La recette ci-dessus a été exécutée avec cet accès.
- Après autorisation explicite de lecture MCP sur A, un essai le 2 novembre
  2026 a échoué : limite d'appels du siège View atteinte. A reste consultable
  dans Arc. B a été inventoriée via MCP. Des rapprochements partiels sont décrits ci-dessus ;
  aucune comparaison visuelle exhaustive ni création Figma n'a été validée. A ne doit jamais être modifiée.
- Le dépôt local contient des changements préexistants sur le comptage des
  stocks. Les préserver et ne pas les inclure dans un lot sans vérification de
  leur provenance et de leur état.

## Ordre de travail

1. Compléter l'inventaire des frames et la matrice des composants et états ;
   relever les valeurs de référence accessibles sans modifier A.
2. Vérifier les parcours et l'accessibilité avec des données isolées, puis
   traiter les fondations et composants transverses selon les écarts prouvés.
3. Comparer chaque vue à sa référence, corriger et documenter les écarts ;
   créer dans B seulement les éléments manquants justifiés.
4. Exécuter les recettes, intégrer chaque lot validé et vérifier le résultat
   distant et la CI.
