# Règles d'interface — un geste clair à chaque écran

## Portée

Ce document complète le [parcours cible](product-parcours.md) et le
[guide restaurateur](guide-restaurateur.md). Il décrit **comment présenter**
l'état des opérations ; il ne change pas les règles de calcul. Les tokens
visuels actifs sont centralisés dans
[`src/styles/index.css`](../src/styles/index.css). Réutiliser les composants,
les styles et la navigation existants avant d'en ajouter.

## Cible : le restaurateur en activité

Concevoir pour un restaurateur, un chef ou une équipe qui prépare un service,
réceptionne une livraison ou termine sa journée. Leur expertise est le métier,
pas le logiciel. L'interface et ses textes doivent permettre de comprendre
**ce qui demande une action, quoi faire et quel sera le résultat**, sans aide.

Choisir le parcours le plus simple qui permet une décision éclairée. Chaque
champ, étape, option ou phrase doit aider la tâche en cours ; sinon, le retirer
ou le placer dans un détail accessible. La concision ne doit pas masquer une
quantité, une unité, une donnée manquante ou l'effet d'une validation.

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

## Parcours sans friction

- Demander seulement ce qui est nécessaire à l'action ; distinguer clairement
  les champs facultatifs. Réutiliser les informations fiables déjà connues,
  sans préremplir une donnée métier incertaine comme si elle était confirmée.
- Regrouper les informations utiles à une même tâche. Éviter les allers-retours
  entre écrans, la double saisie et les étapes sans décision réelle.
- Guider le passage entre écrans par une action qui annonce la destination ou
  l'effet : « Revoir la commande », « Retour aux stocks ». Après une action,
  rendre son résultat et la prochaine étape utile évidents, sans imposer un
  tutoriel, une redirection surprise ou un parcours bloquant.
- Conserver le contexte pertinent entre étapes et au retour : établissement,
  période, filtres, sélection et saisie en cours. Ne pas obliger à retrouver
  le produit ou à recommencer la tâche après une simple consultation.
- Réutiliser un même parcours de référence pour une même tâche, même s'il est
  accessible depuis plusieurs écrans. Éviter les écrans concurrents, formulaires
  en double et blocs répétés sans utilité distincte ; un rappel utile à la
  décision n'est pas un doublon à supprimer.
- Garder l'action principale visible et les options occasionnelles en second
  niveau. Ne pas ajouter un réglage pour une décision que l'interface peut
  résoudre simplement avec le contexte existant.
- Permettre de corriger sur place ; conserver la saisie et le contexte en cas
  d'erreur. Expliquer ce qui manque près du champ concerné.
- Réserver les confirmations aux effets qui les justifient, notamment les
  actions destructives ou engageantes. Préserver la revue du chef avant
  validation ; ne pas multiplier les dialogues pour consulter ou filtrer.

## Vocabulaire et états

| État | Texte court et action |
| --- | --- |
| Chargement | « Chargement des ventes… » ; ne pas afficher zéro provisoire. |
| Vide | « Aucune vente enregistrée » + importer/saisir. |
| Incomplet | « Journée à compléter » + ouvrir les lignes à corriger. |
| Périmé | « Dernier service enregistré le … » + mettre à jour. |
| Erreur réparable | « Ventes indisponibles » + réessayer ; conserver le reste de l'écran. |
| Estimation | « Sortie estimée » + base de calcul accessible ; ne pas la présenter comme une vente ou une perte enregistrée. |
| Simulation | Badge « Données de démonstration » près de la valeur ; ne pas la qualifier d'observation. |
| Commande validée | « Enregistrée, à transmettre » ; pas « envoyée ». |
| Source externe absente | « Non reliée »/« Position non vérifiée » ; montrer saisie ou CSV disponibles. |

Les termes techniques (`OCR`, endpoint, score de modèle, code HTTP) sont dans
les détails de diagnostic. Les états se lisent en texte ; la couleur seule
ne suffit pas. Les montants ont une devise et une nature explicite : coût
estimé, dépense reçue ou vente enregistrée. Un seuil ou une règle n'est pas une
« recommandation IA ». Les graphiques ne remplacent pas les nombres et les
dates de leurs sources.

## Wording : court, concret, métier

- Écrire en français courant, professionnel et direct. Vouvoyer lorsque l'on
  s'adresse à la personne ; préférer l'infinitif pour les actions.
- Employer les mots du travail quotidien : service, couverts, portions, fiche
  recette, stock, fournisseur, commande, livraison, pertes, coût matière.
  Garder le même terme pour la même notion entre écrans ; ne pas confondre une
  facture avec une livraison reçue, ni une suggestion avec une décision.
- Nommer l'action et son objet : « Ajouter un ingrédient », « Modifier la
  quantité ». Éviter « OK », « Gérer » ou « Valider » seuls lorsque l'effet
  reste ambigu.
- Garder une idée par phrase. Supprimer introductions décoratives, répétitions
  du titre, félicitations automatiques, promesses marketing et commentaires sur
  le développement. Ajouter une aide seulement si elle lève une vraie ambiguïté.
- Décrire un problème et le prochain geste utile, sans blâmer la personne.
  Ne jamais promettre une sauvegarde, un envoi ou une conservation de saisie
  que le fonctionnement réel ne garantit pas.
- Laisser visibles quantité, unité, période et nature du montant quand elles
  changent la décision. Placer le détail de calcul ou le diagnostic au second
  niveau ; garder un résumé de l'incertitude près du résultat.

Exemples à adapter au contexte et aux capacités réelles, pas des remplacements
automatiques dans tout le produit :

| À éviter | Préférer | Condition |
| --- | --- | --- |
| « Dashboard opérationnel » | « Aujourd'hui » | Vue des priorités du jour. |
| « Procéder à l'ajout d'un nouvel ingrédient » | « Ajouter un ingrédient » | Même action, sans phrase d'introduction. |
| « Veuillez renseigner une valeur valide » | « Indiquez une quantité supérieure à 0 » | Seulement si cette règle s'applique au champ. |
| « Erreur API 503 » | « Ventes indisponibles. Réessayez. » | Proposer « Réessayer » si l'action existe ; code dans le diagnostic. |
| « Votre commande a été traitée avec succès » | « Commande enregistrée, à transmettre » | La validation n'envoie rien au fournisseur. |
| « Optimisez vos performances grâce à notre IA » | « Pourquoi cette quantité ? » | Ouvre les raisons réellement utilisées pour la suggestion. |

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
