# NASH OS Clean Build 12 — HR Procedures / JD-SOP Operational Enforcement

## Purpose
Build 12 converts the existing Job Description + SOP Library into an operational enforcement layer:

Employee 360 → Job Description → SOP → Task → SLA → Evidence → Approval → Quality Gate → Audit Receipt.

## Run
```bat
npm.cmd install
npm.cmd run mysql:lock-check
npm.cmd run qa:clean-build-12
npm.cmd start
```

Open:

```text
http://localhost:3000/?v=clean-build-12
```

Then select a real employee and open:

```text
HR Operations → HR Procedure Enforcement
```

## Buttons
- Run Procedure Check
- Create Task
- Send Approval
- Request Evidence
- Enforce SLA
- Create Receipt
- Export Map

## Lock Rules
- MySQL remains the source of truth.
- No schema migration is included.
- No database schema is touched.
- AI explains and recommends only.
- Human final decision remains required.
