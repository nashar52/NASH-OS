# NASH OS HF34 — Role-Bound Access Control

- Removed user-selectable workspace role from login.
- Removed in-app role switching.
- Added organization-assigned role resolution from authenticated account identity.
- Added runtime access sessions with server-issued tokens.
- Added dynamic navigation based on assigned role.
- Enforced permissioned action role from the server session rather than client input.
- Restricted Action Ledger retrieval to the authenticated role.
- No MySQL schema, migration, seed, or database reset.

Local acceptance accounts:
- employee@nash.local → Employee
- manager@nash.local → Manager
- hr@nash.local → HR Operations
- executive@nash.local → Executive
