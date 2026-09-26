---
name: ui-ux
description: Design or review Kookia interfaces and French product wording for restaurateurs, including copy-only edits. Use for layout, styling, forms, states, and flows; not internal technical documentation.
---

# UI and UX

## Restaurant task first

Design for a restaurateur or chef getting a task done between services, without
requiring software expertise. Infer the task, moment of use, necessary information,
and next useful action from the request and the existing screen. Do not turn a
small copy edit into a redesign or ask for a persona already established here.

Use the relevant sections of the [interface and wording guide](../../../docs/design-system.md):
reading hierarchy and interactions for UI work; vocabulary, states, and wording
examples for copy-only work. Keep that document as the reference for French copy
conventions rather than creating another parallel guide.

Prefer one clear primary action and details on demand. Remove avoidable choices,
repeated input, detours, and text that does not help the restaurant task. Retain
information needed for an informed decision; fewer clicks alone is not success.
Make the screen state understandable with realistic long, missing, loading,
empty, error, success, and disabled data where relevant.

For wording, use familiar restaurant terms and name the actual action or result.
Keep labels, help, and feedback short, specific, and consistent with nearby
screens. Do not surface implementation details or imply unavailable capabilities.

## Implementation

Follow styles already used near the edited component. The repository mainly uses
local `.css` files; do not introduce or convert a styling system without a task
need. Avoid fragile selectors, unexplained visual constants, and decorative
changes that obscure status or priority.

Design responsive layouts deliberately rather than compressing desktop content.
Confirm consequential or destructive product actions, while keeping normal
local-agent edits autonomous. Do not encode essential meaning only with color or
transient feedback.

For purchase recommendations, make the chef's review, optional modification,
and explicit validation primary and distinguish them from a generated suggestion.
For OCR correction or unavailable POS data, provide a clear manual path rather
than presenting imported values as certain.

Use the accessibility skill when semantics, focus, or keyboard behavior changes.

## Focused review

Before finishing, check the affected scope:

- Can the restaurateur understand what matters and what to do next without help?
- Can a field, step, choice, or sentence be removed without losing useful meaning?
- Is the next screen or return path clear, with relevant context preserved and
  no competing duplicate flow for the same task?
- Do labels describe the real effect, with quantities, units, and uncertainty
  still understandable at the decision point?
- Can the person correct a mistake or recover without entering everything again?

Inspect the affected screen in a browser when available. For layout or interaction
changes, include a narrow visual, keyboard, or responsive check as appropriate.
When navigation changes, follow the affected path through completion and back,
checking continuity of selection, filters, and entered data where relevant.
For copy-only changes, read the text in context and check fit where available;
do not require an unrelated redesign or a full interaction audit.
