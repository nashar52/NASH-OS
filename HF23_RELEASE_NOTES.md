# NASH OS HF23 — Executive Command Center

Built directly on HF22.

## Implemented
- Decision-led Executive Command Center.
- Live operating picture with source-labelled enterprise metrics.
- Executive intervention queue.
- Priority ribbon for urgent decisions, stable domains, interventions, and weakest coverage.
- Controlled operating-domain drilldowns.
- Human-owned decision packets and escalation receipts.
- Explainable AI risk-driver drilldowns.
- Responsive executive layout.

## Safety boundaries preserved
- MySQL remains the source of truth.
- No database schema change.
- No migration, seed, or reset.
- AI remains advisory only.
- Final decisions remain human-authorized.

## Validation
- node --check public/app.js: PASS
- node --check server.js: PASS
- qa:hf22: 10/10 PASS
- qa:hf23: 10/10 PASS
- qa:hf20-all: PASS
