# Sprint 25 — Enterprise Core Integration

## Executive summary

Sprint 25 stabilizes the existing Sprint 17–24 platform without adding a standalone HR module. MySQL remains the operational system of record. Sprint 19, 20, 23 and 24 request ledgers are explicitly runtime-only where no approved schema exists; Sprint 21 workflows and Sprint 22 lifecycle events use their approved additive MySQL tables.

**Final recommendation: BLOCKED — LIVE MYSQL VALIDATION REQUIRED**

## Current architecture and persistence

| Module | Producer/consumer | API/event | Persistence | Human authorization |
|---|---|---|---|---|
| Organization (19) | HR → Executive | `/api/organization/change-request` | Runtime request ledger; source unchanged | Executive final decision |
| Workforce (20) | Manager/HR → Executive | `/api/workforce/requests` | Runtime request ledger; source unchanged | Executive final decision |
| Workflow (21) | Shared approval layer | `/api/workflows`, actions, evidence | MySQL workflow tables | Assigned human step |
| Lifecycle (22) | HR/Manager → workflow | `/api/lifecycle/events` | MySQL lifecycle and workflow tables | Approved lifecycle workflow |
| Policy (23) | HR/Executive → requesting modules | `/api/policies/:id/evaluate` | Runtime policy ledger | Evaluation is advisory only |
| AI (24) | Authorized user → human review | `/api/ai/advisories` | Runtime unavailable-state ledger | AI cannot decide |

## Integration, workflow and policy adoption matrices

| Representative flow | Workflow reference | Policy reference | Receipt/audit | Source mutation status |
|---|---|---|---|---|
| Organization change | Required integration target: Sprint 21 organization template | Evaluate before final authorization | Organization receipt/audit | `REQUEST_ONLY` |
| Hiring/replacement | Required integration target: Sprint 21 workforce template | Evaluate planning evidence | Workforce receipt/audit | `REQUEST_ONLY` |
| Lifecycle event | `workflow_instances` ID is mandatory | Evaluate eligibility before submission | MySQL workflow receipt/audit | `PENDING_AUTHORIZATION` or authorized event |
| Policy lifecycle | Workflow reference supplied on transition | Policy evaluation receipt/audit | Policy receipt/audit | `NOT_SUPPORTED` |
| AI review | Human decision may reference workflow | Policy reference may be recorded | Normalized AI receipt/audit | `NOT_SUPPORTED` |

The organization and workforce modules retain their backward-compatible request packets. They do not claim source updates. Live MySQL validation is required before replacing those packets with automatic shared-workflow creation, because templates and routing are tenant-specific operational configuration.

## Receipt and audit contract

Normalized receipts use: `receiptId`, `timestamp`, `requestId`, `tenantId`, `actorId`, `actor`, `actorRole`, `actionType`, `targetType`, `targetId`, `sourceLabel`, `sourceTimestamp`, `status`, `workflowId`, `policyEvaluationId`, `evidenceReference`, `auditEventId`, `humanAuthorizationStatus`, and `sourceMutationStatus`. Permitted mutation states are `NOT_REQUESTED`, `REQUEST_ONLY`, `PENDING_AUTHORIZATION`, `AUTHORIZED_NOT_APPLIED`, `APPLIED_TO_SOURCE`, `FAILED`, and `NOT_SUPPORTED`. AI unavailable-state receipts now implement this complete contract and declare `NOT_SUPPORTED`.

## Authentication and security alignment

Local development accounts are employee, manager, HR and executive `@nash.local` accounts with password `NashDemo@2026` and MFA `000000`. Security QA now uses that authoritative contract. Server-side assigned roles, MFA, session verification/logout, login throttling, API rate limits, tracing, browser security headers, role-bound access, and blocked role switching remain server enforced.

## MySQL configuration and live validation

Use `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in an untracked `.env`; no password belongs in an example file. `mysql:lock-check` reports configuration missing, connection refused, authentication failure, database missing, required-table missing, or source-lock pass. It never enables JSON fallback, seeds, resets, truncates, drops, or migrates data.

## AI provider readiness

`GET /api/ai/provider-health` is HR/executive-only and returns configuration metadata without secrets. It reports configured/unconfigured provider, credential and model readiness, source-mapping state, and required output validation. With no provider, advisory requests return HTTP 503 and the UI/API state is: **AI provider not configured. No advisory was generated.** No recommendation is fabricated. A provider response remains unable to set identity/role/tenant, execute SQL, mutate master data, approve a workflow, or make a final decision.

## End-to-end scenarios and action matrix

Runtime coverage proves HR authentication, provider-health authorization, explicit AI-unavailable behavior, no fabricated advisory, normalized receipt, and audit ID. Organization, workforce, lifecycle, policy, and workflow E2E scenarios require live MySQL because they depend on existing employees and approved tenant workflow templates. Visible operational controls must create an authorized request, workflow, policy evaluation, receipt/audit, or be removed; request-only controls disclose source mutation status.

## Performance, risks, and blockers

The provider health endpoint performs no provider request and exposes no credential. The lock check uses one connection and runs schema checks only as an explicit preflight command. Runtime list endpoints remain bounded. Main blocker: this environment has no reachable configured MySQL service, so actual source tables, workflow templates, lifecycle event behavior, and tenant routing cannot be accepted here.

## Windows PowerShell 5.1 local validation

```powershell
cd $HOME\Desktop\NASH_OS_ENTERPRISE
git checkout main
git pull origin main
npm install
npm run mysql:lock-check
npm run qa:local-auth
npm run qa:security-boundaries
npm run qa:sprint25-enterprise-core-integration
npm start
```

Then validate `http://localhost:3000`. Record any MySQL failure with command, classification, root cause, fix status, and remaining blocker; do not treat static QA as MySQL acceptance.
