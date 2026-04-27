# Fix: Rule 16 Transactional Integrity

**Date:** 2026-04-26  
**Author:** CTO (Agent)  
**Bible Reference:** Rule 16, Section 10-12, Section 32, Section 40  
**Status:** PARTIAL AFTER APRIL 27 REVALIDATION

## Context

The April 26 live baseline proved that the system could succeed on the happy path while still failing Rule 16.

The unsafe pattern was the same across the locked surfaces:

1. publish wrote multiple related records from app code rather than inside one database-owned transaction
2. bulk generation start created queue state and external dispatch state without auditable failure proof
3. page generation persistence and admin write actions updated multiple tables without runtime rollback proof

That meant the system could appear green while still being vulnerable to partial writes, duplicate retries, or post-commit dispatch gaps.

## Root Cause

The real defect was not one broken route. It was architectural.

The critical write paths were chaining multi-table mutations in JavaScript across tables such as:

- `content_drafts`
- `page_index`
- `location_content`
- `generation_queue`
- `bulk_generation_jobs`
- `event_store`
- `custom_pages` and `page_blocks`
- `blog_posts` and `blog_post_versions`
- `seo_overrides` and `seo_versions`
- `tool_configs` and `tool_config_versions`

Without a database-owned transaction boundary, a failure after one write and before the next could leave orphan or contradictory state.

## Deployed Change Set

The Rule 16 repair moved the critical multi-table write decisions into Postgres and reduced the app layer to thin RPC callers.

### 1. Added transactional publish primitives

Migration `20260426030000_rule16_publish_pipeline_atomicity.sql` added:

- `rule16_trace_and_maybe_fail`
- `rule16_claim_idempotency_key`
- `rule16_infer_page_type`
- `rule16_publish_draft`

This created a DB-owned transaction boundary for the publish pipeline and added explicit failure-injection hooks for live proof.

### 2. Added transactional bulk, pagegen, and admin write primitives

Migration `20260426031000_rule16_bulk_admin_atomicity.sql` added or updated:

- `rule16_write_event`
- `rule16_start_bulk_generation_job`
- `rule16_pagegen_persist_generated_page`
- `rule16_finalize_generation_queue`
- `rule16_transition_draft_status`
- `rule16_update_content_draft`
- `rule16_update_custom_page`
- `rule16_update_blog_post`
- `rule16_upsert_seo_override`
- `rule16_upsert_tool_configs`

This covered the remaining locked Rule 16 scope for multi-table writes.

### 3. Rewired the app layer to the DB transaction boundary

The live code now routes the critical writes through those RPCs:

- manual publish and scheduled publish both call `rule16_publish_draft`
- bulk start calls `rule16_start_bulk_generation_job`
- pagegen persistence/finalization calls `rule16_pagegen_persist_generated_page` and `rule16_finalize_generation_queue`
- admin save flows call the dedicated transactional RPCs instead of chaining writes in route code

### 4. Added durable outbox dispatch behavior

`lib/events/dispatchPagegenOutbox.js` now dispatches `pagegen_requested` outbox rows immediately when possible and leaves a durable recovery path in `event_store` when dispatch is interrupted.

That closes the silent gap between a committed queue row and a missing external dispatch.

### 5. Aligned publish truth with the C33 status model

After `20260426030500_c33_page_index_truth_fix.sql`, `rule16_publish_draft` was redefined so publish writes now land in the canonical page-index model:

- `status = 'published'`
- `indexing_status = 'pending'`

That prevents Rule 16 from reintroducing the old C33 ambiguity.

## Verification

### Local validation

- `npm run build` => PASS
- `npm run predeploy:check` => PASS

### Live schema execution

`schema_migrations` recorded the Rule 16 migrations live:

- `id=73` => `20260426030000_rule16_publish_pipeline_atomicity.sql` => `executed_at=2026-04-26T17:52:02.098Z`
- `id=75` => `20260426031000_rule16_bulk_admin_atomicity.sql` => `executed_at=2026-04-26T17:52:02.577Z`

### Live deploy

The updated runtime was deployed to production from the live working tree with:

- `vercel --prod --yes`

### Live Rule 16 proof

The authoritative passing artifact is:

- `scripts/audit/results/2026-04-26T18-13-17-570Z-rule16-transactional-integrity.json`

What passed live:

1. publish rollback on forced DB error
2. publish rollback on process kill mid-execution
3. publish rollback on socket drop mid-execution
4. publish idempotent replay on the same key
5. bulk start rollback on forced DB error
6. bulk start rollback on process kill mid-execution
7. bulk start idempotent replay on the same key
8. bulk outbox recovery after dispatch-gap simulation through `event_store` + live retry daemon
9. pagegen persistence rollback on forced DB error
10. custom page multi-table rollback
11. blog multi-table rollback
12. SEO override multi-table rollback
13. tool config multi-row rollback
14. draft edit sync rollback
15. draft unpublish rollback
16. draft archive rollback
17. combined Rule 16 verdict => PASS

### Audit residue verification

An earlier non-authoritative harness pass proved the transactional behavior but failed cleanup ordering. That was an audit-script defect, not a runtime defect.

The harness was fixed, rerun, and then a direct DB residue scan confirmed zero remaining Rule 16 audit rows across:

- `page_index`
- `content_drafts`
- `bulk_generation_jobs`
- `generation_queue`
- `event_store`
- `custom_pages`
- `blog_posts`
- `seo_overrides`
- `tool_configs`
- `idempotency_keys`

## April 27 Revalidation Correction

Fresh rerun artifact:

- `scripts/audit/results/2026-04-27T02-21-11-828Z-rule16-transactional-integrity.json`

Supporting observability capture:

- `scripts/audit/results/2026-04-27T02-45-20-483Z-rule16-revalidation-observability.json`

What still passed in the April 27 rerun:

1. publish rollback on process kill mid-execution
2. publish rollback on socket drop mid-execution
3. bulk rollback on forced DB error
4. bulk rollback on process kill mid-execution
5. bulk same-key idempotent replay
6. pagegen persistence rollback on forced DB error
7. admin multi-table rollback checks in the audited scope

What failed in the April 27 rerun:

1. `publish_force_db_error_then_retry` failed because the retry committed DB state, but the live page returned `404` and the sitemap omitted the slug.
2. `bulk_network_drop_then_retry_daemon_recovery` failed because the main artifact never reached a completed `after_retry` state. A follow-up observability query proved that the retry daemon did dispatch the queued event, but no downstream worker completion was captured in the same window.

That means the April 26 closure claim is no longer current truth.

## Outcome

The database-owned Rule 16 primitives remain deployed, but Rule 16 is no longer closed live for the requested transactional-integrity scope.

What changed in runtime truth:

1. the critical multi-table writes now commit or roll back at the database boundary
2. idempotent replays return the original committed state instead of duplicating writes
3. bulk dispatch gaps are now auditable and recoverable through the outbox path
4. failure proof now exists with real DB errors, real process kill, and real network interruption behavior

## Result

**Rule 16 status:** PARTIAL AFTER APRIL 27 REVALIDATION

Truth boundary after this fix:

- the April 26 deploy still moved the critical write paths into DB-owned transactional primitives
- the requested Rule 16 scope is reopened until the failed April 27 publish and bulk recovery checks pass live again
- this does not mean Phase 4, Phase 6, or Phase 14 are now complete
- C26, C29, and C30 remain open separate work
- scheduled publish now shares the same transactional RPC, but scheduled runtime itself was not separately executed during this audit window

## Cross-References

- Related audit: `docs/audits/audit-2026-04-26-rule16-transactional-integrity-live-proof.md`
- Related audit: `docs/audits/audit-2026-04-27-rule16-revalidation-truth-sync.md`
- Related migration: `docs/migrations/migration-2026-04-26-rule16-publish-pipeline-atomicity.md`
- Related migration: `docs/migrations/migration-2026-04-26-rule16-bulk-admin-atomicity.md`
- Related migration: `docs/migrations/migration-2026-04-26-c33-page-index-truth-fix.md`
- Related baseline audit: `docs/audits/audit-2026-04-26-cto-live-proof-refresh.md`