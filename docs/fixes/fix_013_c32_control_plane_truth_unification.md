# Fix: C32 Control-Plane Truth Unification

**Date:** 2026-04-26  
**Author:** CTO (Agent)  
**Bible Reference:** Section 32, Section 39, Section 40, Rule 25  
**Status:** RESOLVED LIVE

## Context

The April 26 live audit proved that runtime control truth was split across two different stores:

1. `system_control_config` held operational controls and health-facing state
2. `feature_flags` still held the runtime guard keys `safe_mode`, `pagegen_enabled`, and `bulk_generation_enabled`

That meant the system could report one control-plane truth in health while workers and admin flag writes still depended on another table. C32 required one single source of truth, no silent fallback overrides, and live proof that contradictory states were no longer possible.

## Root Cause

The contradiction was caused by a legacy abstraction split:

- `lib/system/systemModes.js`, `lib/system/featureFlags.js`, and C24 health normalization already used `system_control_config`
- the older `lib/featureFlags.js` still read and wrote `feature_flags`
- `/api/admin/feature-flags` still allowed runtime control keys to be mutated in `feature_flags`
- `/api/admin/system/health` had to normalize around that split and reported `safe_mode_source: 'feature_flags'`

So the app had two writeable control stores for the same runtime decisions.

## Change Set

### 1. Canonicalized runtime control keys in `system_control_config`

Added live singleton-row columns for:

- `safe_mode`
- `pagegen_enabled`
- `bulk_generation_enabled`

The C32 migration copied the current values from legacy `feature_flags` into the singleton row and updated `updated_at`.

### 2. Removed the legacy duplicate keys from `feature_flags`

The migration deleted:

- `safe_mode`
- `pagegen_enabled`
- `bulk_generation_enabled`

Then it added a database constraint:

- `feature_flags_no_control_plane_keys`

That constraint blocks those three runtime keys from being inserted into `feature_flags` again, so the duplicate state cannot reappear through normal app writes or direct SQL inserts.

### 3. Rewired runtime reads and writes to the canonical store

Updated `lib/featureFlags.js` so that the three canonical runtime keys now resolve from `system_control_config` instead of `feature_flags`.

Important safety behavior after the change:

- `safe_mode`, `pagegen_enabled`, and `bulk_generation_enabled` now have one read source only
- missing control-plane reads fail safe for worker guards
- `checkSafeMode()` and `isSystemEnabled()` no longer depend on the legacy flag table for those keys

### 4. Blocked legacy re-entry at the admin API layer

Updated `/api/admin/feature-flags` so reserved control-plane keys cannot be created through the legacy flag creation path.

Reserved keys:

- `safe_mode`
- `pagegen_enabled`
- `bulk_generation_enabled`

### 5. Made system health truth explicit

Updated `lib/system/systemHealth.js` so the control-plane metadata now reports:

- `control_plane_source: 'system_control_config'`
- `system_mode_source: 'system_control_config'`
- `operational_flags_source: 'system_control_config'`
- `safe_mode_source: 'system_control_config'`
- `conflicting_states_possible: false`

## Deployment and Migration

### Local validation

- `npm run build` => PASS
- `npm run predeploy:check` => PASS
- drift check before migration showed only one repo-only migration: `20260426020000_c32_control_plane_truth_unification.sql`

### Live schema execution

The migration was applied live through the repo migration runner.

Recorded migration facts:

- `schema_migrations.id` => `72`
- `migration_name` => `20260426020000_c32_control_plane_truth_unification.sql`
- `executed_at` => `2026-04-26T16:49:57.409037+00:00`

Operational note:

The generic migration runner also recorded three earlier migrations that were already structurally present in live schema but had remained unrecorded in `schema_migrations`:

- `038_observability_source_enforcement.sql`
- `20260419_fix1f_media_draft_fk.sql`
- `20260420_priority_r_schema_fixes.sql`

That was not new schema behavior for those changes. It only closed the registry gap that the drift checker had already identified as structurally satisfied.

### Live deploy

The updated app code was deployed to production with:

- `vercel --prod --yes`

Deployment result:

- production deployment URL created successfully
- aliased live to `https://bimasakhi.com`

## Verification

Primary live proof artifact:

- `scripts/audit/results/2026-04-26T17-00-58-758Z-control-plane-truth-unification-ps.json`

Live proof passed all required checks:

1. direct REST read from `system_control_config` returned the canonical runtime row with:
   - `safe_mode: false`
   - `pagegen_enabled: false`
   - `bulk_generation_enabled: false`
2. direct REST read from `feature_flags` returned zero rows for those three reserved keys
3. authenticated `/api/admin/feature-flags` returned exactly one row per canonical key and each reported `source: system_control_config`
4. authenticated `/api/admin/system/health` reported all control-plane sources as `system_control_config`
5. final verdict recorded `conflicting_states_possible: false`

Final verdict check:

- `control_plane_truth_unification_verdict` => `PASS`

## Outcome

**C32 status:** RESOLVED LIVE

Conflicting runtime control states are no longer possible through the previous split path because:

1. the canonical runtime keys now exist only in `system_control_config`
2. the legacy duplicate rows were removed from `feature_flags`
3. a database constraint blocks those keys from being reinserted into `feature_flags`
4. runtime helper reads and admin surfaces now resolve those keys from the canonical singleton row

## Cross-References

- Related audit: `docs/audits/audit-2026-04-26-c32-control-plane-truth-unification-live-proof.md`
- Related migration note: `docs/migrations/migration-2026-04-26-c32-control-plane-truth-unification.md`
- Related audit baseline: `docs/audits/audit-2026-04-26-cto-live-proof-refresh.md`