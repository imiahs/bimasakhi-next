# RC-2A: Before Deployment Planning Snapshot

| Field | Value |
|---|---|
| Phase | RC-2A |
| Date | 2026-05-14 |
| Purpose | Authoritative pre-planning state capture before any RC-2A analysis |
| Production commit | `794013e` (2026-05-04) |
| Branch | `main` (HEAD -> main, origin/main) |
| Authority | Supersedes all prior deployment status notes |

---

> **Constraint:** This snapshot is read-only. No files modified, no deployments triggered, no schema changes. RC-2A is planning-only.

---

## Git State

| Metric | Count |
|---|---|
| Modified tracked files (M) | 57 |
| Deleted tracked files (D) | 86 (all `scripts/audit/results/*.json` + `next-build.log`) |
| Untracked code files (??) | 8 |
| Untracked script files (??) | 4 |
| Untracked migration files (??) | 5 |
| Untracked documentation (??) | ~56 |
| Commits since production | 0 (all work local only) |

**All 57 modified files, 8 new code files, and 5 orphaned migrations are local-only. Production is running commit `794013e`.**

---

## Production Operational State (Confirmed)

| System | State | Evidence |
|---|---|---|
| Next.js on Vercel | STABLE | Commit `794013e`, all public pages returning 200 |
| Supabase (DB) | OPERATIONAL | `system_control_config` singleton confirmed |
| QStash cron 1 | ACTIVE | `scd_7J8DtLe6UoKNbB8gTnag7GrQ89m1` → `/api/jobs/scheduled-publish`, `0 * * * *` |
| QStash cron 2 | ACTIVE | `scd_7eLCdvVEp1o7rWvdfRCb729r17xu` → `/api/jobs/reconciliation`, `*/30 * * * *` |
| QStash cron 3 | ACTIVE | `scd_7oSGND79QuX6QhcdsPqZDD2Tk3WP` → `/api/jobs/morning-brief`, `0 2 * * *` |
| QStash cron 4 | ACTIVE | `scd_5Nf3aEoA776GrqKp1nubmAh1BTSU` → `/api/jobs/event-retry`, `*/5 * * * *` |
| QStash cron 5 | ACTIVE | `scd_5kgABtJUWVnB5mHoCscVCYuooGpB` → `/api/jobs/alert-scan`, `*/5 * * * *` |
| QStash cron 6 | ACTIVE | `scd_6JLsqxLgc5n49AW58rfZPicmAZiw` → `/api/jobs/vendor-health-check`, `*/5 * * * *` |
| CRM / Zoho sync | OPERATIONAL | CRM sync confirmed May 13, zoho_id returned |
| Gemini AI | QUOTA EXHAUSTED | All AI calls return 429; `ai_enabled=false` in DB since 2026-05-13T18:01:03 |

---

## Feature Flag State (Production DB — Confirmed)

| Flag | Value | Set |
|---|---|---|
| `ai_enabled` | `false` | 2026-05-13T18:01:03.585Z (RC-1B.1) |
| `queue_paused` | `false` | Active default (migration 20260504123000 confirmed by live state) |
| `crm_auto_routing` | `true` | Active |
| `followup_enabled` | `true` | Active |

---

## Untracked Code Files (8) — Never Deployed

| File | Phase | Import Blocker For |
|---|---|---|
| `lib/cms/resolveRoute.js` | P2.2 | `app/[...slug]/page.js` |
| `lib/cms/resolveCmsRoute.js` | P2.2 | `lib/cms/resolveRoute.js` |
| `lib/ai/promptEngine.js` | P2.4 | `pagegen`, `blog`, `ccc/bulk/[id]`, `ccc/bulk`, `ccc/generate-single` |
| `lib/system/shos.js` | P2.3 | `delivery-logs`, `dlq`, `observability`, `queue`, `system`, `system/health`, `system-health` routes |
| `features/admin/content/ContentInventoryContent.jsx` | P0.4 | `app/admin/ccc/page.js` |
| `features/admin/system/ShosControlCenter.jsx` | P2.3 | `app/admin/system/page.js` |
| `app/api/admin/cms/structure/route.js` | P2.2 | (new route — no dependents) |
| `app/api/admin/system/shos/route.js` | P2.3 | (new route — no dependents; `ShosControlCenter.jsx` calls it via fetch) |

---

## Orphaned Migrations (5) — Applied to DB, Not Committed to Git

| Migration | Schema Change | DB Applied | Risk if Not Committed |
|---|---|---|---|
| `20260504123000_queue_running_steady_state.sql` | `queue_paused` default → FALSE | YES (confirmed by live DB state) | DB drift; supabase CLI reset would diverge |
| `20260504150000_p0_4_content_inventory_completion.sql` | `blog_posts` audit columns | LIKELY | Same drift risk |
| `20260505090000_shos_operator_control.sql` | Creates `system_control_actions` table | LIKELY | SHOS runtime depends on this table |
| `20260507010000_p2_2_cms_data_structure.sql` | CMS nullable columns | LIKELY | CMS resolver runtime depends on these columns |
| `20260507020000_p2_4_ai_prompt_engine.sql` | Prompt columns on `content_drafts`, `blog_posts`, `bulk_generation_jobs` | LIKELY | Prompt engine runtime depends on these columns |

> **NOTE:** "LIKELY applied" means the migrations were created at the time P2 was developed, and the local feature code depends on their schema changes. No direct DB column check was run during RC-2A. Verification is a pre-deployment requirement, not a planning requirement.

---

## Dangerous Mixed States (Inherited from RC-1D)

| ID | State | Risk |
|---|---|---|
| MST-01 | RC-1B governance gates LOCAL ONLY | Production does NOT check `ai_enabled`; Gemini calls would 429 if AI re-enabled before deploying ATOM-A |
| MST-02 | SHOS is 3-way atomic dependency | Library + migration + 7 routes + 2 UI components must all deploy together |
| MST-03 | CMS resolver deployment replaces catch-all | Both `resolveRoute.js` + `resolveCmsRoute.js` must deploy with `app/[...slug]/page.js` |
| MST-04 | `middleware.js` and `withAdminAuth.js` are a coupled auth pair | One cannot deploy without the other safely |
| MST-05 | `app/admin/ccc/page.js` imports `ContentInventoryContent.jsx` | Both must deploy together |

---

## Auth Pair Dependency Verification (RC-2A Confirmed)

| File | Imports (Local) | All Dependencies Tracked? |
|---|---|---|
| `middleware.js` | `logError`, `getAdminAccessDecision`, `getAdminLandingPath`, `NextResponse`, `jwtVerify` | ✅ YES — all tracked |
| `lib/auth/withAdminAuth.js` | `getAdminAccessDecision`, `requireRole`, `verifyAdminSession`, `rateLimiter`, `NextResponse`, `safeSupabase` | ✅ YES — all tracked |

**ATOM-B auth pair: no untracked import dependencies. Safe for atomic deployment after logic review.**

---

## Summary: What Prevents Deployment Today

| Category | Count | Description |
|---|---|---|
| Hard build blockers | 5 | Missing untracked files cause `next build` failure |
| Atomic dependency constraints | 5 | File groups that MUST deploy together |
| Orphaned migration drift | 5 | Migrations applied to DB but not in git |
| Governance gaps (production) | 3+ | AI routes, pagegen — no `ai_enabled` gate in production |
| Dangerous partial states | 16 | Files with incomplete import chains |

**Deployment is NOT SAFE in current state. ATOM-A (3 governance routes) is the only immediately deployable unit without untracked import resolution.**
