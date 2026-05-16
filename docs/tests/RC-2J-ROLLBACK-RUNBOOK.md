# RC-2J Live Rollback Execution Runbook

Date: 2026-05-16
Cycle: RC-2J (Guarded Live Canary Execution Planning)
Mode: Documentation-only. Zero deployment. Zero runtime mutation.

---

## Purpose

Define the exact rollback choreography for the SHOS suppression canary,
including second-coexistence-aware post-rollback verification.

This runbook is executed by ROLE C (Rollback Authority) only, based on evidence
delivered by ROLE B (Signal Observer). ROLE C MUST NOT decide based on their own
observability readings.

---

## Section 1: Rollback Trigger Conditions

The following trigger conditions mandate immediate rollback with no deliberation.

### CRITICAL — Immediate rollback, no wait:

| ID | Condition | Evidence Required | Decision Owner |
|---|---|---|---|
| RT-01 | Suppression gate never activates at T+10 | A1: 5/5 requests show suppressed=false; A2: zero audit log entries | ROLE C on ROLE B report |
| RT-02 | Mutation authority bypassed | B1/B2/B3: any POST returns success=true AND suppressed=false | ROLE C on ROLE B report |
| RT-03 | Data corruption detected | D1: control_config count ≠ 1 | ROLE C on ROLE B report |
| RT-04 | Uncontrolled metric jumps | B4: DLQ/queue count changes >50% in single interval | ROLE C on ROLE B report |
| RT-05 | Observability completely incoherent | E1: divergence index >5 with no pattern | ROLE C on ROLE B report |
| RT-06 | System health CRITICAL and not recovering | Health stays CRITICAL for 2 consecutive measurements | ROLE C on ROLE B report |

### IMPORTANT — Investigate then rollback if not improving:

| ID | Condition | Threshold for Rollback |
|---|---|---|
| RT-07 | Convergence not progressing | Divergence not improving from T+20 to T+25 |
| RT-08 | Auto-reverts spiking | >10 entries in 5-min window in system_control_actions |
| RT-09 | T+30 convergence test fails | <19/20 suppressed after rerun |

### DISCRETIONARY — ROLE C judgment:

- ROLE C may call rollback at any point before T+60 without providing justification
- Operator discomfort alone is valid grounds for rollback

### MANDATORY — Non-deliberative:

- T+60 mark reached without PROCEED decision → ROLE C executes rollback
- No override. No extension. No deliberation.

---

## Section 2: Rollback Initiation Sequence

### Pre-conditions before initiating rollback:

1. ROLE B reports trigger condition to ROLE C verbally
2. ROLE C repeats trigger back: "I am rolling back due to [trigger ID]"
3. ROLE C logs rollback start time

If time from trigger identification to ROLE C initiation exceeds 3 minutes:
ROLE B escalates verbally again. If still no action in 5 minutes: ROLE B contacts
secondary authority for ROLE C replacement.

---

### Rollback Execution Steps (ROLE C):

**Step 1:** Open Vercel dashboard → Deployments
**Step 2:** Locate previous production deployment (commit `9e12ef2` — ATOM-B)
**Step 3:** Click "Promote to Production" or equivalent 1-click rollback action
**Step 4:** Confirm dialog if shown
**Step 5:** Log rollback initiation time

Expected: Vercel shows new build begins immediately
Expected: Vercel build completes within 1–3 minutes

---

### Post-Rollback: Second Coexistence Window

**Critical understanding:** Rollback is a new deployment that propagates old code.
During this propagation (approximately T+rollback to T+rollback+15 min):
- Some instances run new SHOS suppression code (not yet replaced)
- Some instances run old pre-suppression code (being restored)
- This is a SECOND mixed-instance coexistence event
- Observability during this window reflects BOTH code versions

**ROLE B must treat the post-rollback window as a new coexistence event.**
**ROLE C must NOT declare rollback successful based on single readings.**

---

### Post-Rollback Verification Cadence (ROLE B):

**Wait interval before first probe:** Minimum 3 minutes after rollback build shows READY

**Probe 1 (T+rollback+3 min):** Run 5-request batch
- Expected: Mix of suppressed=true and suppressed=false (second coexistence active)
- If 5/5 suppressed=false: Old code fully restored; proceed to confirm
- If 5/5 suppressed=true: New SHOS code still serving; wait another 3 min

**Probe 2 (T+rollback+8 min):** Run 5-request batch
- Expected trend: Moving toward all suppressed=false (old code winning)
- ROLE B reports pattern to ROLE C

**Probe 3 (T+rollback+15 min):** Run 10-request batch
- Required: ≥9/10 suppressed=false = rollback stable
- If still mixed: Run 10-request batch again at T+rollback+20 min

---

### Rollback Success Declaration Criteria

ROLE C may declare rollback successful ONLY when ALL of the following are true:
1. ≥9/10 requests show suppressed=false (old code active)
2. Health endpoint shows stable status (consistent across 3 probes)
3. DLQ/queue/delivery metrics stable (no unexpected changes)
4. `system_control_config` count = 1 (not corrupted)
5. Minimum 10 minutes have elapsed since rollback build went READY

If any criterion fails: rollback is not stable. ROLE C must determine next action
(wait longer, investigate, escalate to platform support).

---

### False Success Prevention

The following patterns MUST NOT be interpreted as rollback success:

| Pattern | Why It's Misleading | Correct Action |
|---|---|---|
| First 3 probes all show suppressed=false | Second coexistence may still be active with new instances serving | Run 10-request batch; wait full 10 min |
| Health endpoint shows HEALTHY immediately | Could be served by old OR new instance | Verify suppression status explicitly |
| No DLQ changes visible | Expected; mutations were suppressed | Not evidence of rollback; check suppression explicitly |
| Vercel says deployment complete | Deployment pushed; not all instances replaced yet | Wait full propagation window |

---

## Section 3: Rollback Communication Protocol

When rollback is initiated:
1. ROLE C announces verbally: "Rollback executing — [time stamp] — trigger [RT-xx]"
2. ROLE A documents rollback in deployment log
3. ROLE B starts post-rollback verification cadence
4. All roles remain on call until rollback success criteria are met

After rollback declared stable:
- ROLE A commits documentation of what occurred
- ROLE B posts signal summary (what signals led to rollback trigger)
- ROLE C posts decision record (which trigger, when, what evidence)
- Team schedules post-mortem within 24 hours

---

## Section 4: Rollback Abort Conditions

The following conditions make rollback ITSELF an emergency:

| Condition | Action |
|---|---|
| Vercel rollback build fails | Contact Vercel support; manually promote old commit via CLI |
| Old deployment no longer available in Vercel UI | Use git revert + force push as fallback |
| DB state corruption detected during rollback | Rollback code regardless; contact DB administrator separately |
| Second coexistence extends past T+rollback+30 | Escalate to platform support; monitor for recovery |

---

## Section 5: Post-Mortem Requirements

After any rollback or after canary success, within 24 hours:

**Questions to answer in post-mortem document:**
1. What was the actual convergence pattern timing?
2. What hidden writes occurred during coexistence? (count from audit trail)
3. Did stale instances retire faster or slower than expected?
4. Was observability interpretable? Was confidence trap experienced?
5. Were all three roles effective? What would improve the role split?
6. Did operator monitoring activity appear to extend coexistence?
7. What should change for next canary attempt?
