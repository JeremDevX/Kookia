# Ventes enregistrées et baseline expérimentale

La page **Ventes** gère les articles vendus du restaurant, distincts des
ingrédients de stock. Ces articles et leurs ventes ne proviennent pas du seed de
démonstration. Chaque vente a une date de service, une quantité en unités, une
source (`manual` ou `csv`), un numéro de révision et l'auteur de la dernière
modification. La saisie, la correction et l'import ne modifient ni stock ni
commande.

Créer d'abord un article vendu, puis enregistrer une quantité pour une date de
service non future. Une vente déjà présente pour le même article et la même date
doit être **corrigée**, pas ajoutée une seconde fois. L'[import CSV Kookia](sales-csv.md)
présente les lignes avant confirmation, signale les rejets et évite le double
import d'un même fichier dans le restaurant.

## Indicateurs

Les quantités par article et par date proviennent exclusivement des ventes
enregistrées de la période choisie. Les totaux distinguent saisies manuelles et
imports CSV ; une correction conserve la provenance CSV. Une date sans saisie
n'est pas interprétée comme zéro vente. La comparaison avec la période
immédiatement précédente porte sur la **moyenne par jour avec ventes
enregistrées**, pas sur tous les jours calendaires. Elle n'est affichée que si
chaque période compte au moins sept jours observés et au moins la moitié de ses
jours calendaires. Ces chiffres ne mesurent ni économies ni gaspillage évité.

## Baseline

Pour chaque article, le serveur examine les **28 journées terminées** précédant
la date du jour (heure de Paris). Il exige une vente enregistrée pour chacun de
ces 28 jours calendaires ; un jour manquant n'est pas imputé à zéro. L'estimation
expérimentale pour aujourd'hui est la moyenne arrondie des sept derniers jours.
Le backtest prédit séparément chacun des sept derniers jours à partir de ses
sept jours **antérieurs**, puis affiche l'erreur absolue moyenne (EAM, en unités)
et l'erreur absolue pondérée (WAPE). Les articles incomplets ne reçoivent pas
d'estimation. Ce test rétrospectif interne ne constitue ni une confiance
calibrée, ni une validation terrain, ni le moteur IA « ventes + météo » ; la
baseline ne déclenche aucune recommandation ou commande fournisseur.

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
4. Avec moins de 28 jours consécutifs par article, vérifier que la baseline
   affiche « historique insuffisant » sans estimation. Sur un jeu de test de
   28 jours consécutifs, comparer l'estimation et les erreurs du backtest aux
   quantités saisies ; une journée manquante doit exclure cet article.
5. Se connecter avec un autre compte : ses articles, ventes, indicateurs et
   baseline ne doivent pas révéler ceux du premier restaurant. Aucune de ces
   opérations ne doit créer une commande ou modifier le stock.
