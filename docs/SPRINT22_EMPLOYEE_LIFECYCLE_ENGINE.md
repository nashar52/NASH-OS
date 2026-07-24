# Sprint 22 — Employee Lifecycle Engine

## Architecture

Sprint 22 adds the `employee_lifecycle_events` MySQL ledger. It is an additive, idempotent migration and the lifecycle ledger does not reset, seed, or mutate employee master records. Each chronological event is tied to a Sprint 21 `EMPLOYEE_LIFECYCLE` workflow instance and writes matching workflow receipt and audit artifacts in the same transaction.

The ledger supports all specified lifecycle stages and event types, including organization movements, workforce hiring/replacement/vacancy closure, performance reviews, learning completions/certifications, compensation decisions, and separation/offboarding records. Performance, learning, and separation detail is stored in relational columns rather than JSON.

## API and access

- `GET /api/lifecycle/stages` exposes the controlled stage and event taxonomy.
- `GET /api/lifecycle/timeline/:employeeId` returns one reverse-chronological timeline. Employees are restricted to their own resolved organization record; managers are limited to their authorized organization scope; HR can view enterprise records.
- `POST /api/lifecycle/events` records a workflow-linked event. A valid `EMPLOYEE_LIFECYCLE` workflow reference and evidence reference are mandatory. The endpoint never performs approval logic: status follows the reusable Workflow Engine state.
- `GET /api/lifecycle/analytics` provides executive-only summarized counts.

Every event contains its event ID, employee ID, event type/date, actor/role, workflow/evidence references, receipt/audit IDs, status, source label, and human authorization status. AI responses are explicitly advisory and cannot create or approve actions.

## QA

Run `npm run qa:sprint22-lifecycle-engine`. The static QA validates timeline, lifecycle taxonomy, workflow integration, organization-aware permissions, performance/learning/compensation/separation fields, receipts/audit, advisory AI boundary, and JSON-storage prohibition. Also run the Sprint 19–21 QA commands for regression coverage.

## Remaining integration gap

Existing Sprint 19 and Sprint 20 request routes intentionally create runtime approval packets and do not mutate source records. They cannot automatically produce a durable lifecycle event until a valid Employee Lifecycle workflow instance is supplied and the authorized lifecycle event is recorded. This preserves the existing no-direct-mutation and single-workflow-engine controls.
