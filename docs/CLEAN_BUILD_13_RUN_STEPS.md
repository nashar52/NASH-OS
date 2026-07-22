# Clean Build 13 Run Steps — Unified Approval / SLA / Evidence Ledger

## Purpose
Build 13 adds one operating control center for approval backlog, SLA breaches, evidence ledger, and audit trail across HR modules.

## Run
```bat
npm.cmd install
npm.cmd run mysql:lock-check
npm.cmd run qa:clean-build-13
npm.cmd start
```

Open:
```text
http://localhost:3000/?v=clean-build-13
```

Navigate to:
```text
HR Operations → Unified Approval / SLA / Evidence
```

## Lock Rules
- MySQL remains the source of truth.
- No schema migration.
- No database schema touch.
- AI provides support and explanation only.
- Human final decision is required.
