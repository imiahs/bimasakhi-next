# RC-2D Mutation Suppression Design Reconstruction

Date: 2026-05-14
Mode: Design-only, no implementation

## Primary Objective Outcome

Smallest safe suppression boundary required for first SHOS deploy is reconstructed.

Final RC-2D decision:
MINIMAL_SUPPRESSION_PATH_RECONSTRUCTED

This does not authorize implementation or deployment.

## Suppression Target Reconstruction

| Runtime Behavior | Suppression Required | Deploy Risk | Rollback Impact | Observability Safe |
|---|---|---|---|---|
| getShosSnapshot auto-revert path | YES | High if active | Persistent control writes | NO until suppressed |
| performShosAction (all mutating actions) | YES | High to Global | Persistent operational writes | N/A |
| queue dispatch-capable paths | YES | High | Queue/event persistence | N/A |
| retry paths (DLQ/delivery/event) | YES | High | Persistent retried lifecycle state | N/A |
| feature flag mutation actions | YES | Global | Persistent control state | N/A |
| run_runbook | YES | High/Unknown | Runbook-dependent persistence | N/A |
| read aggregation helpers (pure read) | NO | Low | Neutral | YES |

## Suppression Boundary Classification

Recommended boundary:
- Core SHOS boundary at performShosAction and auto-revert invocation site.

Not recommended as primary:
- route-only suppression (too broad, more coupling, easier to bypass through additional entry points).

## Rollback Guarantee Classification

If suppression is applied at recommended boundary:
- deterministic rollback: improved
- queue-safe rollback: improved (prevents new queue mutations during first deploy)
- feature-flag-safe rollback: improved (prevents hidden and explicit flag writes)
- observability-safe rollback: improved (pure-read observability behavior)

Risks removed by suppression:
- hidden GET-triggered control writes
- accidental operator-triggered mutation through SHOS actions

Risks unchanged:
- pre-existing data state and historic operational mutations
- non-SHOS pathways outside suppression scope

## Minimal Implementation Surface (Design Scope Only)

### Final Implementation Surface Matrix

| File | Must Touch | Reason | Blast Radius | Rollback Critical |
|---|---|---|---|---|
| lib/system/shos.js | YES | Central suppression boundary for performShosAction and auto-revert invocation | High positive control | YES |
| app/api/admin/system/shos/route.js | OPTIONAL | Optional explicit route-level message/status shaping while core suppresses actions | Low | Medium |
| app/api/admin/system/route.js | OPTIONAL | Optional observability labeling for suppressed mode | Low | Low |
| app/api/admin/system/health/route.js | OPTIONAL | Optional observability labeling for suppressed mode | Low | Low |
| app/api/admin/system-health/route.js | OPTIONAL | Optional observability labeling for suppressed mode | Low | Low |
| app/api/admin/observability/route.js | OPTIONAL | Optional observability labeling for suppressed mode | Low | Low |
| lib/queue/deliveryTruth.js | NO | Out of minimal suppression boundary; avoid overreach | Medium if touched | No |
| lib/system/systemHealth.js | NO | Out of minimal suppression boundary; avoid overreach | Medium if touched | No |
| app/api/admin/queue/route.js | NO (for suppression core) | Existing route may remain; suppression enforced in SHOS core | Medium if changed | No |
| app/api/admin/dlq/route.js | NO (for suppression core) | Existing route may remain; suppression enforced in SHOS core | Medium if changed | No |
| app/api/admin/delivery-logs/route.js | NO (for suppression core) | Existing sync actions are separate concern; avoid mixed-scope overreach | Medium if changed | No |

Files that must NOT be touched in minimal path:
- queue workers, cron routes, auth middleware, env/config pipelines, AI/media subsystems.

## Remaining Deployment Risks

1. If suppression boundary is partially applied, hidden authority may remain.
2. Delivery sync via non-SHOS admin endpoints can still mutate delivery logs when explicitly invoked.
3. Operator confusion risk persists unless UI/response semantics clearly indicate suppressed mode.

## Remaining Operational Ambiguities

- No unresolved ambiguity blocks design reconstruction.
- Implementation details are pending a separate cycle; this cycle only defines minimal safe boundary.

## Final State

RC-2D status:
MINIMAL_SUPPRESSION_PATH_RECONSTRUCTED
