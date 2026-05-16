# RC-2H Mixed-Instance Containment Strategy & Final Confidence Assessment

Date: 2026-05-15
Mode: Operational containment strategy + final readiness determination

---

## STEP 6: Mixed-Instance Containment Strategy

### Executive Summary

**Goal:** Operationalize coexistence so transient divergence is bounded, observable, and manageable.

**Strategy:** Treat coexistence as a CONTROLLED, TIME-BOUNDED state, not an uncontrolled risk.

---

### What Makes Coexistence "Contained"

Coexistence is CONTAINED when:

1. **Duration is BOUNDED** — Coexistence window is predictable and time-limited (T+8 to T+30 expected)
2. **Divergence is DETECTABLE** — Operator can observe and measure mixed-instance behavior
3. **Mutations are SUPPRESSED** — New instances actively prevent mutations via explicit gate
4. **Rollback is AVAILABLE** — Can revert to pre-deployment state at any time
5. **Hidden Writes are LOGGED** — Database audit trail shows what happened
6. **Operator has AUTHORITY** — Can trigger rollback at discretion

### What Would Make Coexistence "UNCONTAINED"

Coexistence is UNCONTAINED if:

1. **Duration is UNBOUNDED** — Coexistence extends indefinitely (stale instances never retire)
2. **Divergence is UNDETECTABLE** — Observability becomes incoherent; can't measure state
3. **Mutations are EXECUTING** — Suppression gate fails; old instances execute freely
4. **Rollback is UNAVAILABLE** — Cannot revert (database corrupted, Vercel issue, etc.)
5. **Hidden Writes are UNLOGGED** — Cannot audit what happened (pre-suppression code path)
6. **Operator has NO AUTHORITY** — Cannot stop deployment mid-flight

---

### Containment Strategy: Seven Operational Principles

#### Principle 1: Time-Bound Coexistence with HARD STOP

**What:** Set an absolute operational ceiling beyond which coexistence is unacceptable

**Exactly:**
- Expected coexistence window: T+8 to T+30 min
- Acceptable extension: Until T+60 min
- MANDATORY ROLLBACK: At T+60 min if not converged

**Why:** Prevents indefinite coexistence risk from extending operational impact

**How:** Operator timer + automated escalation if T+60 passes

---

#### Principle 2: Divergence Detection via Pattern Monitoring

**What:** Make divergence VISIBLE through repeated measurements

**Exactly:**
- Single requests are UNTRUSTWORTHY during coexistence
- Patterns of 5-20 requests ARE TRUSTWORTHY
- Divergence = inconsistent responses across batch
- Convergence = 100% consistent responses

**Why:** Eliminates false confidence from lucky routing to new instances

**How:** Every 2-3 minutes, run batch of 5 requests to `/api/admin/system/shos` and check for divergence

**Example:**
```
T+10:00 → Batch of 5: [T, T, T, F, T] → Divergence DETECTED (1 old instance)
T+11:00 → Batch of 5: [T, T, T, T, T] → No divergence (all new)
T+12:00 → Batch of 5: [T, T, F, T, T] → Divergence DETECTED (1 old instance)
```

---

#### Principle 3: Suppression Gate as Primary Authority Control

**What:** The hard-coded `checkMutationSuppression() = true` gate is the authoritative safety mechanism

**Exactly:**
- All mutations MUST check suppression gate FIRST (before execution)
- If gate returns true: ABORT mutation, return {suppressed: true}
- If gate returns false: Execute mutation normally

**Why:** Gate is "fail-closed" — default is safe, exceptions must be explicit

**How:** Code review ensures gate is checked in all mutation paths

---

#### Principle 4: Observable Hidden Writes via Audit Trail

**What:** Hidden writes (auto-reverts) are expected on old instances; audit trail proves they occurred

**Exactly:**
- Old instances execute `processDueFeatureFlagReverts()` when called
- These writes are NOT logged as "suppressed" (because old code doesn't know about suppression)
- BUT database `system_control_actions` table WILL show revert operations
- Operator can query to confirm: "Yes, hidden writes happened during coexistence"

**Why:** Makes hidden writes OBSERVABLE post-deployment

**How:** Post-convergence (T+30+), query `system_control_actions` to see revert timeline:
```sql
SELECT created_at, operation FROM system_control_actions 
WHERE operation LIKE 'revert%'
  AND created_at BETWEEN NOW() - INTERVAL 1 HOUR AND NOW()
ORDER BY created_at;
```

---

#### Principle 5: Rollback Authority Preserved Until Stabilization

**What:** Operator retains UNILATERAL rollback authority until coexistence ends

**Exactly:**
- Any time before T+60: Operator can trigger rollback at discretion
- No permission required
- No consensus needed
- Single action: 1-click Vercel rollback

**Why:** Ensures human-in-the-loop safety control

**How:** Operator trained on rollback procedure; Vercel dashboard always has rollback available

---

#### Principle 6: Observability Calibration for Mixed-Instance Windows

**What:** Operator KNOWS which observability is trustworthy when

**Exactly:**
- T+8-15 (SAFE_OBSERVATION): Divergence patterns are detectable
- T+15-30 (HIGH_RISK): Divergence is rare; observability unreliable (confidence trap)
- T+30+ (TRUSTWORTHY): Explicit verification confirms convergence

**Why:** Prevents operator from making decisions on false confidence

**How:** Operator has explicit guidance table (from RC-2H-OBSERVABILITY-TRUTHFULNESS.md) mapping window → confidence level

---

#### Principle 7: Stale-Instance Minimization via Reduced Monitoring

**What:** Operator monitoring itself can extend stale instance lifetime; minimize this effect

**Exactly:**
- During SAFE_OBSERVATION (T+8-15): Heavy monitoring is acceptable
- During HIGH_RISK (T+15-30): Reduce monitoring frequency (every 5 min instead of 2-3)
- After T+30: Stop active monitoring; run explicit verification only

**Why:** Each GET request to observability endpoint can refresh old instance idle timers

**How:** Operator intentionally backs off monitoring intensity in HIGH_RISK window

---

### Coexistence Risk Tolerance Matrix

| Duration | Divergence Detection | Observability Trust | Rollback Availability | Acceptable? |
|---|---|---|---|---|
| < 15 min | High (clear patterns) | Medium | Yes | ✅ YES |
| 15-30 min | Low (rare outliers) | Low (trap zone) | Yes | ✅ YES (with caution) |
| 30-45 min | Very low (hard to detect) | Low-High (borderline) | Yes | ⚠️ MARGINAL |
| 45-60 min | Nearly zero | High (if verified) | Yes | ⚠️ MARGINAL |
| > 60 min | Unknown | Unknown | Yes | ❌ NO (rollback required) |

---

### Coexistence Failure Scenarios

#### Scenario 1: Unbounded Divergence (Old Instances Never Retire)

**What if:** At T+30, still seeing <80% suppressed responses

**Why this fails containment:** Coexistence window extends indefinitely; risk compounds over time

**Operator action:**
1. Stop active monitoring (prevent polling from extending old instances)
2. Wait 5 minutes
3. Run explicit 20-request convergence test
4. If still <95% suppressed: ROLLBACK

**Why this works:** Rollback is deterministic if triggered before data corruption

---

#### Scenario 2: Observability Becomes Completely Incoherent

**What if:** Responses are contradictory; can't tell old from new

**Why this fails containment:** Operator cannot observe state; cannot make informed decisions

**Operator action:** ROLLBACK IMMEDIATELY

**Why this works:** Safety requires observable state; if observability fails, deployment fails

---

#### Scenario 3: Suppression Gate Was Never Active

**What if:** All instances show `suppressed: false`; gate failed

**Why this fails containment:** Mutations execute without any suppression; equivalent to pre-deployment

**Operator action:** ROLLBACK IMMEDIATELY

**Why this works:** Rollback restores unambiguous safe state

---

#### Scenario 4: Hidden Writes Cause Data Corruption

**What if:** Audit trail shows orphaned records; control state is inconsistent

**Why this fails containment:** Data integrity failure; database is in undefined state

**Operator action:** ROLLBACK IMMEDIATELY + escalate to database team

**Why this works:** Rollback can't undo writes, but new attempts won't compound damage

---

#### Scenario 5: Rollback Becomes Unavailable

**What if:** Vercel is down; can't execute rollback

**Why this fails containment:** Operator loses exit strategy

**Operator action:**
1. Contact Vercel support immediately
2. Escalate to CTO
3. If Vercel unavailable >15 min: Emergency procedures (TBD by org)

**Why this is rare:** Vercel rarely goes down; but if it does, this is an org-level incident

---

### Coexistence Success Scenarios

#### Success Case 1: Rapid Convergence (T+8 to T+15)

**Timeline:**
- T+8: First divergence detected (60% suppressed)
- T+10: Divergence clear (75% suppressed)
- T+12: Strong convergence (90% suppressed)
- T+15: Near-complete (95%+ suppressed)
- T+20: Verification confirms convergence

**Operator experience:** Monitoring shows clear improvement trend; confidence builds; decision to proceed is obvious

**Why this is ideal:** Coexistence is shortest, safest, and provides clearest signal

---

#### Success Case 2: Slower But Steady Convergence (T+15 to T+30)

**Timeline:**
- T+10: 70% suppressed (confidence trap: trend looks good, but risky)
- T+15: 85% suppressed (HIGH_RISK window; operator reduces monitoring)
- T+20: 95% suppressed (trend continuing downward)
- T+25: Explicit 20-request test: 19/20 suppressed (one outlier)
- T+30: Verification: 20/20 suppressed (complete convergence)

**Operator experience:** Early success, then HIGH_RISK uncertainty, then explicit verification restores confidence

**Why this works:** Explicit verification at T+30 bypasses confidence trap; proves convergence definitively

---

---

## STEP 7: Final Deployment Confidence Assessment

### Current Readiness Classification (From RC-2F)

**Status:** READY_FOR_CANARY_ONLY

**Why:**
- ✅ Local suppression implementation is complete and verified
- ✅ Build passes validation
- ✅ Deployment surface is well-defined (11 files, atomic)
- ❌ Production parity is unverified (no live check after RC-2E)
- ❌ Mixed-instance behavior is theoretically understood but operationally untested
- ❌ Stale-instance retirement timing is unknown

---

### Does Canary Protocol Reconstruction Change Readiness?

**Question:** After defining exact choreography, monitoring, and rollback triggers, should we upgrade/downgrade the classification?

**Answer:** READY_FOR_CANARY_ONLY remains authoritative.

**Reasoning:**

1. **Choreography is now explicit** — But execution remains risky
   - Still have 7-30 minute coexistence window
   - Still have observability unreliability during HIGH_RISK window
   - Still have unknown stale-instance retirement timing

2. **Monitoring is now comprehensive** — But doesn't prevent failures
   - 15 signals identified
   - But signals themselves depend on observability that may be unreliable
   - Monitoring detects problems; doesn't prevent them

3. **Rollback is now fully specified** — But only if triggered in time
   - Rollback is deterministic IF triggered before convergence completes
   - Rollback is safe IF triggered before data corruption
   - Rollback is fast (30-60 sec) but coexistence can still compound issues

4. **Mixed-instance containment is now operationalized** — But still novel
   - Coexistence is now bounded (60-minute hard stop)
   - Divergence is now observable (batch monitoring pattern)
   - But operational execution still depends on human vigilance

---

### Final Readiness Matrix

| Component | Status | Confidence | Blocking? |
|---|---|---|---|
| Suppression implementation | COMPLETE | HIGH | No |
| Deployment choreography | COMPLETE | MEDIUM | No |
| Observation windows | COMPLETE | MEDIUM | No |
| Monitoring signals | COMPLETE | MEDIUM | No |
| Rollback triggers | COMPLETE | HIGH | No |
| Mixed-instance strategy | COMPLETE | MEDIUM | No |
| Production parity | UNVERIFIED | LOW | **YES** |
| Observability truthfulness | UNDERSTOOD (not verified) | MEDIUM | **YES** |
| Stale-instance timing | UNKNOWN | LOW | **YES** |

---

### Blocking Issues Preventing Staged Deployment

**Issue 1: Production Parity Unverified**

**What:** We don't know if production code will behave the same as local code

**Why it blocks:** If production parity diverges from local expectations, all planning is invalidated

**Resolution:** Canary deployment itself SERVES as parity verification
- First live coexistence demonstrates whether actual production behaves as designed
- If parity holds during canary, staged deployment becomes safe

**When resolved:** After SUCCESSFUL canary execution + verification

---

**Issue 2: Observability Truthfulness Unproven**

**What:** We understand that observability has hidden writes during coexistence; but don't know if this will cause operator confusion or decision errors in practice

**Why it blocks:** Operator decisions during HIGH_RISK window could be wrong due to confidence trap

**Resolution:** Canary deployment provides LIVE PROOF
- Operator runs through exact choreography
- Operator experiences observability divergence firsthand
- Operator verifies convergence via explicit verification queries
- Operator sees audit trail confirm hidden writes were logged

**When resolved:** After SUCCESSFUL canary where operator explicitly verified convergence

---

**Issue 3: Stale-Instance Timing Unknown**

**What:** Exact retirement timing for warm serverless instances is unknowable without live observation

**Why it blocks:** Could extend coexistence beyond acceptable bounds

**Resolution:** Canary deployment provides EMPIRICAL DATA
- Record exact times when old instances stop appearing
- Build confidence interval around retirement timing
- Use this data for future rollout planning

**When resolved:** After canary, we'll KNOW the actual stale-instance decay curve for our workload

---

### Final Confidence Assessment

**Can we deploy with READY_FOR_CANARY_ONLY classification?**

**YES.** But with specific constraints:

### Canary Deployment is Safe IF:

✅ All 11 files deploy atomically (verified: single commit)
✅ Operator performs full choreography (documented in STEP 2)
✅ Operator monitors all 15 signals (documented in STEP 4)
✅ Operator is trained to recognize rollback triggers (documented in STEP 5)
✅ Rollback is tested and available before canary (pre-PHASE 2 requirement)
✅ Coexistence window is time-bounded (60-minute hard stop in STEP 6)
✅ Observability is calibrated for reliability (STEP 3.5 windows)
✅ Operator has unilateral rollback authority (any time before T+60)

### Canary Deployment will FAIL if ANY of these are violated:

❌ Partial deployment (some files miss; dependency chain breaks)
❌ Operator skips monitoring (signals go unobserved)
❌ Rollback procedure untested (takes too long to execute)
❌ Coexistence extends indefinitely (old instances never retire)
❌ Operator overconfident in observability during HIGH_RISK window
❌ Rollback authority removed or delegated too much
❌ Communication breakdown (team doesn't know deployment status)

---

### Final Readiness Declaration

**Deployment readiness classification after RC-2H:**

**READY_FOR_CANARY_ONLY** (unchanged from RC-2F)

**With operational upgrades:**
- ✅ Explicit choreography defined (STEP 2)
- ✅ Observation windows calibrated (STEP 3 + 3.5)
- ✅ Monitoring signals specified (STEP 4)
- ✅ Rollback triggers enumerated (STEP 5)
- ✅ Coexistence strategy operationalized (STEP 6)

**Blocking issues status:**
- Production parity: WILL BE VERIFIED during canary
- Observability truthfulness: WILL BE PROVEN during canary
- Stale-instance timing: WILL BE MEASURED during canary

---

### Decision Authority for Canary Go/No-Go

**Who can authorize canary deployment?**

Primary authority: CTO or equivalent (P1 system ownership)
Secondary authority: Deployment lead (operational ownership)
Tertiary authority: Super-admin team lead (rollback capability)

**All three must concur that:**
1. Choreography will be followed exactly
2. Monitoring will be continuous
3. Rollback will be executed if triggered
4. Business impact is acceptable during coexistence window

---

### Post-Canary Success Criteria

After canary completes successfully, the following will be TRUE:

✅ Production parity IS VERIFIED (live instances behave as expected)
✅ Observability truthfulness IS PROVEN (operator verified convergence explicitly)
✅ Stale-instance timing IS MEASURED (we know how long old instances persist)
✅ Suppression gate IS PROVEN ACTIVE (audit trail shows suppression was working)
✅ Rollback was never needed (deployment converged safely)
✅ OR rollback was needed and worked (we learned the trigger was valid)

**Result:** Canary SUCCEEDS → READY_FOR_STAGED_DEPLOYMENT becomes authoritative

**Result:** Canary FAILS or rolls back → Root cause analysis determines what to fix before retry

---

### Conclusion: Confidence Level

**Confidence in safe canary execution: MEDIUM-HIGH**

**Rationale:**
- Choreography is explicit and detailed ✅
- All risks are identified ✅
- Monitoring is comprehensive ✅
- Rollback is well-defined ✅
- But: Execution depends on operator vigilance ⚠️
- And: Unknown stale-instance timing remains ⚠️
- And: HIGH_RISK window still carries confidence trap ⚠️

**Bottom line:** This canary is SAFE TO ATTEMPT but requires active operator engagement and willingness to rollback if evidence warrants it.

**Operator training is CRITICAL.** Operator must understand:
1. Why coexistence is expected (not a failure)
2. Why observability is unreliable in HIGH_RISK window (not a surprise)
3. Why rollback exists (not a last resort but a safety valve)
4. Why monitoring beats decision-making (observe first, decide late)

**This is the smallest survivable first-live coexistence protocol under uncertainty.**
