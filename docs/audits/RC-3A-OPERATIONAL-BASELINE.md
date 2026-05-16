# RC-3A Post-Convergence Operational Baseline

Date: 2026-05-16
Cycle: RC-3A (controlled SHOS operational expansion authorization)
Mode: read-only baseline capture

---

## Scope Lock

No deployment expansion, no schema/migration changes, no auth/middleware redesign, no queue/DLQ replay, and no feature activation occurred in RC-3A baseline capture.

## Baseline Capture Window

Uncached protected/public probes captured across three sequential rounds:

- 2026-05-16T12:14:01Z
- 2026-05-16T12:14:08Z
- 2026-05-16T12:14:14Z

## Required Baseline Checks

### 1. SHOS Suppression Status

- `/api/admin/system/shos` => `200` in all rounds
- `auto_reverts.suppressed=true` in all rounds
- `auto_reverts.reverted=0` in all rounds

### 2. Observability Stability

- `/api/admin/observability` => `200` in all rounds
- `system_mode=normal`
- `queue_depth=0`
- `event_store.failed=0`
- `event_store.stuck_count=0`

### 3. Queue Stability

- `/api/admin/queue` => `200`
- `pending=0`, `processing=0`, `failed=0`

### 4. Rollback Readiness Signals

- no active canary-channel rollback trigger observed
- protected control/health surfaces remained reachable
- rollback-first decision posture remains operationally valid

### 5. Auth Continuity

- `/admin/system` => `200` in all rounds
- `/api/admin/system` => `200`
- `/api/admin/observability` => `200`
- `/api/admin/system/health` => `200`

### 6. Runtime Convergence Continuity

- `/api/status` version: `09b8e23` in all rounds
- `/api/admin/system/health` version: `09b8e23` in all rounds
- public `/api/health`: `status=ok`, `redis=connected`, `supabase=ok`

### 7. Residual Degraded Signals

Persisting bounded residuals:

- health hard failure: `unacknowledged_escalations`
- health warning: `historical_dead_letters:2`
- consistency friction: `matches_health_dlq_total=false`

### 8. Protected Observability Continuity

All protected endpoints required for operator truth remained continuously available in sampled window.

## Baseline Outcome

Operational baseline classification:

STABLE_WITH_BOUNDED_RESIDUAL_RISK
