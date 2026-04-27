# C33 Page Index Truth Fix Live Proof - 2026-04-26

**Status:** CURRENT TRUTH FOR C33 ONLY  
**Audit Type:** Live runtime truth proof with direct DB verification  
**Primary Reference:** `docs/fixes/fix_015_c33_page_index_truth_fix.md`  
**Secondary References:** `docs/migrations/migration-2026-04-26-c33-page-index-truth-fix.md`, `docs/audits/audit-2026-04-26-cto-live-proof-refresh.md`, `docs/CONTENT_COMMAND_CENTER.md`, `docs/INDEX.md`  
**Execution Window:** 2026-04-26 UTC / IST

## 1. Executive Summary

C33 remains resolved live for the `page_index` truth contradiction only.

The baseline contradiction was that `page_index.status` was doing two jobs at once: publication truth and indexing lifecycle truth. That allowed readers, dashboards, sitemaps, and runtime visibility to disagree even when they were all reading `page_index`.

After the C33 migration and runtime rewiring:

- publication truth now lives in `status`
- indexing truth now lives in `indexing_status`
- legacy status values are blocked by the database
- runtime readers and admin metrics use one canonical model

## 2. Evidence Files

- `scripts/audit/results/2026-04-26T18-17-12-972Z-c33-page-index-truth-fix.json`
- `docs/fixes/fix_015_c33_page_index_truth_fix.md`
- `docs/migrations/migration-2026-04-26-c33-page-index-truth-fix.md`

## 3. Baseline Contradiction

The live pre-fix snapshot recorded:

- `active = 3`
- `archived = 3`
- `pending_index = 7`
- `unpublished = 1`
- `pendingVisibleRows = 7`
- `activeWithoutContent = 0`

That was the contradiction C33 had to remove.

## 4. Direct DB Truth After C33

The passing direct DB snapshot returned:

- `archived + blocked = 3`
- `draft + blocked = 7`
- `published + indexed = 3`
- `unpublished + blocked = 1`
- `legacy_status_rows_after = 0`
- `conflicting_rows_after = 0`

This proves the mixed legacy vocabulary is gone and that the new two-column model is internally consistent.

## 5. Live Proof Table

| Check | Result | Status |
|---|---|---|
| `c33_migration_recorded` | migration `20260426030500_c33_page_index_truth_fix.sql` recorded in `schema_migrations` | PASS |
| `c33_before_after_conflict_proof` | baseline mixed statuses replaced by canonical `status + indexing_status`; legacy/conflict counts both `0` | PASS |
| `db_rejects_legacy_page_status` | direct insert with `status='active'` failed on `page_index_status_canonical_check` | PASS |
| `db_canonicalizes_invalid_status_combo` | direct insert with `draft + indexed` stored as `draft + blocked` with `indexed_at = null` | PASS |
| `runtime_visibility_matches_canonical_status` | draft route returned `404`, published route returned `200`, sitemap excluded draft and included published | PASS |
| `admin_login_for_c33_metrics` | authenticated admin session established live | PASS |
| `c33_metrics_consistency` | direct DB metrics and `/api/admin/seo/index-health` returned the same counts during the proof window | PASS |
| `c33_page_index_truth_fix_verdict` | all required checks passed | PASS |

## 6. Representative Live Evidence

From the passing artifact:

- legacy insert error: `violates check constraint "page_index_status_canonical_check"`
- canonicalization insert returned `status='draft'`, `indexing_status='blocked'`, `indexed_at=null`
- public runtime check returned `draft_status: 404`, `published_status: 200`
- sitemap check returned `sitemap_contains_draft: false`, `sitemap_contains_published: true`

Metrics consistency evidence during the proof window:

- direct DB: `published_pages=4`, `pending_pages=1`, `blocked_pages=0`
- admin API: `indexed_pages=4`, `pending_pages=1`, `noindex_pages=0`

Important boundary:

- those counts were measured while the temporary published/pending audit fixture existed
- the proof objective there was consistency between DB truth and API truth, not a permanent claim about steady-state totals

## 7. Verdict

**C33 status:** CURRENT TRUTH FOR C33 ONLY

What is now proven:

- `page_index` has one canonical publication truth model
- the database blocks legacy status vocabulary from reappearing
- invalid publication/indexing combinations are corrected before commit
- draft pages are no longer publicly visible or sitemap-visible through the old `pending_index` ambiguity
- admin metrics now agree with direct DB truth
- this does not close broader Rule 16 or publish-pipeline runtime behavior

What remains outside this proof boundary:

- this closes the C33 truth contradiction only
- it does not claim Phase 6 SEO/publish work is complete in full
- remaining open medium work is now C26, C29, and C30