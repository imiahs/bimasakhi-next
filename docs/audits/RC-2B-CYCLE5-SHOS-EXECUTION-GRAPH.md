# RC-2B Cycle 5: SHOS Execution Graph Reconstruction

| Field | Value |
|---|---|
| Phase | RC-2B Cycle 5 - ATOM-C |
| Classification | BLOCKED_PENDING_REVIEW |
| Runtime mutation during review | None |

## 1. Deployment Divergence Map (Step 1.5)

| Subsystem | State | Evidence |
|---|---|---|
| lib/system/shos.js | LOCAL_ONLY | file exists on disk, not in HEAD |
| app/api/admin/system/shos/route.js | LOCAL_ONLY | file exists on disk, not in HEAD |
| app/api/admin/system/route.js | PARTIALLY_WIRED | local imports SHOS, HEAD does not |
| app/api/admin/system/health/route.js | PARTIALLY_WIRED | local imports SHOS, HEAD does not |
| app/api/admin/system-health/route.js | PARTIALLY_WIRED | local imports SHOS, HEAD does not |
| app/api/admin/queue/route.js | PARTIALLY_WIRED | local imports performShosAction, HEAD does not |
| app/api/admin/dlq/route.js | PARTIALLY_WIRED | local imports performShosAction, HEAD does not |
| app/api/admin/delivery-logs/route.js | PARTIALLY_WIRED | local imports performShosAction, HEAD does not |
| app/api/admin/observability/route.js | PARTIALLY_WIRED | local imports getShosSnapshot, HEAD does not |
| app/admin/system/page.js + ShosControlCenter | LOCAL_ONLY | UI imports SHOS control center not in deployed runtime |

## 2. Execution Graph (Local SHOS path)

Admin UI (ShosControlCenter)
-> POST/GET /api/admin/system/shos
-> withAdminAuth(super_admin)
-> lib/system/shos.js
-> getShosSnapshot() and/or performShosAction()
-> DB reads/writes + optional runbook execution + optional QStash dispatch sync/retry paths

Additional entry points to SHOS actions:
- /api/admin/queue PATCH -> performShosAction(queue_*)
- /api/admin/dlq POST -> performShosAction(dlq_*)
- /api/admin/delivery-logs POST -> performShosAction(delivery_*)
- /api/admin/observability GET -> getShosSnapshot()
- /api/admin/system-health GET -> getShosSnapshot()
- /api/admin/system/health GET -> getShosSnapshot()
- /api/admin/system GET -> getShosSnapshot()

## 3. Action Surface in performShosAction()

### Feature flag mutation paths
- feature_flag_set
  - Writes system_control_config
  - Writes system_control_actions
  - Supports validated, force, disable modes
  - Supports auto_revert_at scheduling metadata

### DLQ mutation paths
- dlq_retry / dlq_retry_all
  - Inserts into job_runs
  - Updates job_dead_letters status/notes/retry metadata
  - Writes system_control_actions
- dlq_discard / dlq_clear_all / dlq_resolve
  - Updates job_dead_letters operator status and resolution metadata
  - Writes system_control_actions
- dlq_requeue
  - Re-opens handled DLQ rows back to pending
  - Writes system_control_actions

### Queue mutation paths
- queue_retry_failed
  - Updates generation_queue failed rows to pending
  - Can enqueue page generation dispatch
  - Writes system_control_actions
- queue_cancel_failed / queue_clear_failed
  - Updates generation_queue status/operator state
  - Writes system_control_actions

### Delivery mutation paths
- delivery_retry / delivery_retry_all
  - Reads failed external_delivery_logs
  - Retry through event_store dispatch, queue retry, or syncExternalDelivery
  - Updates external_delivery_logs operator state
  - Writes system_control_actions
- delivery_mark_terminal
  - Marks external_delivery_logs rows terminal
  - Writes system_control_actions

### Event/alert/error/runbook paths
- event_retry / event_resolve
- alert_fix / alert_retry / alert_resolve
- error_retry / error_resolve
- run_runbook
- delivery_sync_pending

These paths can mutate event_store, alert tables, system_errors/system_runtime_errors, system_control_config, and observability logs via downstream logic.

## 4. Mode Authority Classification

| Capability | Classification |
|---|---|
| safe mode toggle (safe_mode flag) | IMPLEMENTED (via feature_flag_set) |
| degraded mode activation | PARTIALLY_WIRED (via runbook actions through systemModes, not direct SHOS flag) |
| maintenance mode activation | DECORATIVE in SHOS layer (no direct performShosAction branch for maintenance mode) |

## 5. Hidden/Automatic Execution Checks

| Check | Result |
|---|---|
| Automatic self-healing loops | Present only as explicit runbook execution paths; not silent background loop inside SHOS core |
| Hidden retry orchestration | No hidden loop; retries occur only when SHOS actions are called |
| Silent runtime mutation loop | Auto-revert processing exists in getShosSnapshot via processDueFeatureFlagReverts (time-based, explicit action log write) |

## 6. Execution Path Risk Classification

| Path family | Classification |
|---|---|
| getShosSnapshot read assembly | READ_ONLY plus AUTO_REVERT side-effect |
| feature_flag_set | SAFE_MUTATION (high governance impact) |
| DLQ actions | HIGH_RISK_MUTATION |
| queue_* actions | HIGH_RISK_MUTATION |
| delivery_* actions | HIGH_RISK_MUTATION |
| event_* actions | HIGH_RISK_MUTATION |
| alert/error resolve+retry | SAFE_MUTATION to HIGH_RISK depending mapped action |
| run_runbook | HIGH_RISK_MUTATION |

## 7. Key Reconstruction Result

SHOS is not currently production-active in deployed code path. The local graph is comprehensive and mutation-capable, but remains undeployed and coupled across multiple admin routes plus one untracked core library and one untracked SHOS route.
