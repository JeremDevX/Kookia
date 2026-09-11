---
name: architecture
description: Apply for cross-cutting refactors, new module boundaries, dependency direction, staged migrations, or changes spanning app, feature, domain, service, and data layers. Do not use for a local implementation that follows an existing pattern.
---

# Architecture

Inspect the current dependency flow and consumers before moving responsibilities.
Keep rendering, state orchestration, business policies, and data access separated
when the responsibility is real. Prefer an incremental adapter or mapper at a
boundary over a broad rewrite.

The current architecture is a mock-backed frontend. Do not introduce server
layers, repositories, transport contracts, or shared abstractions merely to look
future-ready. A future migration may retain hooks as a stable UI façade while
services change behind them.

When the Jalon 2 migration is explicitly in scope, move one vertical boundary at
a time: API health and contracts, then restaurant/product/stock persistence,
then reviewable recommendations and their decision log, then POS/OCR ingestion.
Do not treat this sequence as implemented in the current frontend.

For a cross-cutting task, make a short plan that names affected boundaries,
compatibility concerns, and validation. Make the smallest coherent structural
change and remove only code made dead by that change.
