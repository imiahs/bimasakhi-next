# Fix: P0.4 Module 2 Bulk Planner Operator Surface Completion

Date: 2026-05-04
Author: CTO (Agent)
Bible Reference: Section 6, Section 13, Section 32, Section 40, Section 47
Status: DEPLOYED + PARTIAL LIVE PROVEN

## Context

Execution stayed inside the approved Module 2 scope:

- existing bulk planner only
- no redesign
- no runtime-lane expansion
- operator control completion only

The target was to convert `/admin/ccc/bulk` from a shallow planner into an operator-grade control surface.

## Broken State Before This Fix

- bulk planner list had no real operator search
- list filtering was missing date and effective failure visibility
- there was no useful job history surface
- there was no detailed job inspection view
- failure evidence was not exposed in the owning bulk planner route
- retry and clear controls were missing from the bulk planner itself
- cancel only changed the bulk job row and did not stop linked queue work
- locality-targeted starts ignored `locality_ids`
- duplicate protection read the wrong `page_index` column (`slug` instead of `page_slug`)
- failed queue-linked jobs still looked like `running` in list filtering because the list filter used raw job status instead of effective operator status
- after deployment, retry and clear mutations still returned `500` because the fire-and-forget observability inserts used an invalid `.catch()` chain on the Supabase query builder

## Change Set

### 1. Bulk planner list route completion

- upgraded `app/api/admin/ccc/bulk/route.js`
- added:
  - `search`
  - `status`
  - `created_from`
  - `created_to`
  - pagination metadata
  - queue-derived enrichment fields
  - list `summary`
- added bulk-level failed-job actions:
  - `retry_failed`
  - `clear_failed`
- corrected status filtering to use the effective operator state so queue-failed jobs appear under `failed`

### 2. Bulk planner detail route completion

- upgraded `app/api/admin/ccc/bulk/[id]/route.js`
- added detail payload sections for:
  - queue snapshot
  - targeting summary
  - failure summary
  - recent drafts
  - generation logs
  - job runs
  - dead letters
  - observability logs
  - event store rows
- added per-job operator actions:
  - `retry_failed`
  - `clear_failed`
- made `cancel` queue-aware so remaining queue work is stopped instead of leaving the queue row active

### 3. Start-path targeting and dedupe corrections

- fixed `buildPageList` to honor `job.locality_ids`
- fixed duplicate checks to query `page_index.page_slug`
- kept the solution inside the owning bulk planner abstraction instead of reopening worker/runtime code

### 4. Operator UI completion

- rebuilt `app/admin/ccc/bulk/page.js` into a real operator surface
- preserved the existing admin visual language while adding:
  - search input
  - status filter
  - created-from and created-to filters
  - richer job cards with queue state and actions
  - sticky detail panel
  - failure inspection blocks
  - retry/clear controls

### 5. Post-deploy bug fix

- fixed invalid Supabase `.catch()` usage in the bulk planner routes
- changed the fire-and-forget audit-log writes to a safe `then(...).catch(...)` pattern
- this removed the false `500` response from `retry_failed` and `clear_failed` after the database mutation had already succeeded

### 6. Live proof harness

- added `scripts/audit/audit-p0-4-bulk-planner-live.mjs`
- the harness proves on production:
  - admin login
  - route reachability
  - create
  - search and planned filters
  - failed effective-status filtering
  - detail/history/failure inspection
  - retry failed
  - clear failed
  - cleanup of disposable proof artifacts

## Validation

- `npm run build` passed before the first production deploy
- `npm run build` passed again after the retry/clear mutation fix
- `vercel --prod --yes` passed twice for Module 2
- `node scripts/audit/audit-p0-4-bulk-planner-live.mjs` reached a final production verdict of `PARTIAL`

## Outcome

Module 2 is now materially closed in code and deployed scope:

- bulk planner search exists
- bulk planner filters exist
- job detail and job history exist
- failure inspection exists
- retry controls exist
- clear-failed controls exist
- list filtering now reflects effective failed status
- locality targeting and duplicate checks now follow the real schema

## Remaining Truth

- the only remaining live-proof blocker is environmental:
  - `PATCH start` is currently blocked on production by `bulk_generation_enabled=false`
- because of that control-plane gate, a real queue-backed start/cancel proof is not yet recorded in the live artifact
- this means Module 2 is still `PARTIAL` under Constitution Article 2, even though the requested operator control surface itself is implemented and deployed