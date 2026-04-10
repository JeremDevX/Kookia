# AGENTS.md

## Rôle
Ce fichier est le point d’entrée de tout agent IA travaillant sur KOOKIA.  
Il définit le workflow obligatoire, les règles globales d’ingénierie, le format de réponse attendu et l’aiguillage vers les agents spécialisés.

L’agent ne doit jamais appliquer toutes les règles mécaniquement.  
Il doit d’abord qualifier la tâche, déterminer les couches impactées, fixer le périmètre réel, puis activer uniquement les agents utiles.

---

## Contexte projet
KOOKIA est un produit numérique destiné aux restaurateurs, centré sur l’anti-gaspillage, le faible niveau de friction, la lisibilité opérationnelle et l’aide à la décision.  
La direction produit privilégie la simplicité, la traçabilité, l’explicabilité et la validation humaine plutôt qu’une automatisation opaque.

Stack front actuellement visible dans l’application :
- Vite
- React 19
- TypeScript 5.9
- React Router 7
- Vitest
- ESLint
- CSS Modules privilégiés pour le style des composants

---

## Workflow obligatoire avant d’écrire du code
Pour chaque tâche, l’agent doit déterminer explicitement :

1. **Le type de tâche**
   - correction de bug
   - feature
   - refactor
   - polish UI
   - correction accessibilité
   - documentation
   - tests
   - architecture / restructuration
   - performance
   - sécurité / validation

2. **Le périmètre**
   - ce qui doit changer
   - ce qui ne doit pas changer
   - si le changement est local, transverse ou architectural

3. **Les couches impactées**
   - UI
   - logique de présentation
   - domaine
   - routing
   - documentation
   - tests
   - accessibilité
   - architecture

4. **Les agents à activer**
   - `AGENTS.frontend.md`
   - `AGENTS.domain.md`
   - `AGENTS.ui.md`
   - `AGENTS.documentation.md`
   - `AGENTS.quality.md`
   - `AGENTS.testing.md`
   - `AGENTS.architecture.md`
   - `AGENTS.accessibility.md`

Si la demande est floue, l’agent doit prendre l’interprétation la plus étroite et la plus sûre à partir du code et du contexte.  
Il ne doit pas élargir le scope seul.

---

## Principes globaux
Ces règles s’appliquent partout, sauf si un agent spécialisé les affine.

### Principes produit
- Garder une expérience **simple, rapide, peu frictionnelle**.
- Préférer les **flows assistés** aux automatisations invisibles.
- Conserver le **contrôle humain** sur les actions impactantes.
- Rendre la sortie compréhensible : recommandation, état, erreur, prochaine action.
- Ne pas introduire de complexité qui ne sert ni le produit ni un besoin réel du moment.

### Principes de conception et de code
- Appliquer **KISS**, **SRP**, **DRY**, **YAGNI**, **composition plutôt que monolithe**, **explicite plutôt qu’implicite**.
- Séparer **affichage**, **orchestration d’état** et **règles métier**.
- Préférer des modules petits et focalisés à de gros fichiers multifonctions.
- Un fichier qui grossit trop est un signal de refacto, pas une réussite.
- Éviter les abstractions brillantes mais fragiles.
- Ne pas ajouter une librairie si la plateforme ou la stack actuelle résout déjà bien le besoin.
- Préférer des fonctions pures quand le comportement peut être modélisé sans couplage framework.
- Isoler les effets de bord et les rendre visibles.

### Seuils de refacto
Ce sont des signaux d’alerte, pas des lois absolues :
- composant React au-dessus de **150-200 lignes** : vérifier si logique, layout et sous-parties doivent être séparés
- hook custom au-dessus de **100-120 lignes** : vérifier si plusieurs responsabilités sont mélangées
- module utilitaire au-dessus de **80-120 lignes** : vérifier si plusieurs concerns coexistent
- CSS Module au-dessus de **250 lignes** : vérifier si le composant est surchargé ou si les tokens sont insuffisants
- fichier de tests au-dessus de **200 lignes** : vérifier si plusieurs comportements ou unités sont mélangés

Si un fichier dépasse un seuil, la réaction par défaut est :
1. vérifier si la taille est justifiée,
2. identifier les responsabilités mélangées,
3. découper par responsabilité si cela améliore lisibilité et testabilité.

---

## Discipline de scope
### In scope
- implémenter la demande
- corriger les problèmes proches qui bloquent la demande
- améliorer la lisibilité si c’est nécessaire pour la demande
- ajouter ou mettre à jour les tests directement liés
- mettre à jour la documentation directement impactée

### Hors scope
- réécritures non demandées
- migrations cachées
- churn de dépendances non sollicité
- renommages larges sans valeur directe
- changements d’architecture sans besoin concret
- cleanup opportuniste sans gain lié à la tâche

---

## Règles de sortie
- Par défaut, ne montrer **que les parties modifiées avec assez de contexte**.
- Fournir un fichier complet seulement si c’est explicitement demandé ou si le partiel serait trompeur.
- Ne pas ajouter de commentaires inline sauf demande explicite.
- Expliquer les choix séparément et brièvement.
- Exposer les hypothèses quand elles impactent la solution.
- Quand c’est utile, commencer par la liste des fichiers touchés.
- Si aucun test n’est ajouté, expliquer pourquoi.
- Si la tâche devrait être découpée, résoudre quand même entièrement l’étape courante.

---

## Quality gates avant de considérer la tâche terminée
L’agent doit vérifier :
- typage préservé
- exigences lint préservées
- pas de dead code ajouté
- naming cohérent avec le domaine
- accessibilité non dégradée
- états loading / empty / error gérés si nécessaire
- documentation mise à jour si comportement ou architecture changent
- tests ajoutés ou mis à jour si le comportement change

---

## Guideline d’organisation
Préférer une structure où les responsabilités restent évidentes.

Découpage recommandé :
- `src/app` pour shell, router, providers
- `src/features` pour les entrées de features et leur orchestration
- `src/domain` pour langage métier, règles, entités, policies
- `src/shared` pour UI réutilisable, hooks, helpers, constantes réellement partagés
- `src/styles` pour reset, tokens et couches globales seulement

Ne pas tout déplacer dans `shared`.  
Quelque chose n’est partagé qu’après une vraie réutilisation avec une sémantique stable.

---

## Quand activer chaque agent spécialisé
- `AGENTS.frontend.md` : React, hooks, routing, frontières de composants, état local
- `AGENTS.domain.md` : règles métier, modélisation, policies, invariants
- `AGENTS.ui.md` : interaction, CSS, cohérence visuelle, états, responsive
- `AGENTS.documentation.md` : README, ADR, doc technique, doc usage
- `AGENTS.quality.md` : smells, cohérence, maintenabilité, règles de revue
- `AGENTS.testing.md` : stratégie de test, types de tests, non-régression
- `AGENTS.architecture.md` : frontières de modules, dépendances, structure
- `AGENTS.accessibility.md` : sémantique HTML, clavier, focus, contrastes, AT

---

## Non négociable
- Ne jamais laisser des décisions métier directement dans le JSX si elles peuvent vivre dans une fonction, un mapper, un selector ou un hook.
- Ne jamais laisser les textes UI, labels et règles d’interaction dériver du comportement réel.
- Ne jamais ajouter un état qui peut être dérivé.
- Ne jamais introduire `any` sans justification forte et sans stratégie de confinement.
- Ne jamais masquer une hypothèse cassante.
- Ne jamais sacrifier la clarté pour une micro-optimisation sans preuve.
