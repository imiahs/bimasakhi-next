# RC-2F Rollback Realism

Date: 2026-05-15
Mode: Readiness test record only

## Objective

Reconstruct whether rollback for the RC-2E suppression implementation is realistic under actual deployment conditions.

## Rollback Surface

| Surface | Role in rollback |
|---|---|
| lib/system/shos.js | Central rollback target for suppression logic.
| app/api/admin/system/shos/route.js | Direct action route bound to the suppression helper.
| app/api/admin/system/route.js | Snapshot observer that reflects suppression state.
| app/api/admin/system/health/route.js | Health observer that depends on the snapshot.
| app/api/admin/system-health/route.js | Health observer that depends on the snapshot.
| app/api/admin/observability/route.js | Operator-facing observer that depends on the snapshot.
| app/api/admin/queue/route.js | Mutation-adjacent surface that must not drift from the helper behavior.
| app/api/admin/dlq/route.js | Mutation-adjacent surface that must not drift from the helper behavior.
| app/api/admin/delivery-logs/route.js | Mutation-adjacent surface that must not drift from the helper behavior.

## Rollback Atomicity

Rollback is atomic only at the code-release level. If all SHOS-consuming files revert together, the runtime behavior can be restored deterministically.

## Rollback Coupling

The SHOS helper is the controlling authority. If a route rolls back without the helper, or the helper rolls back without the route set, deployment behavior can diverge.

## Rollback Ordering

Recommended rollback order for truth reconstruction:

1. Revert the controlling helper and its direct route consumer together.
2. Revert observer routes as part of the same release set.
3. Verify no deployment-window write path was exercised before the rollback.

## Persistence Risks

| Risk | Assessment |
|---|---|
| Persisted control-state writes | Real risk if any mutating path executes before rollback.
| Cached instance behavior | Real risk during rollout windows.
| Mixed runtime authority | Real risk during partial propagation.
| Data rollback completeness | Not guaranteed by code rollback alone.

## Determinism Conclusion

Rollback is deterministic for code state, but only partially deterministic for operational state because persisted writes survive source rollback.

## Final Test Result

**PARTIALLY_DETERMINISTIC**