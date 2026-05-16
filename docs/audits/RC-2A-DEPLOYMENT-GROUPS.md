# RC-2A: Deployment Groups

| Field | Value |
|---|---|
| Phase | RC-2A |
| Date | 2026-05-14 |
| Purpose | Authoritative atomic deployment group definitions — operationally deterministic deployment sequencing |
| Authority | Supersedes RC-1D ATOM-A through ATOM-F (extends and refines them) |

---

> **Rule:** Every file in this repository has exactly ONE deployment group assignment. No file deploys outside its group. Partial group deployment is explicitly forbidden.

---

## Deployment Order

> **Mandatory sequence.** Each group can only deploy after its prerequisites are complete.

```
ATOM-G (migrations commit)
  └─► ATOM-A (governance routes — minimal safety)
       └─► ATOM-B (auth pair — foundational)
            └─► ATOM-C (SHOS system — admin runtime)
                 └─► ATOM-F (CCC content UI — admin content)
                      └─► ATOM-D (prompt engine — only when AI ready)
                           └─► ATOM-E (CMS resolver — LAST, highest blast radius)

ATOM-H (safe admin UI shadow) ─── independent, any position after ATOM-G
ATOM-I (worker routes) ─────────── independent, after CRM compatibility verified
LOCAL-ONLY ──────────────────────── NEVER deploy
```

---

## ATOM-G: Orphaned Migration Commit

| Attribute | Value |
|---|---|
| Purpose | Restore git/DB alignment for all 5 orphaned migrations |
| Risk | NONE at deploy time (migrations already applied to DB) |
| Deployment action | `git add supabase/migrations/*.sql` + commit — no Vercel deploy triggered |
| Prerequisite | Verify each migration file matches DB state before committing |
| Rollback | `git revert` commit — does not un-apply DB migration |
| Blast radius | Git history only — no runtime impact |

### Files

| File | Schema Change | DB Status |
|---|---|---|
| `supabase/migrations/20260504123000_queue_running_steady_state.sql` | `queue_paused` default → FALSE | Applied (confirmed by live DB) |
| `supabase/migrations/20260504150000_p0_4_content_inventory_completion.sql` | `blog_posts` audit columns | Applied (LIKELY) |
| `supabase/migrations/20260505090000_shos_operator_control.sql` | Creates `system_control_actions` table | Applied (LIKELY) |
| `supabase/migrations/20260507010000_p2_2_cms_data_structure.sql` | CMS nullable columns on multiple tables | Applied (LIKELY) |
| `supabase/migrations/20260507020000_p2_4_ai_prompt_engine.sql` | Prompt columns on `content_drafts`, `blog_posts`, `bulk_generation_jobs` | Applied (LIKELY) |

### Pre-Commit Validation (Required)
- [ ] Confirm `system_control_actions` table exists in production Supabase
- [ ] Confirm `content_drafts.prompt_inputs` column exists
- [ ] Confirm `blog_posts.prompt_template_id` column exists
- [ ] Confirm `blog_posts` audit columns from P0.4 migration exist
- [ ] Confirm `custom_pages.full_slug` column exists (CMS structure migration)

---

## ATOM-A: RC Governance Routes (3 files — Immediately Deployable)

| Attribute | Value |
|---|---|
| Purpose | Deploy RC-1B AI governance gates to close production governance gap |
| Risk | LOW — additive guard only. Returns 503 if `ai_enabled=false`. No structural change. |
| Prerequisite | ATOM-G (migrations commit) recommended first |
| Coupling | NONE — these 3 routes are fully independent of each other and all untracked files |
| Rollback | `git revert` — production reverts to un-gated AI routes (acceptable, AI quota exhausted anyway) |
| Blast radius | 3 admin API routes only |
| Deployment trigger | Vercel auto-deploy on push to main |

### Files

| File | Change Summary | Import Chain Clear? |
|---|---|---|
| `app/api/admin/ai/route.js` | RC-1B: adds `ai_enabled` gate before AI call | ✅ All imports tracked |
| `app/api/admin/ai/recruiter/route.js` | RC-1B: adds `ai_enabled` gate before AI call | ✅ All imports tracked |
| `app/api/admin/seo/analyze/route.js` | RC-1B: adds `ai_enabled` gate before AI call | ✅ All imports tracked |

### Validation After Deploy
- [ ] Verify Vercel build succeeds
- [ ] Call `POST /api/admin/ai` → expect `{ error: 'AI_DISABLED', status: 503 }` (not 500)
- [ ] Call `POST /api/admin/seo/analyze` → expect `{ error: 'AI_DISABLED', status: 503 }`
- [ ] Confirm no regression on other admin routes

---

## ATOM-B: Auth Pair (2 files — Coupled)

| Attribute | Value |
|---|---|
| Purpose | Deploy P2.1 auth upgrades + RC-1B governance additions to `withAdminAuth` |
| Risk | MEDIUM — auth layer is foundational. Regression here affects all admin routes. |
| Prerequisite | ATOM-A deployed and validated |
| Coupling | STRONG — `middleware.js` and `lib/auth/withAdminAuth.js` MUST deploy atomically |
| Import chain | ✅ Both files have ONLY tracked dependencies (verified RC-2A) |
| Rollback | Single `git revert` of commit — fast. Vercel redeploy ~2 min. |
| Blast radius | ALL admin routes (auth is foundational). Public routes unaffected (middleware bypasses public paths). |

### Files

| File | Change Summary | Notes |
|---|---|---|
| `middleware.js` | Rate limiting, access control, JWT verification updates | Do NOT deploy without `withAdminAuth.js` |
| `lib/auth/withAdminAuth.js` | RC-1B audit logging, role enforcement, security hardening | Do NOT deploy without `middleware.js` |

### Pre-Deploy Manual Review Required
- [ ] Read `git diff HEAD middleware.js` — confirm no logic regressions in JWT path
- [ ] Read `git diff HEAD lib/auth/withAdminAuth.js` — confirm no role bypass introduced
- [ ] Confirm public routes (homepage, blog, contact) not affected by middleware changes
- [ ] Confirm admin login path preserved

### Validation After Deploy
- [ ] Admin login flow works end-to-end
- [ ] Non-admin request to `/api/admin/*` returns 401/403
- [ ] Public routes (homepage, blog) still load correctly
- [ ] QStash cron routes (job routes) not affected (QSTASH signature verify path unaffected)

---

## ATOM-C: SHOS System (12 files + migration)

| Attribute | Value |
|---|---|
| Purpose | Deploy SHOS operator control system — admin runtime recovery surface |
| Risk | MEDIUM — admin-only routes. Public routes unaffected. |
| Prerequisite | ATOM-B deployed and validated; `system_control_actions` table confirmed in DB (from migration 20260505090000) |
| Coupling | STRONG — `lib/system/shos.js` is required by 7 routes. All 7 + 2 UI files MUST deploy together. |
| Rollback | Single `git revert` commit. Admin system routes revert to P1 behavior. `system_control_actions` table remains (harmless). |
| Blast radius | 7 admin API routes + 2 admin UI pages. Public routes and QStash crons unaffected. |

### Files — Must Deploy Together

| File | Type | Dependency |
|---|---|---|
| `lib/system/shos.js` | New library | Requires `system_control_actions` table |
| `features/admin/system/ShosControlCenter.jsx` | New UI component | Requires `app/api/admin/system/shos/route.js` (via fetch) |
| `app/api/admin/system/shos/route.js` | New API route | Requires `lib/system/shos.js` |
| `app/api/admin/delivery-logs/route.js` | Modified route | Requires `lib/system/shos.js` |
| `app/api/admin/dlq/route.js` | Modified route | Requires `lib/system/shos.js` |
| `app/api/admin/observability/route.js` | Modified route | Requires `lib/system/shos.js` |
| `app/api/admin/queue/route.js` | Modified route | Requires `lib/system/shos.js` |
| `app/api/admin/system/health/route.js` | Modified route | Requires `lib/system/shos.js` |
| `app/api/admin/system/route.js` | Modified route | Requires `lib/system/shos.js` |
| `app/api/admin/system-health/route.js` | Modified route | Requires `lib/system/shos.js` |
| `app/admin/system/page.js` | Modified UI page | Requires `ShosControlCenter.jsx` |
| `supabase/migrations/20260505090000_shos_operator_control.sql` | Migration | Already in ATOM-G, listed for dependency clarity |

### Pre-Deploy Validation Required
- [ ] Confirm `system_control_actions` table exists with expected columns
- [ ] Read `lib/system/shos.js` — verify no direct DB mutation outside expected action set
- [ ] Confirm SHOS routes have `withAdminAuth` wrapping

### Validation After Deploy
- [ ] `GET /api/admin/system/shos` → returns snapshot (no 500)
- [ ] `GET /api/admin/queue` → returns data (not build failure)
- [ ] Admin system page loads SHOS UI
- [ ] `GET /api/admin/system/health` → returns health status

---

## ATOM-D: Prompt Engine System (7 files + migration)

| Attribute | Value |
|---|---|
| Purpose | Deploy AI prompt engine — content generation for pagegen, blog, CCC |
| Risk | MEDIUM — content generation only. BUT: `pagegen/route.js` is a QStash-triggered worker — deployment activates content generation path. Only safe when AI strategy resolved. |
| Prerequisite | ATOM-C deployed; `ai_enabled=false` governance confirmed in production (via ATOM-A); DB columns confirmed from migration 20260507020000 |
| HARD CONSTRAINT | Do NOT deploy ATOM-D while `ai_enabled=false` unless all AI calls are gated by the `ai_enabled` check in `promptEngine.js` itself. Verify before deploying. |
| Coupling | `lib/ai/promptEngine.js` required by 5 routes. All 5 + template lib MUST deploy together. |
| Rollback | Single `git revert`. Content generation reverts to direct Gemini calls (P1 behavior). With `ai_enabled=false`, this is safe. |
| Blast radius | `pagegen` QStash worker + 4 CCC/blog admin routes. Public routes unaffected. |

### Files — Must Deploy Together

| File | Type | Dependency |
|---|---|---|
| `lib/ai/promptEngine.js` | New library | Requires `prompt_templates` table + DB columns |
| `lib/ai/promptTemplates.js` | Modified library | Seed templates — updated alongside promptEngine |
| `app/api/jobs/pagegen/route.js` | Modified worker route | Requires `lib/ai/promptEngine.js` — QStash-triggered |
| `app/api/admin/blog/route.js` | Modified route | Requires `lib/ai/promptEngine.js` |
| `app/api/admin/ccc/bulk/[id]/route.js` | Modified route | Requires `lib/ai/promptEngine.js` |
| `app/api/admin/ccc/bulk/route.js` | Modified route | Requires `lib/ai/promptEngine.js` |
| `app/api/admin/ccc/generate-single/route.js` | Modified route | Requires `lib/ai/promptEngine.js` |
| `supabase/migrations/20260507020000_p2_4_ai_prompt_engine.sql` | Migration | Already in ATOM-G, listed for dependency clarity |

### Pre-Deploy Validation Required
- [ ] Confirm `content_drafts.prompt_inputs` column exists
- [ ] Confirm `blog_posts.prompt_template_id` column exists  
- [ ] Confirm `bulk_generation_jobs.prompt_template_id` column exists
- [ ] Confirm `prompt_templates` table exists with seed data
- [ ] Verify `promptEngine.js` checks `ai_enabled` internally before calling Gemini
- [ ] Decide: is AI strategy ready? (Gemini quota status — currently exhausted)

---

## ATOM-E: CMS Resolver (4 files + migration)

| Attribute | Value |
|---|---|
| Purpose | Deploy unified CMS route resolver — replaces inline Supabase query in catch-all page |
| Risk | HIGH — `app/[...slug]/page.js` handles ALL public page loads. Any regression = all public pages 404. |
| Prerequisite | ALL prior ATOMs deployed and stable (ATOM-A through ATOM-D); DB columns confirmed from migration 20260507010000; Extensive testing of resolver logic |
| Coupling | STRONG — `resolveRoute.js` imports `resolveCmsRoute.js`. Both must deploy with `app/[...slug]/page.js`. |
| MUST BE LAST | Deploy this AFTER all other subsystems are stable. This is the highest blast radius deployment. |
| Rollback | Single `git revert`. Public pages immediately restore to P1 inline query behavior. Vercel redeploy ~2 min. FAST RECOVERY. |
| Blast radius | ALL public pages. Total site downtime if deployed with broken resolver. |

### Files — Must Deploy Together

| File | Type | Dependency |
|---|---|---|
| `lib/cms/resolveRoute.js` | New library | Imports `resolveCmsRoute.js`; requires `custom_pages`, `page_index`, `blog_posts` tables |
| `lib/cms/resolveCmsRoute.js` | New library | Supabase queries against CMS tables; requires migration 20260507010000 columns |
| `app/[...slug]/page.js` | Modified catch-all page | Imports `resolveRoute.js` — REPLACES existing inline logic |
| `app/api/admin/cms/structure/route.js` | New API route | Requires same CMS tables (deploy with ATOM-E for consistency) |
| `supabase/migrations/20260507010000_p2_2_cms_data_structure.sql` | Migration | Already in ATOM-G, listed for dependency clarity |

### Pre-Deploy Validation Required (MANDATORY)
- [ ] Confirm `custom_pages.full_slug` column exists
- [ ] Confirm `page_index` table has required routing columns
- [ ] Read `resolveRoute.js` end-to-end — verify fallback behavior on 404
- [ ] Read `resolveCmsRoute.js` — verify Supabase query correctness
- [ ] Test resolver logic locally against staging DB
- [ ] Confirm rollback plan is ready (have revert commit staged in advance)
- [ ] Confirm Vercel deploy preview tested before merging to production

### Validation After Deploy
- [ ] Homepage (/) loads correctly
- [ ] Known blog post URL loads correctly
- [ ] Known static page URL loads correctly
- [ ] Unknown URL returns proper 404 (not 500)
- [ ] CMS structure API `GET /api/admin/cms/structure` returns data

---

## ATOM-F: CCC Content UI (2 files)

| Attribute | Value |
|---|---|
| Purpose | Deploy Content Command Center inventory UI component |
| Risk | LOW — admin page only. Public routes unaffected. |
| Prerequisite | ATOM-C deployed (SHOS provides operator surface if issues arise). `app/admin/ccc/page.js` and `ContentInventoryContent.jsx` must deploy together. |
| Coupling | `app/admin/ccc/page.js` imports `ContentInventoryContent.jsx`. Both must deploy together. |
| Rollback | Single `git revert`. CCC page reverts to P1 version. |
| Blast radius | Admin CCC page only. |

### Files — Must Deploy Together

| File | Type | Notes |
|---|---|---|
| `app/admin/ccc/page.js` | Modified admin page | Imports `ContentInventoryContent.jsx` |
| `features/admin/content/ContentInventoryContent.jsx` | New UI component | Required by `app/admin/ccc/page.js` |

### Validation After Deploy
- [ ] Admin CCC page loads without error
- [ ] Content inventory table renders
- [ ] Bulk actions still functional

---

## ATOM-H: Safe Admin UI Shadow Batch (~26 files)

| Attribute | Value |
|---|---|
| Purpose | Deploy all admin UI/API modifications that have NO untracked imports |
| Risk | LOW — all files have only tracked imports. These are UI/UX improvements. |
| Prerequisite | ATOM-A deployed (governance); ATOM-B deployed (auth). No other blockers. |
| Coupling | NONE — all files in this group are independent. Can deploy as one batch or individually. |
| Rollback | Single `git revert` of commit. |
| Blast radius | Admin pages and admin API routes only. |

### Files

| Category | Files |
|---|---|
| Admin UI pages (safe shadow) | `app/admin/blog/page.js`, `app/admin/ccc/bulk/page.js`, `app/admin/ccc/drafts/[id]/page.js`, `app/admin/ccc/drafts/page.js`, `app/admin/crm/page.js`, `app/admin/resources/page.js`, `app/admin/settings/page.js`, `app/admin/system/alerts/page.js`, `app/admin/system/dlq/page.js` |
| Admin route registry | `app/admin/routeRegistry.js` |
| Admin API routes (safe shadow) | `app/api/admin/actions/route.js`, `app/api/admin/ccc/drafts/[id]/route.js`, `app/api/admin/ccc/drafts/route.js`, `app/api/admin/config/route.js`, `app/api/admin/errors/route.js`, `app/api/admin/media/route.js`, `app/api/admin/media/upload/route.js`, `app/api/admin/pages/[id]/route.js`, `app/api/admin/pages/route.js`, `app/api/admin/resources/route.js` |
| Feature components | `features/admin/ai/AiBlogContent.jsx`, `features/admin/media/Media.css`, `features/admin/media/MediaContent.jsx`, `features/admin/pages/PageEditorContent.jsx`, `features/admin/pages/PagesContent.jsx`, `features/admin/system/ObservabilityContent.jsx` |
| Lib utilities (safe shadow) | `lib/ai/promptTemplates.js` (if not in ATOM-D), `lib/featureFlags.js`, `lib/queue/deliveryTruth.js`, `lib/system/systemHealth.js` |
| Public pages (safe shadow) | `app/pages/[slug]/page.js`, `app/resources/page.js` |
| Config | `.gitignore` |

> **Note:** `lib/ai/promptTemplates.js` is listed in both ATOM-D and ATOM-H. If ATOM-D deploys first, exclude from ATOM-H. If ATOM-H deploys first, include it — it has no untracked imports and the change is safe.

---

## ATOM-I: Worker Routes Pair (2 files — Active Production Routes)

| Attribute | Value |
|---|---|
| Purpose | Deploy P2 modifications to active CRM sync workers |
| Risk | MEDIUM — these routes are EXECUTING in production. Errors here break CRM sync. |
| Prerequisite | CRM compatibility manually verified (diff reviewed for Zoho API contract changes) |
| Coupling | These routes are independent of each other but both touch CRM sync. Safer to deploy together. |
| Rollback | Single `git revert`. Workers revert to P1 CRM behavior. |
| Blast radius | CRM sync workers. Zoho leads may not sync until fixed. |

### Files

| File | Notes |
|---|---|
| `app/api/workers/lead-sync/route.js` | ACTIVE QStash worker — lead data sync to Zoho |
| `app/api/workers/contact-sync/route.js` | ACTIVE QStash worker — contact data sync to Zoho |

### Pre-Deploy Validation Required
- [ ] Read `git diff HEAD app/api/workers/lead-sync/route.js` — confirm no Zoho API contract changes
- [ ] Read `git diff HEAD app/api/workers/contact-sync/route.js` — confirm no sync logic regressions
- [ ] Confirm error handling preserved (500 → Zoho DLQ)

---

## LOCAL-ONLY: Files That Must Never Deploy

| File | Reason |
|---|---|
| `docs/audits/*.md` | Audit documentation — no runtime function |
| `docs/fixes/*.md` | Fix documentation — no runtime function |
| `docs/tests/*.md` | Test documentation — no runtime function |
| `docs/INDEX.md`, `docs/CONTENT_COMMAND_CENTER.md` | Project management — no runtime function |
| `scripts/rc1b1_ai_pause.mjs` | One-time utility — already executed |
| `scripts/rc1c_register_scheduled_publish.mjs` | One-time utility — already executed (idempotent) |
| `scripts/_forensic_check.mjs` | Forensic audit utility — no production function |
| `scripts/live_status_check.mjs` | Local status check utility — no production function |

---

## Deployment Group Summary

| ATOM | Files | Risk | Prerequisite | Phase |
|---|---|---|---|---|
| ATOM-G | 5 migrations | NONE (git only) | None | RC-2B |
| ATOM-A | 3 routes | LOW | ATOM-G | RC-2B |
| ATOM-B | 2 auth files | MEDIUM | ATOM-A | RC-2B |
| ATOM-C | 12 files | MEDIUM | ATOM-B + DB verify | RC-2C |
| ATOM-F | 2 files | LOW | ATOM-C | RC-2C |
| ATOM-D | 7 files | MEDIUM | ATOM-C + AI strategy | RC-2C (deferred) |
| ATOM-E | 4 files | HIGH | All prior + extensive test | RC-2C (last) |
| ATOM-H | ~26 files | LOW | ATOM-B | RC-2C |
| ATOM-I | 2 files | MEDIUM | CRM verify | RC-2C |
| LOCAL-ONLY | ~60+ docs/scripts | N/A | Never deploy | RC-2D (archive) |
