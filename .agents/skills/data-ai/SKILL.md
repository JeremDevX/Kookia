---
name: data-ai
description: Apply when changing forecasts, scoring, confidence, ingestion, OCR, external data quality, analytics calculations, or AI-assisted recommendations in Kookia. Do not use for ordinary deterministic UI state.
---

# Data and AI

Identify the data source, normalization point, and assumptions before changing a
calculation. Keep raw imported data distinct from normalized domain values and
make fallbacks or missing-data behavior visible where it affects decisions.

Make recommendations and scores traceable enough for an operator to understand
their material inputs, uncertainty, and limitations. Do not call a deterministic
local calculation AI, promise prediction accuracy, or invent model provenance.

For the planned Ticket Z flow, retain the source and extraction status long
enough to let an operator correct uncertain fields. The product framing calls
for assisted correction below 90% OCR confidence; do not convert that target
threshold into a claim about the current mock UI or an unverified provider.
Forecasts may use sales history, local weather, and event calendars only when
their freshness and fallback behavior are explicit.

Use focused examples or tests for changed calculations, including an important
boundary case. Assess privacy or regulated claims separately when personal data,
profiling, retention, or environmental claims are actually involved.
