# Audit — 2026-05-04 P1-P3 Stabilization Slice

## Scope

This audit covers only the first concrete stabilization slice after the CEO deployment stop order:

- P1 blocker: `generation_queue` schema drift (`metadata` / `slug` missing)
- P2 slice: FAQ edit path in the CCC draft editor
- P3 slice: single-page generator queue contract mismatch

This is not a completion claim for the broader P2-P6 stop-order list.

## Verdict

**PARTIAL PASS**

- P1 is fixed live in the requested DB/schema scope.
- P2 FAQ editing is fixed locally in the draft editor UI.
- P2 draft publish/archive DB primitives currently pass direct Rule 16 probe validation.
- P3 single-page generation now writes the queue payload shape the worker expects.
- Deployment remains blocked because publish/archive revalidation and the remaining P3-P6 items are still open.

## Root Causes Confirmed

### P1 — `generation_queue` drift

`public.generation_queue` was originally created without `metadata` or `slug`.

Application code already expected both columns:

- `app/api/admin/ccc/generate-single/route.js` inserted `slug` and `metadata`
- the runtime migration history contained `priority` / `created_by`, but no migration had ever added `metadata` / `slug`

### P2 — FAQ edit path

The draft editor rendered `faq_data` as read-only preview only. The backend accepted `faq_data` updates through `rule16_update_content_draft`, but the editor exposed no input for that field.

### P3 — single-page generator

`/api/admin/ccc/generate-single` queued a row with top-level `slug` only. The pagegen worker accepts only `payload.pages[]` items and requires `keyword_text` inside each page request. The queued jobs were therefore non-runnable.

## Evidence

### P1

- Drift check before the fix reported `Repo migrations: 79`, `Live schema_migrations: 78`, with one repo-only migration: `20260502100000_p1_generation_queue_schema_fix.sql`.
- Targeted migration runner applied only `20260502100000_p1_generation_queue_schema_fix.sql` and requested PostgREST schema reload.
- Drift check after the fix reported `Repo migrations: 79`, `Live schema_migrations: 79`, `No migration drift detected.`
- Re-running the same targeted migration returned `[SKIPPED] ... Already executed`, proving safe replay.
- A live insert/delete probe on `generation_queue` succeeded with `slug`, `metadata`, and `priority`, then cleaned up successfully.

### P2

- The draft editor now exposes `faq_data` as editable JSON in the main editor panel.
- The live preview panel now renders unsaved FAQ edits from editor state.
- Validation on the touched file returned `No errors found`.

### P3

- The single-page generator route now writes `payload.pages[0]` with `slug`, `keyword_text`, `page_type`, and `content_level`.
- It also blocks duplicate pending/processing/paused queue rows for the same slug.
- A queue payload probe inserted a synthetic row, confirmed `pages_length: 1` plus non-empty `keyword_text`, and then cleaned the row up successfully.

### P2 publish/archive DB probe

- `scripts/probeDraftPublishArchive.js` inserted a synthetic draft, published it through `rule16_publish_draft`, verified `draft_status='published'`, `page_status='published'`, and `indexing_status='pending'`, then archived it through `rule16_transition_draft_status` and verified `draft_status='archived'`, `page_status='archived'`, and `indexing_status='blocked'`.
- Probe cleanup completed successfully.

## Files Changed In This Slice

- `supabase/migrations/20260502100000_p1_generation_queue_schema_fix.sql`
- `scripts/applyTargetedMigration.js`
- `scripts/probeDraftPublishArchive.js`
- `app/admin/ccc/drafts/[id]/page.js`
- `app/api/admin/ccc/generate-single/route.js`

## Still Open After This Slice

- P2 API/browser publish/archive revalidation (DB primitives currently pass)
- P3 bulk planner controlled-mode vs safe-mode confusion
- P4 lead scoring and CRM actions
- P5 failed queue operational action layer revalidation
- P6 SEO / backup / automation / AI module stabilization

## CTO Status

**IN PROGRESS**

The CEO stop order remains active. This slice removes the confirmed queue schema blocker and two concrete local editor/queue contract faults, but it does not reopen deployment.
