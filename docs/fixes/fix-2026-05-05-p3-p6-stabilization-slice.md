# Fix — 2026-05-05 P3-P6 Stabilization Slice

## Summary

Second post-stop-order stabilization slice. Two code fixes, two audits with no code defects found.

## Changes

### Fix 1 — Bulk planner `queue_paused` guard gap (P3 bulk)

**File:** `app/api/admin/ccc/bulk/[id]/route.js`

**Root cause:** The `start` action for bulk generation jobs did not check `queue_paused` from `system_control_config`. The pagegen worker checks this flag and returns 503 retriable if the queue is paused. A bulk job started while `queue_paused=true` would be enqueued but then immediately blocked by the worker.

The `resume` action had no safety guards at all — it could resume a job while `safe_mode=true`, `queue_paused=true`, or `pagegen_enabled=false`.

**Fix applied:**
- Added `import { getSystemConfig } from '@/lib/systemConfig'` 
- Added `queue_paused` guard after the existing feature-flag checks in the `start` case
- Added all four guards (`safe_mode`, `bulk_generation_enabled`, `pagegen_enabled`, `queue_paused`) to the `resume` case

**Safety:** Additive guard only. No data mutation. Previously-started jobs are unaffected. Variable names are scoped (`resumeSafeMode`, `resumeBulkEnabled`, etc.) to avoid shadowing in the switch block.

### Fix 2 — Failed queue retry/clear surface (P5)

**File:** `app/api/admin/queue/route.js`

**Root cause:** The admin queue route had no way to recover `generation_queue` rows stuck in `failed` status back to `pending`, nor to purge abandoned failed rows. The event-store retry (`/api/admin/actions PATCH retry_event_store`) handles QStash re-dispatch but does not reset the underlying `generation_queue` row status.

**Fix applied:**
- Added `import { isValidUUID } from '@/lib/observability'`
- Added `PATCH` handler with two actions:
  - `retry_failed`: Resets `status`, `retry_count`, and `error_message` for all failed rows (or a specific `id`) back to `pending`
  - `clear_failed`: Deletes all `status='failed'` rows from `generation_queue`
- Both actions validate `id` with `isValidUUID`, log via `safeLog`, and are restricted to `super_admin`

**Safety:** `retry_failed` only touches rows where `status='failed'`. `clear_failed` is a destructive DELETE — restricted to `super_admin` only. Both are idempotent from an observability standpoint (multiple retries do not cascade).

## Audit Findings (No Fix Required)

### P4 — Lead scoring and CRM actions

Full code inspection: `lib/tools/scoreLead.js` → `lib/ai/leadScorer.js` → `lib/executives/cmo.js` → CMO executive FORENSIC_AUDIT_REPORT PASS. No code defect found. P4 concern is "live session proof not collected" only.

### P6 — SEO/backup/automation/AI

- SEO and indexing routes functional.
- Backup route returns `{ backups: [] }` safely on Vercel (no crash, cosmetic only).
- `lib/scheduler/` is empty — automation is QStash-driven, no persistent scheduler.
- No code defect requiring a fix.

## Follow-On Work

- Collect live P4 lead scoring proof (submit test lead, trace CMO executive execution to `leads.lead_score` update)
- Collect P2 API/browser publish-archive end-to-end proof (start local dev server, authenticate, approve/archive a draft, confirm live status changes)
- P6 backup — document as "serverless-incompatible, returns empty, low priority cosmetic gap"
- P6 scheduler — document as "not implemented, automation is QStash-driven, architectural gap not a blocker"
- Reassess overall system stability score (currently 64/100) after P2 end-to-end proof
- Resume deployment process only after full P2-P6 closure and CTO sign-off
