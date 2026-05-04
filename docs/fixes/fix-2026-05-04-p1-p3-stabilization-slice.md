# Fix — 2026-05-04 P1-P3 Stabilization Slice

## Summary

This fix slice removed one live DB blocker and two concrete local-runtime breakages without redesigning any UI or adding new product scope.

## What Changed

### 1. `generation_queue` schema repair

Added a targeted migration:

- `metadata JSONB DEFAULT '{}'::jsonb`
- `slug TEXT`
- `idx_generation_queue_slug`
- backfill from `payload->>'slug'` where available

### 2. Targeted migration executor

Added `scripts/applyTargetedMigration.js` so one named SQL migration can be applied without invoking the repo-wide migration runner. The script also requests a PostgREST schema cache reload after apply or replay.

### 3. FAQ editing restored

Updated the CCC draft editor so `faq_data` can be edited directly as JSON, with validation feedback before save, and with preview rendering from unsaved edit state.

### 4. Single-page generation queue contract fixed

Updated `/api/admin/ccc/generate-single` to enqueue the worker-compatible payload:

- `payload.version`
- `payload.source`
- `payload.pages[0].slug`
- `payload.pages[0].keyword_text`
- `payload.pages[0].page_type`
- `payload.pages[0].content_level`

Also added duplicate pending/processing/paused queue detection for the same slug.

## Root Cause

- DB schema and application contract drifted apart for `generation_queue`.
- The draft editor backend supported FAQ writes, but the UI never exposed them.
- The single-page generation route wrote a queue row shape the worker rejects.

## Safety Notes

- The DB migration is additive only.
- Targeted migration replay is safe and returns skip semantics.
- No navigation, layout, or broader content workflow redesign was introduced.
- Deployment remains blocked until the remaining stop-order items are audited and fixed.

## Follow-On Work Still Required

- Revalidate draft publish/archive at the API/browser surface now that the direct Rule 16 DB probe is passing.
- Reproduce and repair the bulk planner safe-mode/control-mode confusion.
- Audit lead scoring, CRM actions, failed queue recovery, SEO/backup/automation, and AI module gaps.
