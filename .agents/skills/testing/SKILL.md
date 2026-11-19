---
name: testing
description: Apply when adding or changing tests, fixing a reproducible bug, changing critical domain behavior, or choosing validation for a non-trivial Kookia change. Do not require a new test for every visual or documentation edit.
---

# Testing and validation

Choose the smallest validation that gives reasonable confidence. Reproduce a bug
when practical, then add a focused regression test if it is affordable in the
existing test setup. Prefer unit tests for deterministic policies, services, and
state transitions with Vitest in Node. Reuse the Playwright tests in
`tests/browser/` for end-to-end checks and run them against an isolated
`kookia_test` database.

During iteration, run the narrowest relevant test or static check. Use the local
quality command in `AGENTS.md` before completing the change. Choose behavior
checks by risk. Read wording in context, test calculation boundaries, and use
isolated PostgreSQL for stock writes affected by conflicts or replay. When
deleting code, verify its entry points and run the affected builds. Keep tests
focused on behavior observable by a caller.

For UI changes, a build alone is insufficient: inspect the changed path and its
interactive states in a browser when available. For documentation-only changes,
verify links, commands, and `git diff --check` instead of running application
tests without a reason.

For the planned preproduction work, prioritize the trust-critical paths: stock
status, incomplete data, recommendation modification and validation, decision
traceability, OCR correction, and unavailable POS fallback. The Jalon 2 target
of 70% coverage applies to critical services from the recommendation sprint
onward; it is a future acceptance target, not evidence of current coverage.
