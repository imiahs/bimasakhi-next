# Migration: 20260426020000_c32_control_plane_truth_unification.sql
> **Date:** April 26, 2026
> **ID:** 72 in schema_migrations
> **Priority:** Runtime Truth Stabilization
> **Bible Sections:** 32, 39, 40

---

## Changes Applied

### 1. ALTER TABLE `system_control_config`

Added canonical runtime control columns:

| Column | Type | Default | Notes |
|---|---|---|---|
| `safe_mode` | BOOLEAN | `FALSE` | emergency global pause |
| `pagegen_enabled` | BOOLEAN | `TRUE` | page generation worker guard |
| `bulk_generation_enabled` | BOOLEAN | `TRUE` | bulk planner worker guard |

### 2. Backfill from legacy `feature_flags`

The migration copied the existing live values for:

- `safe_mode`
- `pagegen_enabled`
- `bulk_generation_enabled`

from `feature_flags` into the singleton row in `system_control_config` and refreshed `updated_at`.

### 3. Delete legacy duplicate control keys

Removed these rows from `feature_flags`:

- `safe_mode`
- `pagegen_enabled`
- `bulk_generation_enabled`

### 4. Add duplicate-prevention constraint

Added constraint:

- `feature_flags_no_control_plane_keys`

Constraint rule:

- `feature_flags.key` may not be `safe_mode`, `pagegen_enabled`, or `bulk_generation_enabled`

## Live Execution Record

Recorded in `schema_migrations`:

| Field | Value |
|---|---|
| `id` | `72` |
| `migration_name` | `20260426020000_c32_control_plane_truth_unification.sql` |
| `executed_at` | `2026-04-26T16:49:57.409037+00:00` |

## Verification

- direct REST query to `system_control_config` returned the canonical row with all three new control columns present
- direct REST query to `feature_flags` returned zero rows for the three reserved runtime keys
- admin `/api/admin/feature-flags` returned those keys from `system_control_config`
- admin `/api/admin/system/health` reported `conflicting_states_possible: false`

Primary proof artifact:

- `scripts/audit/results/2026-04-26T17-00-58-758Z-control-plane-truth-unification-ps.json`