# Clean Build 16 Run Steps — Executive Dashboard

```bat
npm.cmd install
npm.cmd run mysql:lock-check
npm.cmd run qa:clean-build-16
npm.cmd start
```

Open:

```text
http://localhost:3000/?v=clean-build-16
```

Then use:

```text
Executive Home → Executive Dashboard
```

Rules:
- Executive Dashboard is source-labeled.
- No schema migration.
- No database schema touch.
- AI explains risk only.
- Final decisions remain human-controlled.
