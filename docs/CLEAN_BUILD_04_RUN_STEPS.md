# Clean Build 04 Run Steps

1. Stop any old server on port 3000:

```bat
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
```

2. Run installation:

```bat
npm.cmd install
```

3. Confirm MySQL lock:

```bat
npm.cmd run mysql:lock-check
```

4. Run QA:

```bat
npm.cmd run qa:clean-build-04
```

5. Start NASH OS:

```bat
npm.cmd start
```

6. Open:

```text
http://localhost:3000/?v=clean-build-04-task-execution
```

7. Test:

```text
Employee 360 → Select employee → Check In → Start Workday Session → Task Execution Gate → Load My Tasks → Start Selected Task → Submit Completion
```
