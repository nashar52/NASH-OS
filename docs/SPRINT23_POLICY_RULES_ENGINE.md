# Sprint 23 — Enterprise Policy & Rules Engine

## Architecture and source integrity

Sprint 23 introduces a module-agnostic, server-side Policy & Rules Engine.  It is deliberately **runtime-only** in this release: no MySQL schema is created, no source record is modified, no JSON file is used as a fallback, and no policies or rules are seeded.  A reviewed MySQL migration is required before policy, rule, acknowledgement, exception, evaluation, receipt, and audit packets can be persistent.

The browser is a display and request client only. Server session identity supplies actor and role. Rule evaluation, lifecycle status, exception decisions, receipts, and authorization are server controlled.

## Models and safe evaluation

Policies expose IDs, code, name, controlled category, description, version, dates, owner, authority, lifecycle status, jurisdiction, scopes, source label, evidence and audit references. Unavailable metadata is labelled `Not configured`; records are labelled `Runtime-only; schema support required`.

Rules carry their ID/code/name/type, policy reference, module/trigger, structured conditions, outcome, priority, dates, evidence/approval requirements, version and evaluation time. Supported operators are Equals, Not Equals, numeric comparisons, Contains/Does Not Contain, list operators, existence operators, date operators, Between, AND, and OR. Unsupported operators and malformed payloads are rejected. No executable expressions or arbitrary code are accepted.

Evaluation (`POST /api/policies/:id/evaluate`) is advisory/gating only and never writes source records. It returns evaluated, matched, and failed rules; warnings; evidence/approval requirements; an advisory recommendation; a human-decision flag; receipt; and audit event.

## Governance

Policy lifecycle supports Draft through Archived. Lifecycle transitions require a workflow reference and executive session for Approved, Published, or Active states. The response includes previous/new state plus the standard receipt/audit contract. Production persistence must additionally verify the Sprint 21 workflow instance before transition.

Conflict detection reports missing authority/evidence and unsupported jurisdictions for human review. The runtime registry is intentionally conservative: it does not silently resolve conflicts or assert legal conclusions. Saudi-related rules can be modelled as `SAUDI_LABOR`; where a legal/compliance source is not configured, users must treat results as requiring legal review.

Exceptions support policy/temporary/emergency/employee/department/position/executive requests. Executive decisions require rationale and are explicitly recorded as human authorization. Acknowledgements are server-receipted and state that acknowledgement may not equal legal agreement.

## Roles, APIs, and integrations

Employees can view published policies, request exceptions, and acknowledge policies. Managers can request exceptions. HR can author draft policies/rules, evaluate, review conflicts, and submit transitions. Executives alone may approve/publish/activate policies and decide exceptions.

Routes: `GET/POST /api/policies`, `GET/PATCH /api/policies/:id`, `POST /api/policies/:id/transition`, `GET/POST /api/rules`, `GET /api/rules/:id`, `POST /api/policies/:id/evaluate`, `GET /api/policies/conflicts`, `POST /api/policy-exceptions`, `POST /api/policy-exceptions/:id/decision`, `POST /api/policies/:id/acknowledgements`, `GET /api/policy-receipts`, and `GET /api/policies/applicability`.

The UI exposes a focused Policy Library, Rule Registry, Conflict Register, source labels and empty states. The reusable module field supports Sprint 19 organization, Sprint 20 workforce planning, Sprint 21 workflow, Sprint 22 lifecycle, recruitment, performance, learning, compensation/payroll, government, documents, and self-service without rewriting their workflows.

## Risks, remaining gaps, and QA

Runtime data is lost at restart and is not a persistent operational system of record. A non-destructive, reviewed migration and repository adapter remain required; workflow reference verification should be upgraded to a transactional Sprint 21 instance check once persistence is approved. Live MySQL validation depends on environment connectivity and must not be inferred from runtime QA.

Run `npm run qa:sprint23-policy-rules-engine` plus the Sprint 17–22 regression suite, syntax checks, lock check and `git diff --check` as specified in the sprint request.
