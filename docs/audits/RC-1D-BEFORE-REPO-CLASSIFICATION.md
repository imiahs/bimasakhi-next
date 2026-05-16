# RC-1D: Before Repo Classification Snapshot

| Field | Value |
|---|---|
| Phase | RC-1D |
| Captured | 2026-05-14 |
| Production commit | `794013e` (2026-05-04) — "feat: end-to-end pipeline proof complete" |
| Current branch | `main` |
| Remote | `origin/main` = `794013e` (matches HEAD) |
| Total tracked changes vs HEAD | 146 files changed (4,876 ins, 39,201 del per `git diff --stat HEAD`) |
| Modified tracked files (M) | 57 |
| Deleted tracked files (D) | 86 (all in `scripts/audit/results/`) |
| Untracked files/dirs (??) | ~60 items (code, docs, scripts, migrations) |

---

## Modified Tracked Files (57)

> These files exist in production at commit `794013e`. Local versions contain modifications NOT deployed.

```
M  .gitignore
M  app/[...slug]/page.js
M  app/admin/blog/page.js
M  app/admin/ccc/bulk/page.js
M  app/admin/ccc/drafts/[id]/page.js
M  app/admin/ccc/drafts/page.js
M  app/admin/ccc/page.js
M  app/admin/crm/page.js
M  app/admin/resources/page.js
M  app/admin/routeRegistry.js
M  app/admin/settings/page.js
M  app/admin/system/alerts/page.js
M  app/admin/system/dlq/page.js
M  app/admin/system/page.js
M  app/api/admin/actions/route.js
M  app/api/admin/ai/recruiter/route.js
M  app/api/admin/ai/route.js
M  app/api/admin/blog/route.js
M  app/api/admin/ccc/bulk/[id]/route.js
M  app/api/admin/ccc/bulk/route.js
M  app/api/admin/ccc/drafts/[id]/route.js
M  app/api/admin/ccc/drafts/route.js
M  app/api/admin/ccc/generate-single/route.js
M  app/api/admin/config/route.js
M  app/api/admin/delivery-logs/route.js
M  app/api/admin/dlq/route.js
M  app/api/admin/errors/route.js
M  app/api/admin/media/route.js
M  app/api/admin/media/upload/route.js
M  app/api/admin/observability/route.js
M  app/api/admin/pages/[id]/route.js
M  app/api/admin/pages/route.js
M  app/api/admin/queue/route.js
M  app/api/admin/resources/route.js
M  app/api/admin/seo/analyze/route.js
M  app/api/admin/system-health/route.js
M  app/api/admin/system/health/route.js
M  app/api/admin/system/route.js
M  app/api/jobs/pagegen/route.js
M  app/api/workers/contact-sync/route.js
M  app/api/workers/lead-sync/route.js
M  app/pages/[slug]/page.js
M  app/resources/page.js
M  docs/CONTENT_COMMAND_CENTER.md
M  docs/INDEX.md
M  features/admin/ai/AiBlogContent.jsx
M  features/admin/media/Media.css
M  features/admin/media/MediaContent.jsx
M  features/admin/pages/PageEditorContent.jsx
M  features/admin/pages/PagesContent.jsx
M  features/admin/system/ObservabilityContent.jsx
M  lib/ai/promptTemplates.js
M  lib/auth/withAdminAuth.js
M  lib/featureFlags.js
M  lib/queue/deliveryTruth.js
M  lib/system/systemHealth.js
M  middleware.js
```

---

## Deleted Tracked Files (86)

> All in `scripts/audit/results/`. Timestamped JSON audit result files from April–May 2026. Deleted locally, still exist in git history.

```
D  scripts/audit/results/2026-04-25T19-36-23-948Z-vercel-runtime-ps.json
D  scripts/audit/results/2026-04-25T19-36-27-569Z-supabase-data-integrity-ps.json
D  scripts/audit/results/2026-04-25T19-36-40-056Z-qstash-ps.json
D  scripts/audit/results/2026-04-25T19-36-43-641Z-zoho-ps.json
D  scripts/audit/results/2026-04-25T19-36-46-548Z-admin-content-flow-ps.json
... [81 more files — all timestamps April 25 through May 7, 2026]
D  scripts/audit/results/2026-05-04T07-36-53-p1-p3-stabilization-slice.json
```

All 86 files: AUDIT_ONLY — no runtime dependency, safe deletion confirmed.

---

## Untracked Files (??)

### Code — New, Never Deployed

```
?? app/api/admin/cms/structure/route.js
?? app/api/admin/system/shos/route.js
?? features/admin/content/ContentInventoryContent.jsx
?? features/admin/system/ShosControlCenter.jsx
?? lib/ai/promptEngine.js
?? lib/cms/resolveCmsRoute.js
?? lib/cms/resolveRoute.js
?? lib/system/shos.js
```

### Scripts — Local Utility Only

```
?? scripts/_forensic_check.mjs
?? scripts/live_status_check.mjs
?? scripts/rc1b1_ai_pause.mjs
?? scripts/rc1c_register_scheduled_publish.mjs
```

### Migrations — Orphaned (Applied to DB, Not Committed)

```
?? supabase/migrations/20260504123000_queue_running_steady_state.sql
?? supabase/migrations/20260504150000_p0_4_content_inventory_completion.sql
?? supabase/migrations/20260505090000_shos_operator_control.sql
?? supabase/migrations/20260507010000_p2_2_cms_data_structure.sql
?? supabase/migrations/20260507020000_p2_4_ai_prompt_engine.sql
```

### Documentation — New, Never Committed

```
?? docs/audits/DEPLOYMENT_POLLUTION_REPORT.md
?? docs/audits/EXTERNAL_SYSTEM_FORENSICS.md
?? docs/audits/EXTERNAL_SYSTEM_SCORECARD.md
?? docs/audits/FEATURE_COMPLETENESS_SCORECARD.md
?? docs/audits/FORENSIC_DEPLOYMENT_RECONCILIATION.md
?? docs/audits/GEMINI_DEPENDENCY_ANALYSIS.md
?? docs/audits/LOCAL_VS_PROD_FILE_MATRIX.md
?? docs/audits/MIGRATION_DRIFT_MATRIX.md
?? docs/audits/QSTASH_OPERATIONAL_AUDIT.md
?? docs/audits/RC-1A-ADMIN_RUNTIME_TRUTH.md
?? docs/audits/RC-1A-AI_RUNTIME_EXECUTION_TRACE.md
?? docs/audits/RC-1A-BASELINE_RUNTIME_SNAPSHOT.md
?? docs/audits/RC-1A-ENVIRONMENT_CLASSIFICATION_MATRIX.md
?? docs/audits/RC-1A-GOVERNANCE_GAP_MATRIX.md
?? docs/audits/RC-1A-QUEUE_AND_RETRY_ANALYSIS.md
?? docs/audits/RC-1B-AFTER-RUNTIME-SNAPSHOT.md
?? docs/audits/RC-1B-BEFORE-RUNTIME-SNAPSHOT.md
?? docs/audits/RC-1B1-AFTER-AI-PAUSE.md
?? docs/audits/RC-1B1-AI-PAUSE-ACTIVATION.md
?? docs/audits/RC-1B1-BEFORE-AI-PAUSE.md
?? docs/audits/RC-1C-SCHEDULED-PUBLISH-VERIFICATION.md
?? docs/audits/RUNTIME_DEPENDENCY_GRAPH.md
?? docs/audits/SUPABASE_RUNTIME_TRUTH.md
?? docs/audits/TELEGRAM_RUNTIME_AUDIT.md
?? docs/audits/ZOHO_CRM_FORENSICS.md
?? docs/audits/audit-2026-05-04-p0-4-module1-content-inventory-live.md
?? docs/audits/audit-2026-05-04-p0-4-module2-bulk-planner-live.md
?? docs/audits/audit-2026-05-05-p1-admin-usability-slice.md
?? docs/audits/audit-2026-05-05-shos-complete-live-proof.md
?? docs/audits/audit-2026-05-05-shos-operator-control-foundation.md
?? docs/audits/audit-2026-05-06-p1-admin-usability-complete.md
?? docs/audits/audit-2026-05-06-p1-complete.md
?? docs/audits/audit-2026-05-06-p2-1-foundation.md
?? docs/audits/audit-p2-complete.md
?? docs/fixes/RC-1B-MINIMAL_GOVERNANCE_ALIGNMENT.md
?? docs/fixes/fix-2026-05-04-p0-4-module1-content-inventory.md
?? docs/fixes/fix-2026-05-04-p0-4-module2-bulk-planner-operator-surface.md
?? docs/fixes/fix-2026-05-05-p1-admin-usability-slice.md
?? docs/fixes/fix-2026-05-05-shos-complete-operator-system.md
?? docs/fixes/fix-2026-05-05-shos-operator-control-foundation.md
?? docs/fixes/fix-2026-05-06-p1-admin-usability.md
?? docs/fixes/fix-p2-system-upgrade.md
?? docs/tests/RC-1B-RUNTIME_VALIDATION.md
?? docs/tests/RC-1B1-RUNTIME-PAUSE-VALIDATION.md
?? docs/tests/test-results-2026-05-05-p1-admin-usability-slice.md
?? docs/tests/test-results-2026-05-05-shos-complete.md
?? docs/tests/test-results-2026-05-05-shos-operator-control.md
?? docs/tests/test-results-2026-05-06-p1-final-validation.md
?? docs/tests/test-results-2026-05-06-p1-final.md
?? docs/tests/test-results-p2-final.md
```

---

## System Control Config (Live DB state at snapshot)

| Flag | Value | Last Updated |
|---|---|---|
| `ai_enabled` | `false` | 2026-05-13T18:01:03.585Z |
| `queue_paused` | `false` | (from migration 20260504123000) |
| `crm_auto_routing` | `true` | |
| `followup_enabled` | `true` | |

---

## QStash Cron State (Live at snapshot)

| Schedule ID | Cron | Endpoint |
|---|---|---|
| `scd_7J8DtLe6UoKNbB8gTnag7GrQ89m1` | `0 * * * *` | `/api/jobs/scheduled-publish` |
| `scd_7eLCdvVEp1o7rWvdfRCb729r17xu` | `*/30 * * * *` | `/api/jobs/reconciliation` |
| `scd_7oSGND79QuX6QhcdsPqZDD2Tk3WP` | `0 2 * * *` | `/api/jobs/morning-brief` |
| `scd_5Nf3aEoA776GrqKp1nubmAh1BTSU` | `*/5 * * * *` | `/api/jobs/event-retry` |
| `scd_5kgABtJUWVnB5mHoCscVCYuooGpB` | `*/5 * * * *` | `/api/jobs/alert-scan` |
| `scd_6JLsqxLgc5n49AW58rfZPicmAZiw` | `*/5 * * * *` | `/api/jobs/vendor-health-check` |

---

## Previous Forensic Audit Cross-Reference

This snapshot SUPERSEDES the BEFORE state captured in `RC-1B-BEFORE-RUNTIME-SNAPSHOT.md` (May 13, 2026). RC-1B, RC-1B.1, and RC-1C changes are incorporated. Production commit has NOT changed — still `794013e`.
