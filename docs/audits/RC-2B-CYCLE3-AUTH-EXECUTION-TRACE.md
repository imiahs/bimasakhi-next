# RC-2B Cycle 3: ATOM-B Auth Execution Trace

| Field | Value |
|---|---|
| Phase | RC-2B Cycle 3 — ATOM-B Auth Pair |
| Date | 2026-05-14 |
| Trace type | Full request lifecycle — before and after ATOM-B |

---

## 1. Current Production Auth Execution Trace (Before ATOM-B)

### 1a. Admin Login

```
Client: POST /api/admin/login  {password: "..."}  or  {email, password}
  ↓
Middleware:
  pathname = /api/admin/login
  → in publicPaths → NextResponse.next()  [no auth check]
  ↓
Login Route:
  shouldUseRealAuth() → check admin_users table
  → if rows exist: handleRealAuth(email, password)
      → supabase: SELECT admin_users WHERE email = ? AND is_active = true
      → bcrypt.compare(password, password_hash)
      → if valid: issueToken(id, email, role)
  → else: handleLegacyAuth(password)
      → if password === ADMIN_PASSWORD: issueToken(sessionId, 'admin@system', 'super_admin')
  
  issueToken():
    JWT = SignJWT({ role, sub: userId, email }).setExpirationTime('24h').sign(JWT_SECRET)
    response.cookies.set({ name: 'admin_session', value: JWT, httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
    return { success: true, role }
  ↓
Client: receives { success: true, role }, cookie admin_session is set (httpOnly, 24h)
```

### 1b. Protected Admin API Request (Before ATOM-B)

```
Client: GET/POST /api/admin/something  (admin_session cookie present)
  ↓
Middleware [LAYER 1 — Edge]:
  pathname = /api/admin/something
  → NOT in publicPaths
  → rate limit check: rateLimitStore[ip] < 100 → pass
  → CSRF check (if mutation): origin.includes(host) → pass
  → authCookie = request.cookies.get('admin_session')
  → if no cookie: return 401 { error: 'Unauthorized' }
  → jwtVerify(authCookie.value, JWT_SECRET)
  → payload = { role, sub, email, iat, exp }
  → getAdminAccessDecision({ role, pathname, method, surface: 'api' })
  → if !allowed: return 403 { error: 'Insufficient permissions' }
  → *** INJECT HEADERS ***
      requestHeaders.set('x-admin-role', payload.role)
      requestHeaders.set('x-admin-user', payload.sub)
      requestHeaders.set('x-admin-email', payload.email)  [if present]
  → return NextResponse.next({ request: { headers: requestHeaders } })
  ↓
withAdminAuth [LAYER 2 — Serverless]:
  ip = x-forwarded-for
  → rateLimit('admin_api:{ip}', 200, 60) → success (mocked)
  → role = request.headers.get('x-admin-role')   ← reads middleware-injected header
  → if !role: return 401 { error: 'Unauthorized. No active admin session found.' }
  → user = { id: request.headers.get('x-admin-user'), role, email: request.headers.get('x-admin-email') }
  → getAdminAccessDecision({ role, pathname, method, surface: 'api', fallbackRoles })
  → if !allowed: requireRole(user, allowedRoles) → return 403
  → handler(request, user, context)
  → [non-blocking] safeInsert admin_audit_logs, api_requests
  → return response
```

### 1c. Protected Admin Page Request (Before ATOM-B)

```
Client: GET /admin/dashboard  (admin_session cookie present)
  ↓
Middleware:
  pathname = /admin/dashboard
  → NOT in login/debug bypass
  → authCookie = request.cookies.get('admin_session')
  → if no cookie: redirect → /admin/login?redirect_to=/admin/dashboard
  → jwtVerify → payload
  → getAdminAccessDecision({ role, pathname, method, surface: 'page' })
  → if !allowed: redirect → /admin/{landingPath}?access=denied  or  /admin/login
  → INJECT HEADERS (same pattern as API)
  → return NextResponse.next({ request: { headers: requestHeaders } })
  ↓
Page component renders (headers available in server component if read)
```

---

## 2. Post-ATOM-B Auth Execution Trace (After Deployment)

### 2a. Admin Login — UNCHANGED

```
[Same as before — login route not affected by ATOM-B]
```

### 2b. Protected Admin API Request (After ATOM-B)

```
Client: GET/POST /api/admin/something  (admin_session cookie present)
  ↓
Middleware [LAYER 1 — Edge]:
  pathname = /api/admin/something
  → rate limit, CSRF check: SAME
  → authCookie = request.cookies.get('admin_session')
  → if no cookie: return 401 { error: 'Unauthorized' }
  → jwtVerify(authCookie.value, JWT_SECRET)
  → payload = { role, sub, email }
  → getAdminAccessDecision({ role, pathname, method, surface: 'api' })
  → if !allowed: return 403
  → *** NO HEADER INJECTION ***
  → return NextResponse.next()   ← plain, no header mutation
  ↓
withAdminAuth [LAYER 2 — Serverless]:
  ip = x-forwarded-for
  → rateLimit → success (mocked)
  → verifyAdminSession(request)   ← NEW: reads cookie directly
      → authHeader check: if Bearer CRON_SECRET → super_admin (cron bypass)
      → request.cookies.get('admin_session')?.value
      → if no token: return { authenticated: false, response: 401 }
      → jwtVerify(token, JWT_SECRET)
      → return { authenticated: true, user: { id: sub, role, email, session_id } }
  → if !authenticated: return sessionCheck.response (401 or 500)
  → user = sessionCheck.user
  → getAdminAccessDecision({ role, pathname, method, surface: 'api', fallbackRoles })
  → if !allowed: requireRole(user, allowedRoles) → return 403
  → handler(request, user, context)
  → [non-blocking] safeInsert admin_audit_logs, api_requests
  → return response
```

### 2c. Protected Admin Page Request (After ATOM-B)

```
Client: GET /admin/dashboard  (admin_session cookie present)
  ↓
Middleware:
  [Same JWT verify, getAdminAccessDecision, redirect logic]
  → *** NO HEADER INJECTION ***
  → return NextResponse.next()  ← plain
  ↓
Page component renders
  [No page component directly read x-admin-* headers — confirmed by grep]
```

---

## 3. Cookie / Session Compatibility

| Property | Before | After | Compatible? |
|---|---|---|---|
| Cookie name | `admin_session` | `admin_session` | ✅ YES |
| Cookie algorithm | HS256 JWT | HS256 JWT | ✅ YES |
| Cookie secret | `JWT_SECRET` | `JWT_SECRET` | ✅ YES |
| Cookie payload fields | `{ role, sub, email, iat, exp }` | `{ role, sub, email, iat, exp }` | ✅ YES |
| `httpOnly` | `true` | `true` | ✅ YES |
| `secure` | `true` (prod) | `true` (prod) | ✅ YES |
| `sameSite` | `lax` | `lax` | ✅ YES |
| `path` | `/` | `/` | ✅ YES |
| Expiration | 24h | 24h | ✅ YES |
| **Existing sessions** | All valid pre-ATOM-B sessions | Still valid — same cookie, same JWT | ✅ PRESERVED |

**VERDICT: Zero cookie/session breakage. No re-login required after deployment.**

---

## 4. Supabase Auth Interaction

| System | Before | After | Notes |
|---|---|---|---|
| Supabase login lookup | In login route only | In login route only | Unchanged |
| Supabase in middleware | Not used | Not used | JWT is self-contained |
| Supabase in withAdminAuth | Not used | Not used | JWT is self-contained |
| Admin session storage | Cookie JWT only | Cookie JWT only | Stateless JWT — no Supabase session table |

**No Supabase auth interaction changes.**

---

## 5. Feature Flag Interaction

| Interaction | Trace |
|---|---|
| ATOM-A `ai_enabled` gate | Runs INSIDE handler after `withAdminAuth` passes user → UNCHANGED |
| Feature flags in middleware | NOT used in middleware auth path |
| Feature flags in withAdminAuth | NOT used |

**No feature flag interaction changes.**

---

## 6. Role Gating Behavior

| Aspect | Before | After | Change |
|---|---|---|---|
| Role source | `request.headers.get('x-admin-role')` (injected by middleware) | `verifyAdminSession().user.role` (from JWT) | Different source, same data |
| Role values | Same JWT payload | Same JWT payload | Identical |
| `getAdminAccessDecision` logic | Unchanged | Unchanged | No change |
| `requireRole` logic | Unchanged | Unchanged | No change |
| `allowedRoles` parameter | Unchanged | Unchanged | No change |

**Identical role gating behavior. Different data source, same data.**

---

## 7. Fallback / Failure Behavior

| Scenario | Before | After |
|---|---|---|
| No cookie | Middleware 401, withAdminAuth never reached | Middleware 401 (unchanged), withAdminAuth also 401 from `verifyAdminSession` |
| Expired JWT | Middleware 401 (`Session expired or invalid token.`) | Same at middleware; also 401 from `verifyAdminSession` (`Session expired or invalid.`) |
| Invalid JWT signature | Middleware 401 | Same at middleware + verifyAdminSession |
| Missing JWT_SECRET | Middleware throws on cold start | Same behavior — middleware already threw; verifyAdminSession returns 500 |
| Wrong role | Middleware 403 | Same at middleware; also 403 from withAdminAuth |
| Rate limit (middleware) | 429 | Unchanged |
| Rate limit (withAdminAuth) | 429 (mocked — never triggers) | Unchanged (still mocked) |
| CSRF failure | 403 | Unchanged |

---

## 8. Redirect Behavior

| Scenario | Before | After |
|---|---|---|
| No session on admin page | Redirect `/admin/login?redirect_to={path}` | **UNCHANGED** |
| Expired session on admin page | Redirect `/admin/login?error=session_expired` | **UNCHANGED** |
| Insufficient role on admin page | Redirect to landing path or `/admin/login` | **UNCHANGED** |
| No session on admin API | 401 JSON | **UNCHANGED** |
| Insufficient role on admin API | 403 JSON | **UNCHANGED** |

---

## 9. Local vs Production Auth Divergence

| Divergence | Severity | ATOM-B Resolution |
|---|---|---|
| Middleware header injection removed | **HIGH — coupled** | withAdminAuth changed to not depend on headers → RESOLVED |
| withAdminAuth header reading removed | **HIGH — coupled** | verifyAdminSession used instead → RESOLVED |
| Auth performed twice per request | **NEGLIGIBLE** | ~0.1ms CPU overhead, no DB calls | Acceptable |
| Cron Bearer support added to withAdminAuth | **ADDITIVE** | New capability, no existing code breaks | SAFE |

**VERDICT: After ATOM-B deployed, zero divergence remains in the auth pair.**

---

## 10. Classification Summary

| Change | Classification |
|---|---|
| middleware.js header injection removal | BEHAVIORAL — safe with paired withAdminAuth change |
| withAdminAuth.js session verification switch | BEHAVIORAL — safe, uses already-deployed verifyAdminSession |
| New import in withAdminAuth | ADDITIVE |
| Cron Bearer token support | ADDITIVE |
| `session_id` added to user object | ADDITIVE — no handlers break |
| Error message wording | COSMETIC |
| All middleware logic except headers | UNCHANGED |
| All withAdminAuth logic except auth source | UNCHANGED |

---

*See also: [RC-2B-CYCLE3-ATOM-B-FORENSIC-REVIEW.md](RC-2B-CYCLE3-ATOM-B-FORENSIC-REVIEW.md), [RC-2B-CYCLE3-ADMIN-LOCKOUT-RISK.md](RC-2B-CYCLE3-ADMIN-LOCKOUT-RISK.md)*
