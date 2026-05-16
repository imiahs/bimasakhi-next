# RC-2H Exact Deployment Choreography

Date: 2026-05-15
Mode: Canary execution protocol reconstruction

## Atomic Deployment Set

**11 Mandatory Files (Deploy Atomically)**

### 3 Core/Untracked Files
1. `lib/system/shos.js` — Suppression gate implementation (new file)
2. `app/api/admin/system/shos/route.js` — Canonical SHOS endpoint (new file)
3. `features/admin/system/ShosControlCenter.jsx` — Control center UI (new file)

### 8 Coupled/Tracked Files
4. `app/admin/system/page.js` — Imports ShosControlCenter
5. `app/api/admin/system/route.js` — Observability aggregation
6. `app/api/admin/system/health/route.js` — Health probe
7. `app/api/admin/system-health/route.js` — System-health with Gemini probe
8. `app/api/admin/observability/route.js` — Full observability snapshot
9. `app/api/admin/queue/route.js` — Queue mutation dispatcher (NOW suppression-aware via performShosAction)
10. `app/api/admin/dlq/route.js` — DLQ mutation dispatcher (NOW suppression-aware)
11. `app/api/admin/delivery-logs/route.js` — Delivery mutation dispatcher (NOW suppression-aware)

**These 11 files MUST deploy together in a single Vercel release. Atomic deployment is enforced by single git commit + single Vercel build.**

## Pre-Deployment Verification (BEFORE Canary)

### PHASE 0: Authority Checkpoint

**Objective:** Confirm deployment authorization exists and operator is briefed

**Requirement:**
- [ ] Deployment authority: Only super_admin or CTO can proceed
- [ ] Operator briefing: Team lead confirms understanding of mixed-instance risks
- [ ] Rollback authority: Operator identifies who can execute 1-click rollback
- [ ] Communication: Slack #alerts subscribed; runbook published to team

**Evidence Required:**
- [ ] Operator names confirmed in ticket
- [ ] Rollback procedure tested (1-click works from Vercel dashboard)
- [ ] Runbook link posted to team
- [ ] Monitoring alerts configured and tested (if STEP 4 signals defined)

**If ANY checkpoint fails:** ABORT. Do not proceed to PHASE 1.

**Verification Time:** ~5 minutes

---

## PHASE 1: Pre-Deployment Baseline (T = -2 hours to 0)

### Objective
Capture authoritative ground truth before any canary code lands

### Step 1.1: Production Parity Baseline Capture
**Action:** Manually verify production state matches local expectations

**Exactly verify:**

```bash
# Production endpoint health check (from production URL)
curl -H "Authorization: Bearer super_admin_token" \
  https://bimasakhi.com/api/admin/system \
  | jq '.health_status, .overall_health, .failures'

# Expected result: All observability endpoints healthy, no hung requests
```

**Record exact response:**
- Health status color
- DLQ pending count
- Queue failed count
- Delivery failed count
- Overall health rating
- Any active alerts or errors

**Critical:** This is the BASELINE for coexistence detection. Any divergence from this baseline during canary indicates mixed-instance behavior.

**Verification Time:** ~2 minutes

---

### Step 1.2: Instance Warmth Assessment
**Action:** Check current instance distribution via Vercel analytics

**Navigate to:**
- Vercel dashboard → Deployments → Current active deployment
- Note: Instance count, geographic distribution, average age

**Record:**
- Current instance count: ___
- Oldest instance age: ___
- Newest instance age: ___
- Average request latency: ___ ms

**Why:** Warmer (older) instances are more likely to persist during coexistence. This baseline helps predict stale-instance risk.

**Verification Time:** ~3 minutes

---

### Step 1.3: Observability Route Verification
**Action:** Verify all 5 observability routes are responding cleanly

**Test each route:**
```bash
# 1. Direct SHOS snapshot
curl -H "Authorization: Bearer super_admin_token" \
  https://bimasakhi.com/api/admin/system/shos

# 2. System aggregation
curl -H "Authorization: Bearer super_admin_token" \
  https://bimasakhi.com/api/admin/system

# 3. System health
curl -H "Authorization: Bearer super_admin_token" \
  https://bimasakhi.com/api/admin/system/health

# 4. System-health with Gemini probe
curl -H "Authorization: Bearer super_admin_token" \
  https://bimasakhi.com/api/admin/system-health

# 5. Full observability
curl -H "Authorization: Bearer super_admin_token" \
  https://bimasakhi.com/api/admin/observability
```

**Record:**
- Response time for each route: ___
- Error count: ___
- Any unusual metrics: ___

**Why:** Baseline response times help detect mixed-instance latency divergence during coexistence.

**Verification Time:** ~3 minutes

---

### Step 1.4: Mutation Authority Verification
**Action:** Verify mutation routes are accessible (but don't execute mutations)

**Test connectivity only:**
```bash
# HEAD request to mutation endpoints (no payload, no mutation)
curl -I -X POST \
  -H "Authorization: Bearer super_admin_token" \
  https://bimasakhi.com/api/admin/queue

curl -I -X POST \
  -H "Authorization: Bearer super_admin_token" \
  https://bimasakhi.com/api/admin/dlq

curl -I -X POST \
  -H "Authorization: Bearer super_admin_token" \
  https://bimasakhi.com/api/admin/delivery-logs
```

**Record:**
- HTTP 200/2xx for all 3 mutation endpoints
- Response time: ___
- Any auth errors: ___

**Why:** Confirms mutation authority is accessible pre-canary (baseline for suppression detection post-canary).

**Verification Time:** ~2 minutes

---

### Step 1.5: Database Schema Verification
**Action:** Confirm system control tables exist and are empty/clean

**Query production database:**
```sql
SELECT COUNT(*) as shos_suppression_count FROM observability_logs 
  WHERE category = 'shos_suppression' 
  AND created_at > NOW() - INTERVAL 24 HOURS;

SELECT COUNT(*) as control_actions_count FROM system_control_actions 
  WHERE created_at > NOW() - INTERVAL 24 HOURS;

SELECT COUNT(*) as suppressed_count FROM system_control_actions 
  WHERE operation = 'suppressed_execution_attempt';
```

**Record:**
- SHOS suppression log count: ___ (should be 0)
- Recent control actions: ___
- Any suppressed attempts: ___ (should be 0)

**Why:** Confirms no suppression-related state exists pre-canary. Any post-canary entries are definitive proof of suppression/mixed-instance behavior.

**Verification Time:** ~2 minutes

---

### Step 1.6: Operator Communication Sent
**Action:** Notify monitoring team and stakeholders

**Post to #alerts and team:**
```
🚀 RC-2H SHOS Canary Protocol Reconstruction - PHASE 1 COMPLETE

Baseline captured:
- Production parity: VERIFIED (all routes responding normally)
- Instance state: [details from Step 1.2]
- Observability: CLEAN (no ongoing issues)
- Mutation authority: ACCESSIBLE (no restrictions pre-canary)
- Database: CLEAN (no suppression state found)

Canary deployment window: [TIME WINDOW]
Expected instance rollout: 5-15 minutes
High-risk observation window: 15 minutes post-deploy
Rollback capability: ACTIVE (1-click ready)

Standing by for PHASE 2 deployment trigger.
```

**Verification Time:** ~2 minutes

**PHASE 1 TOTAL TIME: ~19 minutes**

---

## PHASE 2: Deployment Trigger (T = 0)

### Step 2.1: Final Authority Confirmation
**Action:** Operator confirms deployment authority one final time

**Exact question to operator:**
```
CONFIRM: Are you ready to proceed with SHOS canary deployment?
- Code is ready (RC-2E implementation)
- Baseline is captured (PHASE 1 complete)
- Rollback is tested and available
- Mixed-instance risks are understood

Yes / No?
```

**If NO:** ABORT. Do not proceed.
**If YES:** Proceed to Step 2.2.

---

### Step 2.2: Push Code to Main
**Action:** Merge 11 mandatory files to main branch in single atomic commit

**Exact command (local):**
```bash
# Stage all 11 files
git add \
  lib/system/shos.js \
  app/api/admin/system/shos/route.js \
  features/admin/system/ShosControlCenter.jsx \
  app/admin/system/page.js \
  app/api/admin/system/route.js \
  app/api/admin/system/health/route.js \
  app/api/admin/system-health/route.js \
  app/api/admin/observability/route.js \
  app/api/admin/queue/route.js \
  app/api/admin/dlq/route.js \
  app/api/admin/delivery-logs/route.js

# Single atomic commit
git commit -m "RC-2H: SHOS suppression deployment canary (T=0)"

# Push to main
git push origin main
```

**Evidence:**
- [ ] All 11 files in single commit
- [ ] Commit message includes RC-2H identifier
- [ ] Push succeeds
- [ ] GitHub shows commit on main branch

**Verification Time:** ~2 minutes

---

### Step 2.3: Monitor Vercel Build Trigger
**Action:** Confirm Vercel receives push and starts build

**Verify in Vercel dashboard:**
- [ ] Build status: IN_PROGRESS
- [ ] Build started at: ___
- [ ] Estimated completion: ___

**Expected build time:** 60-90 seconds (standard Next.js build)

**If build fails:** Rollback commit and abort canary.

**Verification Time:** ~1 minute (+ 60-90 second build)

---

## PHASE 3: Build Validation (T = +1 to +3 minutes)

### Step 3.1: Build Success Verification
**Action:** Confirm Vercel build completes successfully

**In Vercel dashboard, verify:**
- [ ] Build status: READY
- [ ] No build errors
- [ ] All 11 files included in build output
- [ ] Build timestamp: ___

**If build fails:**
- Rollback commit from main
- Abort canary
- Fix issues locally, restart from PHASE 1

**Verification Time:** ~2 minutes (build completes automatically)

---

### Step 3.2: Build Artifact Verification
**Action:** Confirm build artifacts are ready for distribution

**Exact checks:**
```bash
# Verify build includes all required routes
curl -s https://bimasakhi.com/.vercel/source/artifacts \
  | grep -E "admin/system|shos|queue|dlq|delivery-logs"
```

**Record:**
- [ ] All 11 files present in artifacts
- [ ] Route table includes: /api/admin/system/shos
- [ ] Bundle includes: ShosControlCenter.jsx

**Verification Time:** ~2 minutes

**PHASE 3 TOTAL TIME: ~4 minutes**

---

## PHASE 4: Instance Rollout Observation (T = +3 to +20 minutes) — HIGH RISK WINDOW

### Objective
Monitor instance replacement and mixed-instance behavior in real time

### Step 4.1: Rollout Monitoring (Continuous, T = +3 to +15 min)

**Action:** Monitor Vercel deployment progress in real-time

**In Vercel dashboard:**
- Watch "Deployments" tab
- Look for "Instances Deployed" counter incrementing
- Expected progression: 5-20 instances deploy gradually

**Record every 30 seconds:**
- [ ] T+3: Instance deployment starts
- [ ] T+6: ___ instances deployed
- [ ] T+9: ___ instances deployed
- [ ] T+12: ___ instances deployed
- [ ] T+15: ___ instances deployed (expected: ~80% complete)

**Expected timeline:**
- T+0-3: Build
- T+3-8: First wave of new instances (cold start)
- T+8-15: Gradual instance replacement (warm instances retire)
- T+15+: Final convergence (remaining stragglers)

---

### Step 4.2: Mixed-Instance Behavior Detection (T = +5 to +15 min)

**Action:** Probe observability routes with rapid succession to detect instance diversity

**Every 30 seconds, execute:**
```bash
# Capture response metadata from each request
for i in {1..5}; do
  RESPONSE=$(curl -H "Authorization: Bearer token" \
    -H "X-Request-Trace: canary-probe-$i" \
    https://bimasakhi.com/api/admin/system/shos)
  
  # Extract relevant fields
  echo "$i: auto_reverts=$(echo $RESPONSE | jq '.auto_reverts')"
  echo "$i: suppressed=$(echo $RESPONSE | jq '.auto_reverts.suppressed')"
  echo "$i: timestamp=$(echo $RESPONSE | jq '.timestamp')"
  echo "$i: latency=$(measure_latency)"
  echo "---"
done
```

**Watch for divergence indicators:**
- [ ] `auto_reverts.suppressed = true` (new instance)
- [ ] `auto_reverts.suppressed = false` OR missing (old instance)
- [ ] Inconsistent responses within 1 minute window = mixed-instance confirmed

**Record:**
- T+5:00 - Divergence status: ___
- T+7:30 - Divergence status: ___
- T+10:00 - Divergence status: ___
- T+12:30 - Divergence status: ___
- T+15:00 - Divergence status: ___

**If divergence detected:** Record time and message to team. Do NOT abort yet; observation continues.

---

### Step 4.3: Observability Truthfulness Check (T = +5 to +15 min)

**Action:** Verify observability routes are responding truthfully

**Every 2 minutes, capture baseline + observe:**

```bash
# Get baseline from MULTIPLE requests (could hit different instances)
BASELINE=$(curl -H "Authorization: Bearer token" \
  https://bimasakhi.com/api/admin/system)

# Extract key metrics
DLQ_COUNT=$(echo $BASELINE | jq '.metrics.dlq_pending')
QUEUE_COUNT=$(echo $BASELINE | jq '.metrics.queue_failed')

# Immediately poll again
RECHECK=$(curl -H "Authorization: Bearer token" \
  https://bimasakhi.com/api/admin/system)

DLQRECHECK=$(echo $RECHECK | jq '.metrics.dlq_pending')
QUEUERECHECK=$(echo $RECHECK | jq '.metrics.queue_failed')

# Verify consistency
if [ "$DLQ_COUNT" = "$DLQRECHECK" ]; then
  echo "✓ DLQ count consistent"
else
  echo "⚠️  DLQ count DIVERGED: $DLQ_COUNT → $DLQRECHECK"
fi
```

**Record divergence events:**
- [ ] T+7:00 - Divergence: ___
- [ ] T+11:00 - Divergence: ___
- [ ] T+15:00 - Divergence: ___

**Why:** Hidden writes during mixed-instance period could cause metric inconsistency. Divergence signals old instances are still executing.

---

### Step 4.4: Mutation Authority Check (T = +5 to +15 min)

**Action:** Confirm mutation authority is accessible but test responses

**Every 3 minutes, send test probe (NO ACTUAL MUTATION):**

```bash
# Test POST to queue endpoint with invalid payload
# (this will fail validation but shows route is responding)
RESPONSE=$(curl -X POST \
  -H "Authorization: Bearer super_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"test": "probe"}' \
  https://bimasakhi.com/api/admin/queue)

# Capture response signature
SIGNATURE=$(echo $RESPONSE | jq '{suppressed, success, error}')

echo "T+X: Queue response signature: $SIGNATURE"
```

**Watch for suppression signal:**
- [ ] Expected NEW instance response: `{suppressed: true, success: false, ...}`
- [ ] Expected OLD instance response: `{suppressed: false, success: false, error: "invalid payload"}`

**Record divergence:**
- [ ] T+5:00 - Suppression signal: ___
- [ ] T+8:00 - Suppression signal: ___
- [ ] T+11:00 - Suppression signal: ___
- [ ] T+14:00 - Suppression signal: ___

**Verification Time:** ~10 minutes (continuous monitoring)

---

### Step 4.5: Stale Instance Refresh Simulation (T = +10 min)

**Action:** Simulate operator polling behavior (ShosControlCenter 45-sec refresh pattern)

**At T+10:00 minute exactly:**
```bash
# Simulate operator opening dashboard (makes rapid GET requests)
for i in {1..3}; do
  RESPONSE=$(curl -H "Authorization: Bearer token" \
    https://bimasakhi.com/api/admin/system/shos)
  
  SUPPRESSED=$(echo $RESPONSE | jq '.auto_reverts.suppressed')
  REVERTED=$(echo $RESPONSE | jq '.auto_reverts.reverted')
  
  echo "Poll $i: suppressed=$SUPPRESSED, reverted=$REVERTED"
  sleep 2
done
```

**Record:**
- [ ] Suppression status after polling: ___
- [ ] Any reverts triggered? ___
- [ ] Observability logs show revert activity? ___

**Why:** Operator actions could extend stale-instance lifetime by refreshing warm instances. This simulates real operator behavior.

---

### Step 4.6: Operator Status Report (T = +15 min)

**Action:** Post observation window status to team

**Exact report format:**

```
⏱️  PHASE 4 OBSERVATION COMPLETE (T+15 min)

🚀 Instance Rollout:
- Instances deployed: ___
- Rollout progress: ___%
- Expected final deployment: T+[time]

🔄 Mixed-Instance Status:
- Divergence detected: YES/NO
- Divergence end time: ___
- Peak divergence: ___

✅ Observability Status:
- Truthfulness: TRUSTWORTHY / PARTIALLY_TRUSTWORTHY / OPERATOR_UNSAFE
- Metric consistency: ✓ / ⚠️ / ✗
- Anomalies: ___

🚫 Mutation Authority:
- Status: SUPPRESSED / DIVERGENT / EXECUTING
- Suppression coverage: ___%

📊 Stale Instance Refresh:
- Polling simulation complete
- Audit trail: [log entries if any]

👁️  NEXT DECISION:
- Continue stabilization (PHASE 5)
- Abort / Rollback (if issues found)
```

**PHASE 4 TOTAL TIME: ~15 minutes**

---

## PHASE 5: Instance Convergence & Stabilization (T = +15 to +45 min)

### Objective
Monitor instance replacement completion and system stabilization

### Step 5.1: Full Convergence Verification (T = +15 to +30 min)

**Action:** Verify all instances are running new code

**In Vercel dashboard:**
- [ ] All instances marked as DEPLOYED
- [ ] No instances in DEPLOYING state
- [ ] Build age: ~20-30 minutes

**Confirm with repeated probes:**
```bash
# Run 20 rapid requests to force different instance routing
for i in {1..20}; do
  RESPONSE=$(curl -s -H "Authorization: Bearer token" \
    https://bimasakhi.com/api/admin/system/shos)
  
  SUPPRESSED=$(echo $RESPONSE | jq '.auto_reverts.suppressed')
  
  if [ "$SUPPRESSED" != "true" ]; then
    echo "⚠️  T+[time]: Old instance detected on request $i"
  fi
done
```

**Record:**
- [ ] All 20 requests returned `suppressed: true`
- [ ] Convergence time: ___
- [ ] Last old instance observed: T+___ min

**Why:** Confirms all instances have new code. This ends the coexistence window.

---

### Step 5.2: Audit Trail Review (T = +30 min)

**Action:** Review database audit trail for suppression activity

**Query:**
```sql
SELECT 
  created_at,
  actor_id,
  operation,
  category,
  metadata
FROM observability_logs
WHERE category = 'shos_suppression'
  AND created_at > NOW() - INTERVAL 1 HOUR
ORDER BY created_at DESC;
```

**Record:**
- [ ] Total suppressed attempts: ___
- [ ] First suppression logged: T+___ min
- [ ] Last suppression logged: T+___ min
- [ ] Any unexpected entries: ___

**Why:** Audit trail confirms suppression was active and logged correctly throughout coexistence. Any gaps suggest unlogged mutations occurred.

---

### Step 5.3: Hidden Auto-Revert Detection (T = +30 min)

**Action:** Detect if any hidden auto-reverts executed during coexistence

**Query:**
```sql
SELECT 
  created_at,
  actor_id,
  target_key,
  operation,
  metadata
FROM system_control_actions
WHERE operation IN ('revert_auto_expired', 'revert_forced', 'revert_scheduled')
  AND created_at > NOW() - INTERVAL 1 HOUR
ORDER BY created_at DESC;
```

**Record:**
- [ ] Auto-revert count: ___ (expected: could be non-zero if old instances still executing)
- [ ] Revert operations: ___
- [ ] Feature flags affected: ___

**Why:** Confirms whether hidden writes occurred on old instances. This is critical observability truthfulness check.

---

### Step 5.4: Consistency Check (T = +35 min)

**Action:** Verify database state consistency

**Query:**
```sql
-- Check for orphaned or inconsistent control state
SELECT COUNT(*) as control_rows FROM system_control_config;
SELECT COUNT(*) as control_actions FROM system_control_actions 
  WHERE created_at > NOW() - INTERVAL 2 HOURS;
  
-- Verify feature flag state matches expectations
SELECT * FROM system_control_config LIMIT 1;
```

**Record:**
- [ ] Control rows: ___ (expected: 1)
- [ ] Recent actions: ___
- [ ] Feature flag state: ___
- [ ] Any inconsistencies: ___

**Why:** Ensures database didn't become corrupted during mixed-instance period. Any orphaned records indicate deployment issue.

---

### Step 5.5: Health Metrics Stabilization (T = +40 min)

**Action:** Confirm system health metrics are stable

**Capture baseline + trend:**
```bash
# T+40 min baseline
BASELINE=$(curl -H "Authorization: Bearer token" \
  https://bimasakhi.com/api/admin/system)

DLQ=$(echo $BASELINE | jq '.metrics.dlq_pending')
QUEUE=$(echo $BASELINE | jq '.metrics.queue_failed')
HEALTH=$(echo $BASELINE | jq '.metrics.overall_health')

echo "Baseline: DLQ=$DLQ, QUEUE=$QUEUE, HEALTH=$HEALTH"

# Wait 2 minutes, capture again
sleep 120

RECHECK=$(curl -H "Authorization: Bearer token" \
  https://bimasakhi.com/api/admin/system)

DLQ2=$(echo $RECHECK | jq '.metrics.dlq_pending')
QUEUE2=$(echo $RECHECK | jq '.metrics.queue_failed')
HEALTH2=$(echo $RECHECK | jq '.metrics.overall_health')

echo "After 2 min: DLQ=$DLQ2, QUEUE=$QUEUE2, HEALTH=$HEALTH2"

# Check for unexpected changes
if [ "$HEALTH" = "$HEALTH2" ]; then
  echo "✓ Health stable"
else
  echo "⚠️  Health changed: $HEALTH → $HEALTH2"
fi
```

**Record:**
- [ ] Initial health: ___
- [ ] Health after 2 min: ___
- [ ] Stability: STABLE / UNSTABLE
- [ ] Any alerts triggered: ___

**Why:** Confirms no system degradation during/after canary deployment.

---

### Step 5.6: Final Stabilization Report (T = +45 min)

**Action:** Post complete status to team

```
✅ PHASE 5 STABILIZATION COMPLETE (T+45 min)

🎯 Convergence:
- All instances updated: YES ✓
- Last old instance retired: T+___ min
- Coexistence window duration: ___ minutes

📋 Audit Trail:
- Suppression activity: ✓ Logged
- Hidden auto-reverts: ___ detected
- Orphaned records: NONE ✓

🏥 System Health:
- Metric stability: ✓ STABLE
- DLQ pending: ___
- Queue failed: ___
- Overall health: ___

🔒 Data Integrity:
- Control state: ✓ CONSISTENT
- Feature flags: ✓ CORRECT
- Action history: ✓ COHERENT

✅ CANARY PHASE COMPLETE

✅ Status: READY_FOR_STAGED_DEPLOYMENT (if no issues found)
⚠️  Status: ROLLBACK_RECOMMENDED (if issues found)
```

**PHASE 5 TOTAL TIME: ~30 minutes**

---

## PHASE 6: Operator Decision Point (T = +45 min)

### Objective
Operator makes final decision: proceed or rollback

### Step 6.1: Final Checklist

**Operator must verify:**
- [ ] All phases completed
- [ ] No critical anomalies found
- [ ] Audit trail shows expected suppression behavior
- [ ] System health stable
- [ ] Database consistent
- [ ] Team concurs decision is safe

**If ANY item unchecked:** Recommend ROLLBACK (PHASE 7)
**If ALL items checked:** May proceed to staged deployment (separate cycle)

---

### Step 6.2: Decision Documentation

**Operator documents decision:**

```
CANARY DECISION (T+45 min):

Decision: [PROCEED / ROLLBACK]

Justification:
- Coexistence window: ___ minutes (acceptable/unacceptable)
- Suppression coverage: ___% (acceptable/unacceptable)
- Audit trail: [clean/concerning/unexpected]
- System health: [stable/degraded/alerting]
- Data integrity: [verified/questionable/corrupted]

Recommendation for next phase:
- [Details about staged rollout readiness]

Approved by: ___
Timestamp: ___
```

**Post to team channel with complete evidence link**

---

## PHASE 7: Rollback (IF TRIGGERED)

### Objective
Execute controlled rollback if canary reveals issues

### Step 7.1: Rollback Decision Authority

**Only trigger rollback if:**
- [ ] Operator decision = ROLLBACK
- [ ] OR system health becomes CRITICAL
- [ ] OR audit trail shows uncontrolled mutations
- [ ] OR mixed-instance period extends beyond 60 minutes

---

### Step 7.2: Rollback Execution

**From Vercel dashboard:**
1. Navigate to Deployments
2. Find previous stable deployment (pre-canary)
3. Click "Promote to Production"
4. Confirm promotion

**Expected rollback time:** 30-60 seconds (Vercel 1-click)

---

### Step 7.3: Rollback Verification (T = post-rollback +5 min)

**Verify rollback completed:**

```bash
# Confirm old code is active
RESPONSE=$(curl -H "Authorization: Bearer token" \
  https://bimasakhi.com/api/admin/system/shos)

# Old code should NOT have suppression gate
SUPPRESSED=$(echo $RESPONSE | jq '.auto_reverts.suppressed')

if [ "$SUPPRESSED" != "true" ]; then
  echo "✓ Rollback verified - old code active"
else
  echo "⚠️  WARNING - suppression still active after rollback"
fi
```

---

### Step 7.4: Rollback Aftermath

**Post-rollback actions:**

1. **Document findings:**
   - What triggered rollback
   - What issues were observed
   - Timeline of coexistence

2. **Preserve evidence:**
   - Save audit trail to docs/forensics/
   - Save deployment metrics
   - Save observability logs

3. **Plan remediation:**
   - What needs to change for next canary attempt
   - Whether suppression redesign needed
   - Whether observability redesign needed

4. **Communicate to team:**
   ```
   🔄 ROLLBACK COMPLETE (T + [time])
   
   Reason: [Specific issue that triggered rollback]
   
   Evidence: [Link to forensic analysis]
   
   Next steps: [Plan for redeployment attempt]
   ```

---

## Summary: Exact Choreography Timeline

```
PHASE 0: Authority Checkpoint               T = -2 hrs (5 min)
PHASE 1: Pre-Deployment Baseline            T = -2 to 0 hrs (19 min)
PHASE 2: Deployment Trigger                 T = 0 min (2 min)
PHASE 3: Build Validation                   T = +1 to +3 min (4 min)
PHASE 4: Rollout & Mixed-Instance Observe  T = +3 to +20 min (17 min HIGH RISK)
PHASE 5: Convergence & Stabilization        T = +20 to +45 min (25 min)
PHASE 6: Operator Decision Point            T = +45 min (5 min)
PHASE 7: Rollback (IF TRIGGERED)            T = post-decision (varies)

TOTAL (no rollback): ~77 minutes (1 hour 17 minutes)
TOTAL (with rollback): ~100+ minutes
```

## Critical Operator Responsibilities During Choreography

1. **Phase 0-1:** Authority verification, baseline capture, team briefing
2. **Phase 2:** Final confirmation before code push
3. **Phase 4:** CONTINUOUS MONITORING (cannot be automated, real-time observation required)
4. **Phase 5:** Audit trail review and consistency verification
5. **Phase 6:** Final decision (proceed vs. rollback)
6. **Phase 7:** Rollback execution if necessary

**The operator is the human-in-the-loop authority for mixed-instance management. Observability truthfulness depends on operator vigilance during Phase 4.**
