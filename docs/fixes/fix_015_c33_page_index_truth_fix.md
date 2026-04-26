# Fix: C33 Page Index Truth Fix

**Date:** 2026-04-26  
**Author:** CTO (Agent)  
**Bible Reference:** Section 8, Section 10-12, Section 40, Rule 25  
**Status:** RESOLVED LIVE

## Context

The April 26 live baseline proved that `page_index` truth was internally contradictory.

The same `status` column was being used for two different meanings at once:

1. publication state
2. indexing lifecycle state

That contradiction leaked into runtime behavior:

- some code treated `status='active'` as live publication truth
- other code treated `status='published'` as live publication truth
- indexing logic mutated the same column to model crawler state
- pending-index rows were still publicly routable in the catch-all page path

As long as those meanings stayed merged, dashboards, sitemaps, and runtime page visibility could disagree while all still reading the same table.

## Root Cause

The real defect was a schema-model collapse.

`page_index.status` had accumulated legacy values such as:

- `active`
- `pending_index`
- `disabled`
- `noindex`
- `processing`

Those values mixed publication truth with indexing truth and forced different readers to interpret the column differently.

## Deployed Change Set

### 1. Split publication truth from indexing truth

Migration `20260426030500_c33_page_index_truth_fix.sql` added:

- `indexing_status`
- `indexed_at`

Canonical publication values are now:

- `draft`
- `published`
- `unpublished`
- `archived`

Canonical indexing values are now:

- `blocked`
- `pending`
- `indexed`

### 2. Migrated live legacy data into the canonical model

The migration translated the old live values into the new two-column truth model.

Representative mappings:

- `active` -> `status='published'`
- `pending_index` -> `status='draft'`
- `disabled` -> `status='unpublished'`
- `noindex` -> `status='published', indexing_status='blocked'`
- `processing` -> `status='draft'`

### 3. Added DB-level enforcement

The migration added:

- `page_index_status_canonical_check`
- `page_index_indexing_status_check`
- trigger `page_index_enforce_truth`

That means:

- legacy status values are rejected at the database layer
- invalid publication/indexing combinations are canonicalized before commit

### 4. Rewired runtime readers to the canonical model

The live runtime now uses the new model consistently across:

- catch-all generated page lookup
- sitemap root and shard generation
- index worker selection and completion updates
- admin SEO metrics
- dashboard and metrics readers
- coverage and event graph readers

### 5. Rewired publish writes to the canonical model

`rule16_publish_draft` was redefined so publish now writes:

- `status='published'`
- `indexing_status='pending'`

That ensures new publish flow cannot reintroduce the old ambiguity.

## Verification

### Local validation

- `npm run build` => PASS
- `npm run predeploy:check` => PASS

### Live schema execution

`schema_migrations` recorded:

- `id=74`
- `migration_name=20260426030500_c33_page_index_truth_fix.sql`
- `executed_at=2026-04-26T17:52:02.338Z`

### Live C33 proof

The authoritative passing artifact is:

- `scripts/audit/results/2026-04-26T18-17-12-972Z-c33-page-index-truth-fix.json`

What passed live:

1. before/after conflict proof showed the baseline live counts moved from mixed legacy values to one canonical model
2. direct DB query returned `legacy_status_rows_after = 0`
3. direct DB query returned `conflicting_rows_after = 0`
4. direct DB insert with `status='active'` was rejected by the database constraint
5. invalid `draft + indexed` combination was canonicalized to `draft + blocked`
6. a draft test page returned `404` from the public runtime and stayed out of the sitemap
7. a published test page returned `200` and appeared in the sitemap
8. direct DB metrics and `/api/admin/seo/index-health` returned the same counts during the proof window

Important note on the metrics check:

- the consistency proof was run while the scoped published/pending audit fixture existed
- the purpose of that check was API-vs-DB truth consistency, not a claim that `published_pages=4` is a permanent steady-state total

## Outcome

C33 is now resolved live.

What changed in runtime truth:

1. publication state and indexing state are now different fields with different meanings
2. the database forbids the legacy status vocabulary from coming back
3. draft rows are no longer publicly routable or sitemap-visible just because indexing logic once used the same column
4. admin metrics, public routing, sitemap generation, and indexing workers now read one canonical model

## Result

**C33 status:** RESOLVED LIVE

Truth boundary after this fix:

- this closes the `page_index` truth contradiction and metrics split
- this does not make Phase 6 SEO/publish work complete end to end
- remaining open medium work is now C26, C29, and C30

## Cross-References

- Related audit: `docs/audits/audit-2026-04-26-c33-page-index-truth-fix-live-proof.md`
- Related migration: `docs/migrations/migration-2026-04-26-c33-page-index-truth-fix.md`
- Related fix: `docs/fixes/fix_014_rule16_transactional_integrity.md`
- Related baseline audit: `docs/audits/audit-2026-04-26-cto-live-proof-refresh.md`