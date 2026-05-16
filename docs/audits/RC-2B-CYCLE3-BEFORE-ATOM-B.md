# RC-2B Cycle 3: ATOM-B Before Snapshot + Forensic Review

| Field | Value |
|---|---|
| Phase | RC-2B Cycle 3 — ATOM-B Auth Pair Forensic Review |
| Date | 2026-05-14 |
| Production commit | `7ba4c5d` |
| Scope | `middleware.js` + `lib/auth/withAdminAuth.js` |
| Cycle type | FORENSIC REVIEW ONLY — no deployment in this snapshot |

---

## 1. Current Production Auth Behavior

### Middleware (deployed HEAD: `7ba4c5d`)

| Property | Value |
|---|---|
| File | `middleware.js` |
| Matcher | `['/((?!_next/static|_next/image|favicon.ico).*)']` — ALL paths except static assets |
| Auth imports | `jwtVerify` (jose), `getAdminAccessDecision`, `getAdminLandingPath`, `logError` |
| JWT_SECRET startup | Throws `Error` if `JWT_SECRET` is not set (crashes cold-start) |
| Rate limiting | In-memory sliding window Map — 100 req/min per IP for `/api/admin` and `/api/jobs` |
| CSRF protection | Checks Origin/Host match for POST/PUT/DELETE/PATCH on admin mutations |
| Admin API auth | JWT verify from `admin_session` cookie → **INJECTS `x-admin-role`, `x-admin-user`, `x-admin-email` headers** → `NextResponse.next(request: {headers})` |
| Admin page auth | JWT verify from `admin_session` cookie → **INJECTS same headers** → `NextResponse.next(request: {headers})` |
| Redirect on 401 (page) | `→ /admin/login?redirect_to={pathname}` |
| Redirect on 403 (page) | `→ /admin/{landingPath}?access=denied` or `/admin/login` |
| Login bypass | `/admin/login`, `/debug/` paths — always `NextResponse.next()` |
| Bot SEO cache | Edge Supabase fetch for `/bima-sakhi-*` bot user agents |

### withAdminAuth (deployed HEAD: `7ba4c5d`)

| Property | Value |
|---|---|
| File | `lib/auth/withAdminAuth.js` |
| Auth source | **Reads `x-admin-role`, `x-admin-user`, `x-admin-email` from request headers** (set by middleware) |
| Auth failure | 401 if `role` header missing |
| Role check | `getAdminAccessDecision` + `requireRole` |
| Rate limiting | `rateLimit('admin_api:{ip}', 200, 60)` — mocked, always returns success |
| Audit logging | Non-blocking `safeInsert` to `admin_audit_logs` + `api_requests` |
| Cron support | **NOT via this path** — middleware would 401 if no cookie; cron routes use `/api/jobs/*` |

### Current Admin Login Flow (production)

```
POST /api/admin/login
→ middleware: publicPath → NextResponse.next()
→ login route: verifies ADMIN_PASSWORD or admin_users table
→ issues JWT { role, sub: userId, email }
→ sets httpOnly cookie: name=admin_session, value=JWT, secure=true, sameSite=lax, path=/

Subsequent request to /api/admin/* or /admin/*:
→ middleware: reads admin_session cookie
→ jwtVerify(token, JWT_SECRET)
→ getAdminAccessDecision({ role, pathname, method, surface })
→ if denied: return 401/403/redirect
→ if allowed: inject x-admin-role/x-admin-user/x-admin-email headers → NextResponse.next(headers)
→ withAdminAuth: reads x-admin-role from request.headers
→ if no role: return 401
→ getAdminAccessDecision (second check)
→ handler(request, user, context)
```

### Cookie Semantics (production)

| Attribute | Value |
|---|---|
| Name | `admin_session` |
| Type | JWT HS256 signed with `JWT_SECRET` |
| Payload | `{ role, sub: userId, email, iat, exp }` |
| httpOnly | `true` |
| secure | `true` (production) |
| sameSite | `lax` |
| path | `/` |
| Expiration | 24h from issuance |

### Protected Admin Routes (currently protected via withAdminAuth)

All `/api/admin/*` routes except `/api/admin/login`. Confirmed via matcher.

Key routes protected:
- `POST /api/admin/ai` (ATOM-A: now also gated by `ai_enabled`)
- `POST /api/admin/ai/recruiter` (ATOM-A: gated)
- `POST /api/admin/seo/analyze` (ATOM-A: gated)
- `PATCH /api/admin/queue` (reads `user.email || user.id || x-admin-user` header)
- All other `/api/admin/*` wrapped routes

### Feature Flag Interaction

`withAdminAuth` does NOT directly interact with feature flags. ATOM-A routes check `ai_enabled` separately after `withAdminAuth` passes the user. No coupling between auth and feature flags.

### Auth Environment Dependencies

| Variable | Required | Status |
|---|---|---|
| `JWT_SECRET` | Yes — middleware throws on missing | Present in `.env.local`, confirmed in production (routes work) |
| `CRON_SECRET` | Yes — used by `verifyAdminSession` for Bearer auth | Present in `.env.local` |
| `ADMIN_PASSWORD` | Optional legacy fallback | Present (legacy) |
| `NEXT_PUBLIC_SUPABASE_URL` | Used in CSRF check | Present |

---

## 2. Local Working Tree State

| File | Git Status | Change Summary |
|---|---|---|
| `middleware.js` | `M` (modified) | Removed header injection in 2 places (22 lines removed) |
| `lib/auth/withAdminAuth.js` | `M` (modified) | Replaced header reads with direct `verifyAdminSession(request)` call |
| `lib/auth/verifyAdminSession.js` | clean | Unchanged — already deployed |
| `lib/auth/adminAccessControl.js` | clean | Unchanged — already deployed |
| `utils/rateLimiter.js` | clean | Unchanged — already deployed (mocked) |

---

## 3. Pre-Deploy Baseline Evidence

| Check | Result |
|---|---|
| Last production SHA | `7ba4c5d` |
| Admin route protection | Verified via deployed middleware (auth required, cookie present) |
| Cookie format | httpOnly JWT HS256, `admin_session`, 24h expiry |
| QStash crons (6/6) | Active, hitting `/api/jobs/*` — NOT admin routes |
| ATOM-A governance gates | Active — `ai_enabled=false` → 3 routes return 503 |
| Public routes (4/4) | 200 — unchanged from ATOM-A validation |

---

## 4. Remaining Dependencies Before Deployment

- [ ] Confirm both files staged together (single atomic commit)
- [ ] Verify `JWT_SECRET` is present in Vercel production env (already confirmed working)
- [ ] Post-deploy: verify admin login and protected route access
- [ ] Post-deploy: verify queue PATCH still works (x-admin-user fallback check)

---

*Snapshot complete. Forensic analysis continues in RC-2B-CYCLE3-ATOM-B-FORENSIC-REVIEW.md.*
