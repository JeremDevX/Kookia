# AGENTS.documentation.md

## Rôle
Cet agent gouverne la documentation développeur, les notes d’architecture, la documentation de features, la doc d’usage et la traçabilité des changements pour KOOKIA.

À activer dès qu’une tâche touche :
- README
- setup
- architecture
- comportement d’une feature
- ADR
- documentation de test
- notes d’exploitation
- onboarding dev

---

## Qualification obligatoire avant action
Avant de modifier la documentation, déterminer si la tâche est :
- documentation d’installation
- documentation d’architecture
- documentation fonctionnelle
- documentation de tests
- decision record
- note de migration
- note de troubleshooting
- note d’usage

Puis identifier :
- à qui le document s’adresse
- ce qui a changé dans la réalité
- si la documentation actuelle est obsolète, incomplète ou trompeuse

---

## Règles de documentation
- Documenter ce qui existe, pas ce qui est seulement prévu.
- Si un point est prospectif, l’indiquer clairement comme futur ou hypothèse.
- Garder les docs cohérentes avec le repo et la stack actuelle.
- Préférer des sections courtes avec des titres explicites.
- Utiliser des exemples quand ils enlèvent une ambiguïté.
- Garder les commandes copy-paste safe.
- Quand un comportement change, mettre à jour la doc concernée dans le même changement.

---

## Déclencheurs obligatoires de mise à jour
Mettre à jour la doc quand on change :
- les étapes d’installation
- les scripts
- les variables d’environnement
- l’architecture ou les frontières de modules
- le comportement public
- le routing si cela change la compréhension de navigation
- la stratégie de tests
- les conventions importantes
- les contraintes ou hypothèses majeures

---

## Types de documents recommandés
- `README.md` pour setup et vue d’ensemble
- `docs/architecture.md` pour les frontières système/module
- `docs/adr/*.md` pour les décisions techniques notables
- `docs/testing.md` pour la stratégie de test et son exécution
- doc spécifique de feature seulement si le comportement est non trivial ou transverse

Ne pas créer de documentation que personne n’utilisera.  
Si une petite section du README suffit, ne pas multiplier les fichiers.

---

## Style de documentation
- direct
- factuel
- peu bruité
- pas de ton marketing dans la documentation technique
- pas de termes vagues comme “robuste”, “scalable”, “clean” sans contenu concret
- expliquer les trade-offs quand ils comptent

---

## In scope
- installation
- scripts
- notes d’architecture
- explication de comportement
- decision records
- troubleshooting
- contraintes
- glossaire si le vocabulaire métier le justifie

## Hors scope
- roadmap spéculative déguisée en état courant
- documentation dupliquée dans plusieurs fichiers
- captures ou schémas qui vieillissent instantanément sauf besoin clair

---

## Patterns recommandés
- “Quoi / Pourquoi / Comment”
- “Prérequis / Install / Run / Test / Build”
- ADR avec contexte, décision, conséquences
- doc feature avec inputs, outputs, états, limites connues

---

## Anti-patterns
- documentation obsolète
- documentation en contradiction avec le code
- gros blocs de texte sans structure
- setup flou
- hypothèses cachées
- documentation d’internals mouvants mais inutiles

---

## Checklist de fin
- la doc reflète le comportement réel
- les commandes sont exactes
- l’audience est claire
- les contraintes modifiées sont documentées
- le futur n’est pas présenté comme déjà implémenté
