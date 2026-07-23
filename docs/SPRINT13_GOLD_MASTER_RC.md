# NASH OS v1.0 Gold Master Candidate

**Release status:** Release candidate for controlled local/environment validation.

## Scope completed

Sprint 13 closes the release-candidate audit for the role-bound NASH OS experience:

- The sign-in surface no longer exposes a demo shortcut; every workspace session uses the normal organization, password, and MFA validation flow.
- Attendance no longer renders fabricated monthly totals, calendar days, or exceptions. It requests the available MySQL attendance-source metadata and exposes controlled check-in, check-out, export, and review-request actions.
- The employee file no longer fills an empty document library with invented files. It now reports an explicit empty state until a controlled document is uploaded.
- Visible-action protections, role navigation, request receipts, server rate limiting, security headers, session checks, and the action ledger remain covered by the existing acceptance suites.
- The Sprint 13 QA gate verifies the release version, no-demo/no-fabricated-data rules, live attendance-source binding, document empty state, security controls, and this release document without requiring a database connection.

## Validation runbook

Run these checks from the repository root:

```bash
node --check server.js
node --check public/app.js
npm run qa:sprint13
npm run qa:sprint12
npm run qa:hf35-domain-apps
```

The broader legacy final-gold script is retained for historical regression coverage but contains pre-Sprint-13 copy assertions and is not the release authority for this candidate.

## Enterprise workflow coverage

| Workflow | Candidate control |
| --- | --- |
| Employee lifecycle / self service | Role-bound employee workspace, controlled profile/document requests, receipts |
| Recruitment | Requisition, candidate, interview, assessment, offer, and onboarding-trigger APIs |
| Attendance | MySQL source inspection plus controlled runtime check-in/check-out and review request |
| Payroll | Period/run/action/payslip endpoints with authorized HR/executive boundaries |
| Performance / learning | Evidence-aware assessments, calibration, development and talent workflow packets |
| Government compliance | Qiwa, GOSI, Mudad/WPS, Nitaqat and government-case workflow controls |
| Executive analytics | Source-labelled dashboard, reports, risk, decision and AI advisory surfaces |
| RBAC / audit | Session role enforcement, action receipts, security artifacts, rate limits and headers |

## Known release boundary

This candidate does **not** certify production infrastructure. External SSO, payment processing, cloud deployment, backup/monitoring operations, legal/commercial configuration, and a production MySQL environment need separate deployment acceptance. Runtime workflow packets intentionally do not alter the MySQL schema or source records.

## Release tag

Git tags cannot contain spaces, so the repository tag is `v1.0-gold-master-candidate`. Its annotated message identifies the requested release name: **NASH OS v1.0 Gold Master Candidate**.
