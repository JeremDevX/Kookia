---
name: security-compliance
description: Apply for auth or permissions, secrets, external input, uploads, storage, logging, exposed APIs, personal data, retention, consent, automated decisions, or regulatory/environmental claims. Do not use for unrelated UI or local refactors.
---

# Security and compliance review

Map the affected data and trust boundary. Validate untrusted input at entry,
enforce authorization and tenant isolation in the existing server layer, and
avoid logging credentials, tokens, or personal data. Client state,
mocks, and local storage are never authorization controls.

Apply least privilege and preserve existing protections. For storage or external
calls, consider disclosure, retention, deletion, failure handling, and sensitive
data exposure. Do not claim legal compliance when jurisdiction, obligations, or
evidence are unknown; state the risk or ask a focused product/legal question.

Ticket Z images, POS credentials, and imported sales data are untrusted external
inputs. For a future ingestion flow, define size/type controls, access scope,
retention, and redaction before storage or provider forwarding. A report labelled
AGEC or HACCP must be presented as an operational export unless its legal
requirements have been independently verified.

Exercise or inspect the security-sensitive path, and add focused validation when
the repository can support it. Escalate only actions that are external,
irreversible, production-impacting, or require unavailable credentials.
