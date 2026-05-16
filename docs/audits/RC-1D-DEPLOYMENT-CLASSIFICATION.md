# RC-1D: Deployment Classification Matrix

| Field | Value |
|---|---|
| Phase | RC-1D |
| Date | 2026-05-14 |
| Production commit | `794013e` (2026-05-04) |
| Authority | RC-1D classification — supersedes `FORENSIC_DEPLOYMENT_RECONCILIATION.md` and `LOCAL_VS_PROD_FILE_MATRIX.md` |

---

## Tier 1: Deployed and Operational

> These components are committed, deployed, and executing in production with confirmed traffic.

| Component | Phase | Evidence |
|---|---|---|
| `app/[...slug]/page.js` (P1 version) | P1 | Every public page load; URL returns 200 on production |
| `app/api/workers/lead-sync/route.js` (P1 version) | P1 | Zoho CRM sync confirmed May 13 |
| `app/api/workers/contact-sync/route.js` (P1 version) | P1 | CRM contact sync confirmed operational |
| `app/api/jobs/scheduled-publish/route.js` | P0.4 | QStash cron `scd_7J8DtLe6UoKNbB8gTnag7GrQ89m1` active since C24 |
| `app/api/jobs/event-retry/route.js` | P0 | QStash cron `scd_5Nf3aEoA776GrqKp1nubmAh1BTSU`, */5 confirmed |
| `app/api/jobs/reconciliation/route.js` | P0 | QStash cron `scd_7eLCdvVEp1o7rWvdfRCb729r17xu`, */30 confirmed |
| `app/api/jobs/alert-scan/route.js` | P0 | QStash cron `scd_5kgABtJUWVnB5mHoCscVCYuooGpB`, */5 confirmed |
| `app/api/jobs/vendor-health-check/route.js` | P0 | QStash cron `scd_6JLsqxLgc5n49AW58rfZPicmAZiw`, */5 confirmed |
| `app/api/jobs/morning-brief/route.js` | P0 | QStash cron `scd_7oSGND79QuX6QhcdsPqZDD2Tk3WP`, 02:00 UTC daily |
| `app/api/admin/config/route.js` (P1 version) | P1 | Used by RC-1B.1 script; control plane endpoint |
| CRM / Zoho integration | P0/P1 | Sync confirmed May 13; zoho_id returned |
| Supabase (DB) | P0 | `system_control_config` singleton, all queries operational |
| QStash (cron delivery) | P0 | 6/6 crons confirmed live |

---

## Tier 2: Deployed but Shadow (Base Deployed, Modifications Local)

> These files have a working P1 version in production. Local modifications are not deployed. Production continues to use the older version.

### 2A. Public Routing — Safe Divergence (Production Working)

| File | Production Behavior | Local Modification | Risk |
|---|---|---|---|
| `app/[...slug]/page.js` | Inline Supabase queries against `page_index` | Imports `resolveRoute` (unified CMS resolver) | HIGH — Local version CANNOT deploy alone |
| `app/pages/[slug]/page.js` | Page lookup logic | P2 modifications | LOW |
| `app/resources/page.js` | Resources page | P2 modifications | LOW |

### 2B. Admin UI — Shadow (Production Working)

All 12 admin UI pages (`app/admin/*/page.js`) are deployed and functional in their P1 state. Local modifications include:
- SHOS integration in `app/admin/system/page.js` (IMPORT_BLOCKER)
- Content inventory in `app/admin/ccc/page.js` (IMPORT_BLOCKER)
- UI updates in remaining 10 admin pages (no untracked imports — SAFE divergence)

### 2C. Admin API — Shadow with Governance Gap

| File | Production State | Local State | Governance Delta |
|---|---|---|---|
| `pagegen/route.js` | No `ai_enabled` gate | RC-1B gate present | **GOVERNANCE GAP in production** |
| `admin/ai/route.js` | No `ai_enabled` gate | RC-1B gate present | Gap |
| `admin/blog/route.js` | No `ai_enabled` gate | RC-1B gate + promptEngine import | Gap + Blocker |
| `admin/seo/analyze/route.js` | No `ai_enabled` gate | RC-1B gate present | Gap |
| `admin/ai/recruiter/route.js` | No `ai_enabled` gate | RC-1B gate present | Gap |
| `admin/system-health/route.js` | Static AI status | RC-1B live probe | Accuracy gap |

### 2D. Worker Routes — Active Shadow

| File | Production State | Local State |
|---|---|---|
| `workers/lead-sync/route.js` | Executing, CRM-confirmed | P2 modifications |
| `workers/contact-sync/route.js` | Executing, CRM-confirmed | P2 modifications |

**Risk:** If local worker route modifications deploy, ensure they maintain CRM compatibility. These are ACTIVE routes.

### 2E. Auth Pair — Coupled Shadow

| File | Production State | Local State |
|---|---|---|
| `middleware.js` | P1 working auth | Modified |
| `lib/auth/withAdminAuth.js` | P1 working auth | RC-1B + P2 modifications |

**Must deploy atomically. Neither deploys safely alone.**

---

## Tier 3: Local Only — Never Deployed

### 3A. Import Blockers (RUNTIME_CRITICAL if deployed)

> These files are required by deployed (shadow) routes. Without them, a build failure occurs.

| File | Depends On | Blocks | Atomic Group |
|---|---|---|---|
| `lib/cms/resolveRoute.js` | `lib/cms/resolveCmsRoute.js` | `app/[...slug]/page.js` | CMS_RESOLVER_ATOM |
| `lib/cms/resolveCmsRoute.js` | Supabase (tables: `page_index`, `custom_pages`, `blog_posts`) | `lib/cms/resolveRoute.js` | CMS_RESOLVER_ATOM |
| `lib/ai/promptEngine.js` | Supabase prompt_templates table | `pagegen`, `blog`, `ccc/bulk/[id]`, `ccc/bulk`, `ccc/generate-single` | PROMPT_ENGINE_ATOM |
| `lib/system/shos.js` | `system_control_actions` table (migration 20260505090000) | 7 admin routes | SHOS_ATOM |
| `features/admin/content/ContentInventoryContent.jsx` | Supabase, admin API | `app/admin/ccc/page.js` | CCC_CONTENT_ATOM |
| `features/admin/system/ShosControlCenter.jsx` | `lib/system/shos.js` (indirectly via API) | `app/admin/system/page.js` | SHOS_ATOM |

### 3B. New API Routes (LOCAL_ONLY)

| File | Phase | Description | Deployment Dependency |
|---|---|---|---|
| `app/api/admin/cms/structure/route.js` | P2.2 | CMS topics/categories CRUD | `withAdminAuth` (deployed), CMS tables from `20260507010000` migration |
| `app/api/admin/system/shos/route.js` | P2.3 | SHOS system snapshot + actions | `lib/system/shos.js` (untracked), `system_control_actions` table |

### 3C. Orphaned Migrations (LOCAL_ONLY — MUST COMMIT)

| Migration | Schema Changes | Applied to DB | Commit Priority |
|---|---|---|---|
| `20260504123000_queue_running_steady_state.sql` | `queue_paused` default → FALSE | ✅ Confirmed by live state | HIGH — Documents current DB default |
| `20260504150000_p0_4_content_inventory_completion.sql` | `blog_posts` audit columns | ✅ Likely applied | HIGH |
| `20260505090000_shos_operator_control.sql` | Creates `system_control_actions` table | ✅ Likely applied | CRITICAL — SHOS depends on it |
| `20260507010000_p2_2_cms_data_structure.sql` | CMS nullable columns on multiple tables | ✅ Likely applied | HIGH |
| `20260507020000_p2_4_ai_prompt_engine.sql` | Prompt columns on `content_drafts`, `blog_posts`, `bulk_generation_jobs` | ✅ Likely applied | HIGH |

---

## Tier 4: Phase Attribution Map

> Every modified/local file attributed to its originating operational phase.

| Phase | Files | Status |
|---|---|---|
| **P0** | All cron routes, QStash infra, event-retry, alert-scan, vendor-health, reconciliation | DEPLOYED + EXECUTING |
| **P1** | Admin UI base, CCC drafts, CRM workers, config endpoint, `withAdminAuth`, `middleware.js` | DEPLOYED, base versions |
| **P0.4/P1** | `ContentInventoryContent.jsx`, `admin/ccc/page.js`, bulk planning | SHADOW (modified base) |
| **P2.1** | `lib/auth/withAdminAuth.js` auth changes, `middleware.js` | SHADOW (coupled pair) |
| **P2.2** | `lib/cms/resolveRoute.js`, `resolveCmsRoute.js`, `app/api/admin/cms/structure/route.js`, `app/[...slug]/page.js` | LOCAL_ONLY (2 cms libs) + SHADOW (slug page) |
| **P2.3 SHOS** | `lib/system/shos.js`, `ShosControlCenter.jsx`, `app/api/admin/system/shos/route.js`, 7 admin route modifications | LOCAL_ONLY (shos) + SHADOW (7 routes) |
| **P2.4** | `lib/ai/promptEngine.js`, `lib/ai/promptTemplates.js`, prompt column migrations | LOCAL_ONLY (engine) + SHADOW (templates) |
| **RC-1A** | All `docs/audits/RC-1A-*` | AUDIT_ONLY, LOCAL_ONLY |
| **RC-1B** | `ai_enabled` gates on 6 routes + `probeGeminiProvider` in health | SHADOW (gates LOCAL ONLY) |
| **RC-1B.1** | `scripts/rc1b1_ai_pause.mjs`, DB flag mutation | EXECUTED, LOCAL_ONLY |
| **RC-1C** | `scripts/rc1c_register_scheduled_publish.mjs` | EXECUTED, LOCAL_ONLY |
| **RC-1D** | `docs/audits/RC-1D-*` | AUDIT_ONLY, LOCAL_ONLY |

---

## Tier 5: Deployment-Blocking Summary

| Blocker ID | File Needing Deploy | Requires First | Build Failure Without |
|---|---|---|---|
| BLOCK-01 | `app/[...slug]/page.js` | `lib/cms/resolveRoute.js` + `resolveCmsRoute.js` | YES — "Cannot find module resolveRoute" |
| BLOCK-02 | `app/admin/system/page.js` | `features/admin/system/ShosControlCenter.jsx` | YES — "Cannot find module ShosControlCenter" |
| BLOCK-03 | `app/admin/ccc/page.js` | `features/admin/content/ContentInventoryContent.jsx` | YES — "Cannot find module ContentInventoryContent" |
| BLOCK-04 | `pagegen`, `blog`, `ccc/bulk*`, `generate-single` (5 routes) | `lib/ai/promptEngine.js` | YES — "Cannot find module promptEngine" |
| BLOCK-05 | `delivery-logs`, `dlq`, `observability`, `queue`, `system`, `system/health`, `system-health` (7 routes) | `lib/system/shos.js` | YES — "Cannot find module shos" |
| BLOCK-06 | All deployed code on fresh deploy | 5 orphaned migrations committed | NO build failure, but DB schema divergence causes runtime errors |
| BLOCK-07 | `middleware.js` | `lib/auth/withAdminAuth.js` (atomic pair) | POSSIBLE — auth breakage if logic coupled |

---

## Tier 6: What Is Safe to Deploy Today (Atomic Units)

> Given current state, safe deployment requires these atomic groups:

### ATOM-A: RC Governance Only (minimal, reversible)
- `app/api/admin/ai/recruiter/route.js`
- `app/api/admin/ai/route.js`
- `app/api/admin/seo/analyze/route.js`

**Why safe:** RC-1B gates added. No untracked imports in these 3 files. Independent routes.
**Why incomplete:** Does NOT include pagegen gate (has promptEngine import) or blog gate (has promptEngine import).

### ATOM-B: Auth Pair
- `middleware.js`
- `lib/auth/withAdminAuth.js`

**Requires:** Both or neither. Manual review of auth logic diff required before deploy.

### ATOM-C: SHOS System
- `supabase/migrations/20260505090000_shos_operator_control.sql` (commit + apply if not applied)
- `lib/system/shos.js`
- `features/admin/system/ShosControlCenter.jsx`
- `app/api/admin/system/shos/route.js`
- `app/api/admin/delivery-logs/route.js`
- `app/api/admin/dlq/route.js`
- `app/api/admin/observability/route.js`
- `app/api/admin/queue/route.js`
- `app/api/admin/system/health/route.js`
- `app/api/admin/system/route.js`
- `app/api/admin/system-health/route.js`
- `app/admin/system/page.js`

### ATOM-D: Prompt Engine System
- `supabase/migrations/20260507020000_p2_4_ai_prompt_engine.sql` (commit + apply if not applied)
- `lib/ai/promptEngine.js`
- `app/api/jobs/pagegen/route.js`
- `app/api/admin/blog/route.js`
- `app/api/admin/ccc/bulk/[id]/route.js`
- `app/api/admin/ccc/bulk/route.js`
- `app/api/admin/ccc/generate-single/route.js`

### ATOM-E: CMS Resolver
- `lib/cms/resolveRoute.js`
- `lib/cms/resolveCmsRoute.js`
- `app/[...slug]/page.js`

### ATOM-F: Orphaned Migrations (commit only, no code change required)
- All 5 orphaned migrations should be committed to prevent git/DB drift.

---

## Deployment Prescription

**Priority order if deployment proceeds (NOT RC-1D scope — documented for future use):**

1. Commit orphaned migrations first (no code change, pure git hygiene)
2. Deploy ATOM-A (3 governance routes — lowest risk)
3. Deploy ATOM-B (auth pair — requires careful diff review)
4. Deploy ATOM-C (SHOS — 12 files, requires migration confirm)
5. Deploy ATOM-D (prompt engine — 7 files, requires migration confirm)
6. Deploy ATOM-E (CMS resolver — 3 files, catches all public page routing)
7. Deploy remaining shadow UI files (CCC UI, media, blog UI, etc.)
