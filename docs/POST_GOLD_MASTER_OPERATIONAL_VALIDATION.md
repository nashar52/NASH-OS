# Post-Gold Master Operational Validation — Issue #15

**Validation date:** 2026-07-23  
**Candidate:** `v1.0-gold-master-candidate` / latest supplied `main` merge commit `e3f5838`  
**Environment:** fresh temporary working directory; `NODE_ENV=test`; no repository `.env` loaded; MySQL deliberately unreachable at `127.0.0.1:1`; JSON fallback disabled.

## Acceptance report

| Track | Severity | Result | Verification evidence |
| --- | --- | --- | --- |
| Clean application boot and web hardening | Critical | **PASS** | The app booted from a fresh directory and `/` returned 200 with request ID, CSP, anti-sniffing, frame, and no-cache headers. |
| Anonymous protection | Critical | **PASS** | `GET /api/sprint12/security/center` returned 401 without a session. |
| Authentication and role binding | Critical | **PASS** | A valid MFA (`000000`) login created an `employee` role session; role is server-resolved from the work email. |
| Role-based authorization | Critical | **PASS** | The employee session received 403 from the executive/HR security center. |
| Permissioned action boundary | High | **PASS** | `EMPLOYEE_PROFILE_EDIT_REQUEST` returned a `RECORDED_RUNTIME_ONLY` receipt declaring direct database CRUD blocked. |
| Cross-role mutation prevention | High | **PASS** | The employee session received 403 when requesting `EXEC_BRIEF`. |
| Source integrity in a clean environment | High | **PASS (control behavior)** | `GET /api/workday/attendance/source` returned explicit 503 `ECONNREFUSED`; no fabricated attendance or document data was returned. |
| Rate-limit hardening and audit correlation | High | **PASS after fix** | Request 121 to an isolated route returned 429 with `X-Request-Id`, CSP, `nosniff`, and a rate-limit receipt containing the same request ID. |
| Session revocation | High | **PASS** | Logout returned 200 and the same token subsequently returned 401 from `/api/access/session`. |

## Failure analysis and remediation

### Closed: rate-limit rejections bypassed response protections — High

- **Observed failure:** Before remediation, a 429 response had neither `X-Request-Id` nor the browser security headers. Its rate-limit evidence receipt also had no request ID.
- **Exact root cause:** The API rate-limit middleware executed before the middleware that created `req.requestId` and set the security headers. Its early 429 return therefore bypassed those controls.
- **Fix:** The tracing/security middleware now executes first, followed by the rate limiter. Rate-limit responses consequently retain correlation, CSP, and anti-sniffing protections.
- **Regression evidence:** `npm run qa:post-gold-master-operational` issues 121 requests, asserts status 429, headers, audit path, and non-empty receipt request ID.

## Remaining environment readiness blocker

No implementation failure remains in the exercised acceptance tracks. However, the clean environment has **no reachable MySQL source of truth**. The application correctly fails source-backed attendance reads explicitly instead of inventing data, but operational workflows requiring employee/source data cannot be completed until a production MySQL instance is provisioned and accepted.

The candidate's documented release boundary also excludes production cloud deployment, external SSO, payment processing, backups/monitoring, and legal/commercial configuration. These are deployment acceptance items, not changes made by this validation.

## Final recommendation

**NO-GO for production.** All executed application acceptance controls pass after the high-severity rate-limit fix, but a critical dependency—production MySQL availability—has not been accepted in a clean environment. The documented production-infrastructure, external-identity, payment, backup/monitoring, and legal/commercial gates also remain open. Re-run this validation against a provisioned production-like MySQL environment and close those deployment gates before certifying production readiness.

## Commands and exact outcomes

```text
$ npm run qa:post-gold-master-operational
PASS clean boot and browser security headers
PASS unauthenticated workspace access is denied
PASS MFA login creates an employee-bound session
PASS employee RBAC blocks executive security center
PASS permissioned employee action records runtime receipt
PASS cross-role permissioned action is denied
PASS clean-environment source outage is explicit and never fabricated
PASS rate-limited response retains trace and security headers
PASS logout invalidates session
qa:post-gold-master-operational = PASS
tracks=9; cleanEnvironment=true; mysqlSourceUnavailable=true; productionRecommendation=NO-GO
```
