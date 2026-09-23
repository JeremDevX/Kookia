# Documentation Kookia

La lecture commence par la tâche à accomplir, pas par la technologie. Les deux
Jalons sont des **sources de cadrage** ; le code et les contrôles du dépôt font foi
pour les capacités disponibles.

| Besoin | Document |
| --- | --- |
| Utiliser l'application au quotidien | [Guide restaurateur](guide-restaurateur.md) |
| Reprendre et tester les flux développés | [Parcours techniques actuels](parcours-techniques-actuels.md) |
| Concevoir un parcours rapide et lisible | [Parcours produit cible](product-parcours.md) |
| Savoir ce qui existe et ce qui manque | [Référence technique](technical-development.md) et [écarts vérifiés](ecarts-techniques.md) |
| Construire dans le bon ordre | [Roadmap produit](plans/roadmap-produit.md) et [plan d'exécution vérifiable](plans/plan-execution.md) |
| Brancher caisse, OCR, position, météo et événements | [Contrats et flux de données](integrations.md) |
| Préparer puis évaluer les prévisions | [Plan du moteur de prévision](plans/forecast-engine.md) |
| Documenter les écrans et le langage visuel | [Règles d'interface](design-system.md) |

## Références et exploitation

- [Cadrage synthétique et traçable des Jalons](references/cadrage-jalons.md) :
  faits utiles, niveau de preuve, divergences et décisions encore ouvertes.
  Les fichiers originaux locaux ne sont pas nécessaires à la reprise du plan.
- [Ventes, indicateurs et baseline](sales.md) et [format CSV](sales-csv.md) :
  règles et limites des données enregistrées.
- [Simulation locale de Camille](plans/restaurant-simulation.md) : hypothèses,
  provenance, idempotence et retour arrière du jeu de démonstration.
- [Installation locale](setup-auth.md) et
  [preuves de migration](plans/database-migration.md) : usage développeur et
  historique de la persistance.
- [Guidance agentique](agentic-development.md) et
  [migration de guidance](plans/agentic-guidance-migration.md) : archives des
  décisions prises avant le backend actuel, pas description du runtime présent.

Les identifiants de démonstration ne figurent pas dans ces documents versionnés.
Sur le poste de travail autorisé, ils sont dans le fichier local ignoré par Git
`kookia-demo-access.local` à la racine du dépôt.
