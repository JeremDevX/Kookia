# Kookia repository guidance

## Product and current architecture

Kookia helps restaurant teams reduce waste through understandable operational
recommendations. Prefer low-friction flows, traceability, and meaningful human
control over opaque automation.

This is a React/TypeScript frontend. Its active runtime flow is:
`app` → `pages`/`components` → `hooks`/`features` → `services`/`domain` →
`data/mock`. Services currently use local mock data; no backend, HTTP client, or
server-side authorization layer is active. Inspect the code before introducing a
new boundary or assuming the planned API migration exists.

The Jalon 2 technical trajectory is planned, not active: Node.js/Express with
TypeScript, PostgreSQL/Prisma, POS ingestion and Ticket Z/OCR. Introduce those
boundaries only when a task explicitly scopes the migration. The chef must keep
an explicit review/validation step for a recommendation; a future backend must
record that decision. The technical reference is
[`docs/technical-development.md`](docs/technical-development.md).

## Invariants

- Keep business decisions out of rendering when they belong in a domain policy,
  service, mapper, selector, or hook. Keep deterministic domain rules testable
  without React where practical.
- Treat recommendations as suggestions. Do not present uncertain data,
  predictions, or regulatory claims as certain; preserve human confirmation for
  consequential external actions.
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
