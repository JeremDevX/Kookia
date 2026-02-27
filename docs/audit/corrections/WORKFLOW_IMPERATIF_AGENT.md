# Workflow Imperatif Agent (Normatif)

Version: 1.0
Statut: obligatoire
Portee: tout ticket de correction dans `docs/audit/corrections/Px-xx/README.md`

## 0) Regles absolues
- L'agent DOIT suivre ce workflow dans l'ordre.
- L'agent NE DOIT PAS sauter une etape obligatoire.
- L'agent NE DOIT PAS etendre le scope sans validation explicite du Lead.
- L'agent DOIT tracer toutes les preuves de validation dans la fiche ticket.

## 1) Entree ticket (obligatoire)
1. Charger la fiche ticket cible `Px-xx`.
2. Verifier les dependances dans l'index corrections.
3. Refuser le demarrage si une dependance bloquante n'est pas `done`.

Sortie attendue:
- statut ticket passe a `in_progress`.

## 2) Cadrage strict (obligatoire)
1. Reformuler l'objectif en phrase testable.
2. Lister les fichiers autorises a modification.
3. Definir la check-list de validation technique et fonctionnelle.

Interdit:
- modifier un fichier hors liste sans ajout explicite dans la fiche ticket.

## 3) Reproduction / preuve de probleme (si applicable)
1. Reproduire le probleme.
2. Capturer commande/resultat minimal.
3. Identifier la cause racine probable.

Si non reproductible:
- marquer "non reproductible" avec contexte exact (env, route, donnees).

## 4) Plan d'implementation (obligatoire)
1. Produire un plan en 6-12 actions max.
2. Ordonner du plus structurel au plus local:
- types/config
- services/hooks
- pages/composants
- styles
- docs
3. Associer un risque principal a chaque action.

## 5) Implementation (obligatoire)
1. Appliquer des changements atomiques.
2. Verifier compilation locale apres chaque bloc critique.
3. Garder compatibilite avec le style/architecture existants.

Interdit:
- suppression destructive non demandee,
- refactor global hors ticket,
- dette ajoutee sans justification documentee.

## 6) Verification technique (gate obligatoire)
Executer dans cet ordre:
1. `npm run lint`
2. `npm run build`
3. tests lies au ticket (si presents)

Gate:
- si un gate echoue, retour en etape 5.

## 7) Verification fonctionnelle (gate obligatoire)
1. Executer la check-list ticket.
2. Verifier les flux adjacents a risque de regression.
3. Noter resultats (OK/KO) point par point.

Gate:
- si KO, retour etape 5.

## 8) Mise a jour documentaire (obligatoire)
1. Mettre a jour la fiche ticket:
- statut final,
- fichiers modifies,
- commandes executees,
- resultats,
- risques residuels.
2. Mettre a jour index/roadmap si sequence impactee.

## 9) Cloture ticket
Condition unique de cloture (`done`):
- gates techniques verts,
- check-list fonctionnelle validee,
- documentation a jour,
- aucun blocage critique ouvert.

## 10) Gestion des exceptions
## Blocage technique
- Documenter blocage + tentative + prochaine action.
- Escalader au Lead avec options A/B/C.

## Conflit de priorite
- Stopper implementation en cours.
- Revalider priorite avec Lead.

## Changement de scope
- Interdit sans approbation explicite.

## 11) Format obligatoire de compte-rendu ticket
- Ticket: `Px-xx`
- Objectif:
- Cause racine:
- Fichiers modifies:
- Validation technique:
  - lint:
  - build:
  - tests:
- Validation fonctionnelle:
- Risques residuels:
- Statut final: `done` / `blocked`

