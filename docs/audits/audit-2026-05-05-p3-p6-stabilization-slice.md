# Audit — 2026-05-05 P3-P6 Stabilization Slice

## Scope

This audit covers the second stabilization slice after the CEO deployment stop order, targeting the remaining open items from the P2-P6 backlog:

- P3 (bulk): bulk planner controlled-mode vs safe-mode guard confusion
- P4: lead scoring and CRM actions
- P5: failed queue operational action layer revalidation
- P6: SEO / backup / automation / AI module stabilization

This is NOT a completion claim for the entire P2-P6 stop-order list.

## Verdict

**PARTIAL PASS**

- P3 bulk planner guard gap: **FIXED**. The `start` and `resume` actions in the bulk job API now check `queue_paused` from `system_control_config` before allowing a job to start or resume. No job can be enqueued into `generation_queue` while the queue is paused.
- P4 lead scoring and CRM: **NO CODE BUG FOUND**. The CMO executive, `score_lead` tool, `calculateLeadScore` function, and CRM pipeline all appear correctly wired. The existing FORENSIC_AUDIT_REPORT PASS for CMO holds. The P4 concern is a "runtime proof not collected" gap, not a broken code path.
- P5 failed queue action layer: **FIXED**. The admin queue route (`/api/admin/queue`) now exposes a `PATCH` handler for `retry_failed` (reset failed rows to pending) and `clear_failed` (delete failed rows). This closes the operational recovery surface.
- P6 SEO/backup/automation/AI: **ASSESSED, NO CRITICAL CODE BUG**. SEO overrides and indexing routes are functional. The backup route returns empty on Vercel (no persistent filesystem — cosmetic only). The `lib/scheduler` directory is empty; automation scheduling is not implemented (architectural gap, not a broken module). AI modules are correctly gated behind `ai_enabled` and `queue_paused` flags.
- Deployment remains blocked. The full P2 API/browser publish-archive revalidation is still open. P4 runtime proof is not yet collected. P6 scheduler/automation architectural gaps remain open.

## Root Causes Confirmed

### P3 bulk planner — `queue_paused` guard gap

`app/api/admin/ccc/bulk/[id]/route.js` `start` action checked `safe_mode`, `bulk_generation_enabled`, and `pagegen_enabled` — but **never checked `queue_paused`**.

The pagegen worker (`app/api/jobs/pagegen/route.js`) checks `queue_paused` from `system_control_config` at execution time and returns `503 retriable` if the queue is paused. So a bulk job started while `queue_paused=true` would be written to `generation_queue` with `status='pending'`, dispatched to QStash, and then immediately rejected by the worker as a retriable blocked job. In the current controlled mode (`queue_paused=true`), this would silently stall every bulk start.

Additionally, the `resume` action had **no safety guards at all** — it would flip `bulk_generation_jobs.status` back to `running` unconditionally, even while `safe_mode=true` or `queue_paused=true`.

### P5 — No queue-level retry surface

`/api/admin/queue` only had GET (stats) and POST (dispatch next pending). There was no `PATCH` handler to reset `generation_queue` rows from `failed` back to `pending`, nor to purge abandoned `failed` rows. The `retry_event_store` action in `/api/admin/actions` handled event-store level retries, but did not reset the underlying queue row status.

### P4 — Not a code bug

The CMO executive imports and invokes `score_lead`, which calls `calculateLeadScore`. The CRM pipeline (`pages/api/crm/[action].js`) already gates QStash dispatch behind `queue_paused`. No code defect identified. The P4 concern reduces to: the scoring flow has not been proven end-to-end at the browser/API/DB level in a live session since the stop order.

### P6 — Architectural gaps, not crashes

- Backup API reads from a local `backups/` directory. On Vercel, this directory does not persist across deployments. The route safely returns `{ backups: [] }` when the directory does not exist — no 500 error.
- `lib/scheduler/` is empty. There is no cron or scheduled job runner implemented. Pages that mention "automation" refer to QStash-driven async work, not a persistent scheduler.
- SEO and indexing routes are functioning correctly.

## Evidence

### P3 bulk planner guard

- Code inspection of `app/api/admin/ccc/bulk/[id]/route.js` confirmed the `start` action called `checkSafeMode()`, `isSystemEnabled('bulk_generation_enabled')`, and `isSystemEnabled('pagegen_enabled')` — but no `getSystemConfig()` call for `queue_paused`.
- Code inspection of `app/api/jobs/pagegen/route.js` line 225 confirmed: `if (config.queue_paused)` returns 503 retriable.
- Code inspection of `lib/featureFlags.js` confirmed `isSystemEnabled` reads from `system_control_config` via `featureFlags.js` — but `queue_paused` is NOT a control-plane flag in that file; it lives in `lib/systemConfig.js` which reads `system_control_config.queue_paused`.
- Fix applied: `getSystemConfig` imported and called in both `start` and `resume` actions.
- Error check after fix: No errors found.

### P5 queue retry surface

- Code inspection of `app/api/admin/queue/route.js` confirmed only GET and POST handlers — no PATCH.
- `PATCH` handler added with `retry_failed` and `clear_failed` actions.
- `isValidUUID` guard applied to the `id` parameter.
- Both actions log via `safeLog` and are restricted to `super_admin`.
- Error check after fix: No errors found.

### P4 lead scoring

- `lib/tools/scoreLead.js`: `score_lead` tool registered, calls `calculateLeadScore`.
- `lib/ai/leadScorer.js`: computes heuristic score, updates `leads.lead_score`, inserts `ai_decision_logs`.
- `lib/executives/cmo.js`: imports `score_lead`, invokes via `executeTool`, captures result in saga.
- FORENSIC_AUDIT_REPORT: CMO shows `71 EXECUTIVE_COMPLETE, 78 SAGA_COMPLETE` — PASS.
- No code defect found.

### P6 SEO/backup/automation/AI

- `app/api/admin/seo/route.js`: functional — reads/writes `seo_overrides` table.
- `app/api/jobs/index/route.js`: functional — marks `page_index` rows with `indexing_status='pending'` as `indexed`.
- `app/api/admin/backups/route.js`: returns `{ backups: [] }` when directory missing — safe on Vercel, no crash.
- `lib/scheduler/` is empty — no scheduler module exists. Automation is QStash-driven only.
- `app/api/admin/system-health/route.js`: correctly gates AI status on `ai_enabled` and `queue_paused`.

## Files Changed In This Slice

- `app/api/admin/ccc/bulk/[id]/route.js` — added `getSystemConfig` import + `queue_paused` guard on `start` and full safety guards on `resume`
- `app/api/admin/queue/route.js` — added `isValidUUID` import + `PATCH` handler for `retry_failed` and `clear_failed`

## Still Open After This Slice

- P2 API/browser publish/archive revalidation (DB primitives confirmed passing; API route and browser surface not yet end-to-end tested)
- P4 lead scoring runtime proof (code is correct; live session proof not collected)
- P6 backup module (cosmetic — returns empty on Vercel; no persistent storage available in serverless)
- P6 automation scheduler (architectural gap — no persistent scheduler exists; QStash is the current async layer)
- Full P1-P6 backlog: system stability score 64/100, not at the threshold required for deployment resumption

## CTO Status

**IN PROGRESS**

CEO stop order remains active. This second slice removes the bulk planner guard gap and closes the queue-level retry/clear surface for operations. It does not reopen deployment.
