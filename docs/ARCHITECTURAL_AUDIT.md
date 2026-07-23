# NASH OS Architectural Audit — 2026-07-23

## Scope and findings

The repository is a single-process Express application with a vanilla JavaScript SPA and a MySQL read layer. The server deliberately keeps workflow actions in bounded runtime receipt stores so the existing HR schema is not mutated. The application is organized around employee, manager, HR, and executive workspaces, with most domain summaries composed from source tables and runtime evidence.

### Strengths retained

- MySQL queries use parameter values for data and a fixed allow-list for table identifiers.
- The client escapes interpolated business content before inserting it into rendered workspace HTML.
- Permissioned workflow actions create receipts and do not perform direct database writes.
- AI responses are advisory and include a human-decision boundary.

### Risks addressed in this change

1. SaaS control-plane routes (tenant registry, billing, provisioning, release readiness, and copilot) were publicly callable and did not enforce the executive role.
2. Runtime session reads did not expire sessions except on the session-inspection endpoint.
3. Login had no throttling and runtime session and tenant stores had no capacity bounds.
4. Tenant provisioning accepted unvalidated owner values and duplicate tenant identifiers.
5. The application did not consistently return baseline browser security headers or a request identifier.

### Remaining production prerequisites

This local acceptance build is not yet equivalent to a production HCM platform. Before production, replace the in-memory directory and receipt stores with persistent, tenant-scoped services; use an external IdP with MFA/SSO; add durable audit retention; use a database pool and migrations owned by a release process; add centralized logging, metrics, alerting, backups, malware scanning for documents, secrets management, and independent security testing. Payroll, government integrations, and AI providers must remain sandboxed until their vendor contracts, legal controls, data-processing agreements, and reconciliation processes are complete.

## Verification approach

`npm run qa:security-boundaries` starts the application on an isolated local port and verifies unauthenticated and employee control-plane requests are rejected, an executive request succeeds, and browser hardening headers are returned. Existing clean-build and role-access QA gates remain part of the release check.
