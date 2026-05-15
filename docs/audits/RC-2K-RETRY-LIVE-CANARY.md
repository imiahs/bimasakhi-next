# RC-2K Retry Live Canary Execution

Date: 2026-05-16
Cycle: RC-2K retry
Scope: FIRST REAL GUARDED LIVE CANARY EXECUTION (exact 11-file SHOS suppression canary)

---

## 1. Deployment Trigger

- Pre-deploy SHA: `9e12ef2188931a12b2157ace4dce9c6d355edc20`
- Canary commit SHA: `3a2edb908ecd89c68378c73bbe9e1cd9378e5346`
- Branch: `main`
- Push result: `9e12ef2 -> 3a2edb9` on `origin/main`
- Deployment timeline anchor: `2026-05-16T02:14:09.1631337+05:30`

## 2. Manifest Integrity (Deployment Discipline)

Deployed with exact 11-file staging only:

1. `lib/system/shos.js`
2. `app/api/admin/system/shos/route.js`
3. `features/admin/system/ShosControlCenter.jsx`
4. `app/admin/system/page.js`
5. `app/api/admin/system/route.js`
6. `app/api/admin/system/health/route.js`
7. `app/api/admin/system-health/route.js`
8. `app/api/admin/queue/route.js`
9. `app/api/admin/dlq/route.js`
10. `app/api/admin/delivery-logs/route.js`
11. `app/api/admin/observability/route.js`

No non-manifest files were staged for deployment.

## 3. Post-Deploy Propagation Evidence

Public deployment version evidence:

- `GET /api/status` => `version: "3a2edb9"`

Protected post-deploy shift:

- pre-deploy: `GET /api/admin/system/shos` => `404`
- post-deploy: `GET /api/admin/system/shos` => `200`

## 4. Coexistence Observation Samples (authenticated operator browser)

Sample A:

- `/api/admin/system/shos` => `200`, `auto_reverts.suppressed=true`, `reverted=0`, `queue_failed=0`, `delivery_failed=0`, `dlq_pending=0`
- `/api/admin/system/health` => `200`, `version=3a2edb9`, `overall_health=DEGRADED`, `hard_failures=["unacknowledged_escalations"]`, `warnings=["historical_dead_letters:2"]`
- `/api/admin/queue` => `200`, `pending=0`, `processing=0`, `failed=0`
- `/api/admin/dlq` => `200`, `total=0`
- `/api/admin/delivery-logs` => `200`, `delivery_failures_recent=0`, `delivery_stuck_count=0`, `delivery_success_rate=100`

Sample B (repeat check):

- `/api/admin/system/shos` => `200`, `auto_reverts.suppressed=true`
- `/api/admin/system/health` => `200`, `version=3a2edb9`, same hard-failure signature (`unacknowledged_escalations`)

Public baseline remained reachable:

- `GET /api/health` => `{"status":"ok","redis":"connected","supabase":"ok"}`

## 5. Risk Classification

- Coexistence state: SAFE_OBSERVATION (suppression active and stable across repeat sample)
- Regression state: NO_NEW_CANARY_REGRESSION_SIGNAL in queue/DLQ/delivery channels
- Residual risk: PRE_EXISTING_DEGRADED_HEALTH (`unacknowledged_escalations`) remains active and must not be masked as canary success proof beyond scope

## 6. Decision

RC-2K retry canary execution outcome:

- DEPLOYED
- SUPPRESSION VERIFIED ACTIVE
- COEXISTENCE ACCEPTED IN GUARDED WINDOW
- ROLLBACK NOT TRIGGERED

The run remains valid as first guarded live canary execution under rollback-first discipline, with explicit residual degraded-health caveat preserved.
