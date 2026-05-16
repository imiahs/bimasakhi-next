# RC-1D: Repository Truth — Full Classification Matrix

| Field | Value |
|---|---|
| Phase | RC-1D |
| Date | 2026-05-14 |
| Production commit | `794013e` (2026-05-04) |
| Classification method | Import chain tracing + phase attribution + git status cross-reference |
| Evidence basis | Live git status, source file imports, forensic audit cross-reference |

---

## Classification Legend

| Code | Meaning |
|---|---|
| `EXISTS` | File present on disk |
| `DEPLOYED` | File committed and pushed to production at `794013e` |
| `ACTIVE` | Actively handles production traffic |
| `EXECUTING` | Currently running / being called at runtime |
| `SHADOW` | Deployed base, but local modifications NOT deployed |
| `LOCAL_ONLY` | File exists locally only — never committed, never deployed |
| `DEAD_CODE` | Exists, committed, but unreachable / never called |
| `DECORATIVE` | Committed and present but has no operational effect |
| `AUDIT_ONLY` | Documentation, logs, snapshots — not runtime |
| `EXPERIMENTAL` | Not wired to any production path |
| `RUNTIME_CRITICAL` | Failure causes service degradation or build failure |
| `IMPORT_BLOCKER` | Modification imports an untracked file — build fails if deployed alone |
| `ORPHANED_MIGRATION` | Applied to DB, not committed to git |

---

## SECTION 1: MODIFIED TRACKED FILES — Full Classification

### 1A. Public-Facing Page Routes

| File | DEPLOYED | SHADOW | Classification | Evidence |
|---|---|---|---|---|
| `app/[...slug]/page.js` | ✅ P1 version | ✅ P2 local | **SHADOW + IMPORT_BLOCKER** | Imports `lib/cms/resolveRoute` (untracked). Production runs inline Supabase queries. |
| `app/pages/[slug]/page.js` | ✅ | ✅ | **SHADOW** | Modified locally; production uses deployed version. No unresolved imports detected. |
| `app/resources/page.js` | ✅ | ✅ | **SHADOW** | Modified locally. Production uses deployed version. |

### 1B. Admin UI Pages

| File | DEPLOYED | SHADOW | Classification | Evidence |
|---|---|---|---|---|
| `app/admin/blog/page.js` | ✅ P1 | ✅ | **SHADOW** | Local modifications; no untracked imports detected. |
| `app/admin/ccc/bulk/page.js` | ✅ P1 | ✅ | **SHADOW** | Local modifications; no untracked imports. |
| `app/admin/ccc/drafts/[id]/page.js` | ✅ P1 | ✅ | **SHADOW** | Local modifications. |
| `app/admin/ccc/drafts/page.js` | ✅ P1 | ✅ | **SHADOW** | Local modifications. |
| `app/admin/ccc/page.js` | ✅ P1 | ✅ | **SHADOW + IMPORT_BLOCKER** | Imports `features/admin/content/ContentInventoryContent` (untracked). |
| `app/admin/crm/page.js` | ✅ P1 | ✅ | **SHADOW** | Local modifications; no untracked imports. |
| `app/admin/resources/page.js` | ✅ P1 | ✅ | **SHADOW** | Local modifications. |
| `app/admin/routeRegistry.js` | ✅ P1 | ✅ | **SHADOW** | Route registry modified to include P2/RC routes. |
| `app/admin/settings/page.js` | ✅ P1 | ✅ | **SHADOW** | Local modifications. |
| `app/admin/system/alerts/page.js` | ✅ P1 | ✅ | **SHADOW** | Local modifications. |
| `app/admin/system/dlq/page.js` | ✅ P1 | ✅ | **SHADOW** | Local modifications. |
| `app/admin/system/page.js` | ✅ P1 | ✅ | **SHADOW + IMPORT_BLOCKER** | Imports `features/admin/system/ShosControlCenter` (untracked). |

### 1C. Admin API Routes

| File | DEPLOYED | RC-1B | Classification | Evidence |
|---|---|---|---|---|
| `app/api/admin/actions/route.js` | ✅ P1 | — | **SHADOW** | Modified; no untracked imports. |
| `app/api/admin/ai/recruiter/route.js` | ✅ P1 | ✅ gate added | **SHADOW (RC-1B gate LOCAL ONLY)** | RC-1B added `ai_enabled` gate. Gate NOT deployed. Production = no gate. |
| `app/api/admin/ai/route.js` | ✅ P1 | ✅ gate added | **SHADOW (RC-1B gate LOCAL ONLY)** | RC-1B added `ai_enabled` gate. Production = no gate. |
| `app/api/admin/blog/route.js` | ✅ P1 | ✅ gate added | **SHADOW + IMPORT_BLOCKER (RC-1B gate LOCAL ONLY)** | RC-1B gate added + imports `lib/ai/promptEngine` (untracked). |
| `app/api/admin/ccc/bulk/[id]/route.js` | ✅ P1 | — | **SHADOW + IMPORT_BLOCKER** | Imports `lib/ai/promptEngine` (untracked). |
| `app/api/admin/ccc/bulk/route.js` | ✅ P1 | — | **SHADOW + IMPORT_BLOCKER** | Imports `lib/ai/promptEngine` (untracked). |
| `app/api/admin/ccc/drafts/[id]/route.js` | ✅ P1 | — | **SHADOW** | Modified; no untracked imports detected. |
| `app/api/admin/ccc/drafts/route.js` | ✅ P1 | — | **SHADOW** | Modified. |
| `app/api/admin/ccc/generate-single/route.js` | ✅ P1 | — | **SHADOW + IMPORT_BLOCKER** | Imports `lib/ai/promptEngine` (untracked). |
| `app/api/admin/config/route.js` | ✅ P1 | — | **DEPLOYED + EXECUTING + RUNTIME_CRITICAL** | Control plane endpoint. Accepts config mutations. In active use (used by RC-1B.1 script). |
| `app/api/admin/delivery-logs/route.js` | ✅ P1 | — | **SHADOW + IMPORT_BLOCKER** | Imports `lib/system/shos` (untracked). |
| `app/api/admin/dlq/route.js` | ✅ P1 | — | **SHADOW + IMPORT_BLOCKER** | Imports `lib/system/shos` (untracked). |
| `app/api/admin/errors/route.js` | ✅ P1 | — | **SHADOW** | Modified; no untracked imports. |
| `app/api/admin/media/route.js` | ✅ P1 | — | **SHADOW** | Media incomplete (30% per FEATURE_COMPLETENESS_SCORECARD). |
| `app/api/admin/media/upload/route.js` | ✅ P1 | — | **SHADOW** | Deployed base; media pipeline incomplete. |
| `app/api/admin/observability/route.js` | ✅ P1 | — | **SHADOW + IMPORT_BLOCKER** | Imports `lib/system/shos` (untracked). |
| `app/api/admin/pages/[id]/route.js` | ✅ P1 | — | **SHADOW** | Modified. |
| `app/api/admin/pages/route.js` | ✅ P1 | — | **SHADOW** | Modified. |
| `app/api/admin/queue/route.js` | ✅ P1 | — | **SHADOW + IMPORT_BLOCKER** | Imports `lib/system/shos` (untracked). |
| `app/api/admin/resources/route.js` | ✅ P1 | — | **SHADOW** | Modified. |
| `app/api/admin/seo/analyze/route.js` | ✅ P1 | ✅ gate added | **SHADOW (RC-1B gate LOCAL ONLY)** | RC-1B `ai_enabled` gate NOT deployed. Production = no gate. |
| `app/api/admin/system-health/route.js` | ✅ P1 | ✅ probe added | **SHADOW (RC-1B probe LOCAL ONLY)** | RC-1B added `probeGeminiProvider`. Production still shows static status. |
| `app/api/admin/system/health/route.js` | ✅ P1 | — | **SHADOW + IMPORT_BLOCKER** | Imports `lib/system/shos` (untracked). |
| `app/api/admin/system/route.js` | ✅ P1 | — | **SHADOW + IMPORT_BLOCKER** | Imports `lib/system/shos` (untracked). |

### 1D. Job and Worker Routes

| File | DEPLOYED | Classification | Evidence |
|---|---|---|---|
| `app/api/jobs/pagegen/route.js` | ✅ P1 | **SHADOW + IMPORT_BLOCKER (RC-1B gate LOCAL ONLY)** | RC-1B `ai_enabled` gate NOT deployed. Also imports `lib/ai/promptEngine` (untracked). Production = no gate, no promptEngine. |
| `app/api/workers/contact-sync/route.js` | ✅ P1 | **SHADOW + ACTIVE** | Modified locally; production version actively handles CRM contact sync. |
| `app/api/workers/lead-sync/route.js` | ✅ P1 | **SHADOW + ACTIVE** | Modified locally; production version handles lead CRM sync. Both workers confirmed executing (QStash delivery confirmed May 13). |

### 1E. Frontend Components and Libraries

| File | DEPLOYED | Classification | Evidence |
|---|---|---|---|
| `features/admin/ai/AiBlogContent.jsx` | ✅ P1 | **SHADOW** | AI blog UI. Locally modified; admin AI generation blocked by `ai_enabled=false` in local code (but gate not deployed). |
| `features/admin/media/Media.css` | ✅ P1 | **SHADOW** | Style-only change. |
| `features/admin/media/MediaContent.jsx` | ✅ P1 | **SHADOW** | Media UI. Media pipeline 30% complete per forensics. |
| `features/admin/pages/PageEditorContent.jsx` | ✅ P1 | **SHADOW** | Page editor UI. |
| `features/admin/pages/PagesContent.jsx` | ✅ P1 | **SHADOW** | Pages list UI. |
| `features/admin/system/ObservabilityContent.jsx` | ✅ P1 | **SHADOW** | Observability UI. SHOS-adjacent. |
| `lib/ai/promptTemplates.js` | ✅ P2 | **SHADOW** | Prompt templates. Modified locally. |
| `lib/auth/withAdminAuth.js` | ✅ P1 | **SHADOW + COUPLED_PAIR** | Coupled with `middleware.js`. Both must deploy atomically. RC-1B changes included. |
| `lib/featureFlags.js` | ✅ P1 | **SHADOW** | Feature flags library. Local changes. |
| `lib/queue/deliveryTruth.js` | ✅ P1 | **SHADOW** | Delivery truth tracking. SHOS-adjacent. |
| `lib/system/systemHealth.js` | ✅ P1 | **SHADOW** | System health check library. Modified; cron definitions. |
| `middleware.js` | ✅ P1 | **SHADOW + COUPLED_PAIR** | Coupled with `lib/auth/withAdminAuth.js`. Auth route protection logic. |

### 1F. Config and Docs

| File | Classification | Evidence |
|---|---|---|
| `.gitignore` | **SHADOW** | Minor additions (e.g., `next-build.log`). No runtime impact. |
| `docs/CONTENT_COMMAND_CENTER.md` | **SHADOW + AUDIT_ONLY** | Documentation only. Updated by RC phases. |
| `docs/INDEX.md` | **SHADOW + AUDIT_ONLY** | Documentation only. Updated by RC phases. |

---

## SECTION 2: DELETED TRACKED FILES — Classification

| Category | Count | Classification | Evidence |
|---|---|---|---|
| `scripts/audit/results/*.json` | 86 | **AUDIT_ONLY, SAFE_DELETE** | Timestamped JSON audit result files. No runtime dependency. Deleted locally, present in git history. Commits may reference these files in messages. |

---

## SECTION 3: UNTRACKED FILES — Classification

### 3A. Untracked Code — New Runtime Systems (LOCAL_ONLY)

| File | Classification | Phase | Evidence |
|---|---|---|---|
| `app/api/admin/cms/structure/route.js` | **LOCAL_ONLY + EXPERIMENTAL** | P2.2 | CMS structure API. Never deployed. Imports `withAdminAuth` (deployed). Self-contained. |
| `app/api/admin/system/shos/route.js` | **LOCAL_ONLY + RUNTIME_CRITICAL (if deployed)** | P2.3 SHOS | SHOS API endpoint. Never deployed. Imports `lib/system/shos` (also untracked). |
| `features/admin/content/ContentInventoryContent.jsx` | **LOCAL_ONLY + IMPORT_BLOCKER** | P0.4/P1 | Imported by `app/admin/ccc/page.js` (deployed base). MUST deploy together. |
| `features/admin/system/ShosControlCenter.jsx` | **LOCAL_ONLY + IMPORT_BLOCKER** | P2.3 SHOS | Imported by `app/admin/system/page.js` (deployed base). MUST deploy together. |
| `lib/ai/promptEngine.js` | **LOCAL_ONLY + IMPORT_BLOCKER** | P2.4 | Imported by 5 routes: `pagegen`, `ccc/bulk/[id]`, `ccc/bulk`, `ccc/generate-single`, `blog`. MUST deploy before those routes. |
| `lib/cms/resolveCmsRoute.js` | **LOCAL_ONLY + RUNTIME_CRITICAL (if deployed)** | P2.2 | CMS route resolver. Imported by `lib/cms/resolveRoute.js`. Part of CMS resolver chain. |
| `lib/cms/resolveRoute.js` | **LOCAL_ONLY + IMPORT_BLOCKER** | P2.2 | Imported by `app/[...slug]/page.js` (deployed base). MUST deploy before catch-all route. |
| `lib/system/shos.js` | **LOCAL_ONLY + IMPORT_BLOCKER** | P2.3 SHOS | Imported by 7 admin routes: `delivery-logs`, `dlq`, `observability`, `queue`, `system`, `system/health`, `system-health`. MUST deploy before those routes. |

### 3B. Untracked Scripts — Local Utility Only

| File | Classification | Evidence |
|---|---|---|
| `scripts/_forensic_check.mjs` | **LOCAL_ONLY + AUDIT_ONLY** | Forensic probe script. Runs locally, reads DB. Never queued or cron-registered. |
| `scripts/live_status_check.mjs` | **LOCAL_ONLY + AUDIT_ONLY** | Live status check. Reads external systems. No runtime dependency. |
| `scripts/rc1b1_ai_pause.mjs` | **LOCAL_ONLY + EXECUTED (completed)** | RC-1B.1 execution script. Already ran successfully. One-time use. |
| `scripts/rc1c_register_scheduled_publish.mjs` | **LOCAL_ONLY + EXECUTED (completed, idempotent)** | RC-1C execution script. Already ran. |

### 3C. Untracked Migrations — ORPHANED

| File | Classification | Applied to DB | Risk |
|---|---|---|---|
| `20260504123000_queue_running_steady_state.sql` | **ORPHANED_MIGRATION** | ✅ CONFIRMED (queue_paused=false is live state) | MEDIUM — Schema divergence if DB reset |
| `20260504150000_p0_4_content_inventory_completion.sql` | **ORPHANED_MIGRATION** | ✅ LIKELY (blog_posts columns referenced by admin UI) | MEDIUM |
| `20260505090000_shos_operator_control.sql` | **ORPHANED_MIGRATION** | ✅ LIKELY (system_control_actions table; SHOS reads it) | HIGH — SHOS code requires this table |
| `20260507010000_p2_2_cms_data_structure.sql` | **ORPHANED_MIGRATION** | ✅ LIKELY (additive columns; P2.2 code uses them) | MEDIUM |
| `20260507020000_p2_4_ai_prompt_engine.sql` | **ORPHANED_MIGRATION** | ✅ LIKELY (prompt columns on blog_posts/content_drafts) | MEDIUM |

**Risk:** All 5 migrations are additive (IF NOT EXISTS). Fresh DB reset without these would silently break P2 features. Migrations MUST be committed before deployment.

### 3D. Untracked Documentation — AUDIT_ONLY

| Category | Count | Classification |
|---|---|---|
| `docs/audits/RC-1*` files | 15 | **LOCAL_ONLY + AUDIT_ONLY** |
| `docs/audits/` general forensic files | 13 | **LOCAL_ONLY + AUDIT_ONLY** |
| `docs/fixes/` files | 8 | **LOCAL_ONLY + AUDIT_ONLY** |
| `docs/tests/` files | 8 | **LOCAL_ONLY + AUDIT_ONLY** |

All documentation is LOCAL_ONLY. None has runtime dependency.

---

## SECTION 4: DANGEROUS MIXED STATES

### MST-01: AI Governance Gate NOT in Production

| Aspect | Production (deployed) | Local (undeployed) |
|---|---|---|
| `pagegen/route.js` | No `ai_enabled` check | RC-1B gate present |
| `admin/ai/route.js` | No `ai_enabled` check | RC-1B gate present |
| `admin/blog/route.js` | No `ai_enabled` check | RC-1B gate present |
| `admin/seo/analyze/route.js` | No `ai_enabled` check | RC-1B gate present |
| `admin/ai/recruiter/route.js` | No `ai_enabled` check | RC-1B gate present |
| DB `ai_enabled` flag | `false` (set RC-1B.1) | N/A |

**Dangerous state:** Production code does NOT respect `ai_enabled=false`. The DB flag is irrelevant to production behavior. If a QStash message triggers pagegen in production, it will attempt Gemini calls (getting 429). The flag provides false assurance.

**Mitigating factor:** pagegen is only triggered by QStash messages. No cron exists for pagegen. If no messages are published to pagegen, production exposure is zero. The queue is not paused (`queue_paused=false`) but nobody appears to be publishing to pagegen.

### MST-02: SHOS Architecture Partially Deployed

| Component | Production | Local |
|---|---|---|
| `lib/system/shos.js` | ❌ NOT DEPLOYED | ✅ Present |
| `app/api/admin/system/shos/route.js` | ❌ NOT DEPLOYED | ✅ Present |
| All 7 routes that import shos | ✅ DEPLOYED (base) | Modified to import shos |

**Dangerous state:** Deploying the 7 modified admin routes without `lib/system/shos.js` causes build failure. Deploying `shos.js` without the `system_control_actions` table migration causes runtime failure. Three-way atomic dependency: migration + `shos.js` + 7 routes.

### MST-03: CMS Resolver Chain Broken

| Component | Production | Local |
|---|---|---|
| `app/[...slug]/page.js` | ✅ P1 inline queries (working) | Modified to import `resolveRoute` |
| `lib/cms/resolveRoute.js` | ❌ NOT DEPLOYED | ✅ Present |
| `lib/cms/resolveCmsRoute.js` | ❌ NOT DEPLOYED | ✅ Present |

**Dangerous state:** Deploying local `app/[...slug]/page.js` without `lib/cms/resolveRoute.js` → **build failure, all public pages 404**.

### MST-04: promptEngine Dependency Across 5 Routes

| Component | Production | Local |
|---|---|---|
| `lib/ai/promptEngine.js` | ❌ NOT DEPLOYED | ✅ Present |
| `app/api/jobs/pagegen/route.js` | ✅ DEPLOYED (no promptEngine) | Modified to import promptEngine |
| 4 admin CCC/blog routes | ✅ DEPLOYED (no promptEngine) | Modified to import promptEngine |

**Dangerous state:** If any of the 5 routes deploy without `lib/ai/promptEngine.js`, build fails.

### MST-05: Auth Pair Coupling

| Component | Production | Local |
|---|---|---|
| `middleware.js` | ✅ P1 working | Modified |
| `lib/auth/withAdminAuth.js` | ✅ P1 working | Modified (RC-1B changes) |

**Dangerous state:** Deploying one without the other may break admin authentication if auth logic changed between them. Must deploy atomically.

---

## SECTION 5: RUNTIME AMBIGUITY ZONES

### RAZ-01: Which Routes Are Actually Active in Production?

**Confirmed active in production (executing regularly):**
- `app/api/workers/lead-sync/route.js` — CRM lead sync confirmed May 13
- `app/api/workers/contact-sync/route.js` — CRM contact sync
- `app/api/jobs/event-retry/route.js` — Fires every 5 min (QStash cron)
- `app/api/jobs/reconciliation/route.js` — Fires every 30 min
- `app/api/jobs/alert-scan/route.js` — Fires every 5 min
- `app/api/jobs/vendor-health-check/route.js` — Fires every 5 min
- `app/api/jobs/scheduled-publish/route.js` — Fires hourly
- `app/api/jobs/morning-brief/route.js` — Fires 02:00 UTC daily
- `app/[...slug]/page.js` — Every public page load

**Uncertain (deployed, traffic unknown):**
- `app/api/admin/*` routes — Admin UI dependent; unknown if admin is actively used
- `app/api/jobs/pagegen/route.js` — Only fires on QStash message; no cron; may be dormant

### RAZ-02: Orphaned Migration Applied Status

5 migrations are untracked but their content suggests they were applied (DB state reflects their changes). However, no runtime verification was done in this phase. Status is LIKELY_APPLIED based on indirect evidence.

### RAZ-03: SHOS System Completeness

SHOS (`lib/system/shos.js` + `ShosControlCenter.jsx` + API route) is locally complete but its DB dependency (`system_control_actions` table from migration `20260505090000`) cannot be confirmed as applied without a direct DB schema query.
