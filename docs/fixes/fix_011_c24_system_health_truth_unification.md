# Fix: C24 System Health Truth Unification

**Date:** 2026-04-26  
**Author:** CTO (Agent)  
**Bible Reference:** Section 39, Section 40, Rule 25  
**Status:** RESOLVED LIVE

## Context

The April 26 live audit proved that production system health was not trustworthy. `/api/status`, `/api/admin/system/health`, and `/api/admin/vendor-health` were using overlapping but different logic, while the admin shell and the health page were not consuming the same truth surface.

The first post-deploy proof for version `fcffe61` showed that the shared health code was live, but production still returned `DEGRADED` for a truthful reason: the only remaining hard failure was `dead_required_crons:event-retry,vendor-health-check`.

That meant C24 had two separate responsibilities:

1. eliminate the split-truth health model
2. restore the actual live cron execution path so green would be earned, not faked

## Root Cause

The real C24 failure chain had four layers:

1. health verdict logic was duplicated across multiple routes instead of being computed once
2. the live UI consumed different health surfaces, which made disagreement possible
3. `vendor-health-check` was missing from the live QStash schedule set, so a required cron was genuinely dead
4. `app/api/jobs/event-retry/route.js` still had a live runtime defect on the idle path because `supabase` was referenced before initialization when no retryable events were found

Important boundary:

- the remaining `historical_dead_letters:3` condition was not a live failure and should stay visible only as a warning
- `morning-brief` remained `unknown`, but it is explicitly non-required and must not make the system unhealthy

## Deployed Change Set

The C24 change set unified health truth and repaired the live cron layer end to end:

1. Added `lib/system/systemHealth.js`.
   - Creates the single server-side health snapshot.
   - Distinguishes hard failures from warnings.
   - Encodes the real cron expectations: `alert-scan` 5m, `reconciliation` 30m, `event-retry` 5m, `vendor-health-check` 5m, `morning-brief` 24h non-required.
2. Updated `app/api/admin/system/health/route.js`.
   - Delegates directly to the shared health snapshot.
3. Updated `app/api/status/route.js`.
   - Exposes the shared `overall_health` and maps it to `status`.
4. Updated `app/api/admin/vendor-health/route.js`.
   - Stops inventing its own overall verdict.
   - Embeds the shared `system_health` payload and normalizes the same health truth for the UI.
5. Updated `app/admin/ClientLayout.jsx`.
   - Health badge now reads `overall_health` and uses `no-store` fetches.
6. Updated `app/admin/system/health/page.js`.
   - Uses cache-busting fetch behavior.
   - Renders `System Health Dashboard` against the normalized vendor-health payload.
7. Updated `lib/adminApi.js`.
   - Fixes the stale admin health path to `/api/admin/system/health`.
8. Updated `lib/monitoring/alertSystem.js`.
   - Auto-resolves alerts whose rules now evaluate to `ok`.
9. Updated `app/api/jobs/event-retry/route.js`.
   - Adds `RETRY_DAEMON_RUN` logging on idle runs.
   - Restores the missing `const supabase = getServiceSupabase();` so idle runs no longer fail before logging.
10. Updated `scripts/setup_qstash_crons.mjs`.
    - Adds `vendor-health-check` to the expected production schedule set.
11. Updated `scripts/checkMigrationDrift.js`.
    - Clears a false deployment blocker by recognizing three historically unrecorded but structurally present live migrations.
12. Recreated the live QStash schedules.
    - Restored `event-retry`, `vendor-health-check`, and the complete expected cron set in production.
13. Forced immediate live execution of the two previously dead required jobs.
    - `event-retry` was published through QStash.
    - `vendor-health-check` was executed directly and returned `200`.

## Verification

- Local validation:
  - `npm run build` passed after the health unification patch.
  - `get_errors` returned clean for the patched `event-retry` route after the final runtime fix.
- Pre-fix live proof:
  - `scripts/audit/results/2026-04-26T16-01-10-956Z-c24-system-health-live-proof.json`
  - `/api/status` => `status: degraded`, `overall_health: DEGRADED`
  - `/api/admin/system/health` => `overall_health: DEGRADED`
  - `summary.hard_failures = ["dead_required_crons:event-retry,vendor-health-check"]`
- Cron recovery proof:
  - `scripts/audit/results/2026-04-26T16-06-51-148Z-c24-cron-recovery-proof.json`
  - live schedules before recovery: `4`
  - live schedules after recovery: `6`
  - `event-retry` schedule restored as `scd_5Nf3aEoA776GrqKp1nubmAh1BTSU`
  - `vendor-health-check` schedule restored as `scd_6JLsqxLgc5n49AW58rfZPicmAZiw`
  - forced `event-retry` publish accepted with message id `msg_26hZCxZCuWyyTWPmSVBrNC1RACnPRaZfJ1AVuz9HKawNFiprbN7eMQ3MKBL5MTs`
  - direct `vendor-health-check` returned `200` with `supabase_status: healthy`, `supabase_latency_ms: 341`
- Post-fix live proof:
  - `scripts/audit/results/2026-04-26T16-08-40-681Z-c24-system-health-postfix-proof.json`
  - `/api/status` => `status: ok`, `overall_health: HEALTHY`, `version: fcffe61`
  - `/api/admin/system/health` => `overall_health: HEALTHY`, `hard_failures: []`, `warnings: ["historical_dead_letters:3"]`
  - `/api/admin/vendor-health` => `overall.health: healthy`, embedded `system_health.overall_health: HEALTHY`
  - `event-retry` => `healthy`, last run `2026-04-26T16:06:49.960602+00:00`
  - `vendor-health-check` => `healthy`, last run `2026-04-26T16:06:51.195707+00:00`
- Live browser proof:
  - authenticated `/admin/system/health` rendered `System Health Dashboard`
  - admin shell badge showed `HEALTHY`
  - system summary card rendered `SYSTEM HEALTH healthy`

## Outcome

The C24 system health blocker is closed.

What changed in runtime truth:

1. there is now one live health verdict across the public status route, admin health route, and vendor health route
2. the green state is tied to real required cron freshness, not UI cosmetics or hand-waved overrides
3. historical DLQ state remains visible as a warning without falsely degrading the system
4. the live admin health UI now renders the same healthy state that the APIs report

## Result

**C24 status:** RESOLVED LIVE

Truth boundary after this fix:

- Phase 21 is still `PARTIAL`, not `COMPLETE`
- C25 remains open: direct Supabase REST audit path still returns `401`
- C32 remains open: control-plane truth still spans `system_control_config` and `feature_flags`
- deeper QStash delivery-log proof and communication failover proof are still open Phase 21 work

## Cross-References

- Related audit: `docs/audits/audit-2026-04-26-c24-system-health-live-proof.md`
- Related audit: `docs/audits/verified-live-system-audit-2026-04-26.md`
- Related audit: `docs/audits/audit-2026-04-26-cto-live-proof-refresh.md`