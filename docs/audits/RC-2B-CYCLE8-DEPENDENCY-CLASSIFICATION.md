# RC-2B Cycle 8 Dependency Classification

Date: 2026-05-14
Scope: Resolve DEP-AMB-01 and DEP-AMB-02 only
Method: Diff-level and caller-level evidence, no deployment, no runtime mutation

---

## DEP-AMB-01 - lib/queue/deliveryTruth.js

### Evidence

1. File is tracked and modified (+26/-23 effective line changes in this cycle window).
2. Exports used by SHOS exist in both HEAD and local versions:
   - recordExternalDelivery
   - syncExternalDelivery
   - syncPendingExternalDeliveries
   - getDeliveryHealthMetrics
3. Runtime callers are active beyond SHOS:
   - app/api/admin/delivery-logs/route.js
   - app/api/jobs/delivery-sync/route.js
   - app/api/jobs/vendor-health-check/route.js
   - lib/queue/publisher.js
   - lib/events/bus.js
   - app/api/admin/actions/route.js
   - lib/system/systemHealth.js
   - lib/system/codeVisibility.js
4. Local diff behavior changes are semantic hardening, not symbol/interface changes:
   - terminal-state derivation from latest terminal log
   - health metric computation filters operator_status active/null
   - stuck delivery metric excludes resolved rows via failed_at/delivered_at null checks

### Deployment Impact

- If local diff is excluded from ATOM-C deploy unit, SHOS import chain still resolves because required exports are already present in HEAD.
- Excluding this diff does not create build failure for ATOM-C.
- Including this diff changes runtime delivery-health semantics globally, not only SHOS.

### Rollback Impact

- If included, rollback reverts delivery health semantics to HEAD behavior.
- If excluded, rollback impact is none for this file because no change shipped.

### Authoritative Classification (single)

OPTIONAL_FOR_ATOM-C (RUNTIME_ACTIVE, NON_BLOCKING, EXCLUDE_FROM_ATOM-C_COMMIT)

Rationale: runtime-active module with many callers, but current local diff is not required to satisfy ATOM-C deployment dependency closure or build safety.

---

## DEP-AMB-02 - lib/system/systemHealth.js

### Evidence

1. File is tracked and modified (+36/-2 line changes).
2. getSystemHealthSnapshot export exists in both HEAD and local versions.
3. Runtime callers:
   - app/api/status/route.js
   - app/api/admin/vendor-health/route.js
   - lib/system/shos.js
4. Local diff behavior changes are policy/threshold semantics, not interface breakage:
   - adds active filters for DLQ and queue failed counts
   - unresolved-only runtime error counting
   - queue_failed metric surfaced in snapshot
   - historical unacknowledged escalations and historical delivery failures can downgrade from hard failure to warning under low-current-incident conditions

### Deployment Impact

- If local diff is excluded from ATOM-C deploy unit, SHOS still compiles and runs because getSystemHealthSnapshot interface remains compatible.
- Excluding this diff does not block ATOM-C deployment unit construction.
- Including this diff modifies global health classification behavior for non-SHOS routes too.

### Rollback Impact

- If included, rollback reverts health classification semantics to HEAD behavior.
- If excluded, rollback impact is none for this file because no change shipped.

### Authoritative Classification (single)

OPTIONAL_FOR_ATOM-C (RUNTIME_ACTIVE, NON_BLOCKING, EXCLUDE_FROM_ATOM-C_COMMIT)

Rationale: runtime-active module with semantic improvements, but not required for ATOM-C dependency closure, atomic deploy safety, or import viability.

---

## Cycle 8 Resolution Effect

Both dependency ambiguities are now resolved by explicit OUT-of-ATOM-C classification.
No hidden coupling discovered that extends the mandatory ATOM-C file set.
