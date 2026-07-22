# Clean Build 07 Run Steps

1. Stop any existing server on port 3000.

```bat
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
```

2. Install dependencies.

```bat
npm.cmd install
```

3. Confirm MySQL lock.

```bat
npm.cmd run mysql:lock-check
```

4. Run QA.

```bat
npm.cmd run qa:clean-build-07
```

5. Start.

```bat
npm.cmd start
```

6. Open:

```text
http://localhost:3000/?v=clean-build-07-self-service-rights
```

7. Hard refresh:

```text
Ctrl + F5
```

## Test Path

1. Select a MySQL employee.
2. Run PIN Check-in.
3. Start Workday Session.
4. Load My Tasks.
5. Select a task.
6. Submit Completion.
7. Run manager/beneficiary closure decision.
8. Load JD/SOP Library.
9. Load Self-Service View.
10. Confirm personal rights, salary summary, attendance, and work report are visible for the selected employee only.
