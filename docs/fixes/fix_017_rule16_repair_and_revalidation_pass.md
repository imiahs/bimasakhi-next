# Fix: Rule 16 Repair and Revalidation Pass

**Date:** 2026-04-27  
**Author:** CTO (Agent)  
**Bible Reference:** Rule 16, Section 8, Section 10-12, Section 32, Section 40  
**Status:** RESOLVED LIVE IN REQUESTED SCOPE

## Context

The earlier April 27 rerun reopened Rule 16 because two required checks no longer passed live:

1. `publish_force_db_error_then_retry`
2. `bulk_network_drop_then_retry_daemon_recovery`

The runtime repair had to close both failures in production, rerun the live harness, and produce a clean PASS artifact before Rule 16 could be closed again.

## Root Cause

The remaining failures were not inside the underlying transactional RPCs. They were in the runtime surfaces wrapped around them.

1. the public generated-page route could still serve a stale `404` after the retry had already committed the correct DB state
2. sitemap routes still depended on a brittle runtime gate and cache behavior, so the repaired slug could remain absent even when the DB was correct
3. the retry daemon only proved that a pagegen retry was re-dispatched, not that the queue/job/event actually completed
4. pagegen worker guard exits could return without closing durable event state in `event_store`
5. the audit harness itself still had a cleanup-order defect that could turn a successful runtime proof into a failing artifact

## Implemented Change Set

### 1. Generated page visibility repair

`app/[...slug]/page.js` now forces dynamic rendering and disables route revalidation caching for generated pages.

That prevents a stale negative cache from surviving after the retry commits the repaired page.

### 2. Sitemap truth repair

The sitemap routes now use runtime Supabase availability instead of a brittle `SUPABASE_ENABLED` gate:

- `app/sitemap.xml/route.js`
- `app/sitemap-index.xml/route.js`
- `app/sitemaps/[type]/route.js`

They also force dynamic execution and return `Cache-Control: no-store, max-age=0` so the repaired slug becomes visible immediately in live sitemap output.

### 3. Retry completion repair

`app/api/jobs/pagegen/route.js` now exports reusable worker logic through `executePagegenJob(body = {})` and closes durable event state on guard exits.

`app/api/jobs/event-retry/route.js` now executes `pagegen_requested` retries inline through that worker logic instead of blindly adding a second async hop.

That turns retry proof from "dispatch accepted" into "queue/job/event completion observed."

### 4. Harness cleanup repair

`scripts/audit/audit-rule16-transactional-integrity.mjs` now deletes test drafts by `bulk_job_id` before deleting the related test bulk jobs.

That removed the false cleanup failure that was previously hiding a successful runtime rerun behind a failing artifact shell.

## Verification

### Local validation

- `npm run build` => PASS
- touched runtime files returned no editor errors after the change set

### Production deploy

- `npx vercel deploy --prod --yes` => PASS

### Fresh live Rule 16 proof

Authoritative passing artifact:

- `scripts/audit/results/2026-04-27T03-58-58-051Z-rule16-transactional-integrity.json`

Key repaired checks:

1. `publish_force_db_error_then_retry` => PASS with `live_page_status=200` and `sitemap_contains_slug=true`
2. `bulk_network_drop_then_retry_daemon_recovery` => PASS with completed `job`, `queue`, and `event` state plus `retry_count=1`
3. `rule16_transactional_integrity_verdict` => PASS with `failed_checks=[]`
4. artifact top-level `status` => PASS

## Outcome

Rule 16 is closed again for the requested audited scope.

What this fix re-proved live:

1. publish retry now becomes publicly visible immediately after the DB repair commits
2. repaired slugs now appear in live sitemap output after retry
3. retry-daemon recovery now proves actual completion rather than only second-hop dispatch
4. the audit harness now completes cleanly and produces a true PASS artifact

This does not claim closure for unrelated open work such as C26, C29, or C30.

## Cross-References

- Related baseline audit: `docs/audits/audit-2026-04-27-rule16-revalidation-truth-sync.md`
- Related current audit: `docs/audits/audit-2026-04-27-rule16-repair-revalidation-pass.md`
- Related baseline fix: `docs/fixes/fix_014_rule16_transactional_integrity.md`
- Related documentation fix: `docs/fixes/fix_016_truth_sync_after_revalidation.md`