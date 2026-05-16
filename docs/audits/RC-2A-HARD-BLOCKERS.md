# RC-2A: Hard Deployment Blockers

| Field | Value |
|---|---|
| Phase | RC-2A |
| Date | 2026-05-14 |
| Purpose | Exhaustive classification of all conditions preventing safe deployment |
| Authority | Evidence-backed — all import chains verified via grep; all git states confirmed |

---

> **Rule:** Every blocker is evidence-backed. If a blocker could not be confirmed with evidence, it is classified INCONCLUSIVE, not asserted.

---

## Category 1: Hard Runtime Blockers (Build Failure)

> These cause `next build` to fail with `Cannot find module`. Vercel deployment aborts. Production is preserved.

### HRB-01: CMS Resolver Missing

| Attribute | Value |
|---|---|
| Severity | 🔴 CRITICAL |
| Trigger | `app/[...slug]/page.js` (line 5): `import { resolveRoute } from '@/lib/cms/resolveRoute'` |
| Missing file | `lib/cms/resolveRoute.js` (untracked, never committed) |
| Missing dependency | `lib/cms/resolveCmsRoute.js` (also untracked; imported by resolveRoute) |
| Build error | `Module not found: Can't resolve '@/lib/cms/resolveRoute'` |
| Production impact | ALL public pages would 404. Vercel catches at build — deploy aborted. |
| Evidence | `git ls-files --others --exclude-standard lib/cms/resolveRoute.js` → file listed as untracked |
| Resolution path | ATOM-E: Deploy `resolveRoute.js` + `resolveCmsRoute.js` + `app/[...slug]/page.js` atomically |
| Safe to defer? | YES — production currently uses working P1 version. No urgency. |

### HRB-02: SHOS Library Missing

| Attribute | Value |
|---|---|
| Severity | 🔴 CRITICAL |
| Trigger | 7 routes import `@/lib/system/shos`: `delivery-logs`, `dlq`, `observability`, `queue`, `system`, `system/health`, `system-health` |
| Missing file | `lib/system/shos.js` (untracked, never committed) |
| Build error | `Module not found: Can't resolve '@/lib/system/shos'` |
| Production impact | 7 admin API routes fail to build. Admin system management unavailable. |
| Evidence | grep confirms imports; `git ls-files --others` confirms untracked |
| Resolution path | ATOM-C: Deploy `shos.js` + all 7 routes + UI component atomically |
| Safe to defer? | YES — admin-only impact. Production admin uses P1 versions which work. |

### HRB-03: Prompt Engine Missing

| Attribute | Value |
|---|---|
| Severity | 🔴 CRITICAL |
| Trigger | 5 routes import `@/lib/ai/promptEngine`: `pagegen`, `blog`, `ccc/bulk/[id]`, `ccc/bulk`, `ccc/generate-single` |
| Missing file | `lib/ai/promptEngine.js` (untracked, never committed) |
| Build error | `Module not found: Can't resolve '@/lib/ai/promptEngine'` |
| Production impact | Content generation pipeline fails to build. 5 admin/job routes fail. |
| Evidence | grep confirms imports; `git ls-files --others` confirms untracked |
| Resolution path | ATOM-D: Deploy `promptEngine.js` + all 5 routes + `promptTemplates.js` atomically |
| Safe to defer? | YES — AI is disabled (`ai_enabled=false`). Deploy ONLY when AI strategy resolved. |

### HRB-04: ShosControlCenter UI Missing

| Attribute | Value |
|---|---|
| Severity | 🔴 CRITICAL |
| Trigger | `app/admin/system/page.js` (line 1): `import ShosControlCenter from '@/features/admin/system/ShosControlCenter'` |
| Missing file | `features/admin/system/ShosControlCenter.jsx` (untracked) |
| Build error | `Module not found: Can't resolve '@/features/admin/system/ShosControlCenter'` |
| Production impact | Admin system page fails to build. |
| Evidence | `git ls-files --others` confirms untracked |
| Resolution path | Deploy with ATOM-C — requires SHOS lib and SHOS route also deployed |
| Safe to defer? | YES — admin-only. |

### HRB-05: ContentInventoryContent UI Missing

| Attribute | Value |
|---|---|
| Severity | 🔴 CRITICAL |
| Trigger | `app/admin/ccc/page.js` (line 5): `import ContentInventoryContent from '@/features/admin/content/ContentInventoryContent'` |
| Missing file | `features/admin/content/ContentInventoryContent.jsx` (untracked) |
| Build error | `Module not found: Can't resolve '@/features/admin/content/ContentInventoryContent'` |
| Production impact | Admin CCC page fails to build. |
| Evidence | `git ls-files --others` confirms untracked |
| Resolution path | ATOM-F: Deploy `ContentInventoryContent.jsx` + `app/admin/ccc/page.js` atomically |
| Safe to defer? | YES — admin-only. |

---

## Category 2: Atomic Deployment Blockers (Partial Deploy Danger)

> These do NOT cause build failure by themselves — but deploying any file in an atomic group without its required co-files causes runtime failure.

### ADB-01: Auth Pair Coupling

| Attribute | Value |
|---|---|
| Severity | 🟠 HIGH |
| Files | `middleware.js` + `lib/auth/withAdminAuth.js` |
| Problem | Auth logic spans both files. `middleware.js` governs route access; `withAdminAuth.js` wraps all admin handlers. If logic between them diverges on session format, tokens, or role expectations, admin authentication breaks. |
| Evidence | Both files modified in local state; RC-1D and RC-2A classify as coupled pair |
| Safe partial deploy? | UNKNOWN — requires reading the diff to determine coupling severity |
| Resolution | Deploy both atomically in a single commit (ATOM-B) |
| Mitigation if diff review fails | Defer ATOM-B until diff is reviewed |

### ADB-02: SHOS 3-Way Dependency

| Attribute | Value |
|---|---|
| Severity | 🟠 HIGH |
| Files | `lib/system/shos.js` + 7 routes + `ShosControlCenter.jsx` + `app/api/admin/system/shos/route.js` |
| Problem | All 7 modified routes import `shos.js`. The UI component calls the shos API route. The shos route calls `shos.js`. If any one deploys without the others, build fails. |
| Resolution | ATOM-C deploys all 12 files atomically |

### ADB-03: Prompt Engine Fan-Out

| Attribute | Value |
|---|---|
| Severity | 🟠 HIGH |
| Files | `lib/ai/promptEngine.js` + 5 consumer routes + `promptTemplates.js` |
| Problem | 5 routes import `promptEngine.js`. If the engine deploys without routes (or vice versa), build fails. |
| Resolution | ATOM-D deploys all 7 files atomically |

### ADB-04: CMS Resolver + Catch-All Page

| Attribute | Value |
|---|---|
| Severity | 🔴 CRITICAL |
| Files | `lib/cms/resolveRoute.js` + `lib/cms/resolveCmsRoute.js` + `app/[...slug]/page.js` |
| Problem | The catch-all page imports `resolveRoute` which imports `resolveCmsRoute`. Deploying the catch-all page without both libs = immediate build failure. Deploying the libs without the page = no activation (harmless but wasted). |
| Resolution | ATOM-E deploys all 3 atomically |

### ADB-05: CCC Page + ContentInventory Component

| Attribute | Value |
|---|---|
| Severity | 🟡 MEDIUM |
| Files | `app/admin/ccc/page.js` + `features/admin/content/ContentInventoryContent.jsx` |
| Problem | Page imports component. Neither deploys safely without the other. |
| Resolution | ATOM-F deploys both atomically |

---

## Category 3: Observability Blockers

> These do not prevent build or deployment, but reduce post-deploy visibility.

### OBS-01: system-health Route Inaccuracy

| Attribute | Value |
|---|---|
| Severity | 🟡 MEDIUM |
| File | `app/api/admin/system-health/route.js` (modified locally, not deployed) |
| Problem | Local version adds live Gemini probe to health endpoint. Production version returns static AI status. Post-deploy health checks will show more accurate AI state. |
| Impact | Misleading health data until deployed. No runtime failure. |
| Resolution | Included in ATOM-C (SHOS system) deployment group |

### OBS-02: Observability Route SHOS Integration

| Attribute | Value |
|---|---|
| Severity | 🟡 MEDIUM |
| File | `app/api/admin/observability/route.js` (imports shos.js) |
| Problem | Until ATOM-C deploys, admin observability panel shows P1 data format. |
| Resolution | Resolved by ATOM-C |

---

## Category 4: Environment Blockers

> Missing or misconfigured environment variables that would prevent runtime function.

### ENV-01: No Missing Environment Variables Detected

| Attribute | Value |
|---|---|
| Status | ✅ CLEAR |
| Evidence | All required env vars confirmed present in prior audits: `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` |
| New dependencies? | ATOM-D (promptEngine) may require OpenAI key if Gemini fallback is configured. Verify before ATOM-D. |
| Action | Verify `OPENAI_API_KEY` or equivalent if ATOM-D introduces new AI provider |

---

## Category 5: Git-State Blockers

### GSB-01: 5 Orphaned Migrations Not Committed

| Attribute | Value |
|---|---|
| Severity | 🟠 HIGH |
| Problem | 5 migration files applied to DB but not tracked in git. `supabase db diff` would show divergence. Any future `supabase db reset` or migration replay would miss these. |
| Impact | Not a build blocker. Is a DB drift risk. Fresh Vercel deploy with a clean DB would have incorrect schema. |
| Resolution | ATOM-G: Commit all 5 migration files BEFORE any code deploy |
| Safe to defer? | NO — should be first action. |

### GSB-02: 86 Deleted Audit JSONs Staged

| Attribute | Value |
|---|---|
| Severity | 🟢 LOW |
| Problem | 86 `scripts/audit/results/*.json` files deleted locally, staged as `D` in git status. Not yet committed. |
| Impact | Cosmetic. No runtime impact. |
| Resolution | Include in RC-2D documentation commit |

### GSB-03: 57 Modified Files Uncommitted

| Attribute | Value |
|---|---|
| Severity | 🟠 HIGH (accumulated risk) |
| Problem | 57 modified tracked files have never been committed. Git history does not reflect current local state. Any context loss, repo clone, or fresh deploy would produce production state, not P2 state. |
| Impact | Risk accumulates with time. No immediate runtime impact (production is stable). |
| Resolution | Systematic ATOM deployment per RC-2C plan |

---

## Category 6: Operational Blockers

### OPB-01: AI Governance Gap in Production (MST-01)

| Attribute | Value |
|---|---|
| Severity | 🟠 HIGH (governance) |
| Problem | RC-1B governance gates are LOCAL ONLY. Production code does NOT check `ai_enabled`. If AI quota is replenished and `ai_enabled` is flipped to `true` WITHOUT deploying ATOM-A first, production AI routes would attempt Gemini calls without any governance gate. |
| Current mitigation | `ai_enabled=false` in DB + Gemini quota exhausted = double protection. Low actual risk. |
| Resolution | Deploy ATOM-A FIRST (before any AI re-enablement) |
| Urgency | HIGH — must be first deployment action |

### OPB-02: pagegen Worker Governance Gap

| Attribute | Value |
|---|---|
| Severity | 🟡 MEDIUM |
| Problem | `app/api/jobs/pagegen/route.js` in production has no `ai_enabled` gate. Has `promptEngine` import locally (build blocker). QStash has no pagegen cron. Only fires on explicit message. |
| Current mitigation | No cron, no explicit trigger in production. Low actual exposure. |
| Resolution | Resolved when ATOM-D deploys (gate included in modified pagegen route) |

### OPB-03: system_control_actions Table Unconfirmed

| Attribute | Value |
|---|---|
| Severity | 🟠 HIGH (for ATOM-C) |
| Problem | Migration `20260505090000_shos_operator_control.sql` creates `system_control_actions` table. It is untracked (orphaned). DB application is LIKELY but unconfirmed by direct query. SHOS runtime depends on this table. |
| Resolution | Query `SELECT to_regclass('public.system_control_actions')` in Supabase console BEFORE deploying ATOM-C |
| Status | INCONCLUSIVE — not verified during RC-2A planning |

---

## Category 7: Cosmetic Blockers

### COS-01: 86 Deleted JSON Files Not Committed

| Attribute | Value |
|---|---|
| Severity | 🟢 COSMETIC |
| Problem | `scripts/audit/results/*.json` files deleted locally but deletion not committed to git |
| Resolution | Include in RC-2D cleanup commit |

### COS-02: Documentation Not Committed

| Attribute | Value |
|---|---|
| Severity | 🟢 COSMETIC |
| Problem | ~56 documentation files (audit docs, fix docs, test docs) are untracked |
| Resolution | Include in RC-2D cleanup commit |

---

## Blocker Resolution Dependency Map

```
BEFORE ANY DEPLOYMENT:
  GSB-01 (orphaned migrations) ──► ATOM-G

BEFORE PRODUCTION AI RE-ENABLEMENT:
  OPB-01 (governance gap) ──────► ATOM-A (MUST deploy first)

BEFORE ATOM-C (SHOS):
  OPB-03 (table unconfirmed) ───► Verify system_control_actions exists
  ADB-01 (auth pair) ────────────► ATOM-B must be deployed

BEFORE ATOM-E (CMS resolver):
  HRB-01 (resolveRoute missing) ─► All prior ATOMs stable
  HRB-02 through HRB-05 ─────────► All resolved by their respective ATOMs

SAFE TO DEFER INDEFINITELY:
  HRB-02 (SHOS) ─────────────────► Admin-only, defer if SHOS not needed
  HRB-03 (promptEngine) ─────────► Defer until AI strategy resolved
  COS-01, COS-02 ─────────────────► RC-2D cleanup
```

---

## Blocker Summary Table

| ID | Category | Severity | Defer Safe? | Resolved By |
|---|---|---|---|---|
| HRB-01 | Hard Runtime | 🔴 CRITICAL | YES (production working) | ATOM-E |
| HRB-02 | Hard Runtime | 🔴 CRITICAL | YES (admin-only) | ATOM-C |
| HRB-03 | Hard Runtime | 🔴 CRITICAL | YES (AI disabled) | ATOM-D |
| HRB-04 | Hard Runtime | 🔴 CRITICAL | YES (admin-only) | ATOM-C |
| HRB-05 | Hard Runtime | 🔴 CRITICAL | YES (admin-only) | ATOM-F |
| ADB-01 | Atomic Coupling | 🟠 HIGH | Until review complete | ATOM-B |
| ADB-02 | Atomic Coupling | 🟠 HIGH | YES | ATOM-C |
| ADB-03 | Atomic Coupling | 🟠 HIGH | YES | ATOM-D |
| ADB-04 | Atomic Coupling | 🔴 CRITICAL | YES | ATOM-E |
| ADB-05 | Atomic Coupling | 🟡 MEDIUM | YES | ATOM-F |
| OBS-01 | Observability | 🟡 MEDIUM | YES | ATOM-C |
| OBS-02 | Observability | 🟡 MEDIUM | YES | ATOM-C |
| ENV-01 | Environment | ✅ CLEAR | N/A | None needed |
| GSB-01 | Git-State | 🟠 HIGH | NO — do first | ATOM-G |
| GSB-02 | Git-State | 🟢 LOW | YES | RC-2D |
| GSB-03 | Git-State | 🟠 HIGH | YES (risk accumulates) | All ATOMs |
| OPB-01 | Operational | 🟠 HIGH | NO — before AI re-enable | ATOM-A |
| OPB-02 | Operational | 🟡 MEDIUM | YES | ATOM-D |
| OPB-03 | Operational | 🟠 HIGH | NO — before ATOM-C | Manual verify |
| COS-01 | Cosmetic | 🟢 LOW | YES | RC-2D |
| COS-02 | Cosmetic | 🟢 LOW | YES | RC-2D |

---

## Blockers That MUST Resolve Before ANY Deployment

1. **GSB-01** — Commit orphaned migrations (ATOM-G) — prevents DB drift on fresh deploy
2. **OPB-01** — Deploy ATOM-A BEFORE any AI re-enablement — governance gap

## Blockers Safe to Isolate

- HRB-01 (CMS resolver) — production working on P1 resolver
- HRB-02, HRB-04 (SHOS) — admin-only, deferrable
- HRB-03, ATOM-D (promptEngine) — AI disabled, safe to defer until AI strategy resolved
- HRB-05, ADB-05 (CCC UI) — admin-only, deferrable

## Blockers That Are Inconclusive

- **OPB-03** — `system_control_actions` table existence: LIKELY applied but unverified by direct DB query during RC-2A. Classified INCONCLUSIVE.
