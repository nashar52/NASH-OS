# Clean Build 10 Run Steps — Compensation / Payroll / WPS Decision Link

Run:

```bat
npm.cmd install
npm.cmd run mysql:lock-check
npm.cmd run qa:clean-build-10
npm.cmd start
```

Open:

```text
http://localhost:3000/?v=clean-build-10
```

Use:

1. Select a real employee from Employee 360.
2. Open HR Operations → Compensation Decisions.
3. Click Run Eligibility Check.
4. Review performance score, training risk, eligibility, payroll impact, and WPS readiness.
5. Use Generate Recommendation, Calculate Payroll Impact, Send to Approval, or Create Evidence Receipt.

Lock rules:

- schemaMigrationIncluded = false
- databaseSchemaTouched = false
- aiRecommendationOnly = true
- humanFinalDecisionRequired = true
