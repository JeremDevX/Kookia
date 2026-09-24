# Ventes enregistrées et baseline expérimentale

La page **Ventes** gère les articles vendus du restaurant, distincts des
ingrédients de stock. Les saisies et imports (`manual` ou `csv`) restent séparés
des données de simulation locale, dont les ventes portent la source
`demo_simulation`. Chaque vente a une date de service, une quantité en unités,
un numéro de révision et l'auteur de la dernière modification. Les ventes de
simulation sont reliées aux productions générées et restent clairement
signalées comme telles dans l'historique, les indicateurs et les rapports : elles
ne sont pas des ventes terrain. La saisie, la correction et l'import ne
modifient ni stock ni commande ; le lien vente-production du jeu de démonstration
ne fait pas déduire automatiquement le stock par l'application.

Créer d'abord un article vendu, puis enregistrer une quantité pour une date de
service non future. Une vente déjà présente pour le même article et la même date
doit être **corrigée** ou réconciliée, pas additionnée une seconde fois.
L'[import CSV Kookia](sales-csv.md) conserve le lot et des snapshots de lignes
bornés sans conserver le fichier brut ; l'empreinte comprend aussi le mapping.
Les apports en conflit restent à revoir : remplacer ou garder l'existant sont
deux décisions explicites et historisées. Les corrections et annulations
gardent leur provenance et leur motif ; un remboursement signalé ne réduit pas
les unités vendues. Le **calendrier des services**
enregistre séparément, par date civile de Paris, si le restaurant était ouvert
ou fermé et si les ventes sont complètes, partielles ou manquantes. Une saisie
manuelle ou un import ouvre automatiquement le jour avec une couverture
partielle ; le restaurateur peut ensuite confirmer la revue complète. Un jour
fermé ne peut contenir de vente. Les anciens jours issus des ventes sont
migrés comme ouverts/partiels, jamais comme complets par supposition.

« Ouvert + complet » signifie que le relevé du service a été revu : un article
vendu sans ligne ce jour-là vaut alors zéro observé. Une date absente, une
couverture partielle ou manquante reste inconnue. Un jour fermé et confirmé
complet est un jour sans service, pas une ouverture à zéro. Les jours de service
sont stockés en date seule (`DATE`) : les heures d'enregistrement restent des
timestamps explicites, sans conversion implicite autour du changement d'heure.

## Indicateurs

Les quantités par article et par date proviennent des ventes présentes dans la
période choisie. Les totaux distinguent saisies manuelles, imports CSV et
simulation ; l'interface identifie explicitement les données de démonstration.
Une correction conserve la provenance CSV. Le total présente les lignes
enregistrées dans la période ; la comparaison et la moyenne ne reposent que sur
les jours **ouverts et complets**, y compris ceux où toutes les quantités
revues valent zéro. Les jours partiels, fermés ou inconnus ne sont pas comptés
comme jours ouverts observés. La comparaison n'est affichée que si chaque
période compte au moins sept jours ouverts complets et au moins la moitié de
ses jours calendaires. Le nombre de dates complètes et manquantes/partielles
reste visible. Ces chiffres ne mesurent ni économies ni gaspillage évité.

## Baseline

Le serveur examine les **28 dates civiles terminées** précédant la date du jour
(heure de Paris). Il exige une couverture complète pour chacune, ouverte ou
fermée et confirmée ; la moindre date absente ou partielle suspend toutes les
estimations. Sur une date complète, l'absence de ligne d'un article est un zéro
observé ; un jour non renseigné n'est jamais imputé à zéro. L'estimation
expérimentale pour demain est la moyenne arrondie des sept derniers jours
calendaires complets.
Le backtest prédit séparément chacun des sept derniers jours à partir de ses
sept jours **antérieurs**, puis affiche l'erreur absolue moyenne (EAM, en unités)
et l'erreur absolue pondérée (WAPE). Les articles incomplets ne reçoivent pas
d'estimation. Ce test rétrospectif interne ne constitue ni une confiance
calibrée, ni une validation terrain, ni le moteur IA « ventes + météo ». Lorsque
sa provenance est `demo_simulation`, il s'agit seulement d'un exercice sur les
quantités générées ; la baseline ne déclenche aucune recommandation ou commande
fournisseur. Si des lignes simulées et enregistrées coexistent dans la fenêtre
du backtest, les lignes simulées sont exclues, le mélange est signalé et aucune
estimation/backtest n'est publié : le calendrier actuel ne sépare pas la
complétude par source. Un résultat uniquement simulé reste étiqueté démonstration.

## Recette manuelle

1. Créer un article dans **Ventes**, saisir une vente, recharger la page et
   vérifier la date, la quantité, la provenance manuelle et les indicateurs.
   Corriger la quantité : l'historique et les indicateurs doivent suivre.
2. Préparer un CSV selon le [format](sales-csv.md) avec une ligne valide, une
   quantité invalide et un article inconnu. Vérifier l'aperçu, associer l'article
   inconnu ou le laisser rejeté, puis confirmer. Réimporter le même fichier :
   aucune vente ne doit être ajoutée. La saisie manuelle reste disponible.
3. Filtrer une période sans vente : l'historique et les indicateurs indiquent
   l'absence de données ; aucune évolution n'est calculée. Comparer ensuite
   deux périodes ayant chacune assez de jours renseignés.
4. Sans 28 jours complets, vérifier que la baseline affiche « historique
   insuffisant » sans estimation. Sur un jeu de test de 28 jours confirmés,
   comparer l'estimation et les erreurs du backtest aux quantités saisies ;
   une ligne d'article absente est zéro seulement si le calendrier du jour est
   complet, tandis qu'une date partielle/exclue suspend la baseline.
5. Se connecter avec un autre compte : ses articles, ventes, indicateurs et
   baseline ne doivent pas révéler ceux du premier restaurant. Aucune de ces
   opérations ne doit créer une commande ou modifier le stock.
