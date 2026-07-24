# Sprint 19 — Organization Persistent Schema Gaps

Sprint 19 inspects `information_schema` at runtime and treats MySQL `departments`, `positions`, and `employees` as read-only source tables. It makes no migrations, seeds, resets, or writes.

The adapter detects the following optional organization entities. If their tables are absent, the UI marks them **Not supported** and uses no invented relationship: `legal_entities`, `branches`, `business_units`, `sections`, `cost_centers`, `job_families`, and `job_grades`.

Organization changes are runtime approval packets and audit receipts only. A future approved persistent implementation needs an explicitly reviewed migration and transactional repository; it is intentionally outside this sprint.
