# Guidance agentique Kookia

## Décision

Kookia utilise un `AGENTS.md` racine court pour les faits durables du dépôt et
des Skills locaux pour les workflows spécialisés. Cette séparation limite le
contexte permanent tout en laissant Codex découvrir les Skills depuis
`.agents/skills` à la racine, y compris lorsqu'il est lancé dans un sous-dossier.
Les fichiers `AGENTS.<sujet>.md` n'étaient pas auto-découverts : leur ancien
routage manuel est supprimé, sans coexistence hybride.

Codex compose les instructions du root jusqu'au répertoire de travail, avec au
plus un document par dossier (`AGENTS.override.md`, puis `AGENTS.md`, puis les
noms configurés dans `project_doc_fallback_filenames`). Les fichiers plus proches
du répertoire de travail ont préséance. Aucun `AGENTS.md` imbriqué n'est créé :
le projet n'a pas de sous-arbre aux contraintes assez distinctes pour justifier
une guidance automatiquement chargée supplémentaire.

Les Skills exposent d'abord leur nom et leur description, puis leurs instructions
seulement s'ils sont pertinents ou explicitement invoqués. Les descriptions
incluent donc déclencheurs et exclusions. Un Skill est un workflow, pas un
sous-agent. Un sous-agent n'existe que lorsqu'une branche indépendante est
réellement déléguée ; l'agent principal garde le scope, l'intégration et la
validation.

Sources officielles : [AGENTS.md et précédence](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[Skills](https://learn.chatgpt.com/docs/build-skills) et
[sous-agents](https://learn.chatgpt.com/docs/agent-configuration/subagents).

## Vérifications réalisées

- Inspection de `AGENTS.md`, des 13 guides historiques, README, `package.json`,
  Vite, Vitest, ESLint, CI, `.agents`/`.codex`, documents et couches
  `app`/`domain`/`features`/`services`/`hooks` représentatives.
- `git diff --check` réussi après la migration ; références à
  `ARCHITECTURE_REVIEW.md` supprimées du README.
- Codex CLI `0.154.0`, lancé en lecture seule, éphémère et sans configuration
  utilisateur, a identifié le root `AGENTS.md` pour une règle de priorité et les
  Skills `domain-decisions`, `data-ai` et `testing` comme pertinents.
- La commande de diagnostic `codex debug prompt-input`, lancée depuis
  `src/domain`, a rendu le bloc effectif `agents_md.instructions` contenant le
  texte du root `AGENTS.md`, ainsi que les métadonnées des neuf Skills sous
  `.agents/skills`. Aucun `AGENTS.md` local n'existe dans ce sous-arbre : le root
  est donc bien la seule instruction projet appliquée à cet emplacement.

Cette migration ne change ni runtime, ni dépendances, ni scripts : les suites
applicatives n'ont donc pas été exécutées.

## Audit et destination des guides historiques

| Fichier historique | Classification des règles | Problèmes observés | Destination |
| --- | --- | --- | --- |
| `AGENTS.frontend.md` | `GLOBAL_INVARIANT` (état dérivé, frontières) ; `DUPLICATE`/`TOO_PRESCRIPTIVE` (qualification, patterns, checklist) ; `CI_ENFORCED` (lint) | Rituel et React générique | Root ; détails guidés par le code existant |
| `AGENTS.domain.md` | `GLOBAL_INVARIANT` (policies pures, suggestion contrôlable) ; `SPECIALIZED_WORKFLOW` (modélisation) ; `FUTURE_ARCHITECTURE` (liste de concepts) | Concepts spéculatifs et rituel | Root + Skill `domain-decisions` |
| `AGENTS.ui.md` | `SPECIALIZED_WORKFLOW` (faible friction, états, responsive) ; `TOO_PRESCRIPTIVE` (reset/tokens imposés) | Checklist systématique | Skill `ui-ux` |
| `AGENTS.documentation.md` | `SPECIALIZED_WORKFLOW` (documentation fidèle, liens) ; `DUPLICATE` (workflow/scope) | Pseudo-agent et taxonomie | Skill `documentation` |
| `AGENTS.quality.md` | `GLOBAL_INVARIANT` (scope, simplicité, code mort) ; `CI_ENFORCED` (lint) ; `DUPLICATE` (KISS/DRY/naming) | Pas de workflow propre | Root ; règles CI supprimées |
| `AGENTS.testing.md` | `GLOBAL_INVARIANT` (validation proportionnée) ; `SPECIALIZED_WORKFLOW` (régression) ; `TOO_PRESCRIPTIVE` (test obligatoire) | Checklist répétée | Root + Skill `testing` |
| `AGENTS.architecture.md` | `SPECIALIZED_WORKFLOW` (frontières, migration incrémentale) ; `FUTURE_ARCHITECTURE` (cible imposée) | Architecture future parfois prescrite | Skill `architecture` |
| `AGENTS.accessibility.md` | `GLOBAL_INVARIANT` (ne pas dégrader) ; `SPECIALIZED_WORKFLOW` (clavier, focus, ARIA) | Chargement systématique implicite | Root minimal + Skill `accessibility` |
| `AGENTS.api.md` | `SPECIALIZED_WORKFLOW` (DTO, contrats, erreurs) ; `FUTURE_ARCHITECTURE` (HTTP actif supposé) | Contrat HTTP trop largement présenté | Skill `api-backend`, seulement si API réelle |
| `AGENTS.backend.md` | `SPECIALIZED_WORKFLOW` (frontières de confiance) ; `FUTURE_ARCHITECTURE` (backend actif supposé) | Backend inexistant dans le runtime | Skill `api-backend`, dormant |
| `AGENTS.data.md` | `SPECIALIZED_WORKFLOW` (provenance, incertitude, normalisation) ; `FUTURE_ARCHITECTURE` (pipeline ML présumé) | Pipeline data/ML présumé | Skill `data-ai` |
| `AGENTS.security.md` | `GLOBAL_INVARIANT` (secrets, entrées) ; `SPECIALIZED_WORKFLOW` (authz) ; `DUPLICATE` (scope) | Doctrine appliquée à toute tâche | Root minimal + Skill `security-compliance` |
| `AGENTS.compliance.md` | `SPECIALIZED_WORKFLOW` (PII, rétention, claims) ; `TOO_PRESCRIPTIVE` (conclusions générales) | Risque juridique généralisé | Skill `security-compliance` |

Les règles de lint/TypeScript déjà contrôlées par les outils sont seulement
rappelées lorsqu'elles définissent une frontière utile (`any` confiné, contrats
externes). Les seuils de lignes, catalogues de type de tâche, rôles fictifs,
anti-patterns génériques et checklists identiques sont supprimés. Cela résout les
contradictions précédentes : plan et test ne sont plus universels ; le scope
autorise les correctifs adjacents nécessaires ; sécurité et backend ne sont plus
chargés pour une tâche frontend sans risque.

## Architecture retenue

```text
AGENTS.md
.agents/skills/
├── accessibility/SKILL.md
├── api-backend/SKILL.md
├── architecture/SKILL.md
├── data-ai/SKILL.md
├── documentation/SKILL.md
├── domain-decisions/SKILL.md
├── security-compliance/SKILL.md
├── testing/SKILL.md
└── ui-ux/SKILL.md
docs/
├── agentic-development.md
└── plans/agentic-guidance-migration.md
```

`frontend` n'est pas un Skill : ses quelques invariants sont transverses ou
déjà visibles dans le code React. `quality` n'en est pas un non plus : ce sont
des critères de scope et de Done, pas un workflow. API/backend et
security/compliance sont chacun fusionnés, car ils partagent une même frontière
et ne sont pertinents que selon le risque. Aucun sous-agent permanent ni
configuration modèle n'est créé.

## Configuration Codex et permissions

Le dépôt ne contenait pas de `.codex/config.toml`; aucun n'est ajouté. La
découverte native de `AGENTS.md` et de `.agents/skills` suffit. En particulier,
`project_doc_fallback_filenames` ne doit pas réintroduire les treize guides
supprimés. Les modèles, reasoning effort, sandbox, approbations et MCP restent
des choix de runtime ou d'organisation, sauf besoin réel du projet.

Les actions locales et réversibles nécessaires à une tâche peuvent avancer sans
confirmation supplémentaire. Les actions externes, irréversibles, de production,
de publication, de déploiement ou nécessitant des credentials demandent une
autorisation adaptée au risque.

## Routing de modèles (politique opérationnelle externe)

Les modèles ne sont pas mentionnés dans `AGENTS.md`. Évaluer ce tableau sur les
cas Kookia avant d'en faire une politique de plateforme :

| Classe de tâche | Luna | Terra | Sol | Astra | Défaut initial |
| --- | --- | --- | --- | --- | --- |
| Inventaire, extraction, petit changement déterministe | Bon | Bon | Oui | Surdimensionné | Luna |
| Maintenance standard, lecture importante, sous-tâche bornée | Possible | Bon | Bon | Possible | Terra |
| Debug, évolution multi-fichiers, refactor raisonné | Limité | Possible | Bon | Possible | Sol |
| Migration transversale, architecture difficile, recherche + outils | Non par défaut | Possible | Bon | Meilleur candidat | Astra |

Luna et Terra conviennent aux charges sensibles au coût; Sol est le choix solide
pour le développement complexe; Astra est la capacité maximale pour les travaux
end-to-end difficiles. Astra ne prend pas en charge `reasoning.effort: none`;
les autres modèles listés le prennent en charge. Ajuster l'effort par difficulté
(faible pour tâche déterministe, moyen pour implémentation courante, élevé ou plus
pour migration/debug difficile), jamais comme règle permanente de ce dépôt.
Sources : [catalogue de modèles](https://developers.openai.com/api/docs/models),
[GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra) et
[guidance Astra](https://developers.openai.com/api/docs/guides/latest-model).

## Validation de discovery et evals

Exécuter dans une nouvelle session Codex, à la racine puis dans `src/domain` :

```bash
codex --ask-for-approval never "Sans modifier, indique les sources d'instructions chargées et les Skills pertinents pour corriger une règle de priorité."
codex --cd src/domain --ask-for-approval never "Sans modifier, indique les instructions actives et les Skills disponibles."
```

Vérifier que seul le root est une instruction projet, que les neuf Skills sont
découvrables, qu'aucun ancien `AGENTS.<sujet>.md` ne l'est, et qu'un prompt UI ne
charge pas API/backend ou sécurité sans raison. Pour une preuve directe, exécuter
`codex debug prompt-input` dans le sous-répertoire ciblé et inspecter le bloc
`agents_md.instructions`; les logs Codex sont une alternative. Redémarrer Codex
si les nouvelles métadonnées de Skills ne sont pas visibles.

Le benchmark de non-régression compare ancien et nouveau système sur : réussite,
premier passage correct, clarifications inutiles, scope creep, Skills inutiles,
outils inutiles, validations sous/surdimensionnées, fichiers hors scope, latence,
coût et revue humaine. Jouer les scénarios suivants avec les modèles adaptés :

1. micro-correction frontend ;
2. règle de priorité/prédiction ;
3. polish UI ;
4. correction accessibilité ;
5. documentation seule ;
6. migration future d'une façade mock vers API ;
7. entrée externe ou auth ;
8. restructuration transverse ;
9. ambiguïté réversible ;
10. décision métier ambiguë ;
11. revue de PR à branches indépendantes ;
12. conflit d'instruction spécialisé.

Attendus : pas de plan/Skill sécurité pour le scénario 1 ; policy testable et test
ciblé pour 2 ; rendu et accessibilité pour 3–4 ; pas de test applicatif pour 5 ;
DTO/mapping sans backend imaginaire pour 6 ; sécurité seulement pour 7 ; plan et
validation étendue pour 8 ; hypothèse réversible pour 9 ; question ciblée pour
10 ; délégation seulement si indépendante pour 11 ; précédence root/sous-arbre
claire pour 12. Conserver les prompts, résultats, modèle, effort et métriques
dans l'outil d'évaluation choisi avant de modifier à nouveau le socle.
