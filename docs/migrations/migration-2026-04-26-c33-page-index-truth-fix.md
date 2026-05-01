# Migration: 20260426030500_c33_page_index_truth_fix.sql
> **Date:** April 26, 2026
> **ID:** 74 in schema_migrations
> **Priority:** Runtime Truth Stabilization
> **Bible Sections:** Section 8, Section 10-12, Section 40

---

## Changes Applied

### 1. Split page-index truth into two columns

Added:

- `indexing_status`
- `indexed_at`

Canonical truth model after the migration:

- publication truth => `status`
- indexing truth => `indexing_status`

### 2. Migrated legacy live values

The migration translated live legacy values into the canonical model.

Representative mappings:

- `active` -> `published`
- `pending_index` -> `draft`
- `disabled` -> `unpublished`
- `noindex` -> `published + blocked`
- `processing` -> `draft`

### 3. Added DB enforcement

Added:

- `page_index_status_canonical_check`
- `page_index_indexing_status_check`
- trigger `page_index_enforce_truth`

This blocks legacy publication vocabulary and normalizes invalid status/indexing combinations.

### 4. Rebound publish writes to canonical truth

Redefined `rule16_publish_draft` so publish now writes:

- `status='published'`
- `indexing_status='pending'`

## Live Execution Record

Recorded in `schema_migrations`:

| Field | Value |
|---|---|
| `id` | `74` |
| `migration_name` | `20260426030500_c33_page_index_truth_fix.sql` |
| `executed_at` | `2026-04-26T17:52:02.338Z` |

## Verification

- direct DB legacy-status count after migration => `0`
- direct DB conflicting status/indexing count after migration => `0`
- DB rejects `status='active'` => PASS
- DB canonicalizes invalid combo `draft + indexed` to `draft + blocked` => PASS
- public route/sitemap behavior now follows canonical publication truth => PASS

Primary proof artifact:

- `scripts/audit/results/2026-04-26T18-17-12-972Z-c33-page-index-truth-fix.json`