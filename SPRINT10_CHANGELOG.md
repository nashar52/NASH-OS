# Sprint 10 — Enterprise Employee & Manager Self-Service

## Delivered

- Employee Self-Service catalogue with profile, personal-information, document, attendance, leave, business-trip, expense, task, goal, performance, learning, payslip, benefits, request, and notification services.
- Manager Workspace catalogue with dashboard, attendance, leave and expense approvals, recruitment, performance, goal, learning, document, and analytics services.
- Every service action uses the authenticated permissioned-action endpoint and returns a runtime receipt containing an audit event and evidence reference.

## Controls

- MySQL remains the existing system of record; no schema or source-row change is introduced.
- Service actions are role-bound and route policy decisions to human review.
