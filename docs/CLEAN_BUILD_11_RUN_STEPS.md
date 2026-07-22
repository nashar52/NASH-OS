# Clean Build 11 Run Steps — Government Relations / Compliance Decision Link

Built from the corrected Build 10 package only.

```bat
npm.cmd install
npm.cmd run mysql:lock-check
npm.cmd run qa:clean-build-11
npm.cmd start
```

Open:

```text
http://localhost:3000/?v=clean-build-11
```

Use:

```text
HR Operations → Government Relations
```

Operational flow:

```text
Employee 360
↓
Government Relations Check
↓
Qiwa / GOSI / Mudad-WPS / Nitaqat / Work Permit-Iqama Readiness
↓
Task / Approval / Evidence / Payroll Hold
↓
Receipt + Audit Trail
```

Locks:

```text
schemaMigrationIncluded = false
databaseSchemaTouched = false
humanFinalDecisionRequired = true
aiAutonomousDecisionBlocked = true
```
