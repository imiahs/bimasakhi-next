# RC-2B Cycle 5: SHOS Blast Radius and Deployment Coupling

| Field | Value |
|---|---|
| Phase | RC-2B Cycle 5 - ATOM-C |
| Decision | BLOCKED_PENDING_REVIEW |
| Reason | Required table contract mismatch + local/deployed SHOS divergence |

## 1. Deployment Coupling Analysis

### Must-deploy atomically (if ATOM-C is attempted later)

Minimum coupling set:
- lib/system/shos.js (untracked local-only core)
- app/api/admin/system/shos/route.js (untracked local-only entrypoint)
- app/api/admin/system/route.js
- app/api/admin/system/health/route.js
- app/api/admin/system-health/route.js
- app/api/admin/queue/route.js
- app/api/admin/dlq/route.js
- app/api/admin/delivery-logs/route.js
- app/api/admin/observability/route.js
- app/admin/system/page.js and features/admin/system/ShosControlCenter.jsx (if UI rollout included)

### Hidden dependency set
- system_control_actions table and indexes
- operator_status columns on job_dead_letters / generation_queue / external_delivery_logs
- system_control_config singleton semantics
- runbook engine side effects via systemModes and observability_logs
- queue publisher + event store trigger map + deliveryTruth synchronization

### Partial deployment risk

If only some SHOS-coupled routes deploy without lib/system/shos.js in production commit, runtime import failures are likely.
If shos.js deploys without route/API adoption, SHOS remains dormant and operational truth diverges.

## 2. Required Table Contract Check

Cycle-required tables:
- system_control_actions: PRESENT
- observability_logs: PRESENT
- generation_queue: PRESENT
- job_dead_letters: PRESENT
- delivery_failures: MISSING

Result:
- BLOCKING by rule: missing required table delivery_failures

Observed practical replacement table in SHOS implementation:
- external_delivery_logs (PRESENT, actively referenced by SHOS code)

This creates a contract mismatch between cycle requirement and implemented schema naming.

## 3. Blast Radius by Capability

| Capability | Primary tables/systems touched | Blast radius |
|---|---|---|
| feature_flag_set | system_control_config, system_control_actions | GLOBAL_RUNTIME |
| auto_revert in snapshot read | system_control_config, system_control_actions | GLOBAL_RUNTIME |
| dlq_retry/discard/resolve/requeue | job_dead_letters, job_runs, system_control_actions | QUEUE |
| queue_retry/clear/cancel | generation_queue, queue dispatch path, system_control_actions | QUEUE |
| delivery_retry/mark_terminal | external_delivery_logs, event_store, queue retry, qstash sync, system_control_actions | GLOBAL_RUNTIME |
| event_retry/resolve | event_store, qstash dispatch, system_control_actions | GLOBAL_RUNTIME |
| alert_fix/retry/resolve | system_alerts, alert_deliveries, mapped downstream actions | ADMIN to GLOBAL_RUNTIME |
| error_retry/resolve | system_runtime_errors/system_errors + mapped action | ADMIN to GLOBAL_RUNTIME |
| run_runbook | system_mode + flags + observability | GLOBAL_RUNTIME |

## 4. Operational Risk Register

| Risk | Severity | Notes |
|---|---|---|
| Required table delivery_failures missing | High (blocking) | Violates cycle requirement gate |
| SHOS core and route are untracked/local-only | High | Deploy coupling is fragile without atomic packaging |
| getShosSnapshot has auto-revert side-effect | Medium | Snapshot endpoint is not purely read-only |
| runbook mapping can trigger runtime mode/flag changes | High | Blast radius crosses queue/dispatch/AI controls |
| Large multi-route coupling for ATOM-C | Medium | Partial deploy produces inconsistent operator truth |
| False operational truth risk | Medium | Production currently non-SHOS while local admin paths assume SHOS |

## 5. Local vs Production Divergence (Authoritative)

| Area | Local | Production (HEAD) |
|---|---|---|
| SHOS core lib | Present (untracked) | Not present |
| SHOS route /api/admin/system/shos | Present (untracked) | Not present |
| Seven admin routes importing SHOS | Yes | No |
| SHOS UI control center | Present | Not active in deployed graph |
| Table naming assumption | external_delivery_logs | Same DB has external_delivery_logs; delivery_failures missing |

## 6. Deployment Readiness Classification

Final classification: BLOCKED_PENDING_REVIEW

### Exact blockers
1. Required-table contract mismatch: delivery_failures table missing.
2. SHOS deployment unit is not currently a clean tracked atomic set (core + route are untracked local-only).
3. Multi-route coupling means partial rollout has high inconsistency risk.

### Prerequisites before any future ATOM-C deployment attempt
1. Resolve delivery_failures contract mismatch explicitly:
   - either provision/validate delivery_failures table as required by cycle contract, or
   - formally update contract to external_delivery_logs with explicit sign-off.
2. Ensure SHOS core and route are tracked and included in atomic deployment set.
3. Freeze a precise atomic file list and pre-stage rollback target.
4. Re-run preflight import graph on all SHOS-coupled routes.
5. Validate that read endpoints invoking getShosSnapshot are acceptable with auto-revert side effect (or isolate side effect).

## 7. Rollback Considerations (Future ATOM-C)

- Rollback should target last stable auth-governed commit 9e12ef2.
- Because SHOS touches runtime controls, rollback must include all SHOS-coupled routes and SHOS core as one unit.
- No schema rollback expected if this cycle remains review-only.
