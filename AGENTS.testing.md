# AGENTS.testing.md

## Rôle
Cet agent gouverne la stratégie de test, le périmètre des tests, la non-régression et l’écriture de tests pour KOOKIA.

À activer dès qu’une tâche touche :
- comportement métier
- parsing / mapping
- validation
- états UI
- régressions
- flows de feature
- architecture de test
- quality gates

---

## Qualification obligatoire avant action
Avant d’écrire ou modifier des tests, déterminer si la tâche est :
- test unitaire domaine
- test utilitaire / mapper
- test de comportement composant
- test d’intégration
- test de non-régression
- test orienté accessibilité
- refacto de tests
- fermeture de trou de couverture

Puis identifier :
- quel comportement a changé
- quel échec coûte le plus cher
- quel niveau de test apporte le meilleur ratio signal / maintenance

---

## Conscience de la stack actuelle
Outillage visible actuellement :
- `vitest` présent
- couverture via `@vitest/coverage-v8`
- aucun package Testing Library visible dans le manifest fourni
- aucun `jsdom` visible dans le manifest fourni

Conséquence :
- les tests de domaine et d’utilitaires sont immédiatement en scope
- les tests de composants demandent d’ajouter l’infra de test navigateur si elle n’existe pas déjà ailleurs dans le repo

Ajouts recommandés si des tests composants deviennent nécessaires :
- `@testing-library/react`
- `@testing-library/jest-dom`
- `jsdom`

Ne jamais faire comme si les tests composants existaient déjà sans vérification.

---

## Règles de stratégie de test
Privilégier le plus petit test qui prouve le comportement important :
1. tests unitaires de domaine pour la logique pure
2. tests de mapper / validation pour les comportements de frontière
3. tests de composants pour les états visibles utilisateur
4. tests d’intégration plus larges seulement quand l’interaction entre parties est le vrai risque

Ne pas courir après le pourcentage de couverture sans discernement.  
Protéger d’abord les comportements risqués.

---

## Ce qu’il faut tester en priorité
### Priorité haute
- règles métier
- décisions de recommandation
- validation
- parsing / normalisation
- cas limites
- régressions sur bugs déjà rencontrés
- états loading / empty / error côté UI
- transitions d’état

### Priorité plus basse
- wrappers triviaux
- changements purement visuels sauf impact comportement ou accessibilité
- détails d’implémentation susceptibles de changer sans impact fonctionnel

---

## Règles de conception des tests
- Tester le comportement, pas les détails internes.
- Un fichier de test doit généralement cibler une unité ou une famille de comportements.
- Les noms de tests doivent décrire le résultat attendu.
- Préférer des entrées déterministes.
- Garder Arrange / Act / Assert évident.
- Pour le domaine, inclure bords et limites.
- Lors d’une correction de bug, ajouter un test de non-régression si c’est faisable.
- Éviter les snapshots comme stratégie par défaut.

---

## In scope
- tests unitaires de fonctions pures
- tests de mapper et parser
- tests de validation
- tests de non-régression
- tests de composants si l’infra existe
- amélioration de couverture quand elle protège un vrai comportement

## Hors scope
- inflation artificielle de couverture
- test de détails privés d’implémentation
- tests fragiles accrochés au bruit du markup
- sur-mocking de comportements simples et purs

---

## Patterns recommandés
- tests tabulaires pour matrices de règles
- fixtures explicites pour les cas métier
- petits builders de setup quand il y a répétition
- assertions sur résultats observables
- tests de régression nommés selon le bug ou la règle

---

## Anti-patterns
- gros fichiers de tests couvrant des sujets sans rapport
- snapshot-first
- patterns de requêtes fragiles
- tests qui rejouent l’implémentation ligne par ligne
- tout mocker
- sauter des tests silencieusement alors que le comportement a changé

---

## Checklist de fin
- le comportement modifié est protégé
- le niveau de test choisi est pertinent
- les tests sont déterministes
- les assertions collent à un résultat utilisateur ou métier
- l’absence d’infra nécessaire est signalée honnêtement quand c’est le cas
