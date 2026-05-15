# RC-2L Post-Canary Stability Baseline

Date: 2026-05-16
Cycle: RC-2L (post-canary convergence authorization)
Mode: read-only runtime verification

---

## Scope Lock

This cycle performed no deployment expansion, no schema/migration changes, no auth/middleware redesign, no queue or DLQ replay, and no feature rollout.

## Baseline Capture Window

Protected authenticated durability probes were captured in a short sequential window:

- sample window timestamps: `2026-05-15T20:56:01Z` to `2026-05-15T20:56:16Z`
- uncached continuity checks: `2026-05-15T20:56:29Z`

## Authoritative Runtime Snapshot

### 1. Suppression Status

- `/api/admin/system/shos` => `200`
- `auto_reverts.suppressed=true`
- `auto_reverts.reverted=0`
- operator metrics remained stable (`queue_failed=0`, `delivery_failed=0`, `dlq_pending=0`)

### 2. Queue Stability

- `/api/admin/queue` => `200`
- `pending=0`, `processing=0`, `failed=0`
- no delayed failed-state emergence observed in sampled window

### 3. DLQ Stability

- `/api/admin/dlq` => `200`
- `total=0` (endpoint list total)
- historical dead-letter signal remains visible in health warning channel (`historical_dead_letters:2`)

### 4. Delivery Stability

- `/api/admin/delivery-logs` => `200`
- `delivery_failures_recent=0`
- `delivery_stuck_count=0`
- `delivery_success_rate=100`

### 5. Observability Consistency

- `/api/admin/observability` => `200`
- `system_mode=normal`, `queue_depth=0`, `event_store.failed=0`, `event_store.stuck_count=0`
- `/api/admin/system/health` => `200`, `overall_health=DEGRADED`
- retained hard-failure signature: `unacknowledged_escalations`
- retained warning signature: `historical_dead_letters:2`

### 6. Auth Continuity + Protected Endpoint Continuity

- `/admin/system` reachable under active session (`200`)
- `/api/admin/system` => `200`
- `/api/admin/observability` => `200`
- `/api/admin/system/shos` => `200`
- no auth-session collapse observed during sampled durability window

### 7. Runtime Version Continuity

- uncached `/api/status` => `version=07607b5`
- protected `/api/admin/system/health` => `version=07607b5`
- public `/api/health` => `status=ok`, `redis=connected`, `supabase=ok`

## Baseline Classification

- Runtime stability posture: STABLE_WITH_RESIDUAL_DEGRADED_SIGNALS
- Protected observability continuity: ACTIVE
- Suppression continuity: ACTIVE
- Immediate rollback debt emergence: NOT OBSERVED IN SAMPLE WINDOW
