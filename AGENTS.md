# Kookia repository guidance

## Product and current architecture

Kookia helps restaurant teams reduce waste through understandable operational
recommendations. Prefer low-friction flows, traceability, and meaningful human
control over opaque automation.

The active runtime is React/TypeScript → hooks/features → HTTP services →
Express/TypeScript → PostgreSQL/Prisma. Account sessions and per-owner restaurant
workspaces are persisted; authorization and critical mutations are server-side.
Demo data is seeded idempotently, never a frontend fallback. Inspect the current
code before introducing or replacing boundaries.

POS/OCR providers and an AI prediction engine remain planned, not active.
Open-Meteo service context is implemented but disabled by default; confirmed city,
freshness and provenance are required. A known terrace setting enables explicit,
uncalibrated weather scenarios for service forecasts and purchase needs, never
automatic changes to recorded operations or already validated decisions. See
[`docs/plans/terrace-weather-adjustment.md`](docs/plans/terrace-weather-adjustment.md).
The chef must retain explicit review and validation;
commands and menus have persistent decision records. No provider email is sent
by order validation. The technical reference is
[`docs/technical-development.md`](docs/technical-development.md); migration scope
and verification evidence live in
[`docs/plans/database-migration.md`](docs/plans/database-migration.md).
For long-running feature work, follow the dependency gates and evidence in
[`docs/plans/plan-execution.md`](docs/plans/plan-execution.md).

## Restaurateur-first interface and wording

Design and write for French-speaking restaurateurs, chefs, and restaurant teams
with little time, often between services; do not assume software expertise.
Prefer the simplest understandable path to the task: one clear primary action,
minimal required input, and secondary details on demand. Use familiar restaurant
vocabulary and short, useful French copy; omit technical jargon, marketing filler,
and explanations that do not help the next decision. Simplicity must preserve
essential quantities, units, uncertainty, and meaningful human confirmation.
Guide transitions between screens with a clear next step and return path,
preserving relevant context. Reuse one coherent flow per task rather than
duplicating screens, information, or data entry without a distinct user need.
For interface design, review, or product wording (including copy-only changes),
use the existing [`ui-ux` skill](.agents/skills/ui-ux/SKILL.md). Its reference is
[`docs/design-system.md`](docs/design-system.md); apply it to the requested scope,
not as a mandate to redesign unrelated screens.

## Invariants

- Keep business decisions out of rendering when they belong in a domain policy,
  service, mapper, selector, or hook. Keep deterministic domain rules testable
  without React where practical.
- Treat recommendations as suggestions. Do not present uncertain data,
  predictions, or regulatory claims as certain; preserve human confirmation for
  consequential external actions.
- Product history has no fixed four-year limit. Restaurant invoice working
  dates may be shifted to align with 2026; use those working dates and never
  expose origin dates.
- When sales or loss records are unavailable, aim to provide plausible
  ingredient-outflow estimates for every positive, recorded receipt. Match each
  received ingredient to a compatible, dated recipe and estimate from the
  received amount, recipe dosage, and yield. If no suitable recipe exists,
  derive a compatible recipe candidate from the received ingredient and catalog,
  then show its conditional estimate for human review; never treat an
  unconfirmed candidate as a recipe in use. If no credible candidate or usable
  dosage/unit exists, expose the coverage gap rather than an arbitrary value.
  Keep candidate-based estimates distinct from ledger-backed estimates and
  measured KPIs. Keep estimates distinct from recorded operations, expose their
  assumptions and provenance, and never persist them as sales, losses,
  production, or stock movements without confirmation. An invoice transcription
  alone is not a receipt. In user-facing text, call these “estimations” and
  explain their basis; do not call them invented, fictional, a demo, or a
  story, and do not imply they are observed facts. Use “Historique” for the
  product timeline.
- Prefer derived state to duplicated state, explicit side effects, existing
  patterns, and the smallest useful abstraction or dependency.
- Preserve strict TypeScript boundaries. Do not let uncontained `any` or raw
  external data spread through the application.
- When account-level access is needed, use only the `kookia` account and the
  local untracked `kookia-demo-access.local` credentials. Never try other
  accounts. Keep automated tests on isolated temporary fixtures; do not generate
  or alter operational records in the account.
- Complete the requested outcome without unrelated churn. Adjacent corrections
  needed for the solution or its validation are in scope; opportunistic refactors
  and independent changes are not.
- Never expose secrets or weaken existing controls. Treat external input as
  untrusted at its boundary.

## Working approach

Discussion, diagnosis, and planning requests are read-only. For implementation,
work on `main`, preserve existing changes, and verify locally.

Identify the requested user outcome and affected entry points. Read the existing
implementation and its consumers before editing. Complete the affected flow and
update every consumer of a changed contract. Report independent findings
separately. For a risky or cross-cutting change, plan around the affected
boundaries. Use the repository Skills that match the task's scope and risks.
Ask only when missing product intent or authorization materially changes the result.

## Reuse and dead code

- Search for existing components, hooks, policies, and dependencies before
  adding any. New abstractions must serve a concrete caller in this change.
- For UI, start with the primitives in `src/components/common/`, the tokens
  in `src/styles/index.css`, and [the design system](docs/design-system.md).
  Add a variant only when existing variants cannot serve a concrete consumer.
- Remove the implementation, exports, CSS, and dependencies made obsolete by
  the change. Keep symbols private unless an external consumer needs them.
  Before removing a reported element, verify dynamic routes/imports, CLI
  scripts, local demos, and the document workshop where relevant. Any tool
  exception must be narrow and identify the real consumer.

## Validation

For code changes, run `npm run check:quality` locally and the relevant builds
and focused behavior checks. Review the full diff and verify the changed flow
through its normal entry point. For changed interactions, verify relevant error
and recovery states, keyboard behavior, and mobile rendering when available.
For documentation-only changes, verify links, commands, and `git diff --check`.
Report the outcome, evidence, and any checks that could not run.
