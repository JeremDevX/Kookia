---
name: api-backend
description: Apply when Kookia work introduces or changes an HTTP/API contract, server handler, persistence, job, external integration, or backend authorization. Do not use for presentation-only frontend work.
---

# API and backend boundaries

Inspect the existing Express/Prisma transport and trust boundary. Keep DTOs and external
payloads distinct from domain models when they differ; validate untrusted input
at the boundary and return structured, actionable errors. Update all consumers
when a contract changes and preserve compatibility deliberately.

Keep transport, business decisions, and persistence responsibilities separate.
Apply idempotency, retries, authorization, tenancy isolation, and auditability
only where the operation warrants them; restaurant ownership is derived from
the server session, never accepted as client authority.

For a staged API change, switch one service boundary at a time, keep the
existing UI-facing hook contract unless a change is necessary, and test mapping,
failure behavior, and authorization-sensitive paths.

Express/TypeScript with PostgreSQL/Prisma is installed, and reviewable orders
have persistent decision records. Preserve those invariants: a POS or OCR import
must never silently create a validated order. Future providers belong behind
adapters, with a demonstrable manual fallback when unavailable.
