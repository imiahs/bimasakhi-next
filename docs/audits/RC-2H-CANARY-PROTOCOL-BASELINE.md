# RC-2H Canary Protocol Baseline

Date: 2026-05-15
Mode: Canary execution protocol reconstruction (no deployment, no mutations)

## Authoritative Starting State

### Current Production Reality
| Item | Evidence-Backed State |
|---|---|
| Production Runtime Code | No SHOS suppression deployed; production instances run pre-RC-2E code |
| Deployed Commit | `794013e` (2026-05-06, no SHOS changes since then) |
| Production SHOS State | No suppression gate; all mutations execute normally |
| Suppression Authority | DOES NOT EXIST in production yet |
| Observability Coverage | 5 observability routes read health; mutations flow through 3 dispatcher routes |
| Database Schema | 12 required system control tables verified present |
| Warm Instance Count | Unknown but persistent; serverless reuse is active |
| Auth Gates | All SHOS routes require `super_admin` role |

### Local RC-2E Implementation (Undeployed)
| Component | State |
|---|---|
| Suppression Gate | `checkMutationSuppression()` returns `true` (hard gate) |
| Snapshot Path | `getShosSnapshot()` skips `processDueFeatureFlagReverts()` when suppressed |
| Mutation Path | `performShosAction()` returns explicit `{suppressed: true}` without executing writes |
| Audit Logging | All suppressed attempts logged to `observability_logs` with category `shos_suppression` |
| Build Status | PASS (npm run build, 82 seconds) |
| Files Touched | 11 mandatory (3 untracked: shos.js + route + UI; 8 tracked modified: observability routes) |

### Current Deployment Readiness Classification
**READY_FOR_CANARY_ONLY**

Reason: Local suppression passes build validation, but production parity is unverified and mixed-instance transient risk is unquantified.

### Current Production Parity Classification
**PRODUCTION_PARITY_UNVERIFIED**

Reason: 
- No live instance behavior recheck after local RC-2E implementation
- Serverless warm-instance behavior during rollout is unknowable without live observation
- Stale module cache persistence is a realistic but unproven risk

## Exact Coexistence Scenario During First Canary

### Timeline

**T=0:00 (Pre-Deploy)**
- All production instances: Running old SHOS code (no suppression)
- All mutations: Execute normally
- Observability: All observability routes read clean snapshots
- Stale instances: Actively serving production traffic

**T=0:00-5:00 (Vercel Deployment Propagation)**
- New code pushed to Vercel buildstep
- Some instances begin rolling to new code
- Transient period: New and old instances coexist
- Instance replacement: Probabilistic (not deterministic within seconds)
- Typical propagation window: 3-5 minutes for most instances to receive new code

**T=0:05-15:00 (Coexistence Window - HIGH RISK PERIOD)**
- New instances: Running suppression-enabled SHOS code
- Old instances: Still running unsuppressed SHOS code
- Mixed behavior:
  - GET `/api/admin/system/shos` → could hit OLD instance → executes `processDueFeatureFlagReverts()` (writes!)
  - GET `/api/admin/system/shos` → could hit NEW instance → skips auto-revert (no writes)
  - POST `/api/admin/system/shos` → could hit OLD instance → executes mutation normally
  - POST `/api/admin/system/shos` → could hit NEW instance → returns suppressed response (no mutation)
- Observability polling: ShosControlCenter hits endpoint every 45 seconds
  - 45-sec poll could refresh warm stale instances on either old or new code path
- Audit trail: Some suppressed attempts logged, some mutations executed, inconsistent audit

**T=0:15-60:00 (Convergence Window - MEDIUM RISK)**
- Most instances rotated to new code
- Remaining old instances: Likely replaced or idle (warm cache decay)
- Stale closures: Increasingly unlikely but still possible
- Observability: Converging toward trueful state as old instances retire

**T=60+ (Stabilization)**
- All instances: Running suppressed code (or rollback has occurred)
- Observability: Trustworthy signal restoration
- Mixed-instance risk: Resolved or rollback triggered

### Critical Discovery: Hidden Writes During Mixed Instance

**The Hidden Revert Path:**

```javascript
// In getShosSnapshot():
const suppressionEnabled = await checkMutationSuppression(supabase);
const autoReverts = suppressionEnabled 
    ? { reverted: 0, suppressed: true } 
    : await processDueFeatureFlagReverts(supabase);  // ← HIDDEN WRITE
```

**What this means during coexistence:**

- OLD instance (pre-suppression): `GET /api/admin/system/shos` → calls `processDueFeatureFlagReverts()` → **writes to `system_control_config` and `system_control_actions` tables**
- NEW instance (suppressed): `GET /api/admin/system/shos` → skips `processDueFeatureFlagReverts()` → no write

**Operator Impact:**
- Operator polls health via ShosControlCenter
- 45-second interval refresh could HIT AN OLD INSTANCE
- Old instance silently executes feature-flag reverts (writes!)
- Operator sees "suppressed" UI label but data was actually mutated
- Audit trail conflict: suppressed operation in UI, but database shows revert executed

**This is a CRITICAL OBSERVABILITY TRUTHFULNESS FAILURE during coexistence.**

## Mixed-Instance Authority Divergence Details

### Mutation Paths Affected

| Route | Action | Old Instance | New Instance | Coexistence Risk |
|---|---|---|---|---|
| POST `/api/admin/system/shos` | any mutation | Executes | Returns `{suppressed: true}` | **DIVERGENCE** |
| GET `/api/admin/system/shos` | read snapshot | Calls `processDueFeatureFlagReverts()` | Skips auto-revert | **HIDDEN WRITE DIVERGENCE** |
| PATCH `/api/admin/queue` | queue mutation | Executes | Returns suppressed | **DIVERGENCE** |
| POST `/api/admin/dlq` | dlq mutation | Executes | Returns suppressed | **DIVERGENCE** |
| POST `/api/admin/delivery-logs` | delivery mutation | Executes | Returns suppressed | **DIVERGENCE** |
| GET `/api/admin/system` | observability | Calls getShosSnapshot (hidden write) | Skips hidden write | **HIDDEN DIVERGENCE** |
| GET `/api/admin/observability` | observability | Calls getShosSnapshot (hidden write) | Skips hidden write | **HIDDEN DIVERGENCE** |

### Stale Instance Persistence During Coexistence

**Warm Serverless Lifecycle:**
- Instances keep memory state, module imports, and closure scope across HTTP requests
- Vercel redeployment does NOT immediately kill warm instances
- Warm instances continue serving requests until:
  1. Vercel forcefully recycles them (timing: uncontrollable)
  2. Memory pressure forces eviction (timing: unpredictable)
  3. Instance idle timeout expires (Vercel default: 5-15 minutes)
- During coexistence: Warm old instances stay alive in parallel with new instances

**Operator Observability Polling Refresh Effect:**
- Operator opens ShosControlCenter dashboard
- ShosControlCenter makes GET `/api/admin/system/shos` request
- If request routes to warm OLD instance: old module code executes, including hidden writes
- **This could EXTEND stale instance lifetime by refreshing its last-access timestamp**

**Critical Implication:**
Operator actions intended to observe state could unintentionally REFRESH warm stale instances, extending coexistence window and mixed-instance risk duration beyond passive decay estimates.

## Rollback During Coexistence (Second Coexistence Event)

### Rollback Choreography Creates Transient Risk

If rollback is triggered during coexistence (T=5:00-15:00):

1. **Rollback Initiated**: Vercel 1-click rollback to prior commit
2. **New instances begin**: Rolling back to old code
3. **New coexistence**: Both old-old instances (never deployed) + old-new instances (deployed then rolled back) coexist
4. **Total divergence**: Four possible code paths momentarily:
   - Pre-deployment instances (original old code)
   - Deployment-phase instances (transiting to new)
   - Rollback-phase instances (transiting back to old)
   - Error/partial instances (unknown state)

### Rollback Data Persistence

- Rollback reverses code state deterministically
- Data mutations persist: Any writes that occurred during coexistence (including hidden auto-reverts) REMAIN in database
- Observability audit trail: Suppressed attempts logged during coexistence period remain in `observability_logs`
- Operator sees conflicting signals: "Rollback completed" but audit trail shows suppressed operations + actual mutations

## Observability Truthfulness During Coexistence

### Five Observability Routes Under Coexistence Risk

| Route | Query Pattern | Coexistence Truthfulness | Risk |
|---|---|---|---|
| GET `/api/admin/system/shos` | Direct snapshot + hidden auto-revert | **OPERATOR_UNSAFE** | Hidden writes make suppression status untruthful |
| GET `/api/admin/system` | Calls getShosSnapshot (indirect) | **OPERATOR_UNSAFE** | Routes to observability, not mutation; but triggers hidden writes |
| GET `/api/admin/system/health` | Calls getShosSnapshot (indirect) | **OPERATOR_UNSAFE** | Same hidden write risk |
| GET `/api/admin/system-health` | Calls getShosSnapshot + Gemini probe | **PARTIALLY_TRUSTWORTHY** | Snapshot unreliable; Gemini probe state independent |
| GET `/api/admin/observability` | Calls getShosSnapshot (indirect) | **OPERATOR_UNSAFE** | Routes to observability, but triggers hidden writes |

### Three Mutation-Dispatch Routes Under Coexistence

| Route | Coexistence Truthfulness | Signal Reliability |
|---|---|---|
| PATCH `/api/admin/queue` | **DIVERGENT** | Response says "suppressed" but old instance executed mutation |
| POST `/api/admin/dlq` | **DIVERGENT** | Response says "suppressed" but old instance executed mutation |
| POST `/api/admin/delivery-logs` | **DIVERGENT** | Response says "suppressed" but old instance executed mutation |

## Suppression Guarantees During Canary

### What WILL be Guaranteed
- ✅ New instances (post-deployment) suppress mutations via explicit `checkMutationSuppression()` gate
- ✅ All suppressed attempts logged with audit trail
- ✅ UI will report suppression status based on route response

### What will NOT be Guaranteed During Coexistence
- ❌ All mutation attempts are actually suppressed (old instances execute)
- ❌ Observability reads are pure (hidden writes still execute on old instances)
- ❌ Audit trail reflects actual suppression state (mixed trail of suppressed + executed)
- ❌ Rollback determinism for data state (code rollback works, data persists)
- ❌ Observer action safety (polling could refresh stale instances)

## Deployment Surface Classification (Unchanged from RC-2F)

### REQUIRED_FOR_DEPLOY (3 files)
- `lib/system/shos.js` — Core suppression logic
- `app/api/admin/system/shos/route.js` — Canonical SHOS endpoint
- `features/admin/system/ShosControlCenter.jsx` — UI component

### DEPLOYMENT_COUPLED (8 files)
- Observability routes (5: system, system/health, system-health, observability)
- Helpers (systemHealth.js, deliveryTruth.js)
- UI pages (app/admin/system/page.js)

### DANGEROUS_IF_DEPLOYED_ALONE (3 files)
- `app/api/admin/queue/route.js` — queue mutation dispatcher
- `app/api/admin/dlq/route.js` — dlq mutation dispatcher
- `app/api/admin/delivery-logs/route.js` — delivery mutation dispatcher

**Reason:** These routes call `performShosAction()` but if deployed without suppression enforcement, they expose unguarded mutation authority.

## Stale-Instance Expiration Timing (Unknowns)

| Factor | Evidence | Timing Uncertainty |
|---|---|---|
| Vercel cold-start replacement | Observable (new instances immediately receive new code) | ✓ Deterministic first refresh |
| Warm instance retirement | Passive: idle timeout ~5-15 minutes; Active: forceful recycle (Vercel-controlled) | ❌ Unknowable without live monitoring |
| Module import cache persistence | Vercel uses memory-based module cache per instance | ❌ Persists until instance recycled |
| Closure state persistence | JavaScript closures capture reference scope at import time | ❌ Persists until instance recycled |
| Operator polling refresh effect | Every GET `/api/admin/system/shos` could hit old instance | ❌ Could extend stale lifetime indefinitely |

**Critical:** The unknown stale-instance expiration timing is why READY_FOR_CANARY_ONLY is the maximum safe classification. Staged deployment requires stale-instance timing to be known or bounded.

## Rollback Trigger Implications

If rollback is triggered, exact choreography requires:

1. **Rollback Decision**: When does transient risk become unacceptable?
2. **Rollback Execution**: How does rollback itself handle coexistence?
3. **Rollback Verification**: How do we know rollback succeeded with mixed instances?
4. **Post-Rollback State**: What is the ground truth after rollback?

Rollback is itself a second coexistence event that must be carefully sequenced.

## Current Constraints That Apply to Canary Protocol

1. **No deployment until protocol is finalized** — This cycle is reconstruction only
2. **No runtime mutations** — Protocol must preserve production state
3. **No suppression redesign** — Hard gate stays as implemented
4. **No observability redesign** — Routes stay as they are
5. **Truthful observability constraint** — Protocol must not inflate confidence beyond what is provable
6. **Rollback must be operationally feasible** — Can't require impossible manual coordination

## Unverified Assumptions to Challenge

1. **Assumption:** Warm instances will naturally retire within 60 seconds
   - **Challenge:** How do we know? No SLA documented
   - **Risk:** Coexistence window could extend indefinitely without forced recycle

2. **Assumption:** Operator can observe mixed-instance state without making decisions
   - **Challenge:** Hidden writes during polling make observation unreliable
   - **Risk:** Operator might make rollback decision based on false observability

3. **Assumption:** Database audit trail will reflect actual suppression state
   - **Challenge:** Hidden auto-reverts execute on old instances during coexistence
   - **Risk:** Post-canary investigation will find conflicting signals

4. **Assumption:** Rollback restores ground truth
   - **Challenge:** Data mutations from coexistence window persist after code rollback
   - **Risk:** Operator confusion if rollback completes but audit shows suppressed state

## Foundation for Next Steps

This baseline establishes:
- ✅ **Current state**: READY_FOR_CANARY_ONLY (local), PRODUCTION_PARITY_UNVERIFIED (global)
- ✅ **Mixed-instance reality**: 7-15 minute coexistence window probable, operator actions could extend it
- ✅ **Observability truthfulness**: OPERATOR_UNSAFE during coexistence (hidden writes)
- ✅ **Rollback triggers**: Undefined yet (to be determined in STEP 5)
- ✅ **Suppression guarantees**: NOT FULL until convergence complete

**RC-2H will now reconstruct:**
1. Exact deployment choreography (STEP 2)
2. Observation window bounds (STEP 3)
3. Observability truthfulness recovery (STEP 3.5)
4. Canary monitoring signals (STEP 4)
5. Rollback triggers and choreography (STEP 5)
6. Mixed-instance containment strategy (STEP 6)
7. Final deployment confidence reassessment (STEP 7)
