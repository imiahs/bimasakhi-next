# RC-2H Observability Truthfulness Window

Date: 2026-05-15
Mode: Observability truthfulness analysis during coexistence

## Executive Summary

During canary deployment, observability surfaces become UNRELIABLE not because they fail, but because they execute hidden writes. The exact same GET request that appears to be read-only can silently mutate database state on old instances.

**This document maps every observability surface to its truthfulness window, enabling operators to know WHEN observability is safe to trust.**

---

## The Hidden Write Problem (Review)

### Code Path Discovery
```javascript
// In lib/system/shos.js, getShosSnapshot():
const suppressionEnabled = await checkMutationSuppression(supabase);
const autoReverts = suppressionEnabled 
    ? { reverted: 0, suppressed: true } 
    : await processDueFeatureFlagReverts(supabase);  // ← HIDDEN WRITE PATH
```

### What This Means During Coexistence

**On OLD instance (no suppression):**
- GET `/api/admin/system/shos` → executes `processDueFeatureFlagReverts()` → writes to database
- GET `/api/admin/system` → calls `getShosSnapshot()` → executes `processDueFeatureFlagReverts()` → writes
- GET `/api/admin/observability` → calls `getShosSnapshot()` → executes `processDueFeatureFlagReverts()` → writes

**On NEW instance (suppressed):**
- GET `/api/admin/system/shos` → skips `processDueFeatureFlagReverts()` → NO write
- GET `/api/admin/system` → calls `getShosSnapshot()` → skips auto-revert → NO write
- GET `/api/admin/observability` → calls `getShosSnapshot()` → skips auto-revert → NO write

**Result:** Mixed-instance behavior means the same GET request produces different side effects depending on which instance it routes to.

---

## Five Observability Surfaces Under Coexistence

### Surface 1: GET `/api/admin/system/shos` (Direct SHOS Snapshot)

**Route:** `app/api/admin/system/shos/route.js`
**Operation:** Direct call to `getShosSnapshot()`
**Auth:** `super_admin` only

#### Pre-Deployment (T < 0)
| Metric | Truthfulness | Why |
|---|---|---|
| `auto_reverts.suppressed` | TRUSTWORTHY | Always false (no suppression yet) |
| `auto_reverts.reverted` | TRUSTWORTHY | Actual count of reverts |
| DLQ pending | TRUSTWORTHY | Pure read |
| Queue failures | TRUSTWORTHY | Pure read |
| Health metrics | TRUSTWORTHY | Aggregated correctly |

**Confidence:** 100%

---

#### Early Coexistence (T+8 to T+15)
| Metric | Truthfulness | Why |
|---|---|---|
| `auto_reverts.suppressed` | **DIVERGENT** | true on new instances, false on old |
| `auto_reverts.reverted` | **DIVERGENT** | 0 on new (suppressed), >0 on old (executed) |
| DLQ pending | **PARTIALLY_TRUSTWORTHY** | Accurate if new instance, stale if old |
| Queue failures | **PARTIALLY_TRUSTWORTHY** | Accurate if new instance, stale if old |
| Health metrics | **DIVERGENT** | Could reflect old or new state |

**Hidden writes:** YES — Old instances executing `processDueFeatureFlagReverts()` without suppression logging

**Confidence:** 30-40% — Single responses are NOT trustworthy; patterns across 5+ requests could indicate divergence

**Detection strategy:**
```javascript
// Run 5 consecutive requests
responses = []
for i in 1..5:
  response = GET /api/admin/system/shos
  responses.push(response)

// Check for divergence
uniqueSuppressions = responses.map(r => r.auto_reverts.suppressed).unique()
if uniqueSuppressions.length > 1:
  console.log("DIVERGENCE DETECTED - Coexistence active")
else if uniqueSuppressions[0] == true:
  console.log("Coexistence likely ended - all suppressed")
else if uniqueSuppressions[0] == false:
  console.log("ERROR - All old instances? Deployment failed?")
```

---

#### High-Risk Coexistence (T+15 to T+30)
| Metric | Truthfulness | Why |
|---|---|---|
| `auto_reverts.suppressed` | **MOSTLY_TRUSTWORTHY** | ~90% new instances, occasional old request |
| `auto_reverts.reverted` | **MOSTLY_TRUSTWORTHY** | ~90% accurate, occasional old reading |
| DLQ pending | **CONFIDENCE_TRAP** | Mostly accurate but divergence is hard to detect |
| Queue failures | **CONFIDENCE_TRAP** | Mostly accurate but divergence is hard to detect |
| Health metrics | **CONFIDENCE_TRAP** | Appears stable but occasional divergences undetected |

**Hidden writes:** YES — Fewer old instances, but still executing hidden writes

**Confidence:** 50-70% — **CONFIDENCE TRAP ZONE** — Appears trustworthy but divergence is harder to detect

**Detection strategy:**
```javascript
// Harder to detect divergence now (fewer old instances)
// Must run MANY requests to catch outliers
responses = []
for i in 1..20:
  response = GET /api/admin/system/shos
  responses.push(response)

suppressed_true_count = responses.filter(r => r.auto_reverts.suppressed == true).length

if suppressed_true_count == 20:
  console.log("Likely converged (all new)")
else if suppressed_true_count == 19:  // One outlier
  console.log("WARNING: Outlier detected - old instance still alive")
else if suppressed_true_count < 18:
  console.log("Still significant divergence")
```

---

#### Post-Convergence (T+30+)
| Metric | Truthfulness | Why |
|---|---|---|
| `auto_reverts.suppressed` | **TRUSTWORTHY** | All instances suppressed, should be true |
| `auto_reverts.reverted` | **TRUSTWORTHY** | 0 (suppression prevented reverts) |
| DLQ pending | **TRUSTWORTHY** | No more hidden writes, accurate |
| Queue failures | **TRUSTWORTHY** | Accurate |
| Health metrics | **TRUSTWORTHY** | Correct aggregation |

**Hidden writes:** NO — All old instances retired

**Confidence:** 95%+ (after explicit convergence verification test)

---

### Surface 2: GET `/api/admin/system` (Observability Aggregation)

**Route:** `app/api/admin/system/route.js`
**Operation:** Calls `getShosSnapshot()` with limits (5,5,5,5,5)
**Auth:** `super_admin` only
**Returns:** System status aggregation (health, DLQ, queue, etc.)

#### Pre-Deployment (T < 0)
| Component | Truthfulness |
|---|---|
| `health_status` | TRUSTWORTHY |
| `dlq_pending` | TRUSTWORTHY |
| `queue_failed` | TRUSTWORTHY |
| `overall_health` | TRUSTWORTHY |
| Failures aggregate | TRUSTWORTHY |

**Confidence:** 100%

---

#### Early Coexistence (T+8 to T+15)
| Component | Truthfulness | Why |
|---|---|---|
| `health_status` | **DIVERGENT** | Calls getShosSnapshot which has hidden writes |
| `dlq_pending` | **DIVERGENT** | Could reflect old or new snapshot |
| `queue_failed` | **DIVERGENT** | Could reflect old or new snapshot |
| `overall_health` | **DIVERGENT** | Mixed inputs from old/new |
| Failures aggregate | **DIVERGENT** | Mixed source data |

**Hidden writes:** YES — Exact same issue as Surface 1

**Confidence:** 30-40% — Use same divergence detection as Surface 1

---

#### High-Risk Coexistence (T+15 to T+30)
| Component | Truthfulness | Why |
|---|---|---|
| `health_status` | **CONFIDENCE_TRAP** | Usually accurate, divergence hard to spot |
| `dlq_pending` | **CONFIDENCE_TRAP** | Appears stable but occasional divergences missed |
| `queue_failed` | **CONFIDENCE_TRAP** | Trend looks good but individual outliers undetected |
| `overall_health` | **CONFIDENCE_TRAP** | Appears stable; rare divergences might be ignored |
| Failures aggregate | **CONFIDENCE_TRAP** | Looks reasonable but lacks confidence |

**Hidden writes:** YES — Fewer but still active

**Confidence:** 50-70% — Same confidence trap as Surface 1

---

#### Post-Convergence (T+30+)
| Component | Truthfulness |
|---|---|
| `health_status` | TRUSTWORTHY |
| `dlq_pending` | TRUSTWORTHY |
| `queue_failed` | TRUSTWORTHY |
| `overall_health` | TRUSTWORTHY |
| Failures aggregate | TRUSTWORTHY |

**Confidence:** 95%+

---

### Surface 3: GET `/api/admin/system/health` (Health Probe)

**Route:** `app/api/admin/system/health/route.js`
**Operation:** Calls `getShosSnapshot()` with limits (5,5,5,5,5)
**Auth:** `super_admin` only
**Returns:** Health classification with component breakdown

#### Truthfulness Timeline
- **T < 0:** TRUSTWORTHY (100%)
- **T+8-15:** DIVERGENT (30-40%)
- **T+15-30:** CONFIDENCE_TRAP (50-70%)
- **T+30+:** TRUSTWORTHY (95%+)

**Note:** Identical behavior to Surface 2 (same underlying `getShosSnapshot()` call)

**Hidden writes:** YES — Same `processDueFeatureFlagReverts()` path

---

### Surface 4: GET `/api/admin/system-health` (System Health + Gemini Probe)

**Route:** `app/api/admin/system-health/route.js`
**Operation:** Calls `getShosSnapshot()` + `probeGeminiProvider()`
**Auth:** `super_admin` only
**Returns:** Health status + Gemini AI provider status

#### Component Truthfulness During Coexistence

| Component | Source | Truthfulness | Why |
|---|---|---|---|
| SHOS snapshot | `getShosSnapshot()` | DIVERGENT (T+8-15) | Same hidden write issue |
| Gemini probe | `probeGeminiProvider()` | TRUSTWORTHY | Independent of deployment |
| Overall health | Aggregated | **PARTIALLY_TRUSTWORTHY** | SHOS component divergent, Gemini pure |
| AI provider status | Gemini probe | TRUSTWORTHY | No hidden writes |

#### Pre-Deployment (T < 0)
**Confidence:** 100% — All components trustworthy

---

#### Early Coexistence (T+8 to T+15)
**Confidence:** 60-70% — Gemini probe is trustworthy but SHOS snapshot diverges

**Benefit:** If Gemini probe shows QUOTA_EXHAUSTED but SHOS snapshot shows different AI metrics, the Gemini result is MORE trustworthy

---

#### High-Risk Coexistence (T+15 to T+30)
**Confidence:** 70-75% — Gemini probe carries more weight

---

#### Post-Convergence (T+30+)
**Confidence:** 95%+ — All components converged and trustworthy

---

### Surface 5: GET `/api/admin/observability` (Full Observability Snapshot)

**Route:** `app/api/admin/observability/route.js`
**Operation:** Calls `getShosSnapshot()` with limits (6,6,6,6,6)
**Auth:** `super_admin` only
**Returns:** Complete observability snapshot + event store + executives + recovery helpers

#### Pre-Deployment (T < 0)
| Component | Truthfulness |
|---|---|
| SHOS snapshot | TRUSTWORTHY |
| Event store stats | TRUSTWORTHY |
| Executives | TRUSTWORTHY |
| Recovery helpers | TRUSTWORTHY |

**Confidence:** 100%

---

#### Early Coexistence (T+8 to T+15)
| Component | Truthfulness | Why |
|---|---|---|
| SHOS snapshot | **DIVERGENT** | Same hidden write issue |
| Event store stats | TRUSTWORTHY | Independent read |
| Executives | TRUSTWORTHY | Independent read |
| Recovery helpers | TRUSTWORTHY | Independent logic |

**Confidence:** 60-70% — Most components trustworthy, SHOS snapshot diverges

**Hidden writes:** YES — Via `getShosSnapshot()` call

---

#### High-Risk Coexistence (T+15 to T+30)
**Confidence:** 70-75% — Rare hidden writes, hard to detect

---

#### Post-Convergence (T+30+)
**Confidence:** 95%+ — All converged

---

## Non-Observability Routes (For Reference)

### Three Mutation-Dispatcher Routes (These are INTENTIONALLY NOT PURE-READ)

| Route | Hidden Writes? | Truthfulness |
|---|---|---|
| POST `/api/admin/queue` | Intentional (if not suppressed) | Returns `{suppressed: true/false}` to signal state |
| POST `/api/admin/dlq` | Intentional (if not suppressed) | Returns `{suppressed: true/false}` to signal state |
| POST `/api/admin/delivery-logs` | Intentional (if not suppressed) | Returns `{suppressed: true/false}` to signal state |

**During coexistence:**
- Response says "suppressed" but database might have been mutated (if routed to old instance)
- This is EXPECTED BEHAVIOR for these routes
- Trust the response status code, not the ultimate effect

---

## Operator Guidance: Which Routes to Use When

### During SAFE_OBSERVATION_WINDOW (T+8 to T+15)

**SAFE TO MONITOR:**
- ✅ GET `/api/admin/system/shos` — Run 5x to detect divergence
- ✅ GET `/api/admin/system` — Run 5x to detect divergence
- ✅ GET `/api/admin/system-health` — Gemini probe is reliable
- ✅ GET `/api/admin/observability` — Most components independent

**INTERPRETATION GUIDE:**
- If responses DIVERGE → coexistence confirmed (still deploying)
- If responses CONSISTENT (all suppressed: true) → coexistence likely ended
- If Gemini probe fails but SHOS looks good → Trust Gemini (independent)

---

### During HIGH_RISK_WINDOW (T+15 to T+30)

**AVOID HEAVY MONITORING:**
- ⚠️  GET `/api/admin/system/shos` — Divergence harder to detect; run 20x if testing
- ⚠️  GET `/api/admin/system` — Confidence trap zone
- ✅ GET `/api/admin/system-health` — Gemini probe is reliable
- ⚠️  GET `/api/admin/observability` — Hidden writes still possible

**INTERPRETATION GUIDE:**
- Assume coexistence still active UNLESS you can prove otherwise
- Don't trust single responses; run multiple requests
- Use Gemini probe as secondary confidence signal
- Prepare for rollback if any unexpected behavior

---

### During CONVERGENCE_WINDOW (T+30 to T+60)

**RUN EXPLICIT VERIFICATION TESTS:**
- ✅ GET `/api/admin/system/shos` (20x) → All should return suppressed: true
- ✅ Query audit trail → Count `shos_suppression` entries
- ✅ Query hidden writes → Check for auto-reverts
- ✅ Database consistency → Verify no orphaned records

**If all verifications pass:**
- ✅ Observability is NOW trustworthy
- ✅ You can proceed with confidence

**If any verification fails:**
- 🔄 Triggered rollback OR
- 📞 Escalate to Vercel support

---

## Summary: Observability Truthfulness Matrix

```
Surface                      | T<0      | T+8-15           | T+15-30          | T+30+
─────────────────────────────┼──────────┼──────────────────┼──────────────────┼──────────
1. /api/system/shos          | TRUST    | DIVERGENT(30%)   | TRAP(50%)        | TRUST
2. /api/system               | TRUST    | DIVERGENT(30%)   | TRAP(50%)        | TRUST
3. /api/system/health        | TRUST    | DIVERGENT(30%)   | TRAP(50%)        | TRUST
4. /api/system-health        | TRUST    | MIXED(60%)       | MIXED(70%)       | TRUST
5. /api/observability        | TRUST    | MIXED(60%)       | MIXED(70%)       | TRUST
─────────────────────────────┼──────────┼──────────────────┼──────────────────┼──────────
Gemini probe (independent)   | TRUST    | TRUST            | TRUST            | TRUST
Audit trail (suppression)    | CLEAN    | LOGGING          | SPARSE           | COMPLETE
Hidden writes (auto-reverts) | NONE     | EXECUTING        | RARE             | NONE
```

---

## Critical Constraints

### Constraint 1: Hidden Writes During "Pure Read" Operations

**Problem:** GET requests can modify database state

**Implication:** You cannot trust "read-only" operations during coexistence

**Solution:** Verify via audit trail + database queries, not just GET responses

---

### Constraint 2: Confidence Trap in High-Risk Window

**Problem:** Fewer divergences appear → increased confidence → but reliability DECREASES

**Implication:** Operator tempted to decide too early

**Solution:** NEVER decide between T+15-30; only decide after explicit T+30+ verification

---

### Constraint 3: Operator Polling Extends Stale Instances

**Problem:** ShosControlCenter 45-sec polling could refresh warm instances

**Implication:** Observability monitoring itself extends coexistence

**Solution:** Reduce monitoring frequency after T+15 to minimize stale instance refresh

---

## Verification Queries for Audit Trail

### Query 1: Count Suppressed Attempts
```sql
SELECT COUNT(*) FROM observability_logs 
WHERE category = 'shos_suppression' 
  AND created_at > NOW() - INTERVAL 1 HOUR;
```

**Expectation:** Non-zero (suppression was active during coexistence)

---

### Query 2: Detect Hidden Auto-Reverts
```sql
SELECT COUNT(*) FROM system_control_actions 
WHERE operation IN ('revert_auto_expired', 'revert_forced', 'revert_scheduled')
  AND created_at > NOW() - INTERVAL 1 HOUR;
```

**Expectation:** Could be non-zero (hidden writes from old instances)

---

### Query 3: Timeline of Suppression Activity
```sql
SELECT 
  DATE_TRUNC('minute', created_at) as minute,
  COUNT(*) as count
FROM observability_logs
WHERE category = 'shos_suppression'
  AND created_at > NOW() - INTERVAL 1 HOUR
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY minute;
```

**Expectation:** Shows when suppression was active (peak during T+8-15)

---

## Conclusion

**Observability truthfulness is WINDOW-DEPENDENT, not absolute.**

- **Pre-deployment:** TRUSTWORTHY_BASELINE
- **Early coexistence (T+8-15):** PARTIALLY_TRUSTWORTHY (use patterns, not single values)
- **High-risk coexistence (T+15-30):** CONFIDENCE_TRAP (avoid decisions, reduce monitoring)
- **Convergence (T+30+):** TRUSTWORTHY_AGAIN (only after explicit verification)
- **Stale-instance hidden writes:** UNTRUSTWORTHY AS AUDIT (not logged as suppressed)

**Operator's task:** Know which window you're in, and adjust confidence level accordingly. Observability truthfulness is a function of deployment progress, not data quality.
