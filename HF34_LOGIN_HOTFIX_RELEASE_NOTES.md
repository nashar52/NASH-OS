# NASH OS HF34 Login Hotfix

Fixed two browser runtime blockers in the role-bound access build:

- Removed the undefined `role` variable from local demo access.
- Local demo access now signs in as `employee@nash.local` using the acceptance password.
- Replaced bare `performance.now()` calls with a safe `window.performance.now()`/`Date.now()` wrapper to avoid DOM named-property collisions.
- Updated the application cache-busting query and HF34 startup URL.

No MySQL schema change, migration, seed, reset, insert, update, or delete was introduced.
