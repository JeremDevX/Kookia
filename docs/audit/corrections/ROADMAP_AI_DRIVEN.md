# Roadmap Sprint par Sprint - Mode AI Driven

Date: 2026-02-27
Portee: execution des 24 problemes du registre avec un process optimise AI Driven.

## 1) Objectif
Executer les corrections avec:
- delai court,
- risque controle,
- qualite mesurable,
- tracabilite forte entre probleme -> code -> validation.

## 2) Hypotheses de capacite
Capacite cible minimale:
- 1 Tech Lead humain (decision produit/technique),
- 1 AI Builder (implementation),
- 1 AI Reviewer (revue diff + risques),
- 1 QA humain (validation fonctionnelle critique).

Cadence:
- sprint de 1 semaine (5 jours ouvres),
- release hebdo en fin de sprint.

## 3) Operating Model AI Driven (optimise)
## 3.1 Roles
- Human Tech Lead
  - priorise, tranche les options, valide definitions de done.
- AI Planner
  - transforme un probleme en plan executable fichier par fichier.
- AI Builder
  - implemente, execute lint/build/tests, met a jour docs du ticket.
- AI Reviewer
  - review orientee risques (bug, regressions, perf, accessibilite).
- QA Humain
  - valide les flux critiques metier.

## 3.2 Workflow standard par ticket (T0 -> Done)
1. Intake
- selection 1 ticket depuis `docs/audit/corrections/Px-xx/README.md`.
- definir scope strict (pas de "bonus fix" hors ticket).

2. Plan court
- AI Planner genere plan en 6-12 actions max.
- Lead valide avant codage.

3. Build
- AI Builder code en commits atomiques.
- verification locale continue.

4. Verify
- gates minimales obligatoires:
  - `npm run lint`
  - `npm run build`
  - tests lies au ticket (si existants)

5. Review
- AI Reviewer: findings classes par severite.
- correction immediate des findings P0/P1.

6. Validate
- QA humain sur checklist ticket.
- mise a jour statut ticket (`open` -> `in_progress` -> `done`).

7. Merge
- merge seulement si gates vertes + checklist fonctionnelle cochee.

## 3.3 WIP limits (cle d'optimisation)
- max 2 tickets en parallele par lane.
- max 1 ticket P0 en cours a la fois.
- aucun ticket P1/P2 ne commence si ses dependances P0 ne sont pas `done`.

## 4) Plan macro des sprints
## Sprint 0 (J0-J2) - Setup AI Factory
But: installer le systeme de delivery AI Driven avant volume.

Tickets:
- P0-01 (lint)
- socle P1-11 (outillage test minimal)

Sorties attendues:
- lint/build gates stables,
- workflow PR standardise,
- templates de validation prets.

Exit criteria:
- `lint` et `build` passent en continu,
- 1er ticket ferme de bout en bout avec process complet.

## Sprint 1 (Semaine 1) - Stabilisation produit immediate
But: supprimer les bugs visibles et stabiliser le rendu.

Tickets:
- P0-03
- P0-04
- P0-05
- P0-06
- P1-06
- P1-07

Sorties attendues:
- bugs critiques stock/production corriges,
- base CSS coherente,
- navigation topbar/support fonctionnelle.

Exit criteria:
- zero bug reproduit sur P0-03/P0-04,
- zero variable CSS non definie,
- plus de classes utilitaires orphelines sur ecrans critiques.

## Sprint 2 (Semaine 2) - Convergence architecture data
But: passer de pages->MOCK direct a pages->hooks->services.

Tickets:
- P0-02
- P2-04
- P1-10
- P2-05

Sorties attendues:
- pages principales debranchees des imports `MOCK_*` directs,
- types importes depuis `src/types`,
- README realigne.

Exit criteria:
- grep `MOCK_` absent des pages,
- code mort majeur traite (integre ou retire),
- doc architecture coherente avec runtime.

## Sprint 3 (Semaine 3) - Logique metier prediction/commande
But: rendre la priorisation et les actions commande fiables.

Tickets:
- P1-01
- P1-02
- P1-03
- P1-04
- P2-02

Sorties attendues:
- regle urgence metier validee,
- dashboard ne propose que des actions actionnables,
- dates robustes timezone,
- formulaires mieux valides.

Exit criteria:
- scenarios commande/prediction stables,
- zero confusion "confidence seule = urgence".

## Sprint 4 (Semaine 4) - UX, A11y, persistance, perf
But: finaliser la robustesse utilisateur et la performance.

Tickets:
- P1-05
- P1-13
- P1-08
- P1-09
- P1-12
- P2-03
- P2-01

Sorties attendues:
- modales accessibles et lock scroll robuste,
- settings analytics persistants,
- styles Input centralises,
- chunk initial reduit,
- mutations DOM imperatives supprimees,
- constantes metier externalisees.

Exit criteria:
- checklist a11y modales validee clavier,
- warning bundle reduit ou supprime,
- UX stable desktop/mobile.

## Sprint 5 (Semaine 5) - Hardening et qualite continue
But: verrouiller non-regression et cadence durable.

Tickets:
- completion P1-11 (suite de tests cible + couverture critique)
- dette residuelle issue des revues sprints 1-4

Sorties attendues:
- regression suite utile sur flux critiques,
- quality dashboard de suivi en place.

Exit criteria:
- suite test executee en CI,
- taux de defects post-merge en baisse.

## 5) Plan de parallelisation (par lanes)
Lane A - Core Data & Domain
- P0-02, P2-04, P1-01, P1-02, P1-03, P1-04, P2-01

Lane B - UI/UX/A11y
- P0-03, P0-04, P1-05, P1-06, P1-07, P1-09, P1-13, P2-03

Lane C - Qualite/Perf/Doc
- P0-01, P0-05, P0-06, P1-10, P1-11, P1-12, P2-05, P1-08

Regle:
- lane C prepare les fondations avant acceleration lane A/B.

## 6) Rituels quotidiens (AI Driven)
## Daily 30 min (humain + AI)
- 10 min: tri ticket du jour (1 principal + 1 backup).
- 10 min: AI Planner genere mini-plan.
- 10 min: validation scope + risques.

## Build cycles (90 min)
- 60 min implementation AI Builder.
- 15 min verify (lint/build/tests cibles).
- 15 min AI review + fix findings.

## End of day (20 min)
- update ticket doc (statut, preuves, risques residuels).
- prepare prompt du lendemain avec contexte minimal.

## 7) Quality Gates obligatoires par PR
1. Gates techniques
- `npm run lint`
- `npm run build`
- tests lies au ticket (quand disponibles)

2. Gates fonctionnelles
- checklist ticket executee,
- capture de preuves (notes, screenshots, logs utiles).

3. Gates documentaires
- fiche ticket mise a jour,
- liens fichiers modifies ajoutes.

## 8) Templates de prompts (operationnels)
## 8.1 Prompt Planner
"Prends le ticket `Px-xx` et genere un plan de correction en <=10 etapes, avec risques et validations. Scope strict: uniquement fichiers lies au ticket."

## 8.2 Prompt Builder
"Implemente `Px-xx` selon le plan valide. Applique des commits atomiques. Execute lint/build. Mets a jour la fiche ticket avec statut et preuves."

## 8.3 Prompt Reviewer
"Fais une review orientee risques du diff `Px-xx`. Classe findings par severite. Verifie regressions possibles sur flux adjacents."

## 9) KPIs de pilotage (hebdo)
- Lead time ticket (open -> done)
- First pass green rate (PR verte sans rework majeur)
- Defect escape rate (bugs remontes apres merge)
- % tickets fermes avec preuves completes
- % pages debranchees des mocks directs
- taille chunk JS principal (trend hebdo)

Seuils cibles apres Sprint 3:
- first pass green rate >= 70%
- defect escape rate < 10%
- 100% P0 fermes

## 10) Backlog sequence exacte recommandee
Ordre recommande (maximisant dependances et quick wins):
1. P0-01
2. P0-03
3. P0-04
4. P0-05
5. P0-06
6. P1-06
7. P1-07
8. P0-02
9. P2-04
10. P1-10
11. P2-05
12. P1-01
13. P1-02
14. P1-03
15. P1-04
16. P2-02
17. P1-05
18. P1-13
19. P1-08
20. P1-09
21. P1-12
22. P2-03
23. P2-01
24. P1-11

## 11) Risques de programme et mitigations
- Risque: scope creep pendant migration P0-02.
  - mitigation: PRs petites par page, feature flags simples.
- Risque: regressions UI pendant P0-05/P0-06.
  - mitigation: revue visuelle systematique par page.
- Risque: surcharge doc non maintenue.
  - mitigation: update doc obligatoire dans definition of done.

## 12) Plan des 48 prochaines heures (demarrage immediat)
Jour 1:
- fermer P0-01,
- lancer P0-03.

Jour 2:
- fermer P0-03,
- fermer P0-04,
- preparer inventaire detaille P0-05.

Condition de go Sprint 1:
- gates vertes,
- 2 P0 fermes,
- workflow AI Driven operationnel prouve sur au moins 2 tickets.
