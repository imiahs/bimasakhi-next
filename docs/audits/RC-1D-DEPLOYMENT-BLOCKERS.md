# RC-1D: Deployment Blockers

| Field | Value |
|---|---|
| Phase | RC-1D |
| Date | 2026-05-14 |
| Production commit | `794013e` (2026-05-04) |
| Authority | RC-1D classification — evidence-backed via import chain analysis |

---

> **Purpose:** Authoritatively enumerate every condition that would cause a deployment failure, runtime error, or governance regression if the current local state were deployed to Vercel.

---

## Hard Blockers — Build Failure

> Deploying without resolving these causes `next build` to fail. Vercel deployment aborts.

### HARD-01: CMS Resolver Dependency Chain

| Metric | Value |
|---|---|
| Blocker type | Import resolution failure |
| Severity | 🔴 CRITICAL |
| Build failure | `Cannot find module '@/lib/cms/resolveRoute'` |
| Failing file | `app/[...slug]/page.js` (line 5) |
| Missing file | `lib/cms/resolveRoute.js` (untracked, never committed) |
| Also missing | `lib/cms/resolveCmsRoute.js` (imported by resolveRoute) |
| Production impact | ALL public pages would 404. Vercel catches this at build time — deployment would abort, preserving current production. |
| Resolution | Deploy `lib/cms/resolveRoute.js` + `resolveCmsRoute.js` atomically with `app/[...slug]/page.js` |

### HARD-02: SHOS Library Dependency Chain

| Metric | Value |
|---|---|
| Blocker type | Import resolution failure |
| Severity | 🔴 CRITICAL |
| Build failure | `Cannot find module '@/lib/system/shos'` |
| Failing files | 7 routes import `lib/system/shos`: `delivery-logs`, `dlq`, `observability`, `queue`, `system`, `system/health`, `system-health` |
| Missing file | `lib/system/shos.js` (untracked, never committed) |
| Also required | `supabase/migrations/20260505090000_shos_operator_control.sql` (creates `system_control_actions` table — if not applied, SHOS runtime fails) |
| Production impact | Build aborts. Admin system/queue/observability routes unavailable. Vercel preserves current production. |
| Resolution | Deploy `lib/system/shos.js` + 7 routes atomically. Confirm `system_control_actions` table exists in DB. |

### HARD-03: promptEngine Dependency Chain

| Metric | Value |
|---|---|
| Blocker type | Import resolution failure |
| Severity | 🔴 CRITICAL |
| Build failure | `Cannot find module '@/lib/ai/promptEngine'` |
| Failing files | 5 routes: `pagegen`, `blog`, `ccc/bulk/[id]`, `ccc/bulk`, `ccc/generate-single` |
| Missing file | `lib/ai/promptEngine.js` (untracked, never committed) |
| Also required | DB `prompt_templates` table with default seeds (from migration `20260507020000`) |
| Production impact | Build aborts. Content generation disabled. Pagegen worker fails immediately. |
| Resolution | Deploy `lib/ai/promptEngine.js` + 5 routes atomically. Confirm prompt_templates table and seeds exist. |

### HARD-04: ShosControlCenter UI Component

| Metric | Value |
|---|---|
| Blocker type | Import resolution failure |
| Severity | 🔴 CRITICAL |
| Build failure | `Cannot find module '@/features/admin/system/ShosControlCenter'` |
| Failing file | `app/admin/system/page.js` (line 1) |
| Missing file | `features/admin/system/ShosControlCenter.jsx` (untracked) |
| Production impact | Admin system page fails to render. Build aborts. |
| Resolution | Deploy `ShosControlCenter.jsx` atomically with `app/admin/system/page.js`. Requires SHOS lib (HARD-02) to be deployed first. |

### HARD-05: ContentInventoryContent UI Component

| Metric | Value |
|---|---|
| Blocker type | Import resolution failure |
| Severity | 🔴 CRITICAL |
| Build failure | `Cannot find module '@/features/admin/content/ContentInventoryContent'` |
| Failing file | `app/admin/ccc/page.js` (line 5) |
| Missing file | `features/admin/content/ContentInventoryContent.jsx` (untracked) |
| Production impact | Admin CCC page fails. Build aborts. |
| Resolution | Deploy `ContentInventoryContent.jsx` atomically with `app/admin/ccc/page.js`. |

---

## Soft Blockers — Runtime Failure (Build Succeeds, Runtime Fails)

> Deploying without resolving these causes build to succeed but runtime errors at specific paths.

### SOFT-01: Orphaned Migration — system_control_actions Table

| Metric | Value |
|---|---|
| Blocker type | Missing DB table |
| Severity | 🟠 HIGH |
| Failure mode | `shos.js` calls `getShosSnapshot()` which queries `system_control_actions`. If table missing, runtime 500 errors on 7 admin routes |
| Missing migration | `20260505090000_shos_operator_control.sql` (untracked) |
| Detection | Only fails when SHOS routes are called. Build succeeds. |
| Resolution | Commit migration + confirm table exists before deploying SHOS. |

### SOFT-02: Orphaned Migration — Prompt Engine Columns

| Metric | Value |
|---|---|
| Blocker type | Missing DB columns |
| Severity | 🟠 HIGH |
| Failure mode | `promptEngine.js` queries `content_drafts.prompt_inputs`, `blog_posts.prompt_template_id` etc. Missing columns → runtime errors |
| Missing migration | `20260507020000_p2_4_ai_prompt_engine.sql` (untracked) |
| Detection | Only fails when prompt engine generates content |
| Resolution | Confirm columns exist, commit migration. |

### SOFT-03: Orphaned Migration — CMS Data Structure Columns

| Metric | Value |
|---|---|
| Blocker type | Missing DB columns |
| Severity | 🟡 MEDIUM |
| Failure mode | CMS resolver and CMS structure API query `content_drafts.page_type`, `custom_pages.full_slug`, etc. |
| Missing migration | `20260507010000_p2_2_cms_data_structure.sql` (untracked) |
| Resolution | Confirm columns exist, commit migration. |

---

## Operational Blockers — Governance Regression

> The RC-1B local governance changes are NOT deployed. These are not build failures, but operational regressions relative to the intended post-RC-1B state.

### OPR-01: pagegen AI Governance Gap

| Metric | Value |
|---|---|
| Blocker type | Governance regression |
| Severity | 🟠 HIGH |
| Current production behavior | `app/api/jobs/pagegen/route.js` calls Gemini with NO `ai_enabled` check |
| Intended behavior (RC-1B) | Gate returns HTTP 200 + `{blocked: true}` when `ai_enabled=false` |
| Risk | If someone publishes a QStash message to pagegen, production silently attempts Gemini (gets 429, QStash retries 3×) |
| Mitigation | No cron exists for pagegen. Queue not actively fed. Exposure: low but non-zero. |
| Resolution | Deploy pagegen route as part of ATOM-D (promptEngine + 5 routes) |

### OPR-02: Admin AI Routes Governance Gap

| Metric | Value |
|---|---|
| Blocker type | Governance regression |
| Severity | 🟡 MEDIUM |
| Affected routes | `admin/ai/route.js`, `admin/ai/recruiter/route.js`, `admin/seo/analyze/route.js` |
| Current production behavior | No `ai_enabled` check — would call Gemini if triggered |
| Risk | Admin user could trigger AI analysis in production, which fails silently with 429 |
| Resolution | ATOM-A deployment (3 routes, no untracked imports — safest batch) |

### OPR-03: Health Status Inaccuracy

| Metric | Value |
|---|---|
| Blocker type | Observability regression |
| Severity | 🟡 MEDIUM |
| Current production behavior | `admin/system-health` shows static AI status (likely "Operational") |
| Intended behavior (RC-1B) | Shows "Paused" or "Degraded" based on live `probeGeminiProvider()` |
| Resolution | Deploy `admin/system-health/route.js` (depends on `lib/system/shos` — part of ATOM-C) |

---

## Cosmetic Blockers — Not Breaking But Incomplete

### COS-01: Documentation Not Committed

| Metric | Value |
|---|---|
| Blocker type | Audit trail not committed |
| Severity | 🟢 LOW |
| Files | ~54 docs/audits and docs/fixes files (LOCAL_ONLY) |
| Resolution | Commit documentation as part of any deployment or standalone docs commit |

### COS-02: Orphaned Audit Result Files Deleted Locally

| Metric | Value |
|---|---|
| Blocker type | Unclean git state |
| Severity | 🟢 LOW |
| Files | 86 `scripts/audit/results/*.json` files — deleted locally, still in HEAD |
| Resolution | `git add -A scripts/audit/results/` and commit the deletions |

---

## Files That MUST Deploy Together (Atomic Groups)

| Atom | Files | Reason |
|---|---|---|
| **ATOM-A** | `admin/ai/route.js`, `admin/ai/recruiter/route.js`, `admin/seo/analyze/route.js` | RC-1B gates only. No untracked imports. Smallest safe batch. |
| **ATOM-B** | `middleware.js` + `lib/auth/withAdminAuth.js` | Auth coupling. Unclear if safe without diff review. |
| **ATOM-C** | `lib/system/shos.js`, `ShosControlCenter.jsx`, `shos/route.js`, 7 modified routes, `admin/system/page.js` + migration `20260505090000` | SHOS import chain + table dependency |
| **ATOM-D** | `lib/ai/promptEngine.js`, `pagegen/route.js`, `blog/route.js`, 3 CCC routes + migration `20260507020000` | promptEngine import chain + column dependency |
| **ATOM-E** | `lib/cms/resolveRoute.js`, `resolveCmsRoute.js`, `app/[...slug]/page.js` | CMS resolver chain |
| **ATOM-F** | 5 orphaned migrations | DB/git drift correction. No code change needed. |

---

## Files That MUST NOT Deploy Independently

| File | Reason |
|---|---|
| `app/[...slug]/page.js` | Breaks ALL public pages without `resolveRoute.js` |
| `app/admin/system/page.js` | Breaks admin system page without `ShosControlCenter.jsx` |
| `app/admin/ccc/page.js` | Breaks admin CCC without `ContentInventoryContent.jsx` |
| Any of the 5 promptEngine-importing routes | Build failure without `lib/ai/promptEngine.js` |
| Any of the 7 shos-importing routes | Build failure without `lib/system/shos.js` |
| `middleware.js` | Deploy only with `lib/auth/withAdminAuth.js` |

---

## Files Safe for Future Archival (No Deployment Impact)

| Category | Files |
|---|---|
| Executed one-time scripts | `scripts/rc1b1_ai_pause.mjs`, `scripts/rc1c_register_scheduled_publish.mjs` |
| Deleted audit JSONs | 86 `scripts/audit/results/*.json` (already deleted locally) |
| All docs/* files | Pure documentation — no build or runtime dependency |

---

## Overall Deployment Readiness

| Dimension | Status | Notes |
|---|---|---|
| Current production | ✅ STABLE | P1 state (`794013e`) running cleanly |
| Local → Production (full deploy) | ❌ NOT READY | 5 hard build blockers. All 5 ATOM groups must resolve first |
| Partial deploy (ATOM-A only) | ✅ FEASIBLE | 3 governance routes, no untracked imports |
| DB schema state | ⚠ DIVERGED | 5 orphaned migrations in DB but not in git |
| Governance gap risk | 🟠 LOW-MEDIUM | pagegen exposure exists but no cron; admin AI exposure only if admin actively used |
