# Clean Build 18 — Final Acceptance / Local Run Lock

## Purpose
Final acceptance gate for NASH OS clean operational master. This build confirms that the system remains clean, compressed, source-labeled, locally runnable, and protected from schema migration.

## Local Run Steps

```bat
npm.cmd install
npm.cmd run mysql:lock-check
npm.cmd run qa:clean-build-18
npm.cmd run qa:final-acceptance
npm.cmd start
```

Open:

```text
http://localhost:3000/?v=clean-build-18
```

Then open **Final Acceptance**.

## Protected Rules

- MySQL is the source of truth.
- JSON fallback remains blocked.
- No schema migration is included.
- No database schema is touched.
- No autonomous AI decision is allowed.
- Human final decision remains required.
- No silent visible button is allowed.
- No duplicate visible route is allowed.
