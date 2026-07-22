# Clean Build 06 Run Steps

```bat
npm.cmd install
npm.cmd run mysql:lock-check
npm.cmd run qa:clean-build-06
npm.cmd start
```

Open:

```text
http://localhost:3000/?v=clean-build-06-jd-sop-library
```

Test:

1. Select employee from Employee 360.
2. Run Check-in and Start Workday Session.
3. Load My Tasks and select a real task.
4. Open Job Description + SOP Library.
5. Load JD/SOP Library.
6. Select SOP template.
7. Run AI SOP Optimize.
8. Export SOP Map.
