---
name: accessibility
description: Apply for accessibility fixes or when modifying interactive controls, forms, dialogs, navigation, focus, dynamic status, or keyboard behavior in Kookia. Do not load solely for non-interactive styling.
---

# Accessibility

Start with native semantic elements and accessible names. Do not replace native
button, link, input, label, or dialog behavior with ARIA unless the pattern needs
it. Keep visible labels for inputs; placeholders do not replace labels.

For touched interactions, verify keyboard reachability, predictable focus,
visible focus indication, and an escape/close path for dialogs where applicable.
Keep state, validation errors, and dynamic feedback perceivable without color
alone. Use ARIA only to express behavior native semantics cannot provide.

Respect reduced motion for new or changed animation. Check the relevant keyboard
path and rendered semantics in a browser when available; state a limitation when
that inspection cannot be performed.
