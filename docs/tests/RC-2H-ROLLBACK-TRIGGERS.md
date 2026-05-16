# RC-2H Rollback Triggers

Date: 2026-05-15
Mode: Rollback trigger specification for canary safety

## Executive Summary

**A rollback must be triggered IMMEDIATELY if ANY of the following conditions occur.**

These are hard stops. There is no "wait and see" option. Hesitation extends risk.

---

## Phase 0-1 Rollback Triggers (Pre-Deployment & Baseline)

### Trigger 0.1: Baseline Deployment Authority Fails

**Condition:** Operator cannot confirm deployment authority

**Exactly When:**
- Deployment authority is challenged or withheld
- Rollback authority cannot be verified as tested
- Team briefing incomplete or unapproved

**Action:** ABORT (do not proceed to Phase 2)

**Evidence:** Authority checkpoint fails

**Recovery:** Address authority issues; restart from PHASE 0 with new authority

---

### Trigger 0.2: Production Parity Baseline Shows CRITICAL Health

**Condition:** Production health is already CRITICAL or DEGRADED before canary

**Exactly When:**
- GET `/api/admin/system` returns `health_status: CRITICAL` at baseline
- System has active critical alerts
- DLQ depth is dangerously high (>50 pending)
- Queue is heavily failed (>100 failures)

**Action:** ABORT (separate issue, not canary-related)

**Evidence:** Baseline health check shows abnormal state

**Recovery:** Fix production health first, then restart canary

---

### Trigger 0.3: Build Verification Fails

**Condition:** Vercel build does not complete successfully

**Exactly When:**
- Vercel build status != READY by T+3 min
- Build has syntax errors or import errors
- Build output shows missing 11 mandatory files

**Action:** ROLLBACK (revert commit from main)

**Evidence:** Vercel dashboard shows build failure

**Recovery:** 
1. Immediately rollback commit from main
2. Fix local code
3. Restart canary deployment from beginning

---

## Phase 2-3 Rollback Triggers (Deployment & Build Validation)

### Trigger 2.1: Code Push Fails

**Condition:** Code fails to push to main branch

**Exactly When:**
- `git push origin main` fails
- Git returns auth error or branch protection error
- Vercel doesn't receive code

**Action:** ABORT (don't try to force; fix locally)

**Evidence:** Git command error output

**Recovery:** Resolve local git state, try push again

---

### Trigger 3.1: Build Timeout

**Condition:** Build doesn't complete within 5 minutes

**Exactly When:**
- T+3 minute mark passes, build still in progress
- Vercel indicates build is stuck

**Action:** ABORT (contact Vercel support if needed)

**Evidence:** Build age > 5 minutes

**Recovery:** Monitor Vercel dashboard; may need manual intervention

---

## Phase 4 Rollback Triggers (Instance Rollout & Observation) — HIGHEST VIGILANCE

### Trigger 4.1: Suppression Gate Never Activates

**Condition:** New instances are NOT suppressing mutations

**Exactly When:**
- T+10 minute mark: A1 signal (suppression status) is still `false` for majority
- 5+ consecutive requests all show `suppressed: false`
- A2 signal (audit logging) shows ZERO suppression entries

**Action:** ROLLBACK IMMEDIATELY

**Evidence:** 
- GET `/api/admin/system/shos` returns `suppressed: false` consistently
- Query `observability_logs` returns 0 rows for category='shos_suppression'

**Root Cause Analysis:** Suggests new code never deployed or suppression gate is broken

**Recovery:**
1. 1-click rollback in Vercel
2. Post incident analysis: Was new code deployed? Is gate implemented correctly?
3. Fix locally, restart from PHASE 0

---

### Trigger 4.2: Mutation Authority Bypass Detected

**Condition:** Mutations are executing despite suppression claims

**Exactly When:**
- B1-B3 signals show UNSUPPRESSED responses
- POST to `/api/admin/queue` returns success (mutation executed)
- POST to `/api/admin/dlq` returns success (mutation executed)
- POST to `/api/admin/delivery-logs` returns success (mutation executed)

**Exactly:** If response contains `success: true` and `suppressed: false` simultaneously, authority is bypassed

**Action:** ROLLBACK IMMEDIATELY

**Evidence:**
```json
{
  "success": true,
  "suppressed": false,
  "action": "queue_retry_failed"
}
```

**Root Cause Analysis:** Suggests suppression gate is not being checked before mutation execution

**Recovery:**
1. 1-click rollback in Vercel
2. Review lib/system/shos.js performShosAction() to verify gate is checked FIRST
3. Fix code locally, restart canary

---

### Trigger 4.3: Uncontrolled Mutation Activity Detected

**Condition:** Database metrics are changing unexpectedly (hidden mutations)

**Exactly When:**
- B4 signal (metric jump detection) shows multiple significant jumps
- DLQ count jumps by 50%+ in single measurement
- Queue failures jump by 100+ in single measurement
- Multiple metric jumps within 15-minute window

**Exactly:** If you see:
```
T+11:00 → DLQ: 5
T+11:30 → DLQ: 22 (jump of 17)
T+12:00 → DLQ: 8  (jump back down)
T+12:30 → DLQ: 31 (jump of 23)
```

This pattern indicates old instances executing retries (generating more DLQ entries) then cleanup (reducing count).

**Action:** ROLLBACK IMMEDIATELY (or escalate to CTO for analysis)

**Evidence:** Metric jump pattern in consecutive measurements

**Root Cause Analysis:** Suggests hidden writes from old instances are causing unexpected data mutations

**Recovery:**
1. Decision: Rollback OR investigate further?
   - If jumps are large/frequent: ROLLBACK
   - If jumps are small/rare: Can continue monitoring (old instances executing auto-reverts is expected)

---

### Trigger 4.4: Control State Corruption Detected

**Condition:** system_control_config row count becomes invalid

**Exactly When:**
- Query `SELECT COUNT(*) FROM system_control_config` returns 0 (data deleted)
- Query returns >1 (singleton constraint violated)
- Query shows updated_at being set to future timestamp (impossible)

**Action:** ROLLBACK IMMEDIATELY AND ESCALATE

**Evidence:** Database query result shows anomaly

**Root Cause Analysis:** Suggests deployment or hidden writes caused data corruption

**Recovery:**
1. Rollback immediately
2. Contact Vercel support and database team
3. Restore from backup if needed
4. Post-mortem analysis required before retry

---

### Trigger 4.5: Observability Becomes Completely Incoherent

**Condition:** Observability routes are returning wildly inconsistent data

**Exactly When:**
- E1 signal (divergence index) is >5 (extreme inconsistency)
- Repeated requests to same endpoint return completely different values
- Responses are contradictory (DLQ going up/down/up within seconds)

**Action:** ROLLBACK IMMEDIATELY

**Evidence:** Response inconsistency that cannot be explained by expected divergence

**Root Cause Analysis:** Suggests database is in unstable state or observability logic is broken

**Recovery:** Rollback and investigate

---

### Trigger 4.6: System Health Degrades to CRITICAL During Coexistence

**Condition:** Overall system health CRITICAL status that doesn't recover

**Exactly When:**
- GET `/api/admin/system` returns `overall_health: CRITICAL`
- Health status remains CRITICAL for >2 consecutive measurements (4 minutes)
- System was not CRITICAL before deployment

**Action:** ROLLBACK IMMEDIATELY

**Evidence:** Health status = CRITICAL at T+15, still CRITICAL at T+19

**Root Cause Analysis:** Could indicate:
- Hidden mutations causing system degradation
- Observability corruption
- Actual system failure

**Recovery:** Rollback and investigate

---

### Trigger 4.7: Convergence Progress Stalled Past Safe Window

**Condition:** Coexistence extends beyond expected window without end in sight

**Exactly When:**
- At T+20 minute mark: C1 signal (convergence progress) is still <50% suppressed
- At T+25 minute mark: Still <80% suppressed
- At T+30 minute mark: Still not showing clear convergence

**Action:** ROLLBACK OR ESCALATE

**Exactly:** If you see `suppressed: true` on <50% of requests at T+20, ask:
1. Is this normal (expected delay)?
2. Should we wait longer?
3. Should we rollback?

**Decision authority:** CTO or deployment lead

**Evidence:** Repeated measurements showing stalled convergence

**Recovery Options:**
1. Wait (if Vercel indicates deployment is still in progress)
2. Rollback (if waiting has exceeded reasonable bounds)
3. Escalate (if uncertain)

---

### Trigger 4.8: Operator Polling Creates Infinite Coexistence Loop

**Condition:** Stale instances keep getting refreshed by operator actions

**Exactly When:**
- At T+25 min: Still detecting old instances on every poll
- Operator opens ShosControlCenter dashboard (triggering /api/system/shos calls)
- Old instances' idle timers reset due to polling
- Convergence progress never completes

**Action:** OPERATOR STOPS MONITORING (reduce polling frequency)

**If convergence doesn't complete after stopping polls:** ROLLBACK

**Evidence:** Observing same old instances repeatedly; convergence stalled despite Vercel showing 95% deployment

**Recovery:**
1. Stop active monitoring (stop opening dashboard)
2. Wait 5 minutes
3. Run explicit 20-request convergence test
4. If still <95% suppressed: ROLLBACK

---

## Phase 5 Rollback Triggers (Convergence & Verification)

### Trigger 5.1: Convergence Verification Fails

**Condition:** Explicit convergence test (20 requests) shows <95% suppressed

**Exactly When:**
- At T+30+ minute mark: Run 20 requests to `/api/admin/system/shos`
- Count how many return `suppressed: true`
- If count < 19: Convergence hasn't completed

**Action:** INVESTIGATE

**Decision path:**
- If count = 20: Convergence complete ✓
- If count = 19: One outlier, likely acceptable (old instance still active but marginal)
- If count < 19: Convergence incomplete

**If incomplete:** Options:
1. Wait 5 more minutes, re-test
2. If still incomplete at T+40: ROLLBACK
3. If trend shows improvement: Can continue

---

### Trigger 5.2: Audit Trail Shows Hidden Writes Exceeding Expectations

**Condition:** Database query reveals excessive hidden mutations

**Exactly When:**
- Query `SELECT COUNT(*) FROM system_control_actions WHERE operation = 'revert_auto_expired' AND created_at > NOW() - 1 HOUR` returns >10 entries
- OR you find feature flags were auto-reverted that you didn't intend

**Action:** INVESTIGATE

**Questions:**
- Are these reverts expected (old instances executing)?
- Do they correlate with old-instance activity during coexistence?
- Did any reverting cause unintended system state change?

**Decision:**
- If reverts are small and accounted for: Continue
- If reverts are large or unexplained: ROLLBACK
- If reverts changed critical feature flags: ROLLBACK

---

### Trigger 5.3: Control State Corruption Found During Verification

**Condition:** D1-D3 verification queries reveal corruption

**Exactly When:**
- D1: Row count != 1
- D2: Orphaned records found
- D3: Feature flags in unexpected state

**Action:** ROLLBACK AND ESCALATE

**Evidence:** Verification query output shows anomaly

---

### Trigger 5.4: Unexpected Feature Flag State After Convergence

**Condition:** Feature flags are in wrong state after deployment completes

**Exactly When:**
- At T+45 verification: Feature flags don't match expected state
- Flags were modified by auto-reverts you didn't authorize
- Flags are in inconsistent state across instances

**Action:** DECIDE

**Options:**
1. Reset flags manually (if safe to do)
2. ROLLBACK (to restore known state)
3. Accept state if changes are benign

---

## Phase 6 Rollback Triggers (Operator Decision Point)

### Trigger 6.1: Operator Decides to Rollback (Discretionary)

**Condition:** Operator judgment indicates rollback is safer

**Exactly When:**
- Any time before T+60 minute mark
- Based on accumulated evidence, trends, or intuition
- Without requiring a specific quantitative trigger

**Action:** ROLLBACK

**Authority:** Operator can trigger rollback at their discretion anytime until T+60

**Reasoning:** Trust human judgment. If operator is uncomfortable, rollback.

---

### Trigger 6.2: Mandatory Rollback at T+60 (Operational Ceiling)

**Condition:** Coexistence extends beyond T+60 minute mark

**Exactly When:**
- At T+60 minute mark: If deployment has not converged and operator hasn't decided

**Action:** MANDATORY ROLLBACK

**Reasoning:** 60 minutes is the operational ceiling for acceptable coexistence. Beyond this point, assume deployment is not converging normally and must rollback.

**Authority:** Automatic (don't wait for approval)

---

## Rollback Execution Choreography

Once rollback is TRIGGERED, execute in this order:

### Step 1: Immediate Notification (0 seconds)
**Post to team immediately:**
```
🔴 ROLLBACK TRIGGERED

Reason: [Specific trigger that fired]
Time: [T+XX:XX]
Evidence: [Concise evidence summary]

Initiating rollback sequence now.
```

---

### Step 2: Vercel Rollback Execution (T+0 to T+1 min)

**Navigate to Vercel dashboard:**
1. Go to "Deployments"
2. Find pre-deployment commit (last stable production deployment)
3. Click "Promote to Production"
4. Confirm promotion

**Expected behavior:**
- Vercel starts rolling out previous version
- Old instances begin replacing new instances
- Rollback typically completes in 30-60 seconds

---

### Step 3: Rollback Verification (T+1 to T+5 min)

**Verify old code is active:**
```bash
# Run multiple requests to confirm old code
for i in {1..10}; do
  RESPONSE=$(curl -H "Authorization: Bearer token" \
    https://bimasakhi.com/api/admin/system/shos)
  
  # Old code should NOT have suppression
  SUPPRESSED=$(echo $RESPONSE | jq '.auto_reverts.suppressed')
  
  if [ "$SUPPRESSED" != "true" ]; then
    echo "✓ Request $i: Old code confirmed (suppressed=$SUPPRESSED)"
  else
    echo "⚠️  Request $i: Still seeing new code (unexpected)"
  fi
done
```

**Expected result:** All requests show `suppressed: false` or missing (old code doesn't have suppression field)

**If verification FAILS:** Contact Vercel support immediately

---

### Step 4: Data Integrity Check (T+5 to T+10 min)

**Verify database wasn't corrupted:**
```sql
-- Check control state
SELECT COUNT(*) as count FROM system_control_config;

-- Check for orphans
SELECT COUNT(*) as count FROM system_control_actions 
  WHERE target_type IS NULL;

-- Verify feature flags are in expected state
SELECT enabled_background_retry, enabled_media_pipeline 
FROM system_control_config;
```

**Expected result:** Everything should be consistent with pre-deployment state

**If FAILS:** Escalate to database team

---

### Step 5: Rollback Complete Notification (T+10 min)

**Post to team:**
```
✅ ROLLBACK COMPLETE

Old code: Active and verified
Database: Consistent
System health: [STATUS]

Timeline:
- Rollback triggered: T+XX:XX
- Rollback verified: T+XX:XX
- Total rollback time: XX minutes

Next steps:
1. Post-mortem scheduled: [TIME]
2. Root cause analysis: [link or TBD]
3. Canary retry: [TBD after analysis]
```

---

## Important: Rollback Creates Second Coexistence Event

**Critical insight:** Rollback itself creates a temporary coexistence window.

**During rollback (T = post-rollback +0 to +10 min):**
- New instances still exist initially
- Vercel is rolling back to old code
- Brief coexistence: old-new (deployed) + old-old (pre-deployed)
- Takes ~30 seconds for rollback to start propagating
- Takes ~5 minutes for most instances to receive rollback

**Monitoring during rollback:**
- Don't make changes or decisions during rollback
- Don't poll heavily during rollback (extends old instance lifetime)
- Wait for convergence to old code before assessing state

**Data implications:**
- Rollback is only deterministic for CODE state
- Any writes that occurred during coexistence window REMAIN in database
- Audit trail will show both suppressed attempts + actual mutations
- Post-rollback state is NOT identical to pre-deployment (data mutations persist)

---

## Summary: Rollback Trigger Decision Tree

```
START: Is condition met?

├─ Pre-Deployment Triggers (0.1-0.3)
│  ├─ Authority fails? → ABORT
│  ├─ Baseline CRITICAL? → ABORT
│  └─ Build fails? → ROLLBACK
│
├─ Build/Push Triggers (2.1, 3.1)
│  ├─ Push fails? → ABORT
│  └─ Build timeout? → ABORT
│
├─ Rollout Triggers (4.1-4.8)
│  ├─ Suppression never activates? → ROLLBACK
│  ├─ Mutation authority bypassed? → ROLLBACK
│  ├─ Uncontrolled mutations? → ROLLBACK
│  ├─ Control state corrupted? → ROLLBACK
│  ├─ Observability incoherent? → ROLLBACK
│  ├─ Health CRITICAL? → ROLLBACK
│  ├─ Convergence stalled? → ROLLBACK/ESCALATE
│  └─ Polling creates infinite loop? → STOP POLLING, then ROLLBACK if needed
│
├─ Convergence Triggers (5.1-5.4)
│  ├─ Convergence incomplete? → INVESTIGATE/WAIT/ROLLBACK
│  ├─ Hidden writes excessive? → INVESTIGATE/ROLLBACK
│  ├─ Corruption found? → ROLLBACK
│  └─ Flags in wrong state? → DECIDE
│
└─ Decision Triggers (6.1-6.2)
   ├─ Operator discretion? → ROLLBACK (any time)
   └─ T+60 mark? → MANDATORY ROLLBACK
```

---

## Conclusion

**A rollback is NOT a failure.**

Rollback is the operational safety mechanism that prevents small problems from becoming big problems.

Triggering rollback shows:
- You're monitoring correctly
- You can identify problems
- You're willing to take action to protect the system

**Clear rollback triggers enable confident deployments.**

If you know exactly when rollback must occur, you can deploy with confidence that you can always get back to safety.
