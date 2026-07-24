# Sprint 21 — Enterprise Workflow Engine

## Architecture

Sprint 21 adds the single reusable workflow API for Organization, Workforce Planning, Recruitment, Employee Lifecycle, Performance, Learning, Payroll, Government Relations, Documents, and Requests. The engine writes additive relational MySQL tables only: templates, template steps, instances, assignments, delegations, evidence, receipts, audit events, and notification payloads. The idempotent `CREATE TABLE IF NOT EXISTS` migration never resets data, seeds data, or uses JSON columns.

Templates model single, sequential, parallel, conditional, role, named-user, and executive approvals. Instances use `DRAFT`, `SUBMITTED`, `PENDING`, `APPROVED`, `REJECTED`, `RETURNED`, `CANCELLED`, `EXPIRED`, `ESCALATED`, and `COMPLETED` states. Each assignment stores its due time, enabling remaining-time and overdue calculations. The engine records in-app, email-ready, and push-ready notifications.

## Workflow API

* `POST /api/workflows/templates` — HR/executive creates a reusable, module-neutral template.
* `POST /api/workflows` — authenticated user creates a draft instance.
* `POST /api/workflows/:id/actions` — submits, approves, rejects, returns, cancels, recalls, reassigns, or escalates an instance. Final decisions require a routed authenticated human assignment; no AI path exists.
* `POST /api/workflows/:id/evidence` — attaches an evidence reference.
* `POST /api/workflows/delegations` — creates temporary, permanent, or out-of-office delegation.
* `GET /api/workflows/:id` — returns MySQL-backed instance, SLA status, receipts, audit events, and notifications.

## Risks and remaining gaps

* The additive migration requires a MySQL account with table-creation privilege on first use.
* Existing module-local runtime workflows remain for compatibility; their migration to this shared engine should be completed module-by-module in subsequent sprints.
* Notification records are durable delivery payloads; external email/push transport remains an integration concern.
