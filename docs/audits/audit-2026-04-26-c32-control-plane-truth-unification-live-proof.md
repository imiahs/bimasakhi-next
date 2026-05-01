# C32 Control-Plane Truth Unification Live Proof - 2026-04-26

**Status:** CURRENT TRUTH FOR C32  
**Audit Type:** Live runtime truth proof  
**Primary Reference:** `docs/fixes/fix_013_c32_control_plane_truth_unification.md`  
**Secondary References:** `docs/migrations/migration-2026-04-26-c32-control-plane-truth-unification.md`, `docs/audits/audit-2026-04-26-cto-live-proof-refresh.md`, `docs/CONTENT_COMMAND_CENTER.md`, `docs/INDEX.md`  
**Execution Window:** 2026-04-26 UTC / IST

## 1. Executive Summary

C32 is now resolved live.

The baseline contradiction was that runtime control truth was split between `system_control_config` and `feature_flags`. Health normalization had already reduced surface drift after C24, but the actual source of truth was still not unified.

After the C32 migration and production deploy:

- `safe_mode`, `pagegen_enabled`, and `bulk_generation_enabled` now exist only in `system_control_config`
- those keys no longer exist in `feature_flags`
- the admin feature flag surface returns those keys from `system_control_config`
- the admin health surface reports `conflicting_states_possible: false`

The live proof passed end to end.

## 2. Evidence Files

- `scripts/audit/results/2026-04-26T17-00-58-758Z-control-plane-truth-unification-ps.json`
- `scripts/audit/results/2026-04-26T16-59-37-430Z-control-plane-truth-unification-ps.json`
- `docs/fixes/fix_013_c32_control_plane_truth_unification.md`
- `docs/migrations/migration-2026-04-26-c32-control-plane-truth-unification.md`

## 3. Baseline Contradiction

The baseline live audit before repair proved:

- system health relied on normalized truth, not a unified source
- `safe_mode` still came from `feature_flags`
- runtime control keys could disagree between `system_control_config` and `feature_flags`

That contradiction was recorded in:

- `docs/audits/audit-2026-04-26-cto-live-proof-refresh.md`

## 4. Change Applied

### Database

The migration `20260426020000_c32_control_plane_truth_unification.sql`:

1. added `safe_mode`, `pagegen_enabled`, and `bulk_generation_enabled` to `system_control_config`
2. copied legacy values from `feature_flags` into the singleton control row
3. deleted those legacy rows from `feature_flags`
4. added the `feature_flags_no_control_plane_keys` constraint to block their return

### Application

The deployed app now:

- resolves the canonical runtime keys from `system_control_config`
- blocks reserved control-plane keys from the legacy flag creation route
- reports truthful control-plane metadata from the health endpoint

## 5. Proof Notes

The first post-deploy proof attempt was `PARTIAL`, but that was a proof-script defect, not a runtime defect.

Cause:

- the PowerShell audit script unwrapped single-item arrays and misread one-row responses as empty

Correction:

- the proof script was fixed to preserve arrays correctly
- the same live proof was rerun immediately

The final pass artifact is the authoritative C32 proof.

## 6. Live Proof Table

| Check | Surface | Result | Status |
|---|---|---|---|
| `direct_rest_control_plane_row` | direct Supabase REST | `200`; canonical row returned from `system_control_config` with `safe_mode`, `pagegen_enabled`, `bulk_generation_enabled` present | PASS |
| `direct_rest_legacy_control_keys_absent` | direct Supabase REST | `200`; zero rows returned from `feature_flags` for reserved control-plane keys | PASS |
| `admin_login` | production admin auth | `200`; authenticated session established | PASS |
| `admin_feature_flags_single_source` | `/api/admin/feature-flags` | each canonical key returned exactly once with `source: system_control_config` and value matching direct REST | PASS |
| `admin_system_health_single_source` | `/api/admin/system/health` | `control_plane_source`, `system_mode_source`, `operational_flags_source`, and `safe_mode_source` all reported `system_control_config`; `conflicting_states_possible: false` | PASS |
| `control_plane_truth_unification_verdict` | combined verdict | all required checks passed | PASS |

## 7. Representative Live Evidence

From the passing result file:

- direct REST row:
  - `singleton_key: true`
  - `system_mode: normal`
  - `safe_mode: false`
  - `pagegen_enabled: false`
  - `bulk_generation_enabled: false`
- legacy key absence:
  - `feature_flags` query for those three keys returned `row_count: 0`
- admin feature flags:
  - `safe_mode` => `count: 1`, `source: system_control_config`, `value_matches_rest: true`
  - `pagegen_enabled` => `count: 1`, `source: system_control_config`, `value_matches_rest: true`
  - `bulk_generation_enabled` => `count: 1`, `source: system_control_config`, `value_matches_rest: true`
- admin system health:
  - `control_plane_source: system_control_config`
  - `safe_mode_source: system_control_config`
  - `conflicting_states_possible: false`

## 8. Verdict

**C32 status:** RESOLVED LIVE

What is now proven:

- one runtime control-plane source exists for the canonical guard keys
- the old duplicate key path in `feature_flags` has been removed
- the database prevents those duplicate keys from being recreated there
- admin and health surfaces now expose the same source-of-truth story as the underlying database

Next locked work after C32:

1. Rule 16 transactional proof
2. C33 page index status truth cleanup