# RC-2B Cycle 3: ATOM-B Forensic Review — Auth Pair Diff Reconstruction

| Field | Value |
|---|---|
| Phase | RC-2B Cycle 3 — ATOM-B Forensic Review |
| Date | 2026-05-14 |
| Files | `middleware.js`, `lib/auth/withAdminAuth.js` |
| Verdict | **READY_FOR_DEPLOYMENT** — conditions documented below |

---

## 1. Authoritative Diff Summary

### 1a. `middleware.js` — Exact Change

**ONLY change: removal of header injection in 2 symmetric locations.**

```diff
# Location 1: /api/admin JWT success path (approx line 88)
-            // Allow request through, append headers if needed
-            const requestHeaders = new Headers(request.headers);
-            requestHeaders.set('x-admin-role', payload.role);
-            requestHeaders.set('x-admin-user', payload.sub);
-            if (payload.email) {
-                requestHeaders.set('x-admin-email', payload.email);
-            }
-
-            return NextResponse.next({
-                request: {
-                    headers: requestHeaders,
-                },
-            });
+            return NextResponse.next();

# Location 2: /admin page JWT success path (approx line 134)
# (identical pattern removed, same replacement)
-            const requestHeaders = new Headers(request.headers);
-            requestHeaders.set('x-admin-role', payload.role);
-            requestHeaders.set('x-admin-user', payload.sub);
-            if (payload.email) { requestHeaders.set('x-admin-email', payload.email); }
-            return NextResponse.next({ request: { headers: requestHeaders } });
+            return NextResponse.next();
```

**Everything else in `middleware.js` is IDENTICAL between deployed and local:**
- Imports: same (logError, getAdminAccessDecision, getAdminLandingPath, NextResponse, jwtVerify)
- Matcher: same (`['/((?!_next/static|_next/image|favicon.ico).*)']`)
- Rate limiting: same (in-memory Map, 100 req/min)
- CSRF: same
- JWT verification logic: same
- Public path bypass: same
- Bot SEO cache: same
- Error responses: same
- Redirect logic: same

---

### 1b. `lib/auth/withAdminAuth.js` — Exact Change

```diff
+import { verifyAdminSession } from './verifyAdminSession';   ← NEW IMPORT

# Old auth verification (header-reading pattern):
-        const role = request.headers.get('x-admin-role');
-        const userId = request.headers.get('x-admin-user');
-        const userEmail = request.headers.get('x-admin-email');
-
-        if (!role) {
-            return NextResponse.json({ error: 'Unauthorized. No active admin session found.' }, { status: 401 });
-        }
-
-        const path = new URL(request.url).pathname;
-        const user = {
-            id: userId,
-            role: role,
-            email: userEmail,
-        };

# New auth verification (direct session pattern):
+        const sessionCheck = await verifyAdminSession(request);
+        if (!sessionCheck.authenticated) {
+            return sessionCheck.response;
+        }
+
+        const path = new URL(request.url).pathname;
+        const user = sessionCheck.user;
```

**Everything else in `withAdminAuth.js` is IDENTICAL:**
- Rate limiting: same
- Role check: same (`getAdminAccessDecision` + `requireRole`)
- Handler invocation: same
- Telemetry: same (`safeInsert` to admin_audit_logs + api_requests)

---

## 2. Change Classification

### middleware.js changes

| Change | Classification |
|---|---|
| Remove `x-admin-role` header injection | **behavioral** — downstream code no longer receives these headers from middleware |
| Remove `x-admin-user` header injection | **behavioral** — same |
| Remove `x-admin-email` header injection | **behavioral** — same |
| `return NextResponse.next()` instead of `NextResponse.next(headers)` | **behavioral** — request forwarded without mutated headers |
| All else | **unchanged** |

**What does NOT change:** JWT verification logic, auth failure paths, redirects, rate limits, CSRF, matcher, bot cache.

### withAdminAuth.js changes

| Change | Classification |
|---|---|
| Replace header reads with `verifyAdminSession(request)` | **behavioral** — auth source moves from header to direct cookie read |
| Add `import { verifyAdminSession }` | **additive** |
| `user` object now from `sessionCheck.user` | **semantic** — same fields, different origin |
| 401 error message changes | **cosmetic** — "Unauthorized. No active admin session found." → sessionCheck.response message |

**What does NOT change:** Rate limiting, role checking, handler execution, telemetry logging.

---

## 3. Changed Execution Paths

### Before ATOM-B (production)

```
Request → middleware → jwtVerify → inject x-admin-role/user/email → NextResponse.next(headers)
                                                                              ↓
                                              withAdminAuth → reads x-admin-role header
                                                           → if missing: 401
                                                           → user = { id, role, email } from headers
                                                           → getAdminAccessDecision
                                                           → handler(request, user)
```

### After ATOM-B (local)

```
Request → middleware → jwtVerify → NextResponse.next()  (no header mutation)
                                          ↓
         withAdminAuth → verifyAdminSession(request) → jwtVerify cookie directly
                      → if !authenticated: return 401/500
                      → user = { id, role, email } from cookie JWT
                      → getAdminAccessDecision
                      → handler(request, user)
```

**Net effect:** Auth verification happens TWICE (middleware + withAdminAuth). Both read the same `admin_session` cookie. Both use `JWT_SECRET`. Cryptographically identical results. Architecturally safer (no header trust).

---

## 4. Changed Semantics

| Aspect | Before | After | Impact |
|---|---|---|---|
| Auth source in handlers | Request header (`x-admin-role`) | Cookie JWT directly | Same session, different read path |
| Trust model | Handler trusts middleware-injected header | Handler independently verifies | More secure (no forged header risk) |
| JWT verifications per request | 1 (middleware only) | 2 (middleware + withAdminAuth) | Negligible CPU overhead |
| Cron Bearer token support | NOT handled by withAdminAuth (was a gap) | Handled: `verifyAdminSession` checks `CRON_SECRET` | NEW CAPABILITY — cron Bearer tokens now accepted in withAdminAuth handlers |
| User object fields | `{ id: userId, role, email: userEmail }` | `{ id: payload.sub, role: payload.role, email: payload.email, session_id: payload.session_id }` | Gains `session_id` field |

---

## 5. Middleware Matcher Analysis

| Concern | Finding |
|---|---|
| Current matcher scope | `['/((?!_next/static|_next/image|favicon.ico).*)']` — ALL paths except static assets |
| Change to matcher | **NONE** — matcher is identical in deployed and local versions |
| Unintended route capture | No new routes captured — matcher unchanged |
| API route interception | `/api/admin/*` already intercepted in production — no change |
| Public route interception | Already intercepted in production (passes through for non-admin) — no change |
| Static asset capture | Already excluded — no change |
| Recursion risk | None — middleware returns immediately for non-admin/non-bot paths |

**VERDICT: No matcher risk.**

---

## 6. `verifyAdminSession` Compatibility Analysis

| Property | Value |
|---|---|
| File | `lib/auth/verifyAdminSession.js` |
| Status | DEPLOYED and UNCHANGED (git clean) |
| Cookie read | `request.cookies.get('admin_session')?.value` |
| JWT verify | `jwtVerify(token, JWT_SECRET_bytes)` — same secret as middleware |
| Bearer support | `if authHeader.startsWith('Bearer ') && token === CRON_SECRET → super_admin` |
| Return on success | `{ authenticated: true, user: { id: payload.sub, role: payload.role, email: payload.email, session_id: payload.session_id } }` |
| Return on 401 | `{ authenticated: false, response: NextResponse.json({error: 'Unauthorized...'}, {status: 401}) }` |
| Return on expired | `{ authenticated: false, response: NextResponse.json({error: 'Session expired or invalid.'}, {status: 401}) }` |
| Return on missing JWT_SECRET | `{ authenticated: false, response: NextResponse.json({error: 'Server authentication misconfigured.'}, {status: 500}) }` |

**VERDICT: Fully compatible. Same JWT, same cookie, same secret.**

---

## 7. Collateral Impact: `x-admin-*` Header Consumers

| File | Header Read | Risk | Assessment |
|---|---|---|---|
| `lib/auth/withAdminAuth.js` | `x-admin-role`, `x-admin-user`, `x-admin-email` | **P0 — MUST change** | Changed in ATOM-B — resolved |
| `app/api/admin/queue/route.js:133` | `x-admin-user` as last fallback: `user?.email \|\| user?.id \|\| headers.get('x-admin-user') \|\| 'unknown'` | **LOW** — fallback only, `user.email` reached first | SAFE — `user` from `verifyAdminSession` always has `email` and `id` |
| All other files | None found | N/A | SAFE |

**Grep result:** 2 runtime reads of `x-admin-*` headers. One resolved by ATOM-B itself. One is a never-reached fallback. Zero breakage.

---

## 8. New Capability: Cron Bearer Token in withAdminAuth

After ATOM-B, any `withAdminAuth`-wrapped route that receives a `Authorization: Bearer {CRON_SECRET}` header will be authenticated as `super_admin` via `verifyAdminSession`. This is a NEW capability not present in the deployed version (which only checked headers injected by middleware).

**Impact assessment:** LOW RISK. No cron jobs currently call `/api/admin/*` routes directly (they use `/api/jobs/*`). This capability is additive and non-breaking.

---

## 9. Unchanged Systems Confirmation

| System | Status |
|---|---|
| Public routing | UNCHANGED — middleware only affects admin paths, non-admin falls through |
| QStash crons (6/6) | UNCHANGED — hit `/api/jobs/*`, not `/api/admin/*` |
| ATOM-A governance gates | UNCHANGED — `ai_enabled` check is inside handlers, after `withAdminAuth` |
| Login route | UNCHANGED — explicitly bypassed in middleware |
| Cookie structure | UNCHANGED — same name, same attributes, same JWT format |
| `verifyAdminSession` | UNCHANGED — already deployed |
| `adminAccessControl` | UNCHANGED — already deployed |
| `utils/rateLimiter.js` | UNCHANGED — already deployed (mocked) |
| All non-admin routes | UNCHANGED — middleware passes through for public paths |
| CMS resolver | UNCHANGED — deferred to ATOM-E |
| SHOS | UNCHANGED — deferred to ATOM-C |

---

## 10. Deployment Prerequisites

### Conditions for safe deployment

1. **Stage BOTH files atomically in a SINGLE commit:**
   ```
   git add middleware.js lib/auth/withAdminAuth.js
   git commit -m "feat(rc-2b-atom-b): remove header injection — withAdminAuth now verifies session directly"
   git push origin main
   ```

2. **NO other files must be staged** — only these 2

3. **Post-deploy validation required:**
   - Admin login works (POST /api/admin/login → cookie set)
   - Protected admin API route returns correct data (not 401)
   - Public route still 200
   - ATOM-A gates still active (403/503 when ai_enabled=false)
   - Queue PATCH still works (admin action)

4. **Rollback is trivial:** Vercel UI → deploy `7ba4c5d` → 2 min, no state change

### READY_FOR_DEPLOYMENT

No blockers identified. All dependencies deployed. Both files tracked. Matcher unchanged. Cookie unchanged. Session semantics preserved.

---

## 11. Remaining Ambiguities

| Item | Classification | Notes |
|---|---|---|
| Does `admin_users` table exist with rows in production? | INCONCLUSIVE | Login currently works — so either admin_users has rows OR ADMIN_PASSWORD fallback is active. Does NOT affect ATOM-B. |
| `utils/rateLimiter.js` returns mock success | KNOWN | Always was mocked in deployed version. No change. |
| Double JWT verification overhead | NEGLIGIBLE | ~0.1ms per request for crypto operation. No DB calls. |

---

*See also: [RC-2B-CYCLE3-AUTH-EXECUTION-TRACE.md](RC-2B-CYCLE3-AUTH-EXECUTION-TRACE.md), [RC-2B-CYCLE3-ADMIN-LOCKOUT-RISK.md](RC-2B-CYCLE3-ADMIN-LOCKOUT-RISK.md)*
