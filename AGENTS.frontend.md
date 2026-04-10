# AGENTS.frontend.md

## Rôle
Cet agent gouverne React, TypeScript, le routing, les hooks, l’état client, la composition des composants et les détails d’implémentation front pour KOOKIA.

À activer dès qu’une tâche touche :
- composants React
- hooks
- routing
- formulaires
- état côté client
- view-models
- flux front
- composition de composants

---

## Qualification obligatoire avant action
Avant de modifier du front, classer la tâche :
- bug d’affichage
- bug d’interaction
- refacto de composant
- implémentation de feature
- flow formulaire
- routing / navigation
- nettoyage d’état
- cleanup performance
- correction accessibilité

Puis déterminer :
- si le comportement relève de **la vue**, de **la logique de présentation** ou du **domaine**
- si l’état est **local**, **dérivé**, **partagé** ou **alimenté par une source externe**
- si le changement appartient à un composant existant, à un hook, ou à un nouveau fichier

---

## Règles d’architecture front
### Frontières de composants
- Garder les composants centrés sur une seule responsabilité UI.
- Préférer une séparation **container / présentational** quand un composant mélange orchestration et rendu.
- Un composant qui gère layout et orchestration ne doit pas aussi porter une grosse logique métier.
- Extraire les blocs JSX répétés ou imbriqués quand cela améliore la lecture.
- Extraire le comportement non visuel dans un hook seulement s’il est réutilisable ou réduit réellement la complexité.

### Règles d’état
- Préférer **l’état local d’abord**.
- Ne pas remonter l’état si plusieurs siblings n’en ont pas réellement besoin.
- Ne pas créer d’état global pour des concerns UI éphémères.
- Préférer l’état dérivé à l’état dupliqué.
- Réduire le nombre de sources de vérité.
- Utiliser un reducer seulement quand les transitions d’état le justifient vraiment.

### Règles sur les hooks
- Un hook doit encapsuler un comportement, pas cacher des effets de bord sans rapport.
- Un hook doit exposer une API publique petite et claire.
- Scinder un hook s’il gère en même temps :
  - des effets non liés,
  - du mapping de données + events UI + validation + orchestration async,
  - plusieurs concepts métier.
- Ne pas créer de hook simple wrapper autour d’un `useState` trivial.

### Règles de routing
- Les composants de route doivent rester fins.
- Les fichiers route orchestrent données et composition de layout.
- Les détails de feature doivent vivre sous la couche route.
- La navigation doit être explicite et prévisible.
- Ne pas enfouir les décisions de routing dans des composants présentational profonds.

---

## Règles d’implémentation React
- Préférer les composants fonctionnels avec props explicitement typées.
- Préférer la composition à l’explosion de props.
- Ne pas passer de gros prop bags si une interface plus petite suffit.
- Limiter les booléens de contrôle ; quand la complexité monte, préférer des variants sémantiques ou des unions discriminées.
- Éviter la churn d’objets/fonctions inline quand cela nuit à la lisibilité ou à une stratégie de mémoïsation, sans faire du `useMemo` / `useCallback` réflexe.
- La mémoïsation doit être justifiée par un coût réel ou un besoin de stabilité référentielle.
- Utiliser `useEffect` seulement pour de vrais effets de bord.
- Si un `useEffect` sert à recalculer un état de vue dérivable à partir d’inputs existants, revoir le design.

---

## Règles TypeScript
- Pas de `any` sauf cas réellement contraint et correctement borné.
- Modéliser les états exclusifs avec des unions.
- Préférer des types étroits aux frontières.
- Utiliser des fonctions de mapping explicites pour transformer des données externes en structures sûres côté UI.
- Ne pas laisser des formes nullables, partielles ou brutes se propager profondément dans l’arbre UI.
- Préférer des constantes typées à des chaînes dispersées dans le JSX.

---

## Organisation de fichiers
Patterns recommandés :
- `Component.tsx`
- `Component.module.css`
- `useComponentLogic.ts`
- `component.types.ts` seulement si les types sont partagés et assez gros
- `component.mappers.ts` si on transforme des données brutes en view-model

Ne pas créer de mini-framework local dans un seul fichier.  
Ne pas découper prématurément un composant encore trivial.

---

## In scope
- structure des composants React
- gestion des events
- inputs contrôlés
- états loading / empty / error / success
- composition de routing
- gestion d’état front
- view-models typés
- feedback utilisateur et flow d’interaction

## Hors scope
- policies métier profondes qui relèvent du domaine
- design de persistance
- invention d’API contracts sans base réelle
- stratégie de style au-delà de ce que `AGENTS.ui.md` définit
- grosses réécritures d’architecture sans nécessité directe

---

## Patterns recommandés
- composant présentational + hook d’orchestration
- mapping en view-model avant le rendu
- petits primitives réutilisables pour les patterns UI répétés
- guard clauses pour aplatir la logique de rendu
- états UI pilotés par enum/union
- helpers dédiés pour parsing / validation de formulaires quand ils grossissent

---

## Anti-patterns
- JSX rempli de calculs métier
- page monolithe qui fetch, parse, valide, calcule, rend et notifie
- prop drilling profond alors que la composition suffirait
- état dupliqué entre parent et enfant
- mutations cachées
- logique pilotée par `useEffect` alors qu’elle devrait être synchrone et dérivée
- helper générique sans ownership clair

---

## Checklist de fin
- affichage et logique non visuelle sont raisonnablement séparés
- l’état est minimal et correctement placé
- le nom des composants colle à leur responsabilité
- les états limites existent si pertinents
- le code reste lisible sans commentaires inline
- la taille des composants et hooks reste maîtrisée
- les règles métier ne sont pas prisonnières du JSX
