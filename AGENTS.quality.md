# AGENTS.quality.md

## Rôle
Cet agent gouverne la maintenabilité, l’hygiène de code, la cohérence, les standards de revue, la détection de smells et la qualité statique pour KOOKIA.

À activer dès qu’une tâche implique :
- décision de refacto
- revue de code
- amélioration de maintenabilité
- cleanup de naming
- réduction de duplication
- homogénéisation
- détection de smells
- contrôle qualité avant clôture

---

## Qualification obligatoire avant action
Avant d’appliquer des règles qualité, classer la tâche :
- cleanup local
- refacto de maintenabilité
- réduction de duplication
- amélioration de lisibilité
- amélioration de typage
- correction de cohérence
- suppression de dead code
- détection de smell architectural

Puis identifier :
- si le code a un vrai problème ou seulement une différence de style
- si le cleanup est nécessaire pour la tâche courante
- si le bénéfice justifie de toucher le code maintenant

---

## Principes qualité
- Optimiser d’abord pour maintenabilité et justesse.
- Préférer une cohérence simple à une brillance locale incompréhensible.
- Supprimer la duplication seulement quand elle correspond à un comportement stable réellement répété.
- Ne pas abstraire trop tôt.
- Préférer un naming explicite à un code compact mais ambigu.
- Réduire la charge cognitive du prochain lecteur.

---

## Code smells
Considérer ces cas comme des signaux de refacto :
- gros fichiers à responsabilités mélangées
- forte imbrication
- booléens en cascade
- nombreuses props optionnelles aux combinaisons floues
- magic strings et magic numbers dispersés
- mapping ou formatting répétés
- guard logic répétée
- plusieurs sources de vérité
- gros fichier utilitaire sans ownership clair
- casts TypeScript utilisés comme béquille
- branches mortes et commentaires périmés

---

## Règles de naming
- Utiliser le vocabulaire métier quand le comportement est business-facing.
- Utiliser le vocabulaire UI quand le comportement est purement présentation.
- Éviter les noms vagues comme `data`, `item`, `handleThing`, `utils`, `helpers` quand un nom précis existe.
- Les fonctions doivent décrire une intention ou un résultat.
- Les booléens doivent se lire comme des faits.
- Éviter les abréviations non standard.

---

## Qualité statique
- Garder un esprit TypeScript strict même si la config n’est pas complètement stricte.
- Éviter `any`.
- Limiter les assertions et non-null operators aux cas réellement justifiés.
- Ne pas désactiver lint sans motif fort.
- Supprimer le code inutilisé au lieu de le garder “au cas où”.
- Préférer un chemin clair à plusieurs helpers qui se recouvrent partiellement.

---

## Déclencheurs de refacto
Un refacto est généralement justifié si :
- la même règle apparaît à plusieurs endroits
- un fichier mélange plusieurs concerns
- un petit changement oblige à comprendre trop de code sans rapport
- un composant devient difficile à tester
- le naming empêche de comprendre le comportement
- les conditions deviennent difficiles à raisonner
- la prochaine petite feature serait risquée dans l’état actuel

---

## In scope
- amélioration de maintenabilité utile à la tâche
- corrections de naming
- suppression de dead code
- réduction de duplication
- types plus clairs
- séparation de responsabilités
- simplification de conditions

## Hors scope
- churn purement stylistique
- gros reformatage sans raison
- remplacement de patterns juste par préférence personnelle
- réécriture large sans gain mesurable

---

## Patterns recommandés
- guard clauses
- petits helpers purs
- mappers explicites
- interfaces étroites
- naming cohérent
- fichiers focalisés

---

## Anti-patterns
- mega-components
- mega-hooks
- mega-utils
- abstractions one-shot déguisées en réutilisables
- dépendances implicites cachées
- changement de comportement silencieux pendant un cleanup

---

## Checklist de fin
- le change set est resté dans un scope justifié
- la lisibilité a progressé
- les noms sont plus précis
- aucun dead code n’a été ajouté
- les abstractions sont méritées, pas spéculatives
- la taille et la responsabilité des fichiers restent maîtrisées
