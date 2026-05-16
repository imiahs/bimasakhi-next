# RC-2E Before Implementation Snapshot

Date: 2026-05-14
Mode: Implementation-gate evidence capture

## Authoritative Starting State

| Item | State |
|---|---|
| Current SHOS deployment status | LOCAL_ONLY (not in production) |
| Current suppression implementation | LOCAL_HARD_GATE (implemented in `lib/system/shos.js`) |
| Current mutation authority | FULLY_ACTIVE (all actions execute) |
| Current observability purity | IMPURE (snapshot performs hidden writes) |
| RC-2D design finalization | MINIMAL_SUPPRESSION_PATH_RECONSTRUCTED |
| Design authorization | AUTHORIZED_FOR_IMPLEMENTATION_ONLY |

## Current Mutation Authority Matrix

### Hidden Path: getShosSnapshot

**Location:** `lib/system/shos.js` line ~1620

**Current Behavior:**
```javascript
async function getShosSnapshot(options = {}) {
    const supabase = getServiceSupabase();
    // ... setup code ...
    const autoReverts = await processDueFeatureFlagReverts(supabase);  // <-- HIDDEN WRITE
    // ... rest of snapshot assembly ...
}
```

**Hidden Write Actions on GET:**
- Queries `system_control_actions` for due auto-reverts
- Conditionally updates `system_control_config` (upsert)
- Conditionally inserts new `system_control_actions` records (auto-revert log entries)
- Modifies runtime control state without operator explicit intent

**Authority Classification:** HIDDEN_SIDE_EFFECT_WRITE

---

### Explicit Path: performShosAction

**Location:** `lib/system/shos.js` line ~1670 onwards

**Current Behavior:** All mutation actions execute immediately on POST.

**Action Authority Matrix:**

| Action | Category | Write Tables | Dispatch Authority | Rollback Risk | Audit Trail |
|---|---|---|---|---|---|
| feature_flag_set | flags | system_control_config, system_control_actions | None | High (config persists) | insertControlAction |
| dlq_retry | recovery | job_dead_letters, job_runs | Potential (job creation) | High | insertControlAction |
| dlq_discard | recovery | job_dead_letters | None | High | insertControlAction |
| dlq_resolve | recovery | job_dead_letters | None | High | insertControlAction |
| dlq_requeue | recovery | job_dead_letters | None | High | insertControlAction |
| queue_retry_failed | recovery | generation_queue | High (enqueuePageGeneration dispatch) | High | insertControlAction |
| queue_cancel_failed | recovery | generation_queue | None | High | insertControlAction |
| queue_clear_failed | recovery | generation_queue | None | High | insertControlAction |
| delivery_retry | recovery | external_delivery_logs, event_store (via retry), job_runs (via retry) | High (retryEventStoreDispatch to QStash) | High | insertControlAction |
| delivery_retry_all | recovery | multiple delivery and event rows | High (bulk QStash dispatch) | High | insertControlAction |
| delivery_mark_terminal | recovery | external_delivery_logs | None | High | insertControlAction |
| event_retry | recovery | event_store, external_delivery_logs (via recordExternalDelivery) | High (QStash publishJSON) | High | insertControlAction |
| event_resolve | recovery | event_store | None | High | insertControlAction |
| alert_fix | recovery | system_alerts, alert_deliveries, + mapped action | Medium (runs mapped action) | High | insertControlAction |
| alert_retry | recovery | system_alerts, alert_deliveries, + mapped action | Medium (runs mapped action) | High | insertControlAction |
| alert_resolve | recovery | system_alerts, alert_deliveries | None | High | insertControlAction |
| error_retry | recovery | system_runtime_errors OR system_errors, + mapped action | Medium (runs mapped action) | High | insertControlAction |
| error_resolve | recovery | system_runtime_errors OR system_errors | None | High | insertControlAction |
| run_runbook | recovery | Runbook-dependent | Unknown (runbook-dependent) | Unknown | insertControlAction |
| delivery_sync_pending | recovery | external_delivery_logs (syncPendingExternalDeliveries) | None directly (but sync helper can dispatch) | Medium | None (no control action) |

**Authority Classification:** FULLY_ACTIVE_MUTATION_EXECUTION

---

## Current Pure-Read Violation Registry

### Observability Routes

| Route | Via | Calls getShosSnapshot | Hidden Write Risk | Pure-Read Status |
|---|---|---|---|---|
| GET /api/admin/system/shos | direct | YES | HIDDEN_WRITES_OCCUR | IMPURE |
| GET /api/admin/system | systemHealth helper | YES | HIDDEN_WRITES_OCCUR | IMPURE |
| GET /api/admin/system/health | systemHealth helper | YES | HIDDEN_WRITES_OCCUR | IMPURE |
| GET /api/admin/system-health | systemHealth helper | YES | HIDDEN_WRITES_OCCUR | IMPURE |
| GET /api/admin/observability | systemHealth helper | YES | HIDDEN_WRITES_OCCUR | IMPURE |

### Helper Purity Classification

| Helper | Classification | Reason |
|---|---|---|
| getShosSnapshot | OBSERVABILITY_WITH_HIDDEN_WRITES | Calls processDueFeatureFlagReverts unconditionally |
| processDueFeatureFlagReverts | MUTATION_CAPABLE | Queries for reverts, updates config, inserts actions |
| performShosAction | MUTATION_CAPABLE | All action branches are explicit mutations |
| getSystemHealthSnapshot | SAFE_IF_SNAPSHOT_PURE_READ | Depends on getShosSnapshot purity |
| getDlqOverview | SAFE_READ_ONLY | Read-only query |
| getQueueFailureOverview | SAFE_READ_ONLY | Read-only query + join to generation_logs |
| getDeliveryFailureOverview | SAFE_READ_ONLY | Read-only query |
| getAlertOverview | SAFE_READ_ONLY | Read-only queries |
| getErrorOverview | SAFE_READ_ONLY | Read-only queries |
| getEventFailureOverview | SAFE_READ_ONLY | Read-only query |
| buildFeatureFlags | SAFE_READ_ONLY | Aggregates data, no writes |
| buildOperatorMetrics | SAFE_READ_ONLY | Aggregates data, no writes |

---

## Current Rollback Guarantee Status

### Code-Level Rollback

**Method:** Vercel 1-click deployment to prior commit
**Current Risk:** Deterministic via HEAD revert to `9e12ef2`
**Status:** DETERMINISTIC

### Data-Level Rollback

**Feature-Flag Config:** system_control_config changes persist through rollback
**Control Actions:** system_control_actions audit entries persist through rollback
**Queue State:** generation_queue changes persist through rollback
**Event State:** event_store changes persist through rollback
**Delivery State:** external_delivery_logs changes persist through rollback
**Status:** NON_ATOMIC (writes persist, rollback cannot undo data mutations)

### Rollback Risk for First Deploy

**Without Suppression:**
- Hidden auto-revert execution on GET could mutate system_control_config during first deploy
- Operator cannot distinguish intentional from hidden mutations
- First deploy observability renders are untrustworthy

**Classification:** ROLLBACK_RISK_UNACCEPTABLE

---

## Current Implementation Surface

### Files Currently Modified

| File | State | Status |
|---|---|---|
| lib/system/shos.js | UNTRACKED (new) | CORE_MUTATION_ENGINE |
| app/api/admin/system/shos/route.js | UNTRACKED (new) | DIRECT_SHOS_ROUTE |
| app/api/admin/system/route.js | TRACKED/MODIFIED | SHOS_DEPENDENT_ROUTE |
| app/api/admin/system/health/route.js | TRACKED/MODIFIED | SHOS_DEPENDENT_ROUTE |
| app/api/admin/system-health/route.js | TRACKED/MODIFIED | SHOS_DEPENDENT_ROUTE |
| app/api/admin/observability/route.js | TRACKED/MODIFIED | SHOS_DEPENDENT_ROUTE |
| app/api/admin/queue/route.js | TRACKED/MODIFIED | SHOS_DEPENDENT_ROUTE |
| app/api/admin/dlq/route.js | TRACKED/MODIFIED | SHOS_DEPENDENT_ROUTE |
| app/api/admin/delivery-logs/route.js | TRACKED/MODIFIED | SHOS_DEPENDENT_ROUTE (with sync actions) |
| app/admin/system/page.js | TRACKED/MODIFIED | SHOS_DEPENDENT_UI |
| features/admin/system/ShosControlCenter.jsx | UNTRACKED (new) | SHOS_UI_COMPONENT |

### Unchanged Critical Files

- lib/queue/deliveryTruth.js (mutation-capable but NOT TOUCHED in minimal boundary)
- lib/system/systemHealth.js (safe read helper, NOT TOUCHED)
- Queue workers, cron routes, auth middleware, env/config (all UNTOUCHED)

---

## Required Suppression Insertion Points

### Insertion Point 1: getShosSnapshot Auto-Revert Skip

**File:** `lib/system/shos.js`
**Function:** `getShosSnapshot`
**Current Line:** `const autoReverts = await processDueFeatureFlagReverts(supabase);`
**Required Change:** Skip processDueFeatureFlagReverts if suppression is active

**Before:**
```javascript
const autoReverts = await processDueFeatureFlagReverts(supabase);
```

**After:**
```javascript
const autoReverts = suppressionEnabled ? { reverted: 0, suppressed: true } : await processDueFeatureFlagReverts(supabase);
```

---

### Insertion Point 2: performShosAction Authorization Check

**File:** `lib/system/shos.js`
**Function:** `performShosAction`
**Current Line:** Action dispatch begins immediately
**Required Change:** Check suppression flag before executing any mutation action

**Before:**
```javascript
export async function performShosAction(input, user) {
    const supabase = getServiceSupabase();
    const action = input?.action;
    const reason = input?.reason || null;

    if (!action) {
        throw new Error('action is required');
    }

    if (action === 'feature_flag_set') {
        // ... execute immediately
    }
```

**After:**
```javascript
export async function performShosAction(input, user) {
    const supabase = getServiceSupabase();
    const action = input?.action;
    const reason = input?.reason || null;

    if (!action) {
        throw new Error('action is required');
    }

    // CHECK SUPPRESSION FIRST
    const controlRow = await getControlRow(supabase);
    const suppressionMode = controlRow?.shos_mutation_suppressed ?? false;

    if (suppressionMode) {
        // Log suppressed attempt for auditability
        await insertControlAction(supabase, {
            category: 'shos_suppression',
            target_type: 'shos_action',
            target_key: action,
            operation: 'suppressed_execution_attempt',
            actor_id: toActorId(user),
            reason: `Suppressed action attempt: ${action}`,
            source: 'shos_suppression',
            metadata: { suppressed_input: input, suppression_reason: 'first_deploy_mutation_suppression' },
        });

        return {
            success: false,
            action,
            error: 'SHOS mutation authority suppressed for deployment safety',
            suppressed: true,
            suppression_reason: 'first_deploy_mutation_suppression',
        };
    }

    if (action === 'feature_flag_set') {
        // ... execute normally
    }
```

---

## Suppression Semantics Design

### Suppression Mode Activation

**Mechanism:** Local hard gate in `lib/system/shos.js` returns suppression active

**Effect:**
- getShosSnapshot skips processDueFeatureFlagReverts
- performShosAction returns suppressed-error for all mutation actions
- All suppression attempts logged as control actions
- Observability visibility preserved (snapshot aggregation continues)

### Suppression Mode Deactivation

**Mechanism:** Revert the local hard gate by rolling back the code change

**Effect:**
- getShosSnapshot resumes normal execution
- performShosAction resumes normal action execution
- No automatic authority restoration (explicit operator action required)

### Auditability Guarantee

**Requirement:** Every suppressed action attempt must be logged as:
- Control action category: 'shos_suppression'
- Operation: 'suppressed_execution_attempt'
- Actor ID: actual operator
- Metadata: original action input + suppression reason
- Timestamp: accurate

**Goal:** Operator can audit all suppressed execution attempts and decide remediation after first deploy stabilization

---

## Current Production State Baseline

From RC-2D final freeze validation (2026-05-14T10:49:05.437Z):

- HTTP status: home/blog/favicon 200, admin 307 (redirect), admin queue 401 (auth)
- queue_failed_active: 0
- dlq_pending: 0
- delivery_failed_active: 0
- pending_auto_reverts: 0
- singleton_count: 1
- cron errors last 1h: 0, previous 1h: 0
- auth fail signals: 0, 0
- 404 signals: 0, 0

**Status:** PRODUCTION_RUNTIME_UNCHANGED

---

## Implementation Readiness

### Design Readiness

- ✅ Minimal suppression boundary reconstructed in RC-2D
- ✅ Hidden write path identified
- ✅ Mutation action authority matrix complete
- ✅ Pure-read violation registry complete
- ✅ Implementation insertion points identified

### Authorization Status

- ✅ Authorized for IMPLEMENTATION_ONLY
- ❌ NOT authorized for DEPLOYMENT
- ❌ NOT authorized for RUNTIME ACTIVATION
- ❌ NOT authorized for QUEUE/DLQ/RETRY EXECUTION
- ❌ NOT authorized for FEATURE FLAG MUTATION

### Next Step

Proceed to STEP 2: Implement minimal suppression boundary in `lib/system/shos.js`
