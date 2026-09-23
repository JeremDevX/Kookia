# Règles d'interface — un geste clair à chaque écran

## Portée

Ce document complète le [parcours cible](product-parcours.md) et le
[guide restaurateur](guide-restaurateur.md). Il décrit **comment présenter**
l'état des opérations ; il ne change pas les règles de calcul. Les tokens
visuels actifs sont centralisés dans
[`src/styles/index.css`](../src/styles/index.css). Réutiliser les composants,
les styles et la navigation existants avant d'en ajouter.

## Hiérarchie de lecture

1. **Où suis-je ?** Écran, établissement, période.
2. **Que faire ?** Une action dominante, libellée par son effet : « Importer
   des ventes », « Vérifier le stock », « Revoir la commande ».
3. **Pourquoi ?** Une raison brève, une source et une date proches du chiffre.
4. **Puis-je décider autrement ?** Modifier, écarter, revenir ; la conséquence
   de « Valider » est rappelée au point de décision.
5. **Comment creuser ?** Détail à déplier, historique, export ou paramètres,
   sans parasiter la première lecture.

Sur Aujourd'hui, un seul bloc « À faire » précède les cartes secondaires.
Sur Achats, la sélection et la revue précèdent les tendances ou simulations.
Sur téléphone, cartes en colonne et actions utilisables sans zoom ; les
quantités, unités et prix restent visibles au moment de confirmer.

## Vocabulaire et états

| État | Texte court et action |
| --- | --- |
| Chargement | « Chargement des ventes… » ; ne pas afficher zéro provisoire. |
| Vide | « Aucune vente enregistrée » + importer/saisir. |
| Incomplet | « Journée à compléter » + ouvrir les lignes à corriger. |
| Périmé | « Dernier service enregistré le … » + mettre à jour. |
| Erreur réparable | « Ventes indisponibles » + réessayer ; conserver le reste de l'écran. |
| Simulation | Badge « Données de démonstration » près de la valeur ; ne pas la qualifier d'observation. |
| Commande validée | « Enregistrée, à transmettre » ; pas « envoyée ». |
| Source externe absente | « Non reliée »/« Position non vérifiée » ; montrer saisie ou CSV disponibles. |

Les termes techniques (`OCR`, endpoint, score de modèle, code HTTP) sont dans
les détails de diagnostic. Les états se lisent en texte ; la couleur seule
ne suffit pas. Les montants ont une devise et une nature explicite : coût
estimé, dépense reçue ou vente enregistrée. Un seuil ou une règle n'est pas une
« recommandation IA ». Les graphiques ne remplacent pas les nombres et les
dates de leurs sources.

## Composants et interactions

- Lien pour naviguer ; bouton pour agir ; libellé de contrôle visible.
- Bouton de validation désactivé avec raison textuelle lorsque la commande
  comporte une ligne non admissible, une unité manquante ou un chargement.
- Confirmation de la commande après lecture des lignes ; jamais d'envoi
  fournisseur induit par la validation ou par la fermeture d'un dialogue.
- Messages de succès et d'échec proches de l'action, perceptibles par les
  technologies d'assistance. Le focus revient à l'origine après fermeture
  d'un dialogue et reste visible au clavier.
- Recherche, filtre et détails secondaires ne doivent pas déplacer
  l'action principale après chargement asynchrone. Préserver la saisie si une
  source échoue.

## Recette d'interface

Vérifier chaque écran sur petit téléphone et écran bureau, avec souris puis
clavier seul : ordre de lecture, tabulation, focus, annonce des erreurs,
retour des dialogues, noms de boutons, contraste des états, débordements,
quantités et unités. Réaliser ensuite les tâches du
[protocole terrain](product-parcours.md#recette-terrain-à-mesurer) avec de vrais
restaurateurs. Documenter ce qui est observé sans transformer une cible des
Jalons en résultat mesuré.
