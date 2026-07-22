# Clean Build 17 Run Steps — UI Compression / Navigation Cleanup

```bat
npm.cmd install
npm.cmd run mysql:lock-check
npm.cmd run qa:clean-build-17
npm.cmd start
```

Open:

```text
http://localhost:3000/?v=clean-build-17
```

Use:

```text
UI Surface Audit
```

Rules:
- Compressed role navigation only.
- Secondary capabilities are routed through source-labeled operating centers.
- No silent visible button.
- No duplicate standalone page surface.
- No schema migration.
- No database schema touch.
- AI remains recommendation/explanation only.
