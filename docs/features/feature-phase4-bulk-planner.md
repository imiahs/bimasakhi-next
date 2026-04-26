# Feature: Bulk Job Planner (Phase 4)

> **Bible Reference:** Section 10-12 (Sub-modules 4a-4d)  
> **Priority:** B — Core Power  
> **Status:** ✅ COMPLETE  
> **Commit:** a3f17c8  
> **Date:** April 18, 2026

---

## What Was Built

### Database (Migration 039)
- **bulk_generation_jobs** table: 28 columns covering targeting (city_ids, locality_ids, pincode_list), keywords (base_keyword, keyword_variations), content settings (intent_type, content_type), rate control (daily_publish_limit, generation_per_hour_cap), quality gates (auto_approve_threshold, require_review_below), progress counters (total_pages, generated/approved/published/failed/rejected_count), status management (planned/running/paused/completed/failed/cancelled)
- **content_drafts.bulk_job_id** FK added for tracking which drafts belong to which bulk job

### API Endpoints
- `GET /api/admin/ccc/bulk` — List all bulk jobs with optional status filter (super_admin/editor)
- `POST /api/admin/ccc/bulk` — Create new bulk job with targeting + keywords + rate control (super_admin)
- `GET /api/admin/ccc/bulk/[id]` — Single job with draft statistics
- `PATCH /api/admin/ccc/bulk/[id]` — Actions: start, pause, resume, cancel
- `GET /api/admin/locations/cities` — Active cities list for targeting UI (super_admin/editor)

### Start Action Flow
1. Checks safe_mode, bulk_generation_enabled, pagegen_enabled flags
2. Queries localities for selected cities
3. Generates slug list (bima-sakhi-{city}-{locality})
4. Deduplicates against existing page_index
5. Creates generation_queue entry with pages array
6. Dispatches via QStash to pagegen worker
7. Updates job status to 'running'

### Admin UI
- `/admin/ccc/bulk` — Bulk Planner page
- Job creation form: name, description, intent_type, base_keyword, keyword_variations, city targeting (toggle buttons), quality thresholds, rate limits
- Job list: status badges, progress bars, stats grid, action buttons with confirmations

### Navigation
- Added "Bulk" link to admin sidebar (ClientLayout.jsx)

---

## Files Created/Modified

| File | Action |
|---|---|
| supabase/migrations/039_bulk_job_planner.sql | NEW |
| app/api/admin/ccc/bulk/route.js | NEW |
| app/api/admin/ccc/bulk/[id]/route.js | NEW |
| app/admin/ccc/bulk/page.js | NEW |
| app/api/admin/locations/cities/route.js | NEW |
| app/admin/ClientLayout.jsx | MODIFIED |

---

## Integration Points
- **generation_queue** (018 migration) — used to queue pages
- **lib/queue/publisher.js** — enqueuePageGeneration() dispatches via QStash
- **lib/featureFlags.js** — checkSafeMode(), isSystemEnabled()
- **app/api/jobs/pagegen/route.js** — existing page generation worker processes the queue
