# HF32 Fixed — Distinct Operational Apps

This corrective build addresses the observed issue where every sidebar page continued to show the cached generic "Select Employee First" workspace.

Actual corrections:
- Disabled browser caching for HTML, JavaScript, and CSS.
- Added an explicit cache-busting query to app.js.
- Added a visible per-page build proof badge: `HF32 FIXED · DISTINCT APP`.
- Preserved dedicated Attendance, Tasks, Employee File, Performance, Rights, and HR domain renderers.
- Fixed Workspace Home so the role surface is restored after closing a domain app.
- No database schema, migration, seed, or reset changes.
