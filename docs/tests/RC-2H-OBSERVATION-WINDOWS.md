# RC-2H Observation Windows

Date: 2026-05-15
Mode: Observation window analysis for coexistence safety

## Executive Summary

During canary deployment, three distinct time windows emerge:

1. **SAFE_OBSERVATION_WINDOW (T+5 to T+15 min)** — Observability is declining but still useful for detecting catastrophic failures
2. **HIGH_RISK_WINDOW (T+15 to T+30 min)** — Observability is unreliable; operator must use indirect signals
3. **CONVERGENCE_WINDOW (T+30 to T+60 min)** — Mixed-instance behavior diminishing; observability recovering
4. **ROLLBACK_MANDATORY_WINDOW (T+60+ min)** — If rollback hasn't been triggered, stale-instance persistence becomes unacceptable

## Window Analysis in Detail

### PHASE A: PRE-DEPLOYMENT WINDOW (T = -5 to 0 min)

**Classification:** TRUSTWORTHY_BASELINE

**Characteristics:**
- All instances running pre-suppression code
- All mutations execute normally
- All observability reads are pure (no hidden writes)
- State is ground truth

**What you can trust:**
- ✅ Health metrics are accurate
- ✅ DLQ/Queue/Delivery counts are exact
- ✅ System health classification is correct
- ✅ No hidden writes occurring

**Action by operator:**
- Capture baseline snapshot
- Record baseline metrics
- This is the GOLD STANDARD for comparison

**Decision point:** If baseline shows system is DEGRADED, abort deployment (separate issue, not canary-related)

---

### PHASE B: BUILD & DEPLOYMENT WINDOW (T = 0 to +3 min)

**Classification:** EXPECTED_SILENCE

**Characteristics:**
- Code is being built by Vercel
- No instances updated yet
- No change to production behavior
- System appears unchanged (because it is)

**What you can trust:**
- ✅ System state unchanged from baseline
- ✅ No deployment effects yet
- ✅ Observability still pure

**What NOT to trust:**
- ❌ Don't make decisions yet (data still establishing)
- ❌ Don't poll too frequently (waste of data)

**Action by operator:**
- Light monitoring (check build progress in Vercel)
- Prepare observation tools
- Brief team on what's coming

**Timeline accuracy:**
- T+0 to +1 min: Vercel receives code, triggers build
- T+1 to +2.5 min: Next.js build process
- T+2.5 to +3 min: Build finishes, pushed to Vercel CDN

**Decision point:** If build fails at T+3, abort immediately and rollback commit

---

### PHASE C: INSTANCE DEPLOYMENT BEGINS (T = +3 to +8 min)

**Classification:** EARLY_PROPAGATION (deterministic start, probabilistic end)

**Characteristics:**
- First wave of new instances start receiving code
- Cold-start instances spin up with new code
- Warm instances still running old code
- HEAVY DIVERGENCE starting
- Coexistence begins

**What's happening under the hood:**
- Vercel pushes new code to edge locations
- CDN distributes to regional zones
- First requests to new endpoints trigger cold-start instances
- These new instances are immediately suppression-active

**Observability state:**
- Snapshot responses START DIVERGING
- Some requests hit NEW instances (suppressed)
- Some requests hit OLD instances (not suppressed)
- Requests to same endpoint get different responses

**What you can trust:**
- ✅ That divergence HAS STARTED
- ✅ Suppression gate is ACTIVE on new instances
- ✅ Old instances STILL EXIST somewhere

**What NOT to trust:**
- ❌ Overall health status (mixed signals from old/new)
- ❌ Exact metric counts (old vs new report differently)
- ❌ Audit trail consistency (suppressed attempts starting, but old instances still executing)
- ❌ Single requests (could hit either old or new)

**Stale-instance behavior:**
- Warm instances are STILL RUNNING OLD CODE
- They will continue serving requests
- They will continue executing mutations (unsuppressed)
- They are now DIVERGENT AUTHORITIES

**Action by operator:**
- START monitoring (Phase 4.1)
- Capture divergence evidence
- Record when first divergence detected
- Monitor for catastrophic failures
- Do NOT make deployment decisions yet

**Decision point:** If catastrophic failure detected (all instances erroring), abort immediately

**Expected duration:** 3-5 minutes until most instances updated

---

### PHASE D: PEAK DIVERGENCE / EARLY COEXISTENCE (T = +8 to +15 min)

**Classification:** SAFE_OBSERVATION_WINDOW ← Operator can safely observe and make inferences

**Characteristics:**
- Peak number of instances running both old and new code
- Suppression gate active on ~40-70% of instances
- Mutation authority divergent: some instances suppress, some execute
- Hidden writes still executing on old instances
- Observability is PARTIALLY_TRUSTWORTHY

**Mixed-instance realities:**
- Operator polls `/api/admin/system/shos` → could hit old instance (no suppression in response) or new instance (suppression in response)
- Operator sees inconsistent `auto_reverts.suppressed` values
- Repeated polls show DIVERGENCE in response patterns
- This divergence is PROOF that coexistence is active

**What you CAN trust:**
- ✅ IF all 5 consecutive requests show `suppressed: true` → coexistence likely ended
- ✅ IF responses are INCONSISTENT → coexistence definitely active
- ✅ IF DLQ/Queue metrics JUMP → old instance executed unsuppressed mutation
- ✅ IF audit trail shows `shos_suppression` logs → new instances are logging correctly
- ✅ System is NOT experiencing catastrophic failure

**What you CANNOT trust:**
- ❌ Absolute metric values (old vs new report differently)
- ❌ Health status (mixed signals)
- ❌ Whether a mutation you intended to suppress actually got suppressed
- ❌ Observability routes being pure-read (hidden writes still executing)

**Stale-instance refresh effect:**
- Operator polls ShosControlCenter endpoint
- Polling could hit OLD WARM INSTANCE
- Old instance executes `processDueFeatureFlagReverts()`
- **This is a HIDDEN WRITE on what appears to be a read-only operation**
- Operator doesn't know a write just happened
- Database state changed without operator awareness
- BUT audit trail DOES NOT show it as suppressed (old code doesn't log suppression)

**Observability truthfulness risk:**
- 🔴 **CRITICAL:** You cannot know if metrics are accurate
- 🔴 **CRITICAL:** You cannot know if hidden writes just happened
- 🔴 **CRITICAL:** Operator actions themselves could trigger hidden writes

**Action by operator:**
- ✅ DO monitor divergence patterns
- ✅ DO look for consistency across repeated polls
- ✅ DO check audit trail for `shos_suppression` category
- ✅ DO watch for metric jumps (indicating old instance mutations)
- ❌ DON'T trust single observations
- ❌ DON'T make decisions on absolute metric values
- ❌ DON'T expect hidden writes to be logged in audit trail (they aren't)

**Key signals during this window:**

| Signal | What It Means | Action |
|---|---|---|
| Responses inconsistent (suppressed: true/false mixed) | Coexistence confirmed | Continue observing |
| DLQ or Queue count jumps 2+ in single poll | Old instance executed mutation | Note time, watch for rollback signal |
| Audit trail shows shos_suppression entries | New instances logging correctly | Good sign |
| All 5 consecutive polls return suppressed: true | Coexistence likely ending | Move to PHASE E |
| Observability route latency increases 50%+ | Old instances becoming overloaded | Monitor for degradation |
| Single request shows old response, next shows new | Instance routing working correctly | Normal behavior |

**Rollback trigger threshold for this window:**
- Multiple uncontrolled mutations detected (DLQ/Queue jump unexpectedly)
- System health degrades from baseline to CRITICAL
- Observability routes become completely inconsistent (all metrics divergent)

**Expected duration:** 5-7 minutes (T+8 to T+15)

---

### PHASE E: LATE COEXISTENCE / CONVERGENCE BEGINS (T = +15 to +30 min)

**Classification:** HIGH_RISK_WINDOW ← Observability becomes less trustworthy; use indirect signals

**Characteristics:**
- New instances now represent ~70-90% of active traffic
- Old instances are retiring but some warm instances persist
- Divergence is DECLINING (fewer old instances)
- Mixed-instance behavior is LESS OBVIOUS
- Observability is becoming UNRELIABLE

**Why observability becomes unreliable:**
- With fewer old instances, divergence is harder to detect
- You might THINK coexistence has ended when it hasn't
- Occasional requests to old instances go unnoticed
- Confidence in observations increases just as reliability decreases
- **This is a confidence trap**

**Hidden write persistence:**
- Old instances STILL executing auto-reverts (at lower frequency)
- Observability route polling STILL triggers hidden writes on remaining old instances
- Audit trail STILL doesn't show these as suppressed (old code)
- Database is STILL being mutated outside suppression gate

**What you CAN trust (with caveats):**
- ✅ Trend direction (if metrics are declining/stable) — but not absolute values
- ✅ Catastrophic failures (if system goes CRITICAL) — but not minor fluctuations
- ✅ Audit trail presence (if shos_suppression entries exist) — but not absence
- ✅ That MOST instances are suppression-active (if >90% show suppressed: true)

**What you CANNOT trust:**
- ❌ Any single metric or response
- ❌ Health status (still mixed signals, just fewer old instances)
- ❌ That coexistence has ended (could still have 5-10% old instances)
- ❌ Pure-read operations (hidden writes persist)
- ❌ Consistency checks (old instances now harder to detect)

**The confidence trap:**
```
Time progresses T+15 → T+25
Observer sees fewer divergences
Observer thinks: "Must be converging!"
Observer raises confidence level
Observer stops watching as closely

Reality: Last 5-10% of old instances still active
Reality: Operator missed coexistence window end
Reality: Database has accumulated hidden writes
Result: Operator makes decision with false confidence
```

**Action by operator:**
- ✅ DO continue monitoring
- ✅ DO not trust single observations
- ✅ DO check for divergence still (might appear intermittent now)
- ✅ DO preserve audit trail
- ❌ DON'T raise confidence based on reduced divergences
- ❌ DON'T make deployment decisions in this window
- ❌ DON'T expect consistency yet

**Key signals during this window:**

| Signal | What It Means | Action |
|---|---|---|
| Divergence appears intermittent (not every poll) | Old instances now 10-20% of traffic | Continue monitoring |
| Most requests show suppressed: true | Coexistence mostly over | But don't conclude yet |
| Occasional metric jump (single request) | Stray old instance still active | Note it |
| Audit trail entries declining | Fewer new instances logging | Normal—fewer suppressed attempts |
| Latency stabilizing | Instances converging | Good indicator but not proof |
| Single request showing old response | Confirmed: old instance still alive | Extend observation window |

**Rollback trigger threshold for this window:**
- Catastrophic failure occurs
- Audit trail shows evidence of uncontrolled hidden writes
- System health drops to CRITICAL and does NOT recover within 2 minutes

**Expected duration:** 10-15 minutes (T+15 to T+30)

---

### PHASE F: CONVERGENCE COMPLETE / VERIFICATION (T = +30 to +60 min)

**Classification:** TRUSTWORTHY_AGAIN ← Observability recovering; verification mode

**Characteristics:**
- >99% of instances updated to new code
- Old instances are extremely rare (if any)
- Divergence signals should be nearly absent
- Observability is converging to reliable state
- But NOT yet confirmed 100% converged

**What you CAN trust:**
- ✅ That suppression is NOW active on nearly all instances
- ✅ That hidden writes are NOW minimized
- ✅ That observability is NOW mostly pure-read
- ✅ That metrics are NOW mostly accurate

**What you STILL verify:**
- ❌ Run explicit 20-request convergence test (confirm 100% suppressed)
- ❌ Query audit trail (complete picture of coexistence activity)
- ❌ Check hidden-revert table (evidence of writes)
- ❌ Database consistency check (no orphaned records)

**Action by operator:**
- ✅ DO run explicit convergence verification (PHASE 5.1)
- ✅ DO query audit trail for complete coexistence picture (PHASE 5.2)
- ✅ DO check for hidden writes (PHASE 5.3)
- ✅ DO verify database consistency (PHASE 5.4)
- ✅ NOW make deployment decisions

**Rollback trigger in this window:**
- Audit trail reveals unexpected mutations
- Hidden writes exceeded expectations
- Database consistency check finds problems
- System health hasn't stabilized

**Expected duration:** 15-30 minutes (T+30 to T+60)

---

### PHASE G: ROLLBACK MANDATORY WINDOW (T = +60 min onwards)

**Classification:** ROLLBACK_MANDATORY ← If issues haven't been resolved, deployment failed

**Characteristics:**
- If you haven't decided to proceed by T+60, you're out of options
- Continued coexistence beyond 60 minutes indicates:
  - Stale instances are NOT retiring (unusual condition)
  - Forced recycle might be needed (Vercel intervention required)
  - Deployment is NOT converging normally

**Action by operator:**
- If no rollback triggered by T+60 min: Assume deployment succeeded OR contact Vercel support
- If rollback WAS triggered earlier: Good (coexistence was actively managed)
- If still seeing divergence at T+60: ABNORMAL (not a normal coexistence pattern)

**Decision point:**
- At T+60, you must either:
  1. ✅ Confirm deployment succeeded + proceed to staged rollout
  2. 🔄 Rollback if any concerns remain
  3. 📞 Escalate to Vercel if system is in unexpected state

---

## Window-by-Window Observation Guidance

### T+0 to T+3 (Build Window)

**How often to observe:** Every 30 seconds
**What to measure:** Build progress only
**Observation tool:** Vercel dashboard
**Decision authority:** Can abort if build fails
**Data reliability:** N/A (no production change yet)

---

### T+3 to T+8 (Early Propagation)

**How often to observe:** Every minute
**What to measure:**
- Vercel instance deployment progress
- First divergence detection
- Catastrophic failure presence

**Observation tool:** 
```bash
# Every 1 minute:
curl /api/admin/system/shos | jq '.auto_reverts.suppressed'
```

**Decision authority:** Can abort if catastrophic failure
**Data reliability:** Low (expect heavy divergence)

---

### T+8 to T+15 (SAFE_OBSERVATION_WINDOW)

**How often to observe:** Every 2-3 minutes ← This is the KEY window
**What to measure:**
- Divergence pattern (consistent or declining?)
- Mutation evidence (unexpected metric jumps?)
- Audit trail (suppression logging correctly?)
- Hidden write evidence (revert table changes?)

**Observation tool:**
```bash
# Every 2-3 minutes:
echo "=== Poll $(date +%s) ==="
for i in {1..5}; do
  curl -s /api/admin/system/shos | jq '{suppressed: .auto_reverts.suppressed, dlq: .metrics.dlq_pending, queue: .metrics.queue_failed}'
done

# Every 5 minutes:
sqlite3 prod.db "SELECT COUNT(*) FROM observability_logs WHERE category='shos_suppression' AND created_at > NOW()-interval 1 minute;"
```

**Decision authority:** Can trigger rollback if mutation detected
**Data reliability:** Medium (divergence pattern is trustworthy, absolute values are not)

---

### T+15 to T+30 (HIGH_RISK_WINDOW)

**How often to observe:** Every 3-5 minutes ← Reduced frequency (divergence decreasing)
**What to measure:**
- Divergence persistence (still there? intermittent? gone?)
- Metric trend (stable or degrading?)
- Health status (improving or declining?)
- Audit trail accumulation

**Observation tool:**
```bash
# Every 5 minutes:
curl -s /api/admin/system | jq '.metrics.overall_health, .metrics.dlq_pending, .metrics.queue_failed'

# Check for divergence (run 3x, look for variation):
for i in {1..3}; do
  curl -s /api/admin/system/shos | jq '.auto_reverts.suppressed'
  sleep 2
done
```

**Decision authority:** DO NOT trigger rollback in this window (high uncertainty)
**Data reliability:** Low-Medium (confidence trap risk — fewer divergences but not necessarily converged)

---

### T+30 to T+60 (CONVERGENCE_WINDOW)

**How often to observe:** Once per 5 minutes ← Much slower
**What to measure:**
- Explicit convergence verification (20 requests)
- Audit trail complete picture
- Hidden write detection
- Database consistency
- System health stabilization

**Observation tool:**
```bash
# 20-request convergence test:
SUPPRESSED_COUNT=0
for i in {1..20}; do
  SUPPRESSED=$(curl -s /api/admin/system/shos | jq '.auto_reverts.suppressed')
  if [ "$SUPPRESSED" = "true" ]; then
    ((SUPPRESSED_COUNT++))
  fi
done
echo "Convergence: $SUPPRESSED_COUNT / 20 instances suppressed"

# Audit trail complete:
sqlite3 prod.db "SELECT COUNT(*) FROM observability_logs WHERE category='shos_suppression';"
sqlite3 prod.db "SELECT COUNT(*) FROM system_control_actions WHERE operation='revert_auto_expired' AND created_at > NOW()-interval 1 hour;"
```

**Decision authority:** CAN decide to proceed if all verifications pass
**Data reliability:** High (convergence test is deterministic)

---

## Decision Matrix by Window

| Window | Time | Divergence | Action | Confidence |
|---|---|---|---|---|
| Build | T+0-3 | N/A | Wait for build; abort if fails | High |
| Early Prop | T+3-8 | Starting | Monitor; abort if catastrophic | Low |
| SAFE_OBS | T+8-15 | Peak | Observe patterns; monitor mutations | Medium |
| HIGH_RISK | T+15-30 | Declining | Don't decide yet; just verify trends | Low-Medium |
| CONVERGENCE | T+30-60 | Nearly gone | Verify explicitly; decide go/no-go | High |
| MANDATORY | T+60+ | Should be 0 | Finalize or escalate | Variable |

---

## Special Case: Operator Observability Polling Effect

**The ShosControlCenter 45-second refresh pattern:**

At T+8, T+8:45, T+9:30, etc., if the operator dashboard is OPEN, it makes GET requests to `/api/admin/system/shos` every 45 seconds.

**Effect on stale instances:**
- If request routes to OLD instance, it executes `processDueFeatureFlagReverts()`
- This RESETS the old instance's idle timer
- Old instance lifetime could be EXTENDED by polling

**Impact on observation windows:**
- **Observation window could be PROLONGED by operator actions**
- Operator trying to observe state inadvertently EXTENDS coexistence
- This is unintentional, not malicious, but real

**Guidance for operator:**
- ✅ During SAFE_OBSERVATION_WINDOW (T+8-15): Heavy monitoring is SAFE (worth the cost)
- ⚠️  During HIGH_RISK_WINDOW (T+15-30): Light monitoring only (reduce refresh rate if possible)
- ⛔ After T+30: Stop active monitoring; run explicit verification only once

---

## Summary: Observation Window Safety Matrix

```
T=0-3 min    | BUILD PHASE        | TRUSTWORTHY_BASELINE   | High confidence
T=3-8 min    | EARLY_PROPAGATION  | EXPECTED_SILENCE       | Low confidence
T=8-15 min   | SAFE_OBSERVATION   | PARTIALLY_TRUSTWORTHY  | Medium confidence ← KEY WINDOW
T=15-30 min  | HIGH_RISK          | OPERATOR_UNSAFE        | Low-Medium confidence
T=30-60 min  | CONVERGENCE        | TRUSTWORTHY_AGAIN      | High confidence (if verified)
T=60+ min    | ROLLBACK_MANDATORY | FAILURE_INDICATIVE     | Escalate or declare success
```

**Critical insight:** The SAFE_OBSERVATION_WINDOW (T+8-15) is when the operator can most safely monitor and make inferences. Beyond T+15, observations become less reliable even as divergences appear to diminish (confidence trap).
