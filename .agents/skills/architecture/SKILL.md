---
name: architecture
description: Apply for cross-cutting refactors, new module boundaries, dependency direction, staged migrations, or changes spanning app, feature, domain, service, and data layers. Do not use for a local implementation that follows an existing pattern.
---

# Architecture

Inspect the current dependency flow and consumers before moving responsibilities.
Keep rendering, state orchestration, business policies, and data access separated
when the responsibility is real. Prefer an incremental adapter or mapper at a
boundary over a broad rewrite.

The active runtime is React/TypeScript through hooks and HTTP services to an
Express/TypeScript API and PostgreSQL/Prisma. Account sessions, per-owner
restaurant workspaces, and reviewable order decisions are persisted. Inspect
the actual boundary before introducing another abstraction. Use the current
[technical reference](../../../docs/technical-development.md) for feature status.

Identify the authoritative owner of the rule before changing it. The UI owns
interaction and rendering. The server owns permissions and authoritative
mutations. Use `shared/` for contracts and pure logic with consumers on both
sides. If two flows enforce the same business rule, reuse its authoritative
implementation and verify each migrated caller.

For staged work, move one vertical boundary at a time and keep the current
consumer contracts coherent. Preserve server-side authorization and decision
records; a new source adapter must not directly create a validated order.

For a cross-cutting task, make a short plan that names affected boundaries,
compatibility concerns, and validation. Make the smallest coherent structural
change and remove only code made dead by that change.
