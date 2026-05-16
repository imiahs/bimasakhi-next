# RC-2J Guarded Live Execution Plan

Date: 2026-05-16
Cycle: RC-2J (Guarded Live Canary Execution Planning)
Mode: Documentation-only. Zero deployment. Zero runtime mutation.

---

## Step 2: Exact Operator Choreography

### 2.1 Mandatory Roles

Canary execution requires exactly THREE named operators.
Proceeding with fewer than three is a hard no-go condition.

---

**ROLE A — DEPLOYMENT LEAD**
- Authority: Initiates deployment (git push to main)
- Authority: Calls preflight checks complete
- Authority: Documents phase transitions
- Does NOT: Interpret monitoring signals
- Does NOT: Own rollback decision
- Does NOT: Declare convergence

---

**ROLE B — SIGNAL OBSERVER**
- Authority: Runs all observability probes
- Authority: Reports divergence index and signal counts
- Authority: Calls SAFE_OBSERVATION to HIGH_RISK transition
- Authority: Runs 20-request convergence verification test at T+30
- Does NOT: Own rollback decision
- Does NOT: Initiate deployment
- Does NOT: Interpret signals alone — reports raw evidence to ROLE C

---

**ROLE C — ROLLBACK AUTHORITY**
- Authority: Final say on all rollback decisions
- Authority: Declares rollback trigger confirmed
- Authority: Executes 1-click Vercel rollback
- Authority: Declares rollback stabilization complete
- Authority: Calls T+45 PROCEED or ROLLBACK final decision
- Does NOT: Run observability probes during coexistence
- Does NOT: Initiate deployment
- Does NOT: Interpret signals without ROLE B evidence first

**Critical separation rule:**
ROLE B (signal observer) and ROLE C (rollback authority) MUST be different people.
No single operator may both interpret coexistence signals AND own rollback execution
without a secondary verbal confirmation from the other role.

---

### 2.2 Forbidden Single-Operator Conditions

- Single operator performing both ROLE B and ROLE C → HARD NO-GO
- Single operator performing deployment AND rollback authority → HARD NO-GO
- ROLE C not present at T+45 decision gate → HARD NO-GO
- ROLE C not contactable during T+15 to T+60 → HARD NO-GO

---

### 2.3 Mandatory Staffing Conditions

All of the following must be true before T-15 countdown begins:

- [ ] ROLE A named and present
- [ ] ROLE B named and present
- [ ] ROLE C named and present
- [ ] All three roles have Vercel dashboard access verified
- [ ] All three roles have DB query tool access verified
- [ ] Communication channel open (chat/voice) for all three roles
- [ ] Rollback procedure printed or on-screen for ROLE C

If any item unchecked: ABORT. Do not begin T-15 countdown.

---

### 2.4 Mandatory Checkpoint Confirmations

Each of the following requires explicit verbal or written acknowledgment by ALL THREE ROLES before proceeding:

| Checkpoint | Time | What is confirmed |
|---|---|---|
| PREFLIGHT COMPLETE | T-5 | All preflight checks passed; staffing complete |
| DEPLOYMENT AUTHORIZED | T-1 | ROLE C explicitly says "proceed" |
| BUILD VERIFIED | T+3 | ROLE A confirms build READY in Vercel |
| SAFE_OBS START | T+8 | ROLE B confirms first probe responses |
| HIGH_RISK ENTRY | T+15 | All roles confirm reduced monitoring cadence |
| CONVERGENCE TEST | T+30 | ROLE B reports 20-request batch result |
| FINAL DECISION | T+45 | ROLE C announces PROCEED or ROLLBACK |
| HARD STOP | T+60 | ROLE C initiates mandatory rollback if not already decided |

---

### 2.5 Mandatory Handoff Protocol

If any role must leave during T+8 to T+60 coexistence window:
- Replacement must be named and briefed before original operator leaves
- ROLE C handoff requires minimum 5-minute overlap
- If handoff cannot occur: ROLE C must call ROLLBACK before departing
- No gaps in ROLE C coverage during T+8 to T+60

---

## Step 3: Exact Live Execution Timeline

### T-15: Preparation Phase

**ROLE A actions:**
- [ ] Confirm local git state: all 11 SHOS files staged and ready
- [ ] Run `npm run build` locally — must pass
- [ ] Open Vercel dashboard
- [ ] Open DB query tool
- [ ] Confirm rollback target: current production deployment hash noted

**ROLE B actions:**
- [ ] Run preflight observability probe: GET /api/admin/system/shos — note baseline suppression=false
- [ ] Run preflight health probe: GET /api/admin/system — note baseline health status
- [ ] Run preflight control check: SELECT COUNT(*) FROM system_control_config — confirm = 1
- [ ] Run preflight audit check: SELECT COUNT(*) FROM observability_logs WHERE category='shos_suppression' — confirm = 0

**ROLE C actions:**
- [ ] Locate and test Vercel 1-click rollback button for current deployment
- [ ] Confirm rollback target hash
- [ ] Confirm Vercel dashboard shows correct current deployment
- [ ] Verbally confirm: "Rollback path verified and ready"

**MANDATORY HOLD:** All three roles must complete their T-15 checklist and
confirm verbally before T-5 countermeasure begins.

---

### T-5: Final Authority Gate

- ROLE A, B, C all confirm readiness aloud
- ROLE C gives explicit "proceed" authorization
- If ROLE C hesitates: ABORT T-5 gate
- Clock begins at ROLE C's "proceed"

---

### T+0: Deployment Initiation

**ROLE A executes:**
```
git add [11 mandatory SHOS files]
git commit -m "RC-2J: SHOS suppression canary deployment"
git push origin main
```

**ROLE B starts timer**

**ROLE C watches Vercel dashboard** for build trigger

Expected: Vercel build starts within 30 seconds of push

---

### T+1 to T+3: Build Validation

**ROLE B monitors:** Vercel build status every 30 seconds
**Success condition:** Vercel status = READY by T+3
**Failure condition:** Vercel status = ERROR, or BUILDING past T+5

**If build fails at T+3:**
- ROLE A: revert commit — `git revert HEAD --no-edit && git push origin main`
- ROLE C: confirms revert deployed
- All roles: post-mortem before any retry

---

### T+3 to T+8: Early Propagation Silence

**ROLE B:** No monitoring probes during this window
**Reason:** Probing routes to old instances refreshes warm timers; early silence
lets some stale instances begin natural expiry

**ROLE A:** Documents deployment time stamp
**ROLE C:** Remains available and watching Vercel dashboard

**Forbidden in this window:** Any GET to admin observability routes

---

### T+8: SAFE_OBSERVATION_WINDOW Opens

**ROLE B activates signal monitoring:**
Run 5-request batch probes:
```
# Batch probe pattern (5 requests to same endpoint)
for i in 1..5:
  GET /api/admin/system/shos
  record: auto_reverts.suppressed (true/false)
  record: response time
```

**Expected divergence pattern:**
- Mix of true/false for `suppressed` field
- Both values expected — this is normal
- ROLE B reports: "X of 5 requests suppressed"

**If 0 of 5 suppressed at T+10:** → IMMEDIATE ROLLBACK TRIGGER
- Suppression gate may not have deployed
- ROLE B calls trigger, ROLE C executes rollback without deliberation

**If 5 of 5 suppressed at T+10:** May indicate rapid convergence OR stale instances
not yet appearing. Do NOT declare convergence early.

---

### T+10: Mandatory Mid-SAFE_OBS Checkpoint

**ROLE B runs:**
- A1 probe: suppression status batch (5 requests)
- A2 probe: `SELECT COUNT(*) FROM observability_logs WHERE category='shos_suppression'` → must be > 0
- B1 probe: POST to /api/admin/queue with test action → must return {suppressed: true}
- D1 probe: `SELECT COUNT(*) FROM system_control_config` → must = 1

**ROLE B reports all 4 results to ROLE C**
**ROLE C confirms no rollback trigger condition met**

---

### T+15: HIGH_RISK_WINDOW Entry

**ALL ROLES:** Explicitly acknowledge HIGH_RISK entry

**ROLE B:** Reduce monitoring cadence to every 5 minutes ONLY
**Reason:** Continued frequent probing refreshes stale instances; the monitoring
activity itself prolongs coexistence. This is the observability-extends-risk trap.

**Forbidden in T+15 to T+30:**
- Batch probes more frequent than every 5 minutes
- Any refresh of /api/admin/system dashboard
- Any ShosControlCenter UI loads (ShosControlCenter polls every 45 s — do NOT open)

**ROLE B runs 5-minute interval light probe only:**
- Run single 3-request divergence check: count suppressed/unsuppressed
- Do NOT run 20-request batch before T+30

**ROLE C:** Enters heightened vigilance mode — receives every ROLE B report immediately

---

### T+20: Convergence Progress Check

**ROLE B runs:** Single 3-request batch
**Expected:** Trend toward all suppressed (old instances retiring naturally)
**Acceptable state:** Still some divergence (0–1 unsuppressed out of 3 = normal)
**Concerning state:** More than 1 unsuppressed at T+20 → flag to ROLE C

**ROLE C assessment:** If flagged, decide: WAIT or ROLLBACK
- Wait condition: divergence not increasing, rate = 1 outlier per batch → continue
- Rollback trigger: divergence increasing, or same rate at T+25 → escalate to rollback

---

### T+25: Stale-Instance Liveness Check

**ROLE B:** Run 3-request batch
**Target:** Outliers should be rare (0–1 per batch) by T+25
**If T+25 shows consistent divergence (2+ out of 3):**
- ROLE B flags ROLE C immediately
- ROLE C makes decision: continue to T+30 explicit test OR call rollback

**Hard rule:** If divergence is increasing trend between T+20 and T+25, ROLE C
must call rollback — do not wait for T+30.

---

### T+30: CONVERGENCE_WINDOW Opens — Explicit Verification

**ROLE B runs mandatory 20-request convergence test:**
```
for i in 1..20:
  GET /api/admin/system/shos
  record: auto_reverts.suppressed
count_suppressed = sum of true values
count_unsuppressed = sum of false values
```

**Convergence criteria:**
- 20/20 suppressed → CONVERGED
- 19/20 suppressed (1 outlier) → LIKELY CONVERGED, run again
- 18/20 or fewer suppressed → NOT CONVERGED — escalate to ROLE C

**If NOT CONVERGED at T+30:**
- ROLE C assesses: If trend shows declining divergence, may wait to T+35
- If T+35 also shows NOT CONVERGED: ROLE C calls rollback

**ROLE B also runs at T+30:**
- Audit trail check: `SELECT COUNT(*) FROM observability_logs WHERE category='shos_suppression'` → confirm entries growing
- Auto-revert detection: `SELECT COUNT(*) FROM system_control_actions WHERE created_at > [T+0 timestamp]` → document count
- Control state: `SELECT COUNT(*) FROM system_control_config` → must remain = 1

---

### T+35 to T+45: Stabilization Verification

**ROLE B:** Run 3-request batch every 5 minutes
**ROLE B:** Run health consistency check: GET /api/admin/system — should show stable metrics
**ROLE A:** Prepare final decision evidence summary

At T+45: ROLE A assembles evidence package for ROLE C decision:
- T+30 convergence test result
- Any auto-revert count
- Current health status
- DLQ/queue stability

---

### T+45: Final Decision Gate

**ROLE C receives evidence package from ROLE A**
**ROLE C asks ROLE B:** "Any signals in last 15 minutes warranting rollback?"

**ROLE C makes ONE explicit decision:**
- PROCEED → Document decision; canary declared successful; production stabilized
- ROLLBACK → Execute immediately per rollback runbook

**No ambiguous states permitted at T+45.**
No "let's wait a bit" extension past T+50 without explicit ROLE C authorization.
**T+60 is an automatic rollback trigger regardless of T+45 decision.**

---

### T+60: Hard Stop

If no PROCEED decision documented by T+60: ROLE C executes mandatory rollback.
This is non-negotiable and pre-authorized. No deliberation. No escalation required.

---

## Step 6: Human-Stress Containment Plan

### Acceptable Operator Load

- ROLE B monitoring workload: 1 batch probe every 2–3 min in T+8-15, then 1 every 5 min in T+15-30
- ROLE C decision load: Evidence-based decisions at 5 checkpoints (T+10, T+25, T+30, T+45, T+60)
- ROLE A action load: Deployment at T+0, commit management only, evidence summary at T+45

### Dangerous Operator Load

- ROLE B running continuous single-request probes (fatigue + stale-instance refresh risk)
- ROLE C receiving unfiltered signal stream without ROLE B summary layer
- ROLE A managing both deployment and observability simultaneously

### Authorization-Blocking Staffing Failure

- ROLE C absent or unresponsive at any checkpoint between T+10 and T+60
- ROLE B absent during T+8 to T+30
- Any role doing another high-cognitive task simultaneously

### Anti-Fatigue Rules

- All roles must have eaten and be rested before T-15
- No canary during extended shift (>6 hours already worked)
- ROLE C must have decision authority pre-committed in writing ("I will rollback at T+60 without deliberation")
- ROLE B scripts must be pre-written — no ad-hoc query construction during canary

---

## Step 7: Final Live Execution Authorization

### Technical survivability: PASS_WITH_CONSTRAINTS
Evidence: Suppression gate implemented, build passes, 11 files staged

### Rollback survivability: CONDITIONAL_PASS
Evidence: Mechanism exists; second coexistence is a risk; runbook must address it

### Observability survivability: CONDITIONAL_PASS
Evidence: Window-dependent; explicit verification at T+30 addresses confidence trap

### Human survivability: CONDITIONAL_PASS
Evidence: Three-role model addresses OPERATOR_RISK; pre-committed abort rules address hesitation

### Coexistence survivability: CONDITIONAL_PASS
Evidence: Time-bounded at T+60; monitoring cadence reduction at T+15 controls operator-extension risk

### Final classification:

**READY_FOR_GUARDED_CANARY_EXECUTION**

**Condition:** All three roles named, present, and confirmed at T-15 gate.
Any missing condition degrades to READY_ONLY_WITH_ADDITIONAL_GUARDS or EXECUTION_AUTHORIZATION_BLOCKED.

---

## Final Live Execution Matrix

| Time | Action | Verification Required | Rollback Critical | Operator Owner |
|---|---|---|---|---|
| T-15 | Preflight: stage files, verify baseline | Baseline suppression=false, health stable, control_config=1 | YES | ROLE A + B |
| T-15 | Preflight: verify rollback path | 1-click rollback tested | YES | ROLE C |
| T-5 | Final authority gate | ROLE C explicit "proceed" | YES | ROLE C |
| T+0 | Deploy: git push to main | Push confirmed, Vercel build starts | YES | ROLE A |
| T+1 | Build monitoring starts | Vercel status tracked | YES | ROLE B |
| T+3 | Build verification | Vercel status = READY | YES | ROLE B → ROLE C |
| T+3 to T+8 | SILENCE — no probes | None | NO | ROLE B (inaction) |
| T+8 | Begin SAFE_OBS monitoring: 5-request batch | Mix of suppressed/unsuppressed expected | NO | ROLE B |
| T+10 | Mid-SAFE_OBS checkpoint: A1+A2+B1+D1 | All 4 signals verified, audit log > 0 entries | YES | ROLE B → ROLE C |
| T+15 | HIGH_RISK entry: reduce cadence to 5 min | Monitoring acknowledged by all roles | YES | ALL ROLES |
| T+15 to T+30 | 3-request light probes every 5 min | Trend tracked, outlier rate monitored | NO | ROLE B → ROLE C |
| T+20 | Convergence progress check | Outlier rate ≤ 1/3 expected | YES (if trend worsens) | ROLE B → ROLE C |
| T+25 | Stale-instance liveness check | Outlier rate declining | YES (if increasing) | ROLE B → ROLE C |
| T+30 | CONVERGENCE TEST: 20-request batch | ≥19/20 suppressed = converged | YES | ROLE B → ROLE C |
| T+30 | Audit trail + auto-revert + control state checks | Control=1, audit growing | YES | ROLE B |
| T+35 to T+44 | Stabilization: 3-request batch every 5 min | Stability confirmed | NO | ROLE B |
| T+45 | Evidence summary delivered | ROLE A assembles package | YES | ROLE A → ROLE C |
| T+45 | Final decision gate | ROLE C declares PROCEED or ROLLBACK | YES | ROLE C |
| T+60 | Hard stop: mandatory rollback if no PROCEED | Non-deliberative | YES (automatic) | ROLE C |

---

## Final Human-Risk Matrix

| Human Risk | Trigger Window | Detectability | Mitigation | Authorization Impact |
|---|---|---|---|---|
| Confidence-trap optimism (T+15-30 appears calm) | T+15 to T+30 | Low without explicit protocol | Explicit distrust of T+15-30; ROLE B must NOT interpret, only report | High — blocks proceed without T+30 explicit test |
| Rollback hesitation at T+45 | T+45 to T+60 | Medium (delay visible to others) | ROLE C pre-commits written rollback rule; T+60 is automatic | High — authorization blocks if ROLE C is absent |
| Observer fatigue from dense signal stream | T+8 to T+30 | Medium (ROLE A can notice) | Cadence reduction at T+15; pre-scripted queries | Medium — degrades quality but not catastrophic if spotted |
| Operator triggers stale-instance extension | T+8 to T+30 | Low | Forbidden continuous probing; silence T+3-8; step-down T+15 | High — extends coexistence beyond planned window |
| Authority confusion under stress | T+15 to T+60 | High (conflicting signals) | Pre-assigned roles; ROLE B reports facts, ROLE C decides | High — blocks if roles are ambiguous |
| Premature convergence declaration | T+15 to T+30 | Low (appears fine) | MANDATORY T+30 explicit verification before any proceed | High — authorization blocks proceed without explicit test |
| Single-operator role collapse | Any point | High | Three-role mandatory staffing; ROLE C handoff protocol | AUTHORIZATION_BLOCKING if violated |
| Post-rollback false stability (second coexistence) | Rollback +3 to +15 min | Low (looks like stabilization) | Post-rollback batch verification; minimum 10-min verify window | High — rollback declared failed if not explicitly verified |
