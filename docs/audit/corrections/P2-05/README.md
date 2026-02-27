# P2-05 - README decale par rapport a l'implementation

## Traceabilite
- Source audit: [registre-problemes.md:L235](../../registre-problemes.md#L235)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P2`
- Depend de: [P0-02](../P0-02/README.md)

## Objectif (testable)
Le `README.md` doit decrire l'architecture actuellement active dans le code, expliciter les limites connues, et presenter un plan de migration sans promettre des mecanismes non branches.

## Cadrage strict
- Fichiers modifies autorises:
  - `README.md`
  - `docs/audit/corrections/P2-05/README.md`
  - `docs/audit/corrections/README.md`
- Hors scope interdit: changement runtime applicatif (services/hooks/pages/composants).

## Reproduction / diagnostic
- Constat initial: le README racine decrivait des elements non actifs (ex: section API avec fichier `src/config/api.ts` non present dans le projet), ce qui introduisait une ambiguite d'onboarding.
- Cause racine: documentation non maintenue apres evolution progressive de l'architecture front et des tickets precedents.

## Plan d'implementation execute
1. Basculer le ticket en `in_progress`.
2. Verifier la roadmap et les dependances (`P0-02` done/teste).
3. Auditer les pages principales (`Dashboard`, `Stocks`, `Predictions`) et la chaine hooks/services.
4. Reecrire `README.md` avec etat reel date, architecture active, limites et migration cible.
5. Ajouter les liens explicites vers `docs/audit/*` pour la tracabilite.
6. Executer les gates qualite (`lint`, `build`, `test`).
7. Mettre a jour la fiche ticket et la roadmap avec preuves de validation.

## Fichiers modifies
- [README.md](../../../../README.md)
- [docs/audit/corrections/P2-05/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Validation technique
- `npm run lint`: OK
- `npm run build`: OK
- `npm run test -- --run`: OK (4 fichiers, 17 tests)

## Validation fonctionnelle
Checklist executee:
- README aligne avec le flux reel `pages -> hooks -> services -> mockData`: OK
- README ne promet plus d'integration API deja active: OK
- Presence d'une section datee "Etat du projet": OK
- Liens vers documentation audit/corrections ajoutes: OK
- Onboarding dev faisable sans ambiguite majeure: OK

## Risques residuels
- La documentation peut re-deriver si elle n'est pas mise a jour a chaque evolution d'architecture.
- Mitigation recommandee: verifier `README.md` dans la checklist de chaque ticket touchant data/hooks/services.

## Rollback
- Restaurer la version precedente de `README.md` et publier un addendum temporaire si une communication externe depend de l'ancien contenu.

## Estimation
- Effort reel: ~0.5 jour.

## Compte-rendu obligatoire
- Ticket: `P2-05`
- Objectif: realigner le README avec l'etat reel du code et le plan de migration.
- Cause racine: documentation obsolescente vs implementation actuelle.
- Fichiers modifies: `README.md`, fiche ticket `P2-05`, roadmap corrections.
- Validation technique:
  - lint: OK
  - build: OK
  - tests: OK
- Validation fonctionnelle: checklist doc/onboarding OK.
- Risques residuels: derive documentaire future si non maintenue.
- Statut final: `done`
