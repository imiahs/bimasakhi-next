# RC-2J Observability Discipline Plan

Date: 2026-05-16
Cycle: RC-2J (Guarded Live Canary Execution Planning)
Mode: Documentation-only. Zero deployment. Zero runtime mutation.

---

## Purpose

Define EXACT observability behavior required during canary coexistence, including
sampling counts, batch verification rules, confidence-trap mitigation rules,
and explicit forbidden patterns.

---

## Step 4: Observability Discipline Plan

### 4.1 Minimum Sampling Counts by Window

| Window | Time | Min Requests per Probe | Probe Frequency | Trust Level |
|---|---|---|---|---|
| PRE-DEPLOYMENT | T < 0 | 1 (single baseline) | Once at T-15 | TRUSTWORTHY — 100% |
| SILENCE | T+3 to T+8 | 0 (forbidden) | None | N/A — do not probe |
| SAFE_OBSERVATION | T+8 to T+15 | 5 per batch | Every 2–3 min | DIVERGENT — 30–40% |
| HIGH_RISK entry check | T+15 | 3 per batch | Once at T+15 | CONFIDENCE_TRAP — 50–70% |
| HIGH_RISK window | T+15 to T+30 | 3 per batch | Every 5 min MAX | CONFIDENCE_TRAP — 50–70% |
| CONVERGENCE TEST | T+30 | 20 per batch | Once mandatory | TRUSTWORTHY_IF_ALL_SUPPRESSED |
| CONVERGENCE window | T+30 to T+45 | 3 per batch | Every 5 min | HIGH — after explicit test |
| POST-ROLLBACK | T+rollback+3 | 5 per batch | Every 3–5 min | SECOND_COEXISTENCE — uncertain |
| ROLLBACK VERIFY | T+rollback+15 | 10 per batch | Twice minimum | TRUSTWORTHY_IF_≥9/10 |

**The 5-request minimum in SAFE_OBSERVATION exists because:**
A single request cannot distinguish coexistence divergence from stale cache.
Across 5 requests, a mix of true/false confirms divergence and coexistence is active.
All-true across 5 requests could mean converged OR sparse old-instance exposure.
All-false across 5 requests at T+10 is a critical rollback signal.

**The 20-request minimum for convergence test exists because:**
At T+30, old instances are rare but not guaranteed absent.
A 10-request batch might miss the last outlier.
A 20-request batch with 20/20 suppressed has sufficient statistical confidence
to conclude convergence for operational purposes.
A 19/20 result (one outlier) should trigger a rerun before declaring success.

---

### 4.2 Batch Verification Rules

**Rule B-1:** No single-request conclusions permitted at any point during coexistence.
**Rule B-2:** Minimum batch sizes per window must be respected exactly.
**Rule B-3:** ROLE B must record every individual request result, not just aggregate.
**Rule B-4:** Divergence index = number of outlier requests in most recent batch.
**Rule B-5:** Trend tracking requires at least 3 consecutive batches (not just one).
**Rule B-6:** "Looks stable" is not a valid conclusion — count and compare are required.

---

### 4.3 Stale-Instance Detection Rules

**What a stale-instance response looks like:**
- `auto_reverts.suppressed` = false (old code responding)
- Response may include active auto_reverts count > 0 (hidden write executed)
- Response time may differ from new-instance responses (cold boot vs warm)

**Detection pattern for coexistence:**
```
Batch of N requests:
  K responses with suppressed=true  (new instance)
  N-K responses with suppressed=false  (old instance)
  K/N ratio = convergence progress indicator
```

**Trend interpretation rules (ROLE B must report, not interpret):**
- T+8-10: K/N expected to be 0.3–0.7 (heavy divergence)
- T+10-15: K/N expected to be 0.5–0.8 (convergence starting)
- T+20: K/N expected to be 0.8+ (most old instances retired)
- T+25: K/N expected to be 0.9+ (stale instances rare)
- T+30 explicit test: K/N expected to be 0.95+ (CONVERGED)

**If K/N trend reverses** (ratio decreasing instead of increasing): flag to ROLE C immediately.
This indicates either new traffic is waking old stale instances or something else is wrong.

---

### 4.4 Rollback-Trigger Verification Rules

**When ROLE B suspects a rollback trigger:**
1. Run an immediate second batch (same size) before reporting to ROLE C
2. If second batch confirms trigger → report to ROLE C as CONFIRMED
3. If second batch does NOT confirm → report as SUSPECTED, run third batch
4. Third batch confirms or clears

**Why this matters:** Transient routing anomalies can produce single-batch false
signals. Double-confirmation reduces false rollbacks while maintaining fast response.

**Exception:** RT-01 (suppression gate never activates) requires confirmation but
cannot be waited on indefinitely. If A2 signal (zero audit log entries at T+10)
also confirms, treat as CONFIRMED immediately.

**Exception:** RT-03 (data corruption) requires only one confirmation. DB state
anomalies do not resolve themselves. Confirm once and report immediately.

---

### 4.5 Confidence-Trap Mitigation Rules

**The confidence trap definition:**
During T+15 to T+30, old instances are rare but present. Observability appears
mostly stable. This apparent stability is misleading — it reflects reduced
divergence, not convergence. Operators are tempted to declare convergence early.

**Mitigation Rule C-1:**
No convergence may be declared before the mandatory T+30 20-request batch test.
"Appears converged" is not a valid state. Only "20-request batch shows ≥19/20 suppressed"
is convergence evidence.

**Mitigation Rule C-2:**
During T+15 to T+30, if all probes return suppressed=true, do NOT reduce probe frequency.
Maintain 5-minute cadence. Absence of detected divergence does not mean absence of divergence.

**Mitigation Rule C-3:**
ROLE B must not add interpretive language to reports to ROLE C during this window.
ROLE B reports counts only: "3 of 3 suppressed" or "2 of 3 suppressed, 1 outlier."
Interpretation statements like "looks like it's converging" are forbidden.

**Mitigation Rule C-4:**
If 3 consecutive batches all show 3/3 suppressed (total 9 readings), the appropriate
conclusion is "no outliers detected in 9 readings" — not "converged."
Full convergence declaration still requires T+30 explicit 20-request test.

---

## Step 4.5: Confidence-Trap Detection Model

### False Convergence Signals

These patterns appear to indicate convergence but do not:

| Pattern | Why It's Misleading | Correct Response |
|---|---|---|
| 3 batches in a row with 3/3 suppressed at T+20 | Sparse old instances not yet appearing in sample | Maintain cadence; do not declare early |
| Health endpoint shows HEALTHY at T+20 | Could be new instance only; health truth depends on which instance serves | Do not trust single health probe |
| No auto-revert entries visible since T+15 | Hidden writes may have stopped because old instances entered retirement gap | Do not trust absence of activity |
| DLQ/queue counts stable since T+10 | Expected; mutations are suppressed | Not convergence evidence |

### Stale-Instance Illusion

This specific pattern creates the illusion that the stale instance problem is solved:
- At T+20, probe returns 3/3 suppressed
- Operator assumes old instances are gone
- At T+22, probe returns 2/3 suppressed (old instance appears again)
- The T+20 all-suppressed result was sampling luck, not convergence

**Detection:** This is detected only if the operator is running probes consistently
and recording individual results. If monitoring was reduced or gaps exist, this
pattern is invisible until the T+30 explicit test.

### Mandatory Distrust Windows

| Window | Distrust Level | Reason |
|---|---|---|
| T+0 to T+8 | ABSOLUTE | No probing; no conclusions possible |
| T+8 to T+10 | HIGH | First samples; baseline divergence not established |
| T+15 to T+30 | HIGH_DISTRUST | Confidence trap zone; single reads unreliable |
| T+28 to T+30 | MAXIMUM_DISTRUST | Last moments before explicit test; do not pre-conclude |
| T+rollback+0 to T+rollback+10 | HIGH_DISTRUST | Second coexistence; reads unreliable |

### Mandatory Re-verification Windows

| Event | Re-verification Required | Minimum Batch Size |
|---|---|---|
| Any all-suppressed result before T+30 | Run batch again 3 min later | 5 |
| T+30 convergence test shows 19/20 | Run again immediately | 20 |
| Post-rollback all-unsuppressed result before T+rollback+10 | Run batch again 3 min later | 5 |
| Any ROLE C "looks stable" intuition | ROLE B must run fresh batch | 5 minimum |

### Forbidden Early-Confidence Patterns

The following statements are forbidden at any point before explicit convergence verification:
- "It looks like it's converging"
- "Should be fine by now"
- "The pattern seems stable"
- "Only one more check to go"
- "The trend is clearly positive"

All of these are interpretation statements from intuition, not evidence.
ROLE B must use evidence-only language at all times.

### Coexistence Skepticism Checkpoints

At each of the following moments, ROLE B must verbally state the exact divergence count to ROLE C:
- T+10: "X of 5 suppressed, Y of 5 old-instance responses seen"
- T+15: "Entering HIGH_RISK window; last batch: X of 3 suppressed"
- T+20: "X of 3 suppressed. Convergence trend: [improving / flat / worsening]"
- T+25: "X of 3 suppressed. Stale instances: [absent / rare / still active]"
- T+30: "Explicit 20-request test result: X of 20 suppressed. [CONVERGED / NOT CONVERGED]"
- T+rollback+15 (if applicable): "X of 10 suppressed=false. Rollback state: [stable / still second-coexistence]"

---

## Section 3: Observability Truthfulness by Traffic Condition

### Under low traffic:

- Fewer requests reaching stale instances → divergence appears lower than reality
- False convergence signal more likely at low traffic
- Mitigation: Operator-initiated batch probes bypass this (direct observation, not ambient traffic)

### Under burst traffic:

- More requests reaching stale instances → divergence appears higher
- May extend stale-instance warm lifetime
- Mitigation: Monitoring cadence reduction prevents OPERATOR-triggered extension

### Under cache reuse:

- Supabase response caching or Next.js API caching could return stale snapshots
- The SHOS snapshot itself is not cached (DB query), but CDN edge caching at Vercel
  could affect observability routes if not explicitly bypassed
- Mitigation: Operator batch probes should include cache-bypass headers or direct DB checks

### Under partial instance rotation:

- The most dangerous case: half old, half new, each with stable individual behavior
- Batch probes are the only reliable detection mechanism
- Single-request conclusions are completely unreliable in partial rotation
- Mitigation: Batch sizes and the T+30 20-request test exist specifically for this case

---

## Forbidden Observability Patterns (Summary)

| Forbidden Pattern | Risk Level | Why Forbidden |
|---|---|---|
| Single-request convergence conclusions | CRITICAL | Sampling noise indistinguishable from real signal |
| Continuous polling (< 2 min interval) | HIGH | Refreshes stale instance warm timers; extends coexistence |
| Probing during T+3 to T+8 silence window | HIGH | Keeps stale instances alive before natural first expiry |
| Opening ShosControlCenter UI (polls every 45s) | HIGH | Automatic polling will refresh stale instances |
| Loading /api/admin/system or /api/admin/observability dashboards repeatedly | HIGH | Same issue — hidden writes triggered on old instances |
| "It looks converged" without 20-request test | CRITICAL | Confidence trap; premature proceed decision |
| Single DB audit count as sole evidence | MEDIUM | Count alone doesn't distinguish expected vs unexpected write volume |
| Declaring rollback successful before T+rollback+10 | HIGH | Second coexistence window not yet resolved |
