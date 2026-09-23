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
the actual boundary before introducing another abstraction. POS/OCR ingestion,
live weather, and a prediction engine are not active.

For staged work, move one vertical boundary at a time and keep the current
consumer contracts coherent. Preserve server-side authorization and decision
records; a new source adapter must not directly create a validated order.

For a cross-cutting task, make a short plan that names affected boundaries,
compatibility concerns, and validation. Make the smallest coherent structural
change and remove only code made dead by that change.
