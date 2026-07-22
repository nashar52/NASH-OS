# NASH OS Clean Build 03 — Workday Attendance Lock

## Purpose
Build 03 connects the controlled MySQL Employee 360 profile to the first daily operational workflow: check-in, workday session start, check-out, and attendance receipts.

## Run
```bat
npm.cmd install
npm.cmd run mysql:lock-check
npm.cmd run qa:clean-build-03
npm.cmd start
```

Open:
```text
http://localhost:3000/?v=clean-build-03-workday-attendance
```

Press Ctrl + F5.

## Acceptance
- Employee must be selected from MySQL.
- No manual employee typing.
- Check-in creates a controlled attendance receipt.
- Start Workday creates a session.
- Check-out records duration.
- No schema change, no migration, no JSON fallback.
- No legacy patch UI, no generic operating form.
