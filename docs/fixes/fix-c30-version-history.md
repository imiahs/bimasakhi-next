# Fix: C30 Content Version History

Date: 2026-05-02
Status: IMPLEMENTED + DB APPLIED + LOCAL RUNTIME PROVEN

## Problem

Phase 14 Content Version History existed in documentation, but the draft save path had no persisted version ledger, no draft-history API surface, and no editor workflow for viewing or restoring saved draft states.

## Root Cause

The controlling draft write path was still owned by `rule16_update_content_draft`, but that RPC did not snapshot the pre-update row. Because the version table and snapshotting logic were missing, adding UI alone would have created a fake history surface with no authoritative DB record behind it.

## What Was Implemented

### 1. Draft version-history storage

- Added `public.content_version_history`
- Added unique `(draft_id, version_number)` protection
- Added draft history lookup index on `(draft_id, created_at desc)`

### 2. Snapshotting in the controlling RPC

- Replaced `public.rule16_update_content_draft` through the C30 migration
- Before each draft update, the RPC now inserts a full JSON snapshot of the locked current `content_drafts` row
- The RPC stores:
  - `draft_id`
  - `version_number`
  - `saved_by`
  - `snapshot`
  - `change_summary`
  - `created_at`

### 3. Admin draft API support

- `GET /api/admin/ccc/drafts/[id]` now returns version-history metadata and can return a selected snapshot by `versionId`
- `PATCH /api/admin/ccc/drafts/[id]` now supports:
  - normal draft saves with `change_summary`
  - `restore_version` using a stored snapshot

### 4. Draft editor UI support

- Added version-history state to the draft editor
- Added a right-panel version list
- Added per-version view and restore actions
- Added a diff modal for selected snapshots
- Added optional change-summary capture on save

### 5. Backward-compatible rollout guard

- The route tolerates pre-migration environments where `content_version_history` does not exist yet
- Save metadata is tunneled through reserved JSON keys in `p_updates` instead of forcing a breaking RPC signature change
- Result: draft reads and saves remain compatible before the migration lands, while the DB-owned version ledger activates automatically after apply

## Validation

- `npm run build` passed on the final C30 working tree
- Migration `20260502050000_c30_content_version_history.sql` applied successfully and was recorded in `schema_migrations`
- `public.content_version_history` exists with all required columns
- Real authenticated local runtime proof passed on draft `8ad8c681-ca98-42ad-a5b1-b8299a8fdb06`
- Save 1 created version `1`
- Save 2 created version `2`
- Restore of version `1` created version `3` while restoring the draft to the original state
- Direct DB verification confirmed three rows for one `draft_id` with sequential `version_number` values `1, 2, 3`

## Issue Found During Proof

- The first automated PATCH probe failed with `403 CSRF token missing or origin mismatch.`
- Admin middleware requires same-origin headers for mutations, which is correct behavior.
- The proof harness was corrected to send `Origin` and `Referer` for the local host, and the full save/save/restore flow then passed.

## Remaining Gap

- C30 is not closed in live scope yet.
- The database migration and local runtime proof are complete, but deployed production proof is still pending.
- Phase 14 remains `PARTIAL` until the deployed C30 surface is proven live and the broader RBAC lifecycle gap is closed.

## Outcome

C30 now has an implemented version-history MVP backed by a real database ledger, a real restore path, and successful local authenticated runtime proof. The remaining work is deployment proof, not more design or local feature construction.