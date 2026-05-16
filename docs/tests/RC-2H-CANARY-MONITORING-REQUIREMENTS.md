# RC-2H Canary Monitoring Requirements

Date: 2026-05-15
Mode: Canary runtime signals specification

## Executive Summary

During canary execution, the operator must monitor specific signals that indicate:
1. Suppression gate is ACTIVE on new instances
2. Suppression gate is NOT BYPASSED (mutations are actually blocked)
3. Stale instances are RETIRING at expected pace
4. Mixed-instance divergence is BOUNDED and MANAGEABLE
5. Hidden writes are NOT CAUSING DATA CORRUPTION
6. Observability itself remains TRUSTWORTHY ENOUGH to observe

**This document specifies the exact signals, their sources, criticality levels, and interpretation rules.**

---

## Four Signal Categories

### Category A: Suppression Verification Signals

**Purpose:** Prove suppression gate is actually working

#### Signal A1: Snapshot Suppression Status

**Source:** GET `/api/admin/system/shos`
**Field:** `auto_reverts.suppressed`
**Expected Value:** `true` (during coexistence, on new instances)
**Interpretation:**
- If `true` on majority of requests → Suppression gate is active
- If `false` on majority of requests → Deployment failed or went to old instances only
- If DIVERGENT (mix of true/false) → Coexistence active (expected during T+8-15)

**Criticality:** CRITICAL
**Rollback Trigger:** If consistently false for 5+ consecutive requests at T+10 min
**Monitoring Frequency:** Every 2-3 minutes during T+8-15, then every 5 minutes

---

#### Signal A2: Suppression Audit Logging

**Source:** Database query (observability_logs table)
**Query:**
```sql
SELECT COUNT(*) as count FROM observability_logs 
WHERE category = 'shos_suppression' 
  AND created_at > NOW() - INTERVAL 5 MINUTES;
```

**Expected Value:** >0 during T+8-20 (proving suppression is logging)
**Interpretation:**
- Presence of `shos_suppression` entries proves new instances are running
- Absence at T+15 could indicate: coexistence ended OR observability logging disabled
- Regular entries during T+8-30 is GOOD (proves suppression working)
- Zero entries at T+5 is BAD (suppression might not be active)

**Criticality:** CRITICAL (proof of deployment success)
**Rollback Trigger:** Zero entries at T+10 min (likely deployment failed)
**Monitoring Frequency:** Every 5 minutes during T+0 to T+30

---

#### Signal A3: Feature Flag Auto-Revert Suppression

**Source:** Database query (system_control_actions table)
**Query:**
```sql
SELECT operation, COUNT(*) as count FROM system_control_actions 
WHERE category = 'feature_flags'
  AND created_at > NOW() - INTERVAL 5 MINUTES
GROUP BY operation;
```

**Expected Value:** 
- Zero entries during coexistence (new instances suppress reverts)
- Some entries could appear (old instances executing hidden reverts)

**Interpretation:**
- If you see feature flag OPERATIONS logged: Could be old instances or new instances executing feature flag changes
- If you see AUTO-REVERT operations: Definitely old instances (new instances suppress these)
- High frequency auto-reverts = Many old instances still active

**Criticality:** IMPORTANT (diagnostic, not critical)
**Rollback Trigger:** If auto-reverts spike unexpectedly high
**Monitoring Frequency:** Every 5 minutes during T+8 to T+30

---

### Category B: Mutation Suppression Verification Signals

**Purpose:** Prove mutations are actually being suppressed, not executing

#### Signal B1: Queue Mutation Response Status

**Source:** Test probe (send invalid mutation to confirm suppression response)
**Operation:** POST `/api/admin/queue` with invalid payload
**Expected Response:**
```json
{
  "suppressed": true,
  "error": "SHOS mutation authority suppressed for deployment safety"
}
```

**Interpretation:**
- `{suppressed: true}` on new instance = GOOD (suppression working)
- `{suppressed: false}` response = OLD instance (not suppressed)
- Error about invalid payload = OLD instance (old code checks payload first)
- Mix of responses = Coexistence active

**Criticality:** CRITICAL (proves mutation authority is gated)
**Rollback Trigger:** If all requests return `suppressed: false` consistently
**Monitoring Frequency:** Every 3 minutes during T+8-20, then every 5 minutes

---

#### Signal B2: DLQ Mutation Response Status

**Source:** Test probe (send invalid mutation to dlq endpoint)
**Operation:** POST `/api/admin/dlq` with invalid payload
**Expected Response:** Same as B1 (suppression response)

**Criticality:** CRITICAL (DLQ has high mutation authority)
**Rollback Trigger:** If all responses show unsuppressed

---

#### Signal B3: Delivery Mutation Response Status

**Source:** Test probe (send invalid mutation to delivery endpoint)
**Operation:** POST `/api/admin/delivery-logs` with invalid payload
**Expected Response:** Same as B1

**Criticality:** CRITICAL (Delivery has high mutation authority)
**Rollback Trigger:** If all responses show unsuppressed

---

#### Signal B4: Unexpected Metric Jumps (Hidden Mutation Detection)

**Source:** GET `/api/admin/system/shos` metric tracking
**Metrics to Track:**
- `metrics.dlq_pending`
- `metrics.queue_failed`
- `metrics.delivery_failed`
- `metrics.event_failed`

**Baseline:** Record at T=0 (before any deployment)
**Expected Change:** Stable or slowly declining (if system is recovering naturally)
**Unexpected Pattern:** Metric JUMPS up suddenly (indicates old instance executed mutation)

**Example:**
```
T+10:00 → DLQ: 5
T+10:30 → DLQ: 5  (stable)
T+11:00 → DLQ: 12 (JUMP! Old instance executed something)
```

**Interpretation:**
- Single jump = One old instance executed a mutation during window
- Multiple jumps = Many old instances active
- No jumps = Either coexistence is minimal OR metrics aren't being updated

**Criticality:** IMPORTANT (diagnostic for hidden mutations)
**Rollback Trigger:** If multiple jumps occur or DLQ spike exceeds 50% of baseline
**Monitoring Frequency:** Every 2 minutes during T+8-20

---

### Category C: Stale-Instance Retirement Signals

**Purpose:** Track when old instances are being replaced by new ones

#### Signal C1: Convergence Progress (Suppression Consistency)

**Source:** Running 5 sequential requests to snapshot endpoint
**Operation:** Collect `auto_reverts.suppressed` value from 5 requests
**Expected Timeline:**
- T+8-12: 30-50% of requests return true
- T+12-18: 70-85% of requests return true
- T+18-30: 95%+ of requests return true

**Interpretation:**
- Percentage increasing → Coexistence progressing normally
- Percentage stalled → Stale instances not retiring
- Percentage stuck at 50% past T+20 → Abnormal; consider rollback

**Criticality:** IMPORTANT (convergence tracking)
**Rollback Trigger:** If still <50% suppressed at T+20 min
**Monitoring Frequency:** Every 5 minutes, run 5-request batch

---

#### Signal C2: Instance Age Distribution (Vercel Deployment Progress)

**Source:** Vercel dashboard
**Metric:** Instance count, deployment status, age distribution

**Expected Timeline:**
- T+0-3: Build in progress
- T+3-5: First instances deployed
- T+8-12: ~50% instances deployed
- T+15-20: ~90% instances deployed
- T+30+: ~99% instances deployed

**Interpretation:**
- Progress tracking deployment rollout
- Rapid rollout = Faster convergence
- Slow rollout = Longer coexistence
- Stalled rollout = Abnormal; contact Vercel

**Criticality:** IMPORTANT (high-level progress tracking)
**Rollback Trigger:** If deployment progress stalled past T+15 min

---

#### Signal C3: Last Old Instance Detection

**Source:** Observability route response diversity
**Method:** Run 20 requests to `/api/admin/system/shos` and look for outlier responses

**Expected Timeline:**
- T+10-15: Outliers are common (old instances frequent)
- T+15-25: Outliers are occasional (old instances rare)
- T+25-30: No outliers detected (convergence likely)

**Detection Code:**
```javascript
responses = []
for i in 1..20:
  resp = GET /api/admin/system/shos
  responses.push(resp.auto_reverts.suppressed)

// Find outliers
true_count = responses.filter(r => r == true).length
false_count = responses.filter(r => r == false).length

if false_count > 0 && false_count < 3:
  console.log(`OUTLIER DETECTED: ${false_count}/20 old instances`)
  console.log("Last old instance(s) still active")
```

**Criticality:** IMPORTANT (proves when convergence complete)
**Rollback Trigger:** Still detecting outliers at T+30 min (abnormal)

---

### Category D: Data Integrity & Corruption Detection Signals

**Purpose:** Detect if hidden writes or mixed-instance behavior is corrupting data

#### Signal D1: Control State Consistency

**Source:** Database query
**Query:**
```sql
SELECT COUNT(*) FROM system_control_config;
SELECT row_count, updated_at FROM system_control_config LIMIT 1;
```

**Expected:** 
- Exactly 1 row in system_control_config
- updated_at reflects last change

**Interpretation:**
- If 0 rows: CORRUPTION (schema error)
- If >1 rows: CORRUPTION (singleton constraint violated)
- If updated_at > T+0: Changes occurred during coexistence (might be expected if old instances executed reverts)

**Criticality:** CRITICAL (data integrity)
**Rollback Trigger:** If row count != 1

---

#### Signal D2: Orphaned Action Records

**Source:** Database query
**Query:**
```sql
SELECT COUNT(*) FROM system_control_actions 
WHERE target_type IS NULL OR target_key IS NULL;
```

**Expected:** 0 (no orphaned records)

**Interpretation:**
- If >0: Possible corruption or migration failure
- Could indicate old code path executing invalid writes

**Criticality:** IMPORTANT (data quality)
**Rollback Trigger:** If orphaned records detected

---

#### Signal D3: Feature Flag State Validation

**Source:** Database query
**Query:**
```sql
SELECT 
  enabled_background_retry,
  enabled_media_pipeline,
  enabled_execution_recovery
FROM system_control_config;
```

**Expected:** 
- Values should match your operational intent
- Should not change unexpectedly during coexistence

**Interpretation:**
- Unexpected changes = Old instances executing auto-reverts
- Changes consistent with audit trail = Expected behavior
- Changes NOT in audit trail = Corruption or unlogged execution

**Criticality:** IMPORTANT (operational consistency)
**Rollback Trigger:** If changes don't match audit trail

---

### Category E: Observability Trustworthiness Signals

**Purpose:** Track whether observability itself is reliable during coexistence

#### Signal E1: Response Divergence Index

**Source:** 5 sequential requests to observability endpoints
**Calculation:**
```javascript
// Collect responses
responses = []
for i in 1..5:
  resp = GET /api/admin/system
  responses.push({
    dlq: resp.metrics.dlq_pending,
    queue: resp.metrics.queue_failed,
    health: resp.metrics.overall_health
  })

// Calculate divergence
dlq_values = responses.map(r => r.dlq).unique()
queue_values = responses.map(r => r.queue).unique()
health_values = responses.map(r => r.health).unique()

divergence_index = (dlq_values.length + queue_values.length + health_values.length) / 3
```

**Expected Timeline:**
- T+8-12: divergence_index = 2-4 (high divergence)
- T+15-20: divergence_index = 1-2 (low divergence)
- T+30+: divergence_index = 1 (no divergence)

**Interpretation:**
- Index = 1: Consistent responses (observability trustworthy)
- Index > 2: Divergent responses (old/new mixed, observability unreliable)
- Index trending down: Coexistence progressing toward convergence

**Criticality:** IMPORTANT (observability confidence)
**Rollback Trigger:** If index stays > 3 past T+20 min

---

#### Signal E2: Gemini Probe Independence

**Source:** GET `/api/admin/system-health` response
**Fields:** 
- `gemini_probe_status` (independent of deployment)
- `ai_provider_status` (should match Gemini state)

**Expected:**
- Gemini probe = CONSISTENT across requests (independent)
- AI provider status = Might diverge (calls getShosSnapshot)

**Interpretation:**
- If Gemini probe DIVERGES: Abnormal (external service issue)
- If AI provider status DIVERGES but Gemini doesn't: Expected (suppression divergence)
- Use Gemini probe as ground truth for AI status

**Criticality:** INFORMATIONAL (secondary signal)
**Rollback Trigger:** If Gemini probe shows repeated failures

---

## Signal Monitoring Table

| Signal | Source | Criticality | Window Start | Window End | Frequency |
|---|---|---|---|---|---|
| A1: Suppression Status | /api/system/shos | CRITICAL | T+8 | T+30 | Every 2-3 min |
| A2: Suppression Logging | Database | CRITICAL | T+0 | T+30 | Every 5 min |
| A3: Auto-Revert Activity | Database | IMPORTANT | T+8 | T+30 | Every 5 min |
| B1: Queue Mutation Test | POST /queue probe | CRITICAL | T+8 | T+20 | Every 3 min |
| B2: DLQ Mutation Test | POST /dlq probe | CRITICAL | T+8 | T+20 | Every 3 min |
| B3: Delivery Mutation Test | POST /delivery probe | CRITICAL | T+8 | T+20 | Every 3 min |
| B4: Metric Jump Detection | /api/system/shos | IMPORTANT | T+8 | T+20 | Every 2 min |
| C1: Convergence Progress | 5-request batch | IMPORTANT | T+8 | T+30 | Every 5 min |
| C2: Instance Age Distribution | Vercel dashboard | IMPORTANT | T+3 | T+30 | Every 5 min |
| C3: Last Old Instance | 20-request batch | IMPORTANT | T+15 | T+30 | Every 10 min |
| D1: Control State | Database | CRITICAL | T+30 | T+45 | Once at T+30 |
| D2: Orphaned Records | Database | IMPORTANT | T+30 | T+45 | Once at T+30 |
| D3: Feature Flags | Database | IMPORTANT | T+30 | T+45 | Once at T+30 |
| E1: Response Divergence | 5-request batch | IMPORTANT | T+8 | T+30 | Every 5 min |
| E2: Gemini Independence | /api/system-health | INFORMATIONAL | T+8 | T+30 | Every 10 min |

---

## Automation vs. Manual Monitoring

### Fully Automatable Signals
- ✅ A1: Suppression Status (simple GET + JSON parse)
- ✅ A2: Suppression Logging (SQL query)
- ✅ B4: Metric Jump Detection (compare values)
- ✅ C1: Convergence Progress (batch requests + count)
- ✅ C2: Instance Age (query Vercel API)
- ✅ D1-3: Data Integrity (SQL queries)
- ✅ E1: Response Divergence (batch requests + calculate)

### Requires Manual Interpretation
- ⚠️  B1-B3: Mutation Tests (need human interpretation of suppression signal)
- ⚠️  C3: Last Old Instance (outlier detection needs judgment)
- ⚠️  E2: Gemini Independence (requires context about AI service health)

---

## Recommended Monitoring Dashboard

**Real-time display during canary:**

```
┌─────────────────────────────────────────────────────────┐
│ RC-2H CANARY MONITORING DASHBOARD                        │
│ Time: [T+mm:ss] | Status: [SAFE|HIGH_RISK|ALERT]       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ SUPPRESSION STATUS                                       │
│  A1: Suppressed status    [████░░░░░░] 60%             │
│  A2: Audit logging        [✓] Active                    │
│  A3: Auto-reverts         [✓] Normal                    │
│                                                          │
│ MUTATION SUPPRESSION                                     │
│  B1: Queue responses      [✓] Suppressed               │
│  B2: DLQ responses        [✓] Suppressed               │
│  B3: Delivery responses   [✓] Suppressed               │
│  B4: Metric jumps         [ ] None detected             │
│                                                          │
│ STALE-INSTANCE RETIREMENT                               │
│  C1: Convergence progress [████████░░] 80%             │
│  C2: Vercel deployment    [████████░░] 85% complete    │
│  C3: Last old instance    [?] Still active             │
│                                                          │
│ DATA INTEGRITY                                           │
│  D1: Control state        [✓] Consistent               │
│  D2: Orphaned records     [✓] None                      │
│  D3: Feature flags        [✓] Valid                     │
│                                                          │
│ OBSERVABILITY TRUST                                      │
│  E1: Divergence index     [1.2] Low divergence         │
│  E2: Gemini independent   [✓] Functioning              │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ DECISION READINESS: Can proceed if all CRITICAL ✓       │
└─────────────────────────────────────────────────────────┘
```

---

## Signal Interpretation Rules

### When to Continue Monitoring
- ✅ All CRITICAL signals show expected behavior
- ✅ Observability divergence declining over time
- ✅ No unexpected metric jumps
- ✅ No data corruption

### When to Escalate Monitoring
- ⚠️  Some CRITICAL signals show concerning patterns
- ⚠️  Convergence progress stalled
- ⚠️  Multiple unexpected metric jumps
- ⚠️  Divergence index not declining

### When to Trigger Rollback
- 🔴 Suppression status consistently false (gate might not be active)
- 🔴 Mutation responses show unsuppressed (authority bypass)
- 🔴 Significant metric jumps (hidden mutations occurring)
- 🔴 Control state corruption (data integrity issue)
- 🔴 Convergence progress completely stalled past T+20 min

---

## Monitoring During Each Phase

### PHASE 4 (T+3 to T+20 min): Instance Rollout
**Focus:** A1, A2, B1-B4, C1, E1
**Frequency:** Every 2-3 minutes
**Goal:** Detect if suppression is working; watch for mutations

---

### PHASE 5 (T+20 to T+45 min): Convergence
**Focus:** C1, C2, C3, E1
**Frequency:** Every 5 minutes
**Goal:** Confirm convergence; detect when coexistence ends

---

### PHASE 6 (T+45+ min): Verification
**Focus:** D1-D3 (explicit verification queries)
**Frequency:** Once at T+45 min
**Goal:** Confirm data integrity; final decision

---

## Monitoring Dependency on Observability Truthfulness

**Critical awareness:** The signals you're monitoring depend on observability routes that have hidden writes.

**Risk:** You could be monitoring using unreliable data

**Mitigation:**
1. **During SAFE_OBSERVATION_WINDOW (T+8-15):** Divergence patterns are detectable; use multiple requests to confirm trends
2. **During HIGH_RISK_WINDOW (T+15-30):** Harder to detect divergence; rely on CRITICAL signals only, not trends
3. **After T+30:** Run explicit verification (Category D) to confirm observability became trustworthy again

**The meta-rule:** Use audit trail and database queries (which cannot have hidden writes) as ground truth. Use API responses for pattern detection only.

---

## Conclusion

**Effective canary monitoring requires:**
1. **15 distinct signals** across 5 categories
2. **Critical vs. Important vs. Informational** prioritization
3. **Window-aware interpretation** (same signal means different things at different times)
4. **Awareness of observability unreliability** (don't trust single responses during coexistence)
5. **Explicit verification phase** (at T+30+, confirm data integrity via database queries)

**Operator responsibility:** Monitor these signals in real-time, escalate immediately if CRITICAL signals show concerning patterns, and trigger rollback only when evidence is clear.
