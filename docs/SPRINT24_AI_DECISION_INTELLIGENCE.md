# Sprint 24 — Enterprise AI Decision Intelligence Engine

## Architecture and source integrity
Sprint 24 adds a provider-neutral, authenticated advisory boundary in `server.js`. It separates advisory request validation, controlled source retrieval boundaries, provider availability, output contract construction, explainability, receipts/audit, and human-decision recording. MySQL remains the operational source of truth: this sprint performs no schema migration, seed, reset, or operational record mutation.

No provider is configured in this repository. Requests return an explicit `503 AI_PROVIDER_NOT_CONFIGURED` advisory contract rather than a synthetic recommendation. The runtime ledger only records the request receipt/audit and its unavailable state; persistent advisory, decision, receipt, and audit storage requires an approved tenant-scoped MySQL schema.

## Advisory, explainability, confidence, and risk models
The allowlist covers the 25 requested workforce, employee, compliance, workflow, data-quality, and executive advisory categories. Each result includes IDs, tenant and requester context, source labels/timestamps, coverage, limitations, categorical confidence, risk level/basis, recommendation, explanation, factors, missing data, policy/rule/workflow/evidence references, human-review status, receipt, and audit ID.

Confidence is categorical (`High`, `Medium`, `Low`, or `Insufficient Data`); no percentage is fabricated. Risk is categorical (`Critical`, `High`, `Medium`, `Low`, `Informational`, or `Unable to Assess`). With no approved provider and source mapping, the engine returns `Insufficient Data` and `Unable to Assess`, explains what was not evaluated, and requires human review.

## Human boundary, roles, privacy, fairness, and tenant isolation
AI is advisory only and cannot write employees, positions, payroll, performance, policies, workflows, government records, or final decisions. Human decision recording supports the seven controlled decision types, requires server-confirmed rationale, and creates a receipt/audit event. Managers cannot record final acceptance/rejection/alternative decisions. Employees can request only their own authorized development categories. All advisory, evidence, receipt, and audit reads compare server session tenant context; browser tenant input is ignored.

The adapter sends no unrestricted database records to a provider and does not model protected attributes. It exposes limitations, alternative interpretations, missing data, and a human-review warning instead of adverse conclusions. The policy, workforce, workflow, lifecycle, learning, compliance, payroll, government, and executive integrations are source boundaries until approved mappings and provider configuration exist.

## Routes
- `POST /api/ai/advisories`, `GET /api/ai/advisories`, `GET /api/ai/advisories/:id`
- `GET /api/ai/advisories/:id/explainability`, `GET /api/ai/advisories/:id/evidence`, `GET /api/ai/receipts/:id`
- `GET /api/ai/executive-risk-summary`, `/workforce-intelligence`, `/employee-development`, `/policy-compliance`, `/workflow-delays`
- `POST /api/ai/advisories/:id/decisions`; controlled status, dismissal, and escalation routes reject direct/silent state changes.

## QA and live validation status
Run `npm run qa:sprint24-ai-decision-intelligence` plus the Sprint 17–23 regression commands. Static QA validates contracts, source/explainability fields, provider-unavailable behavior, roles, tenant checks, human boundary, receipts/audit, no seeded output, and no `eval()`.

Live MySQL validation is pending environment availability. AI provider validation is pending an approved provider configuration and controlled source-mapping implementation. Risks and remaining gaps: no persistent Sprint 24 schema, no approved provider, no model invocation, and no source-backed recommendation until both controls are delivered.
