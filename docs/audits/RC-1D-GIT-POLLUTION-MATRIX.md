# RC-1D: Git Pollution Matrix

| Field | Value |
|---|---|
| Phase | RC-1D |
| Date | 2026-05-14 |
| Scope | Classification of all non-deployed local content into pollution categories |
| Constraint | Read-only — no files moved, deleted, or renamed |

---

> **Purpose:** Make the distinction between "what should be deployed", "what is audit-only", and "what is genuinely polluting the repository" operationally deterministic.

---

## Pollution Category Legend

| Category | Description |
|---|---|
| `DEPLOYABLE_RUNTIME` | Production-ready code files that must deploy to activate a feature |
| `UNDEPLOYED_RUNTIME` | Runtime code that exists locally but has not deployed |
| `AUDIT_DOC` | Documentation, snapshots, forensic analysis — no runtime dependency |
| `GENERATED_ARTIFACT` | Machine-generated output (JSON results, logs) |
| `TEMP_SCRIPT` | One-time utility scripts — already executed or ephemeral |
| `STALE_EXPERIMENT` | Code created but never wired to any route or runtime path |
| `SAFE_ARCHIVAL` | Could be committed to git-archive or stash if desired |
| `DANGEROUS_UNRESOLVED` | Mixed state — partially deployed, import chain incomplete |
| `ORPHANED_MIGRATION` | Applied to DB but not committed to git |

---

## Matrix: Modified Tracked Files (57 files)

### Group: Governance Patches (RC-1B — LOCAL ONLY)

| File | Pollution Category | Risk if Ignored |
|---|---|---|
| `app/api/admin/ai/recruiter/route.js` | `UNDEPLOYED_RUNTIME` | Governance gap — AI admin runs without `ai_enabled` check in production |
| `app/api/admin/ai/route.js` | `UNDEPLOYED_RUNTIME` | Same governance gap |
| `app/api/admin/seo/analyze/route.js` | `UNDEPLOYED_RUNTIME` | Same |
| `app/api/admin/system-health/route.js` | `UNDEPLOYED_RUNTIME` | Inaccurate health status in production admin |
| `app/api/admin/blog/route.js` | `DANGEROUS_UNRESOLVED` | Has governance gate + promptEngine import. Cannot deploy without promptEngine |
| `app/api/jobs/pagegen/route.js` | `DANGEROUS_UNRESOLVED` | Has governance gate + promptEngine import. Most critical: if pagegen fires in production, it calls Gemini (no gate) |

### Group: SHOS Integration (P2.3 — LOCAL ONLY)

| File | Pollution Category | Risk |
|---|---|---|
| `app/api/admin/delivery-logs/route.js` | `DANGEROUS_UNRESOLVED` | Imports `lib/system/shos` (untracked) |
| `app/api/admin/dlq/route.js` | `DANGEROUS_UNRESOLVED` | Same |
| `app/api/admin/observability/route.js` | `DANGEROUS_UNRESOLVED` | Same |
| `app/api/admin/queue/route.js` | `DANGEROUS_UNRESOLVED` | Same |
| `app/api/admin/system/health/route.js` | `DANGEROUS_UNRESOLVED` | Same |
| `app/api/admin/system/route.js` | `DANGEROUS_UNRESOLVED` | Same |
| `app/admin/system/page.js` | `DANGEROUS_UNRESOLVED` | Imports `ShosControlCenter` (untracked) |

### Group: Prompt Engine Integration (P2.4 — LOCAL ONLY)

| File | Pollution Category | Risk |
|---|---|---|
| `app/api/admin/ccc/bulk/[id]/route.js` | `DANGEROUS_UNRESOLVED` | Imports `lib/ai/promptEngine` (untracked) |
| `app/api/admin/ccc/bulk/route.js` | `DANGEROUS_UNRESOLVED` | Same |
| `app/api/admin/ccc/generate-single/route.js` | `DANGEROUS_UNRESOLVED` | Same |

### Group: CMS Resolver Integration (P2.2 — LOCAL ONLY)

| File | Pollution Category | Risk |
|---|---|---|
| `app/[...slug]/page.js` | `DANGEROUS_UNRESOLVED` | Imports `lib/cms/resolveRoute` (untracked). ALL public pages break if deployed alone |

### Group: CCC UI (P0.4 — LOCAL ONLY)

| File | Pollution Category | Risk |
|---|---|---|
| `app/admin/ccc/page.js` | `DANGEROUS_UNRESOLVED` | Imports `ContentInventoryContent` (untracked) |

### Group: Auth Pair (P2.1 — LOCAL ONLY)

| File | Pollution Category | Risk |
|---|---|---|
| `middleware.js` | `UNDEPLOYED_RUNTIME` | Safe if deployed with its pair. Risk if deployed alone |
| `lib/auth/withAdminAuth.js` | `UNDEPLOYED_RUNTIME` | Same — must deploy as coupled pair |

### Group: Active Worker Shadow (P1/P2 — SHADOW)

| File | Pollution Category | Risk |
|---|---|---|
| `app/api/workers/lead-sync/route.js` | `UNDEPLOYED_RUNTIME` | Active route. Local changes undeployed. Low risk (no untracked imports) |
| `app/api/workers/contact-sync/route.js` | `UNDEPLOYED_RUNTIME` | Same |

### Group: Admin UI Shadow (P1/P2 — SHADOW, no import blockers)

> These 20+ files are modified but have NO untracked imports detected. Safe divergence.

| Files | Pollution Category |
|---|---|
| `app/admin/blog/page.js`, `ccc/bulk/page.js`, `ccc/drafts/*/page.js`, `crm/page.js`, `resources/page.js`, `routeRegistry.js`, `settings/page.js`, `system/alerts/page.js`, `system/dlq/page.js` | `UNDEPLOYED_RUNTIME` (safe) |
| `app/api/admin/actions/route.js`, `ccc/drafts/*/route.js`, `config/route.js`, `errors/route.js`, `media/route.js`, `media/upload/route.js`, `pages/*/route.js`, `resources/route.js` | `UNDEPLOYED_RUNTIME` (safe) |
| `features/admin/ai/AiBlogContent.jsx`, `media/Media.css`, `media/MediaContent.jsx`, `pages/PageEditorContent.jsx`, `pages/PagesContent.jsx`, `system/ObservabilityContent.jsx` | `UNDEPLOYED_RUNTIME` (safe) |
| `lib/ai/promptTemplates.js`, `lib/featureFlags.js`, `lib/queue/deliveryTruth.js`, `lib/system/systemHealth.js` | `UNDEPLOYED_RUNTIME` (safe) |
| `app/pages/[slug]/page.js`, `app/resources/page.js` | `UNDEPLOYED_RUNTIME` (safe) |
| `.gitignore` | `UNDEPLOYED_RUNTIME` (safe, cosmetic) |
| `docs/CONTENT_COMMAND_CENTER.md`, `docs/INDEX.md` | `AUDIT_DOC` |

---

## Matrix: Deleted Tracked Files (86)

| Category | Files | Pollution Category | Action |
|---|---|---|---|
| `scripts/audit/results/*.json` | 86 timestamped JSON files | `GENERATED_ARTIFACT` | Already deleted locally. Safe to commit this deletion. No runtime dependency. |

---

## Matrix: Untracked Files

### New Code Files

| File | Pollution Category | Action Needed |
|---|---|---|
| `lib/cms/resolveRoute.js` | `DEPLOYABLE_RUNTIME` | Commit when ATOM-E deploys |
| `lib/cms/resolveCmsRoute.js` | `DEPLOYABLE_RUNTIME` | Commit with resolveRoute |
| `lib/ai/promptEngine.js` | `DEPLOYABLE_RUNTIME` | Commit when ATOM-D deploys |
| `lib/system/shos.js` | `DEPLOYABLE_RUNTIME` | Commit when ATOM-C deploys |
| `features/admin/content/ContentInventoryContent.jsx` | `DEPLOYABLE_RUNTIME` | Commit with `app/admin/ccc/page.js` |
| `features/admin/system/ShosControlCenter.jsx` | `DEPLOYABLE_RUNTIME` | Commit when ATOM-C deploys |
| `app/api/admin/cms/structure/route.js` | `DEPLOYABLE_RUNTIME` | Commit when CMS phase deploys |
| `app/api/admin/system/shos/route.js` | `DEPLOYABLE_RUNTIME` | Commit when ATOM-C deploys |

### Scripts

| File | Pollution Category | Notes |
|---|---|---|
| `scripts/_forensic_check.mjs` | `AUDIT_DOC` | Useful for future forensic probes; safe to commit or archive |
| `scripts/live_status_check.mjs` | `AUDIT_DOC` | Status check utility; safe to commit |
| `scripts/rc1b1_ai_pause.mjs` | `TEMP_SCRIPT` | One-time use, already executed. SAFE_ARCHIVAL candidate |
| `scripts/rc1c_register_scheduled_publish.mjs` | `TEMP_SCRIPT` | One-time use, already executed (idempotent). SAFE_ARCHIVAL candidate |

### Orphaned Migrations

| File | Pollution Category | Risk if Not Committed |
|---|---|---|
| `20260504123000_queue_running_steady_state.sql` | `ORPHANED_MIGRATION` | DB drift — supabase CLI migration history out of sync |
| `20260504150000_p0_4_content_inventory_completion.sql` | `ORPHANED_MIGRATION` | Same |
| `20260505090000_shos_operator_control.sql` | `ORPHANED_MIGRATION` | CRITICAL — SHOS runtime depends on `system_control_actions` table |
| `20260507010000_p2_2_cms_data_structure.sql` | `ORPHANED_MIGRATION` | Same DB drift risk |
| `20260507020000_p2_4_ai_prompt_engine.sql` | `ORPHANED_MIGRATION` | Prompt engine runtime depends on these columns |

### Documentation

| Category | Files | Pollution Category |
|---|---|---|
| RC-phase audit docs (RC-1A through RC-1D) | ~25 files | `AUDIT_DOC` — High value, commit when ready |
| General forensic audits | ~13 files | `AUDIT_DOC` — High value |
| Phase fix docs | ~8 files | `AUDIT_DOC` |
| Phase test docs | ~8 files | `AUDIT_DOC` |

---

## Summary: Pollution Severity Map

| Severity | Category | File Count |
|---|---|---|
| 🔴 CRITICAL | `DANGEROUS_UNRESOLVED` | 16 modified files (import blockers or governance gaps) |
| 🔴 CRITICAL | `ORPHANED_MIGRATION` | 5 migrations (DB/git drift) |
| 🟡 MEDIUM | `UNDEPLOYED_RUNTIME` (safe divergence) | ~34 modified files |
| 🟡 MEDIUM | `DEPLOYABLE_RUNTIME` (untracked code) | 8 new code files |
| 🟢 LOW | `GENERATED_ARTIFACT` | 86 deleted JSON files |
| 🟢 LOW | `AUDIT_DOC` | ~54 doc files |
| 🟢 LOW | `TEMP_SCRIPT` | 4 scripts |

---

## Duplicate System Inventory

> Systems with parallel/competing implementations in the repo.

| System | Deployed Version | Local Version | Conflict |
|---|---|---|---|
| Public page resolver | `app/[...slug]/page.js` inline Supabase | `lib/cms/resolveRoute.js` abstracted | YES — local version will replace deployed when ATOM-E deploys |
| AI health status | Static "Operational" string | `probeGeminiProvider()` live probe | YES — governance gap until RC-1B deploys |
| Admin system page | Static admin page | SHOS-backed `ShosControlCenter` | YES — SHOS replaces static when ATOM-C deploys |
| Queue admin | Direct Supabase queries | SHOS `getShosSnapshot()` | YES — SHOS provides unified view when ATOM-C deploys |
