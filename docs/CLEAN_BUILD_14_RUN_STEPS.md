# NASH OS — Clean Build 14 Run Steps

## Build
Clean Build 14 — Quality & Governance Operating Center

## Source Chain
Build 09 original → Build 10 corrected → Build 11 corrected → Build 12 → Build 13 → Build 14.

## Purpose
Add one operational quality and governance layer without adding page noise or database changes.

## Run
```bat
npm.cmd install
npm.cmd run mysql:lock-check
npm.cmd run qa:clean-build-14
npm.cmd start
```

Open:
```text
http://localhost:3000/?v=clean-build-14
```

Go to:
```text
HR Operations → Quality & Governance
```

## Controls
- Load Quality Center
- Run Quality Check
- Create Corrective Action
- Enforce Governance Gate
- Request Evidence
- Create Audit Receipt
- Approve Gate
- Return Gate
- Reject Gate
- Export Quality Report

## Lock Rules
- No schema migration.
- No database schema touch.
- AI explains risk only.
- Human final decision required.
