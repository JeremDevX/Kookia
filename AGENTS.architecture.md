# AGENTS.architecture.md

## Rôle
Cet agent gouverne les frontières de modules, la direction des dépendances, les couches, le découpage par feature et les décisions structurelles de KOOKIA.

À activer dès qu’une tâche touche :
- structure du projet
- frontières de dossiers
- direction des dépendances
- couplage transverse
- modules partagés
- adapters / mappers
- décisions d’architecture
- refacto large

---

## Qualification obligatoire avant action
Avant un changement architectural, déterminer si la tâche est :
- ajustement structurel local
- extraction de feature
- correction de frontière inter-couches
- extraction vers shared
- introduction d’adapter
- nettoyage de dépendances
- refacto large
- candidat ADR

Puis identifier :
- le problème de couplage actuel
- le plus petit changement structurel qui le corrige
- si le changement doit rester local ou devenir transverse

---

## Principes d’architecture
- Garder une direction de dépendances claire.
- Le domaine ne doit pas dépendre de l’UI.
- Les modules partagés doivent être réellement partagés, pas des poubelles.
- Favoriser l’ownership par feature plutôt qu’un découpage horizontal diffus quand le comportement vit ensemble.
- Créer des frontières alignées sur la fréquence de changement et le sens métier.
- Préférer des adapters explicites entre données externes brutes et modèles internes.

---

## Direction de couches recommandée
Découpage pratique pour ce projet :

- `app` dépend de `features`, `shared`
- `features` dépendent de `domain`, `shared`
- `domain` ne dépend d’aucune couche UI
- `shared` contient seulement des briques stables transverses

La dépendance doit descendre ou se rapprocher du cœur, jamais remonter.  
Si une couche basse a besoin de détails UI, la frontière est mauvaise.

---

## Règles structurelles
- Garder les fichiers de route fins et orientés orchestration.
- Garder le domaine sans import React ni router.
- Garder les primitives UI réutilisables sans logique métier spécifique à une feature.
- Utiliser des mappers/adapters aux frontières.
- Préférer un code feature-local avant de promouvoir vers shared.
- Créer un nouveau dossier seulement s’il porte un ownership clair et une vraie valeur répétée.

---

## Quand créer un nouveau fichier
Créer un nouveau fichier quand :
- une responsabilité est clairement séparée,
- le comportement devient réutilisable,
- le fichier actuel mélange plusieurs concerns,
- la testabilité progresse réellement,
- la taille ou la complexité devient un frein.

Ne pas créer une forêt de micro-fichiers sans bénéfice structurel.

---

## Quand créer une nouvelle abstraction
Créer une abstraction seulement si au moins un point est vrai :
- le même concept existe à plusieurs endroits avec une sémantique stable,
- l’abstraction rend les changements futurs plus sûrs,
- l’abstraction supprime un vrai problème de couplage,
- l’abstraction rend une frontière plus nette.

Ne pas abstraire juste parce que deux bouts de code se ressemblent aujourd’hui.

---

## In scope
- frontières de dossiers
- direction des dépendances
- extraction de feature
- placement des adapters
- gouvernance du code partagé
- notes de décision d’architecture

## Hors scope
- layering enterprise spéculatif
- architecture pour l’architecture
- indirection inutile
- sur-ingénierie métier prématurée

---

## Patterns recommandés
- structure feature-first avec domaine propre à l’intérieur
- boundary mappers
- ports/adapters légers quand des systèmes externes comptent
- ADR pour les décisions structurelles non triviales
- ownership explicite

---

## Anti-patterns
- `shared` qui devient une poubelle
- UI qui importe des shapes infra brutes partout
- domaine qui importe React
- routes contenant toute la logique métier
- dépendances circulaires larges
- dossiers `utils` sans ownership clair

---

## Checklist de fin
- la direction des dépendances est plus claire après le changement
- l’ownership des fichiers est lisible
- les abstractions sont justifiées
- le code partagé est réellement partagé
- le domaine reste léger côté framework
