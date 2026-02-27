# Index des plans de correction (1 dossier = 1 probleme)

## Navigation rapide
- AI entrypoint (start here): [../../../AI_ENTRYPOINT.md](../../../AI_ENTRYPOINT.md)
- Process standard: [PROCESS_STANDARD.md](./PROCESS_STANDARD.md)
- Roadmap AI Driven: [ROADMAP_AI_DRIVEN.md](./ROADMAP_AI_DRIVEN.md)
- Workflow imperatif agent: [WORKFLOW_IMPERATIF_AGENT.md](./WORKFLOW_IMPERATIF_AGENT.md)
- Best practices agent: [BEST_PRACTICES_AGENT.md](./BEST_PRACTICES_AGENT.md)
- Source des constats: [../registre-problemes.md](../registre-problemes.md)

## Strategie d'execution recommandee
1. Corriger tous les P0 dans l'ordre.
2. Traiter P1 par lots coherents (data, UX/a11y, perf, qualite).
3. Traiter P2 en parallele de l'industrialisation.

## Roadmap et suivi d'avancement
Legend:
- `A faire`: ticket pas encore termine
- `Fait`: implementation terminee
- `Teste`: validation technique + fonctionnelle terminee

| ID | Priorite | Titre | Dependances | A faire | Fait | Teste | Plan detaille |
|---|---|---|---|---|---|---|---|
| P0-01 | P0 | Lint en echec | - | [ ] | [x] | [x] | [P0-01](./P0-01/README.md) |
| P0-02 | P0 | Architecture data non branchee | P0-01 | [ ] | [x] | [x] | [P0-02](./P0-02/README.md) |
| P0-03 | P0 | Bug state quantite production | P0-01 | [ ] | [x] | [x] | [P0-03](./P0-03/README.md) |
| P0-04 | P0 | Ajustement stock drawer incoherent | P0-01 | [ ] | [x] | [x] | [P0-04](./P0-04/README.md) |
| P0-05 | P0 | Strategie CSS incoherente | P0-01 | [ ] | [x] | [x] | [P0-05](./P0-05/README.md) |
| P0-06 | P0 | Variables CSS manquantes | P0-05 | [ ] | [x] | [x] | [P0-06](./P0-06/README.md) |
| P1-01 | P1 | Regle urgence predictions discutable | P0-02 | [ ] | [x] | [x] | [P1-01](./P1-01/README.md) |
| P1-02 | P1 | Predictions passees dans actions dashboard | P0-02, P1-01 | [x] | [ ] | [ ] | [P1-02](./P1-02/README.md) |
| P1-03 | P1 | Reset selection dashboard incomplet | P0-02 | [x] | [ ] | [ ] | [P1-03](./P1-03/README.md) |
| P1-04 | P1 | Dates sensibles timezone | P0-02 | [x] | [ ] | [ ] | [P1-04](./P1-04/README.md) |
| P1-05 | P1 | Accessibilite modale incomplete | P0-01 | [x] | [ ] | [ ] | [P1-05](./P1-05/README.md) |
| P1-06 | P1 | Top bar non contextuelle | - | [x] | [ ] | [ ] | [P1-06](./P1-06/README.md) |
| P1-07 | P1 | Lien support non fonctionnel | - | [x] | [ ] | [ ] | [P1-07](./P1-07/README.md) |
| P1-08 | P1 | Parametrage analytics non persistant | P0-02 | [x] | [ ] | [ ] | [P1-08](./P1-08/README.md) |
| P1-09 | P1 | Styles injectes dans Input | P0-05 | [x] | [ ] | [ ] | [P1-09](./P1-09/README.md) |
| P1-10 | P1 | Code mort / non utilise | P0-02 | [x] | [ ] | [ ] | [P1-10](./P1-10/README.md) |
| P1-11 | P1 | Absence de tests automatises | P0-01 | [x] | [ ] | [ ] | [P1-11](./P1-11/README.md) |
| P1-12 | P1 | Bundle principal trop lourd | P0-01 | [x] | [ ] | [ ] | [P1-12](./P1-12/README.md) |
| P1-13 | P1 | Overflow body modal non robuste | P1-05 | [x] | [ ] | [ ] | [P1-13](./P1-13/README.md) |
| P2-01 | P2 | Valeurs metier hardcodees | P0-02 | [x] | [ ] | [ ] | [P2-01](./P2-01/README.md) |
| P2-02 | P2 | Validation formulaires limitee | P0-02 | [x] | [ ] | [ ] | [P2-02](./P2-02/README.md) |
| P2-03 | P2 | Mutation style DOM en React | P0-05 | [x] | [ ] | [ ] | [P2-03](./P2-03/README.md) |
| P2-04 | P2 | Couplage type domaine vers mock | P0-02 | [x] | [ ] | [ ] | [P2-04](./P2-04/README.md) |
| P2-05 | P2 | README decale vs implementation | P0-02 | [x] | [ ] | [ ] | [P2-05](./P2-05/README.md) |

## Regles de mise a jour
- Chaque correction doit mettre a jour la fiche du probleme traite.
- La fiche doit contenir:
  - liens vers fichiers modifies,
  - commandes de validation executees,
  - statut final (`open`, `in_progress`, `done`).
- Le tableau roadmap DOIT etre mis a jour en fin de ticket:
  - passer `A faire` de `[x]` a `[ ]`,
  - passer `Fait` a `[x]` quand l'implementation est terminee,
  - passer `Teste` a `[x]` uniquement apres validations techniques et fonctionnelles.
