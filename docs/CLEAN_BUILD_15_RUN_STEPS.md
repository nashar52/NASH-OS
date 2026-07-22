# NASH OS — Clean Build 15 Run Steps

Clean Build 15 — AI Risk Radar / Decision Support Center

## Correct lineage
Build 09 original → Build 10 corrected → Build 11 corrected → Build 12 → Build 13 → Build 14 → Build 15.

## Run
```bat
npm.cmd install
npm.cmd run mysql:lock-check
npm.cmd run qa:clean-build-15
npm.cmd start
```

Open:
```text
http://localhost:3000/?v=clean-build-15
```

Menu:
```text
HR Operations → AI Risk Radar / Decision Support
Executive Home → AI Risk Radar
```
