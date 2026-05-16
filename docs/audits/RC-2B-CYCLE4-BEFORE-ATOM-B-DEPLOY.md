# RC-2B Cycle 4: BEFORE ATOM-B Deployment Snapshot

| Field | Value |
|---|---|
| Phase | RC-2B Cycle 4 — ATOM-B Controlled Deployment |
| Date | 2026-05-14 |
| Current Production SHA | `7ba4c5d` |
| Deployment Target | `middleware.js` + `lib/auth/withAdminAuth.js` |
| Cycle Type | ATOMIC DEPLOYMENT |

---

## 1. Current Production State

### Git State

| Property | Value |
|---|---|
| HEAD commit | `7ba4c5d` |
| Commit timestamp (UTC+5:30) | 2026-05-14 02:02:55 +0530 |
| Commit message | `feat(rc-2b-atom-a): enforce ai_enabled gate on 3 admin AI routes` |
| Remote tracking | `origin/main` at `7ba4c5d` |
| Branch | `main` |
| Total modified files in working tree | 143 |

### Deployed Files (Production)

| File | Status | Version |
|---|---|---|
| `middleware.js` | **DEPLOYED** | Last deployed in ATOM-A; contains header injection logic |
| `lib/auth/withAdminAuth.js` | **DEPLOYED** | Last deployed in ATOM-A; reads headers from middleware |
| `lib/auth/verifyAdminSession.js` | **DEPLOYED** | Unchanged; used by withAdminAuth post-ATOM-B |
| `lib/auth/adminAccessControl.js` | **DEPLOYED** | Unchanged; used by both middleware and withAdminAuth |
| `utils/rateLimiter.js` | **DEPLOYED** | Unchanged; mocked rate limiter |
| `app/api/admin/login/route.js` | **DEPLOYED** | Issues JWT to `admin_session` cookie |

### Current Auth Architecture (Before ATOM-B)

```
Client Request → middleware [Edge]
  ├─ JWT verify from admin_session cookie
  ├─ getAdminAccessDecision check
  ├─ INJECT x-admin-role, x-admin-user, x-admin-email headers ← ATOM-B will remove
  └─ return NextResponse.next(request: {headers})
     ↓
  withAdminAuth [Serverless]
     ├─ read x-admin-role from request headers ← ATOM-B will change to verifyAdminSession
     ├─ getAdminAccessDecision check
     └─ handler(request, user)
```

---

## 2. BEFORE Behavioral Baseline

### Admin Authentication

| Behavior | Current State |
|---|---|
| Admin login route | `/api/admin/login` — not protected, accepts POST |
| Admin login response | Returns `{ success: true, role }` + sets `admin_session` httpOnly cookie |
| Cookie attributes | `httpOnly=true`, `secure=true`, `sameSite=lax`, `path=/`, expires `24h` |
| Session token type | JWT HS256 signed with `JWT_SECRET` |
| Session payload | `{ role, sub: userId, email, iat, exp }` |

### Admin API Protection

| Route | Current Protection |
|---|---|
| `/api/admin/*` (except login) | Middleware JWT verify + header inject + withAdminAuth header read |
| Rate limit | 100 req/min per IP (middleware), 200 req/min (withAdminAuth, mocked) |
| CSRF check | Origin/Host match required for mutations |
| Failure mode | 401 on missing/invalid cookie, 403 on insufficient role |

### Admin Page Protection

| Route | Current Protection |
|---|---|
| `/admin/*` (except login/debug) | Middleware JWT verify → header inject → redirect on 401/403 |
| Redirect on 401 | `→ /admin/login?redirect_to={pathname}` |
| Redirect on 403 | `→ /admin/{landingPath}?access=denied` or `/admin/login` |

### Session Persistence

| Behavior | Current |
|---|---|
| Existing valid session across page navigation | WORKS — session cookie persists |
| Existing valid session across deployment | EXPECTED TO WORK after ATOM-B (same JWT, same cookie) |
| Session re-login requirement | NOT expected after ATOM-B (session continuity preserved) |

---

## 3. Dependent Systems (BEFORE)

### Queue System

| System | State |
|---|---|
| Queue table status | NOT checked (ATOM-B does not touch queue logic) |
| Queue paused flag | Expected `queue_paused=false` (unchanged from RC-1C) |
| Pending jobs | Expected stable/empty (ATOM-B not touching queue) |

### QStash Crons (6 total)

| Cron | Status | Expected After Deploy |
|---|---|---|
| `scd_7J8DtLe6UoKNbB8gTnag7GrQ89m1` | Active (`0 * * * *`) | **UNCHANGED** |
| `scd_7eLCdvVEp1o7rWvdfRCb729r17xu` | Active (`*/30 * * * *`) | **UNCHANGED** |
| `scd_7oSGND79QuX6QhcdsPqZDD2Tk3WP` | Active (`0 2 * * *`) | **UNCHANGED** |
| `scd_5Nf3aEoA776GrqKp1nubmAh1BTSU` | Active (`*/5 * * * *`) | **UNCHANGED** |
| `scd_5kgABtJUWVnB5mHoCscVCYuooGpB` | Active (`*/5 * * * *`) | **UNCHANGED** |
| `scd_6JLsqxLgc5n49AW58rfZPicmAZiw` | Active (`*/5 * * * *`) | **UNCHANGED** |

All crons hit `/api/jobs/*` routes, NOT admin routes. **Zero impact from ATOM-B.**

### AI Governance (ATOM-A)

| Route | Gate | Expected After Deploy |
|---|---|---|
| `POST /api/admin/ai` | `ai_enabled=false` → 503 | **UNCHANGED** |
| `POST /api/admin/ai/recruiter` | `ai_enabled=false` → 503 | **UNCHANGED** |
| `POST /api/admin/seo/analyze` | `ai_enabled=false` → 503 | **UNCHANGED** |
| `POST /api/jobs/pagegen` | `ai_enabled=false` → 200 (no retry) | **UNCHANGED** |

All ATOM-A gates run INSIDE handlers, after `withAdminAuth` passes user. **Zero impact from ATOM-B.**

### Public Routing

| Route | Expected Behavior | Expected After Deploy |
|---|---|---|
| `/` (homepage) | 200 HTML | **UNCHANGED** |
| `/blog` | 200 HTML | **UNCHANGED** |
| `/[...slug]` (catch-all) | 200 or 404 | **UNCHANGED** |
| `/api/public/*` | Unprotected | **UNCHANGED** |
| `/api/jobs/*` | Cron-accessible | **UNCHANGED** |

Public routing uses different middleware paths. **Zero impact from ATOM-B.**

---

## 4. Vercel Deployment State

| Property | Value |
|---|---|
| Current deployment | Production alias: `https://bimasakhi.com` |
| Last deploy command | Vercel CLI (RC-2B Cycle 2 — ATOM-A) |
| Deployment method | Git push → automatic Vercel deploy on `main` |
| Rollback target available | `7ba4c5d` + predecessor `c8334d3` (ATOM-G) |

---

## 5. Pre-Deployment Validation Checklist

| Check | Status | Notes |
|---|---|---|
| Both files modified | ✅ YES | `middleware.js`, `lib/auth/withAdminAuth.js` |
| No other auth-related changes staged | ✅ YES | Only these 2 for ATOM-B |
| Dependencies already deployed | ✅ YES | verifyAdminSession, adminAccessControl, rateLimiter |
| No schema dependencies | ✅ YES | JWT-only, no DB changes |
| No feature flag dependencies | ✅ YES | Auth is independent of flags |
| Rollback path known | ✅ YES | Vercel to `7ba4c5d` or git revert |
| Session continuity understood | ✅ YES | Same JWT, same cookie |
| Middleware matcher unchanged | ✅ YES | Same matcher in both versions |

---

## 6. Post-ATOM-B Expected State

### Auth Architecture (After ATOM-B)

```
Client Request → middleware [Edge]
  ├─ JWT verify from admin_session cookie
  ├─ getAdminAccessDecision check
  └─ return NextResponse.next() [NO header injection] ← CHANGE
     ↓
  withAdminAuth [Serverless]
     ├─ call verifyAdminSession(request) [direct cookie read] ← CHANGE
     ├─ getAdminAccessDecision check
     └─ handler(request, user)
```

### Key Changes

| Before | After | Impact |
|---|---|---|
| Middleware injects headers | No header injection | Eliminates header trust |
| withAdminAuth reads headers | withAdminAuth reads cookie directly | Same session data, safer source |
| 1 JWT verify (middleware) | 2 JWT verify (middleware + withAdminAuth) | ~0.1ms overhead per request |
| No cron Bearer support in handlers | Cron Bearer token support in handlers | NEW CAPABILITY (safe, additive) |

---

*Snapshot complete. Ready for STEP 2: Deployment scope verification.*
