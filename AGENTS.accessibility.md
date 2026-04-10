# AGENTS.accessibility.md

## Rôle
Cet agent gouverne l’accessibilité, la sémantique HTML, l’usage clavier, la gestion du focus, la lisibilité des états et les patterns inclusifs d’interaction pour KOOKIA.

À activer dès qu’une tâche touche :
- formulaires
- boutons et liens
- dialogues
- tableaux / listes
- navigation
- messages de feedback
- contenu dynamique
- flux de focus
- couleur / contraste
- motion

---

## Qualification obligatoire avant action
Avant de modifier un comportement accessible, déterminer si la tâche est :
- correction sémantique
- correction clavier
- correction focus
- accessibilité formulaire
- correction message / statut
- correction visuelle liée au contraste
- support reduced motion
- clarification lecteur d’écran

Puis identifier :
- qui a besoin de l’information
- quel parcours existe sans souris
- ce qui change dynamiquement
- ce dont le sens dépend aujourd’hui uniquement de la vue, de la couleur ou du mouvement

---

## Règles d’accessibilité
- Préférer d’abord la sémantique native HTML.
- Utiliser le bon élément avant d’ajouter de l’ARIA.
- Tout contrôle interactif doit être atteignable au clavier et compréhensible.
- Le focus doit rester visible.
- Les labels doivent exister et être correctement associés.
- Les erreurs et statuts doivent être perceptibles.
- Ne jamais faire dépendre le sens uniquement de la couleur.
- Respecter `prefers-reduced-motion`.

---

## Règles de sémantique
- Utiliser `button` pour les actions et `a` pour la navigation.
- Utiliser une hiérarchie de titres logique.
- Utiliser des listes pour des collections.
- Utiliser des tableaux seulement pour de la vraie donnée tabulaire.
- Utiliser des champs de formulaire avec label, description et erreur associée.
- Éviter les `div` ou `span` cliquables.

---

## Règles clavier et focus
- Toute interaction utile doit être faisable sans souris.
- Ne pas casser l’ordre de tabulation.
- Dans les dialogues ou overlays, gérer le focus explicitement.
- Après une action async, conserver ou restaurer le focus à un endroit logique si sinon l’utilisateur est perdu.
- Les styles de focus ne doivent pas être supprimés sans alternative accessible forte.

---

## Feedback et contenu dynamique
- Les états de chargement doivent être perceptibles.
- Les erreurs de validation doivent dire ce qui ne va pas et, si possible, comment corriger.
- Les messages success / warning / error doivent être compréhensibles sans la couleur seule.
- Les actions en icône seule doivent avoir un nom accessible.
- Les changements dynamiques importants doivent être annoncés correctement.

---

## Règles visuelles d’accessibilité
- Maintenir un contraste suffisant.
- Supporter le zoom et l’augmentation de texte sans casser le layout.
- Éviter les cibles tactiles trop petites.
- Garder les écrans denses lisibles.
- Le mouvement ne doit jamais être nécessaire pour comprendre un changement d’état.

---

## In scope
- HTML sémantique
- labels et descriptions
- comportement clavier
- gestion et visibilité du focus
- décisions visuelles liées au contraste
- reduced motion
- communication des erreurs et statuts

## Hors scope
- réécrire le produit autour d’hypothèses d’accessibilité non demandées
- ajustements purement décoratifs sans impact utilisateur

---

## Patterns recommandés
- contrôles natifs
- labels visibles
- helper text lié aux champs
- styles `:focus-visible`
- résumés d’erreurs explicites pour formulaires riches
- noms accessibles sur les boutons icône

---

## Anti-patterns
- containers non sémantiques cliquables
- formulaires sans labels
- focus invisible
- warnings uniquement par couleur
- animations excessives pour exprimer un état
- contrôles icône non nommés

---

## Checklist de fin
- l’interaction fonctionne au clavier
- les éléments sémantiques sont corrects
- labels et messages sont bien associés
- le focus reste visible et logique
- la couleur n’est pas l’unique vecteur de sens
- reduced motion est respecté quand pertinent
