# RC-2B Cycle 3: ATOM-B Admin Lockout Risk Analysis

| Field | Value |
|---|---|
| Phase | RC-2B Cycle 3 — ATOM-B Admin Lockout Risk |
| Date | 2026-05-14 |
| Result | **NO LOCKOUT RISK** when both files deployed atomically |

---

## 1. Lockout Scenario Analysis

### Scenario A: Only `middleware.js` deployed (partial deploy — FORBIDDEN)

| Event | Result |
|---|---|
| Middleware no longer injects `x-admin-role` header | |
| withAdminAuth reads `request.headers.get('x-admin-role')` → `null` | |
| `if (!role)` → return 401 | |
| **ALL `/api/admin/*` routes return 401** | 🔴 P0 LOCKOUT |
| Admin login still works (bypassed) | |
| Admin pages redirect to login (middleware still works) | |
| BUT all admin API calls fail → admin panel is broken | 🔴 |

**Mitigation: NEVER deploy `middleware.js` alone. Always atomic pair commit.**

---

### Scenario B: Only `withAdminAuth.js` deployed (partial deploy — acceptable fallback)

| Event | Result |
|---|---|
| Middleware still injects `x-admin-role` header | |
| withAdminAuth now calls `verifyAdminSession(request)` | |
| verifyAdminSession reads `admin_session` cookie → JWT verify | |
| Returns `user = { id, role, email }` from JWT | ✅ |
| Role headers still injected but not read | (ignored) |
| **ALL admin routes work correctly** | ✅ |

**Assessment: Partial deploy of withAdminAuth alone is safe. But we should deploy both atomically.**

---

### Scenario C: Both deployed atomically (INTENDED)

| Event | Result |
|---|---|
| Middleware no longer injects headers | |
| withAdminAuth reads cookie directly | |
| Both use same JWT_SECRET | ✅ |
| Same admin_session cookie | ✅ |
| Same role values from JWT | ✅ |
| **All admin routes work correctly** | ✅ |
| **No re-login required** | ✅ |

**VERDICT: SAFE. Zero lockout risk when deployed atomically.**

---

## 2. Redirect Loop Risk

| Condition | Risk |
|---|---|
| No cookie → middleware redirects to `/admin/login` | EXISTING BEHAVIOR — no change |
| Login page itself → middleware bypasses (`pathname.includes('/login')`) | EXISTING BEHAVIOR — no change |
| `/admin/login` page renders → allows POST to `/api/admin/login` | EXISTING BEHAVIOR — no change |
| Post-login redirect_to processing | CLIENT-SIDE — no middleware involvement |

**VERDICT: No redirect loop risk. Login bypass logic unchanged.**

---

## 3. Broken Auth Session Risk

| Condition | Risk |
|---|---|
| Existing sessions (pre-ATOM-B cookies) | Valid JWT — same algorithm, same secret → STILL VALID |
| No forced re-login | Sessions continue across deployment |
| Cookie attributes unchanged | No SameSite/Secure changes |
| 24h expiry | Unchanged |

**VERDICT: No broken auth session risk. Existing sessions survive deployment.**

---

## 4. Permission Bypass Risk

| Scenario | Before | After | Risk |
|---|---|---|---|
| Forged `x-admin-role: super_admin` header | ⚠️ POTENTIAL RISK — withAdminAuth trusted the header | ✅ ELIMINATED — withAdminAuth now verifies JWT | IMPROVED SECURITY |
| Forged `Authorization: Bearer {guessed}` | Not applicable in withAdminAuth (old) | Only works if matches `CRON_SECRET` exactly | UNCHANGED |
| Cookie theft/replay | Same JWT risk | Same JWT risk | UNCHANGED |
| Role escalation in JWT | Not possible without JWT_SECRET | Not possible — unchanged | UNCHANGED |

**VERDICT: ATOM-B IMPROVES security by eliminating header trust assumption.**

---

## 5. Stale Session Acceptance Risk

| Condition | Risk |
|---|---|
| JWT signed before ATOM-B deploy | Still valid (same secret, same algorithm) | LOW — intentional |
| Expired JWT (>24h old) | `jwtVerify` throws → 401 | UNCHANGED |
| Revoked admin user (is_active=false) | JWT still valid until expiry (stateless) | KNOWN LIMITATION — pre-existing, unchanged |

**VERDICT: No new stale session risks introduced.**

---

## 6. Admin Route 401/403 Spike Risk

| Risk | Assessment |
|---|---|
| During deployment window (~30s Vercel propagation) | Old and new functions may serve simultaneously |
| Old middleware + new withAdminAuth (partial propagation) | withAdminAuth reads cookie → works |
| New middleware + old withAdminAuth (partial propagation) | withAdminAuth reads null header → 401 |
| Mitigation | Vercel deploys atomically per function; partial propagation window is minimal |
| Recovery | If spike observed → Vercel rollback to `7ba4c5d` takes ~2 min |

**VERDICT: LOW RISK. Vercel atomic function deployment minimizes partial-state window. Monitor for 5 min post-deploy.**

---

## 7. Middleware Recursion Risk

| Check | Finding |
|---|---|
| Middleware intercepting its own requests | Not possible in Next.js (middleware runs once per external request) |
| Login page calling login API | Login page is static; API is called by client POST |
| Admin page making admin API calls | Page → client-side fetch → middleware runs on that API call too (correct behavior) |
| Infinite redirect | Login bypass prevents `/admin/login` recursion |

**VERDICT: No recursion risk.**

---

## 8. Runtime Auth Mismatch Risk

| Scenario | Risk |
|---|---|
| Double JWT verification with different secrets | NOT POSSIBLE — both use `JWT_SECRET` from same env |
| Middleware accepts but withAdminAuth rejects (same JWT) | NOT POSSIBLE — identical verification logic |
| Role mismatch between layers | NOT POSSIBLE — same JWT payload |
| Race condition (cookie vs header) | NOT POSSIBLE — sequential execution |

**VERDICT: No runtime auth mismatch risk.**

---

## 9. Blast Radius Analysis

| Category | Affected | Notes |
|---|---|---|
| Admin API routes (`/api/admin/*`) | ALL — ALL now verify from cookie | Behavioral change, same security outcome |
| Admin page routes (`/admin/*`) | Only middleware layer | withAdminAuth not in page handlers |
| Public routes | NONE | Middleware passes through unchanged |
| QStash cron jobs | NONE | Hit `/api/jobs/*`, not `/api/admin/*` |
| Scheduled-publish, reconciliation, etc. | NONE | Cron routes unchanged |
| ATOM-A governance gates | NONE — gates run after withAdminAuth | `ai_enabled` check unaffected |
| Login route | NONE | Explicitly bypassed |
| Supabase schema | NONE | No schema changes |
| Feature flags | NONE | No flag changes |
| CMS/SHOS/promptEngine | NONE | Deferred ATOMs |

**Blast radius: ADMIN API ROUTES ONLY (auth mechanics). Zero effect on public/job/data layers.**

---

## 10. Rollback Analysis

| Property | Value |
|---|---|
| Rollback target | `7ba4c5d` (last clean state) |
| Rollback method | Vercel dashboard → Deployments → `7ba4c5d` → Redeploy |
| Rollback execution time | ~2 minutes |
| Rollback complexity | TRIVIAL — single click in Vercel UI |
| State changes to revert | NONE — pure code change, no schema, no cookies, no flags |
| Session impact on rollback | NONE — same JWT_SECRET, existing sessions still valid |
| Data loss risk | NONE |

---

## 11. Emergency Recovery Path

### If ATOM-B causes admin lockout:

```
1. Open Vercel dashboard
2. Go to Deployments
3. Find commit 7ba4c5d
4. Click "..." → "Redeploy"
5. Wait ~2 minutes
6. Admin access restored — no data changes, no session invalidation
```

### If Vercel is unavailable:

```
1. git revert HEAD (creates revert commit)
2. git push origin main
3. Vercel auto-deploys from push
4. Admin access restored in ~3 minutes
```

### Supabase direct recovery capability:

Not required — no Supabase schema changes. Admin session is purely JWT cookie.

---

## 12. Deployment Decision

| Check | Result |
|---|---|
| Both files tracked in git | ✅ YES |
| All dependencies deployed | ✅ YES (verifyAdminSession, adminAccessControl, rateLimiter) |
| No untracked dependencies | ✅ YES |
| No new env vars required | ✅ YES |
| No schema changes | ✅ YES |
| Atomic deployment possible | ✅ YES — single commit with 2 files |
| Rollback trivial | ✅ YES — Vercel 1-click, ~2 min |
| Collateral damage | ✅ NONE — only queue.js has fallback header read, never reached |
| Session continuity | ✅ PRESERVED — same JWT, same cookie |
| Security posture | ✅ IMPROVED — eliminates header trust |
| Lockout risk (atomic deploy) | ✅ NONE |
| Lockout risk (partial deploy) | 🔴 HIGH — must not split files |

## FINAL VERDICT: **READY_FOR_DEPLOYMENT**

**One mandatory condition: `middleware.js` and `lib/auth/withAdminAuth.js` MUST be in the same commit. They MUST NOT be staged separately.**
