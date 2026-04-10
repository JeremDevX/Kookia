# AGENTS.ui.md

## Rôle
Cet agent gouverne la structure UI, l’UX, la stratégie CSS, les états visuels, le responsive et l’exécution des interactions pour KOOKIA.

À activer dès qu’une tâche touche :
- layout
- spacing
- styling
- micro-interactions
- responsive
- hiérarchie visuelle
- utilisabilité
- visibilité des états
- empty / loading / error states

---

## Qualification obligatoire avant action
Avant de modifier l’UI, déterminer si la tâche est :
- correction de layout
- correction responsive
- polish d’interaction
- amélioration de lisibilité / hiérarchie
- amélioration de visibilité d’état
- amélioration d’usage formulaire
- cohérence design
- correction visuelle liée à l’accessibilité

Puis identifier :
- l’objectif principal de l’utilisateur sur l’écran
- l’action primaire
- les actions destructrices ou sensibles
- les points de friction probables
- si l’écran est mobile-first, desktop-first ou réellement bi-format

---

## Principes UX KOOKIA
- Favoriser les **flows zéro friction**.
- Faire émerger vite l’action utile suivante.
- Ne pas surcharger les écrans avec de l’information de faible valeur.
- Rendre la valeur évidente : prévision, recommandation, économie, alerte, statut.
- Maintenir un haut niveau de confiance : montrer ce qui s’est passé, ce qui est suggéré, ce qui demande validation.
- Prioriser la clarté opérationnelle sur la décoration.

---

## Règles CSS
### Style global
- Utiliser un **reset CSS** ou une couche normalize au niveau racine de l’application.
- Définir des **tokens via variables CSS** pour :
  - couleurs
  - espacements
  - rayons
  - ombres
  - couches de z-index
  - échelle typo
  - timings de motion
- Le CSS global doit rester limité à :
  - reset / base
  - tokens
  - layout global quand il est réellement transversal

### Style composant
- Préférer **CSS Modules** pour le style local.
- Garder les styles au plus près du composant.
- Éviter toute fuite globale des styles de composant.
- Préférer les classes aux styles inline, sauf cas runtime très ciblé.
- Éviter les sélecteurs fragiles, trop profonds ou dépendants de la structure.
- Utiliser des noms de classes sémantiques liés au rôle, pas à un accident visuel.

### Responsive
- Penser mobile et densité d’information intentionnellement.
- Éviter le “desktop compressé sur mobile”.
- Préférer des layouts fluides, flexibles, wrap, gap.
- Concevoir pour du contenu réel : texte court, long, manquant, chargé.

---

## Règles de design visuel
- Une action primaire claire par zone.
- Préserver une hiérarchie lisible :
  - titre
  - contexte
  - donnée principale
  - donnée secondaire
  - actions
- Utiliser l’espace avant d’ajouter des bordures.
- Éviter les cartes bruyantes et la décoration gratuite.
- Réserver l’emphase forte à :
  - alertes
  - actions irréversibles
  - signaux d’économie / performance
  - problèmes critiques de stock

---

## Règles d’interaction
- Tout élément interactif doit avoir une affordance évidente.
- Les états doivent être visibles :
  - default
  - hover
  - focus
  - active
  - disabled
  - loading
  - error
  - success
- Ne pas cacher un feedback important dans du transitoire uniquement.
- Confirmer les actions destructrices ou à fort impact.
- Préférer la progressive disclosure quand une complexité secondaire existe.
- Respecter `prefers-reduced-motion`.

---

## Formulaires et saisie
- Les labels doivent rester visibles.
- Le placeholder n’est pas un label.
- Les inputs doivent communiquer le format attendu, l’intention et l’erreur.
- Les messages d’erreur doivent aider la correction.
- Grouper les champs et actions liés.
- Réduire au maximum la saisie manuelle.
- Préférer valeurs par défaut, suggestions et automatisation inspectable.

---

## États qui doivent exister si pertinents
- loading
- empty
- no results
- partial data
- recoverable error
- success / completion
- disabled / unavailable

Ne jamais livrer un écran correct uniquement dans le happy path.

---

## In scope
- layout et spacing
- stratégie CSS Modules
- variables et reset
- responsive
- signaux d’interaction
- hiérarchie visuelle
- clarté des flows UX
- gestion visuelle des états

## Hors scope
- définition de règles métier
- logique de routing profonde
- infrastructure
- stratégie de tests au-delà des implications d’état UI

---

## Patterns recommandés
- primitives UI réutilisables avec sémantique stable
- spacing et typo tokenisés
- états visuels explicites
- empty states avec action utile
- messages de statut courts et informatifs
- micro-interactions sobres, lisibles et peu animées

---

## Anti-patterns
- composants saturés de styles inline
- couleurs et espacements hardcodés partout
- formulaires pilotés par placeholder
- disabled states invisibles
- cartes imbriquées sans hiérarchie
- hacks pixel-perfect qui cassent sur contenu réel
- polish visuel qui dégrade la lisibilité opérationnelle

---

## Checklist de fin
- stratégie reset + variables respectée
- styles de composant réellement scopés
- action primaire évidente
- responsive pensé, pas subi
- états visuels complets
- aucune info importante dépend uniquement de la couleur
- l’interface reste simple même avec du vrai contenu
