---
name: documentation
description: Apply when changing Kookia README, developer documentation, architecture decisions, setup, scripts, user-visible behavior documentation, or agent guidance. Do not use for code-only changes with no documentation impact.
---

# Documentation

Document the repository as it exists, distinguishing current behavior from a
future plan. Update the nearest useful document once; avoid duplicating an
architecture or workflow across files. Keep commands copy-pasteable and verify
local links and referenced files.

For Kookia technical framing, update
[`docs/technical-development.md`](../../../docs/technical-development.md) as the
canonical current-versus-target reference, then keep README and agent guidance
as concise entry points. Do not promote a Jalon 2 target to runtime behavior.

For agent guidance, use `AGENTS.md` only for durable repository-wide constraints,
a Skill for a reusable specialized workflow, a reference for occasional detail,
and a subagent only for an actually delegated execution context. Do not imply
that a file named `AGENTS.<topic>.md` is automatically discovered.

Use concise headings and factual language. Validate documentation changes with
link/reference checks and `git diff --check`; application tests are unnecessary
unless the documented code or configuration also changed.
