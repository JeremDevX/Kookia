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

POS ingestion, Ticket Z/OCR, live weather and an AI prediction engine remain
planned, not active. The chef must retain explicit review and validation;
commands and menus have persistent decision records. No provider email is sent
by order validation. The technical reference is
[`docs/technical-development.md`](docs/technical-development.md); migration scope
and verification evidence live in
[`docs/plans/database-migration.md`](docs/plans/database-migration.md).
For long-running feature work, follow the dependency gates and evidence in
[`docs/plans/plan-execution.md`](docs/plans/plan-execution.md).

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
- When sales or loss records are unavailable, derive plausible ingredient
  outflows from reviewed incoming stock: match each eligible received ingredient
  to compatible, dated recipes and estimate sales/loss quantities from the
  received amount, recipe dosage, and yield. If no suitable recipe exists,
  propose a compatible recipe candidate from the incoming ingredients for human
  review; never treat an unconfirmed candidate as a recipe in use. Keep these
  estimates distinct from recorded operations, expose their assumptions and
  provenance, and never persist them as sales, losses, production, or stock
  movements without confirmation. An invoice transcription alone is not a
  receipt. In user-facing text, call these “estimations” and explain their
  basis; do not call them invented, fictional, a demo, or a story, and do not
  imply they are observed facts. Use “Historique” for the product timeline.
- Prefer derived state to duplicated state, explicit side effects, existing
  patterns, and the smallest useful abstraction or dependency.
- Preserve strict TypeScript boundaries. Do not let uncontained `any` or raw
  external data spread through the application.
- Complete the requested outcome without unrelated churn. Adjacent corrections
  needed for the solution or its validation are in scope; opportunistic refactors
  and independent changes are not.
- Never expose secrets or weaken existing controls. Treat external input as
  untrusted at its boundary.

## Working approach

Understand the outcome, inspect only the relevant context, and make the smallest
coherent change. Use a repository Skill when its specialized workflow materially
helps; do not load specialized guidance mechanically.

Proceed directly for a small, clear task. Make a short execution plan for
ambiguous, cross-cutting, risky, or long-running work. Infer routine technical
details from the repository and continue through implementation and correction.
Ask only when missing product intent or authorization would materially change the
result. Local, reversible implementation choices do not need confirmation.

## Validation

Use the smallest check that gives appropriate confidence while iterating. The CI
currently runs:

```bash
npm run lint
npm run build
npm test
```

Before PR-ready completion, run the applicable CI-equivalent checks when they are
relevant to the change. UI work also needs a rendered, keyboard, or responsive
check when available. Documentation-only work needs accurate links, commands,
and `git diff --check`, not application tests by default.

## Done

Work is done when the requested result exists, the change respects the active
architecture and scope, proportionate validation has passed, and no known blocker
is hidden. Report what changed, validation performed, and any material limit.
