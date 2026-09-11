---
name: testing
description: Apply when adding or changing tests, fixing a reproducible bug, changing critical domain behavior, or choosing validation for a non-trivial Kookia change. Do not require a new test for every visual or documentation edit.
---

# Testing and validation

Choose the smallest validation that gives reasonable confidence. Reproduce a bug
when practical, then add a focused regression test if it is affordable in the
existing test setup. Prefer unit tests for deterministic policies, services, and
state transitions; this repository has Vitest in Node and no declared DOM or E2E
test infrastructure.

During iteration, run the narrowest relevant test or static check. For a
PR-ready code change, consider the CI gates: `npm run lint`, `npm run build`, and
`npm test`. Do not disable checks or create implementation-mirroring tests merely
to satisfy a rule.

For UI changes, a build alone is insufficient: inspect the changed path and its
interactive states in a browser when available. For documentation-only changes,
verify links, commands, and `git diff --check` instead of running application
tests without a reason.
