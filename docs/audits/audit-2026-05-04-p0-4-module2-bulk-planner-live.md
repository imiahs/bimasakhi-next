# Audit: P0.4 Module 2 Bulk Planner Operator Surface Live Proof

Date: 2026-05-04
Captured at: 2026-05-04T16:47:54.405Z
Verdict: PARTIAL_LIVE_P0_4_MODULE2_BULK_PLANNER

## Scope

This proof covers only the approved P0.4 Module 2 execution slice:

- existing bulk planner only
- no redesign
- no feature expansion beyond operator control completion
- no runtime-lane code changes outside the owning admin bulk planner surfaces
- required operator controls:
  - search
  - filters
  - job history
  - job detail view
  - failure inspection
  - retry controls
  - clear-failed controls

The frozen queue/event/delivery/health runtime lane remained untouched. The only live blocker encountered was the existing production control-plane flag state.

## Proof Artifacts

- audit script: `scripts/audit/audit-p0-4-bulk-planner-live.mjs`
- JSON artifact: `scripts/audit/results/2026-05-04T16-47-54-409Z-p0-4-bulk-planner-live.json`
- production target: `https://bimasakhi.com`

## Build and Deploy Proof

- `npm run build` passed after the final Module 2 change set
- `vercel --prod --yes` completed twice during this slice:
  - first to publish the new operator surface
  - second to publish the retry/clear mutation-path fix
- the live alias remained `https://bimasakhi.com`

## Scripted Live Runtime Proof

The dedicated harness authenticated against production, created disposable bulk jobs, verified database state through the service role, and cleaned up every proof row after execution.

### 1. Authentication and route reachability

- production admin login returned `200`, `success=true`, and issued a valid admin cookie
- `/admin/ccc/bulk` returned `200` in production

### 2. Create, search, and filter proof

- three disposable bulk jobs were created successfully via `POST /api/admin/ccc/bulk`
- the paginated list contract returned the new enriched payload with:
  - `effective_status`
  - queue snapshot fields
  - `total`
  - `page`
  - `limit`
  - `totalPages`
  - `summary`
- `GET /api/admin/ccc/bulk?status=planned&search=...` returned the disposable jobs correctly
- after synthetic failure seeding, `GET /api/admin/ccc/bulk?status=failed&search=...` returned the queue-failed jobs correctly using effective status rather than raw job status

### 3. Detail, history, and failure inspection proof

- `GET /api/admin/ccc/bulk/[id]` returned the rich detail contract for a failed disposable job
- returned detail now included:
  - `queue`
  - `targeting_summary`
  - `failure_summary`
  - `generation_logs`
  - `job_runs`
  - `dead_letters`
  - `observability_logs`
  - `event_store`
- failure inspection evidence was real and non-empty:
  - `failure_summary.has_failure=true`
  - `failure_summary.last_error="retry-audit forced failure"`
  - `job_runs.length=1`
  - `dead_letters.length=1`
  - `generation_logs.length=1`

### 4. Retry and clear controls proof

- `PATCH /api/admin/ccc/bulk/[id]` with `action=retry_failed` returned `200`
- DB proof after retry:
  - bulk job remained attached to the queue row
  - queue status changed from `failed` to `pending`
  - `retry_count` reset from `3` to `0`
  - dispatch returned a real message id
- `PATCH /api/admin/ccc/bulk/[id]` with `action=clear_failed` returned `200`
- DB proof after clear:
  - `bulk_generation_jobs.generation_queue_id` became `null`
  - failed queue row no longer existed

### 5. Remaining live blocker

- `PATCH /api/admin/ccc/bulk/[id]` with `action=start` returned `403`
- returned error: `Bulk generation is disabled`
- direct DB state confirmed the bulk job stayed `planned` with no queue row created

This is not a Module 2 code-path failure. It is the current production control-plane state in `system_control_config`, which prevents a real queue-backed start from being proven on production without temporarily changing live flags.

## Browser UI Proof

An authenticated production browser pass was also executed after deployment.

- `/admin/login` accepted the real admin credentials and loaded the authenticated admin shell
- `/admin/ccc/bulk` rendered successfully in production
- the live page visibly rendered the new operator controls:
  - search input
  - status filter
  - created-from filter
  - created-to filter
  - `Retry Failed Jobs`
  - `Clear Failed Jobs`
- the live list rendered real job cards with `Details` and `Start` controls
- opening a real job card rendered the sticky detail panel with:
  - queue snapshot
  - targeting
  - draft outcome
  - failure inspection block
  - queue and worker history
  - generation logs

This browser pass confirmed that the deployed operator surface is not just returning the right API contract; it is also rendering the intended control plane in the production admin UI.

## Final Status

- Module 2 operator control completion: PARTIAL IN REQUESTED LIVE SCOPE
- implemented and deployed controls:
  - create: COMPLETE
  - search and filters: COMPLETE
  - job detail/history/failure inspection: COMPLETE
  - retry failed: COMPLETE
  - clear failed: COMPLETE
  - effective failed filtering: COMPLETE
- real queue-backed start/cancel proof: BLOCKED BY PRODUCTION FLAG STATE

## Truth Summary

The operator-grade control surface is now live on production and the new admin contracts are proven. The remaining incomplete proof item is a real started queue flow, which is currently blocked by `bulk_generation_enabled=false` in production rather than by the Module 2 implementation itself.