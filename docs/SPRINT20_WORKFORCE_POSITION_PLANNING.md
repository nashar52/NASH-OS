# Sprint 20 — Enterprise Workforce & Position Planning

## Implemented capabilities
- **Position Control Center:** `GET /api/workforce/positions` adapts existing MySQL `positions` and valid employee position-holder relationships. It explicitly returns separate position and employee entities, source labels, and verification timestamps.
- **Headcount and executive workforce dashboard:** `GET /api/workforce/dashboard` returns source-labelled current headcount, position, filled/vacant, and vacancy-rate metrics plus department drill-down rows.
- **Vacancy registry:** `GET /api/workforce/vacancies` uses only validated `employees.position_id` relationships. Age, reason, criticality, coverage, priority, and recruitment status state `Not Configured` when no persistent source exists.
- **Advisory planning and succession:** workforce demand/supply/gap, risks, mobility, readiness, skills, and succession never fabricate data. The succession route returns `INCOMPLETE_DATA` when successor/readiness relationships are absent.
- **Impact simulator:** `POST /api/workforce/impact-preview` is read-only and marks unverified dependencies `UNAVAILABLE`, rather than claiming no impact.

## Runtime-only workflows
`POST /api/workforce/requests` creates controlled, non-persistent packets for position lifecycle states, hiring requests, and replacement requests. Lifecycle request confirmation says MySQL source data has not been modified. `POST /api/workforce/requests/:id/decision` records an Executive human decision only; it does not modify a position or employee source record. `GET /api/workforce/audit` exposes runtime packets, receipts, and audit records.

Every successful action supplies receipt ID, timestamp, server-derived actor and actor role, action/target, source label, status, evidence reference, audit event ID, and human authorization status.

## Schema limitations and source integrity
MySQL remains the operational source of truth. This sprint only uses existing read adapters and does not seed, migrate, alter, reset, or destructively write MySQL. Planned/budgeted headcount, criticality, turnover/retirement, hiring forecast, successor relationships, and several impact domains surface `Not Configured`, `Source Unavailable`, or `Schema Support Required` rather than invented values. Runtime packets are not master data and are labeled accordingly. No JSON fallback is used.

## Role permissions
| Role | Access |
|---|---|
| Employee | Position endpoint is scoped to own mapped position; no workforce workspace navigation or request action. |
| Manager | Authorized workforce view and runtime staffing/replacement request initiation. |
| HR | Enterprise dashboard, positions, vacancies, succession/impact review, and request initiation. |
| Executive | Enterprise dashboard, succession/impact review, audit access, and final human decision recording. |

Session identity is derived by the server through `requireSession`; no browser actor or role is trusted and role switching remains disabled.

## Button/action matrix
| Button | Action | Outcome |
|---|---|---|
| Preview impact | `POST /api/workforce/impact-preview` | Read-only availability-labelled preview. |
| Request lifecycle change | `POST /api/workforce/requests` | Runtime request + full receipt; no MySQL update. |
| Create hiring request | `POST /api/workforce/requests` | Runtime hiring packet + full receipt. |
| Create replacement request | `POST /api/workforce/requests` | Runtime replacement packet + full receipt. |

## QA and live MySQL status
Run `npm run qa:sprint20-workforce-planning` with syntax checks and the Sprint 17–19 regression commands listed in the PR. The static QA validates route/UI contracts, authorization declarations, receipt and audit fields, schema/JSON safeguards, advisory boundaries, impact availability, and retained prior QA registrations. Live MySQL validation depends on configured MySQL availability; no successful live validation is claimed unless `mysql:lock-check` connects.

## Remaining gaps
Persistent headcount plans/budgets, position criticality, vacancy metadata, recruitment linkage, performance/readiness, successor nominations, and dependency mappings require existing schema support or a separately approved schema project. AI remains advisory only and cannot take workforce decisions.
