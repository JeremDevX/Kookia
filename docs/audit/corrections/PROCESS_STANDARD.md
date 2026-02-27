# Process standard de correction (a appliquer a chaque probleme)

Ce process est la methode officielle du dossier `docs/audit/corrections`.
Chaque plan probleme doit l'appliquer avec des actions specifiques au contexte.

## Etape 1 - Cadrage
- Re-lire la fiche probleme du registre d'audit.
- Verifier le perimetre fonctionnel impacte.
- Identifier les dependances (problemes prealables / problemes bloques).

Livrables:
- objectif de correction formule en phrase testable,
- liste des fichiers cibles,
- definition de done.

## Etape 2 - Reproduction / diagnostic
- Reproduire le bug ou l'ecart (si applicable).
- Capturer l'etat actuel: commandes, captures, logs, warning lint/build.
- Localiser la cause racine (pas seulement le symptome).

Livrables:
- cause racine validee,
- scenario minimal de reproduction.

## Etape 3 - Design de correction
- Choisir l'approche technique la plus simple et maintainable.
- Evaluer impacts collateraux (UI, type, perf, accessibilite).
- Lister les tests a ajouter ou adapter.

Livrables:
- mini design de correction,
- plan de changements fichier par fichier.

## Etape 4 - Implementation
- Faire les changements atomiques par couche (types -> services/hooks -> pages/composants -> styles).
- Eviter les modifications hors perimetre.
- Ajouter commentaires uniquement si necessaire.

Livrables:
- code compile,
- lint local passe sur la zone modifiee.

## Etape 5 - Validation technique
- Executer verification minimale:
  - `npm run lint`
  - `npm run build`
- Executer tests disponibles; sinon tests manuels cibles.

Livrables:
- preuves de validation,
- liste des controles manuels executes.

## Etape 6 - Validation fonctionnelle
- Verifier le flux utilisateur complet lie au probleme.
- Verifier regressions sur flux proches.

Livrables:
- checklist fonctionnelle cochee,
- captures/notes de verification.

## Etape 7 - Documentation et tracabilite
- Mettre a jour:
  - la fiche probleme correspondante,
  - le changelog de correction,
  - la doc impactee (README/architecture).
- Referencer commit(s), PR(s), fichiers et lignes.

Livrables:
- documentation alignee,
- liens traces.

## Etape 8 - Rollout / suivi
- Definir risque residuel.
- Definir plan de rollback.
- Definir metrique ou signal de surveillance post-correction.

Livrables:
- plan de rollback,
- criteres de cloture du probleme.

## Template rapide de Definition of Done
Un probleme est cloture quand:
- la cause racine est corrigee,
- les validations techniques passent,
- le flux fonctionnel est verifie,
- la documentation est mise a jour,
- aucun effet de bord critique n'est observe.
