---
name: api-backend
description: Apply only when Kookia work actually introduces or changes an HTTP/API contract, server handler, persistence, job, external integration, or backend authorization. The current mock-backed frontend does not trigger this skill.
---

# API and backend boundaries

First establish the real transport and trust boundary. Keep DTOs and external
payloads distinct from domain models when they differ; validate untrusted input
at the boundary and return structured, actionable errors. Update all consumers
when a contract changes and preserve compatibility deliberately.

Keep transport, business decisions, and persistence responsibilities separate.
Apply idempotency, retries, authorization, tenancy isolation, and auditability
only where the operation warrants them—do not simulate a backend in the current
mock services.

For a staged API migration, switch one service boundary at a time, keep the
existing UI-facing hook contract unless a change is necessary, and test mapping,
failure behavior, and authorization-sensitive paths.
