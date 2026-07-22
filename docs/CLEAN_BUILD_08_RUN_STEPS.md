# NASH OS Clean Build 08 — Performance Evaluation 28 Factors Lock

## Run

```bat
npm.cmd install
npm.cmd run mysql:lock-check
npm.cmd run qa:clean-build-08
npm.cmd start
```

Open:

```text
http://localhost:3000/?v=clean-build-08-performance-evaluation
```

Press `Ctrl + F5`.

## Test path

1. Select a real employee from Employee 360.
2. Run Check-in / Start Workday if needed.
3. Load tasks and submit at least one completion if you want richer evidence.
4. Open Performance Evaluation — 28 Factors.
5. Click `Load 28-Factor Evaluation`.
6. Review overall score, rating band, 28 factor cards, evidence reason, AI explanation, and training gap.
7. Click `Record Final Decision`.
8. Confirm the final decision receipt is shown.
9. Export the evaluation map.

## Lock rules

- MySQL remains the source of truth.
- No schema change.
- No migration.
- No seed.
- No JSON fallback.
- AI is decision support only.
- Final performance decision remains human-approved.
