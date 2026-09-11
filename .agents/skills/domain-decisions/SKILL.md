---
name: domain-decisions
description: Apply when changing Kookia business rules, recommendation or prediction priority, inventory or recipe policies, business validation, or decision explanations. Do not use for presentation-only changes.
---

# Domain decisions

Locate the source of truth in `src/domain`, `src/config/domain`, and the calling
service before changing a rule. Keep deterministic rules framework-independent;
use named types and policy functions when that makes an invariant or transition
clearer. Do not build DDD machinery for a local MVP change.

Separate business meanings from labels, CSS, routing, and transport shapes. Keep
normalization at a boundary when data is external or incomplete. Reuse the
repository's vocabulary rather than inventing near-synonyms.

For recommendations, preserve their status as reviewable suggestions. Surface
uncertainty, fallbacks, and inputs that materially affect a decision when the
feature exposes them; never fabricate confidence, provenance, or compliance.

A recommendation may be modified before the chef validates it. When persistence
is introduced, define the validation transition and its decision record at the
domain boundary; imports, forecasts, and UI state must not imply validation.

Test a changed policy or critical boundary with the smallest focused unit test
that covers the rule and an important edge. Inspect consumers when changing a
type or result shape.
