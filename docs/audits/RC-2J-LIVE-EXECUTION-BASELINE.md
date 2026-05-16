# RC-2J Live Execution Baseline

Date: 2026-05-16
Cycle: RC-2J (Guarded Live Canary Execution Planning)
Mode: Documentation-only. Zero deployment. Zero runtime mutation.

---

## Purpose

Establish authoritative current-state baseline for first guarded SHOS suppression
canary execution planning. All classifications drawn from RC-2F, RC-2H, and RC-2I
evidence. No assumptions. No optimistic projections.

---

## 1. Current Authorization Classification

**RC-2I result:** AUTHORIZED_ONLY_WITH_EXTRA_GUARDS
**Source:** docs/audits/RC-2I-LIVE-CANARY-AUTHORIZATION.md
**What it means for RC-2J:** Execution planning must construct the exact guard
infrastructure that RC-2I identified as mandatory. Planning is not complete until
every RC-2I extra guard is operationalized to a named procedure.

---

## 2. Current Rollback-Risk Classification

**RC-2I result:** LIVE_ROLLBACK_RISKY
**Evidence basis:**
- Rollback mechanism is technically fast (Vercel 1-click, 30–60 s propagation)
- Rollback reverses code state deterministically
- Rollback creates a SECOND coexistence event during propagation
- Post-rollback, stale new-code instances may persist until idle timeout
- Operator must verify rollback success through the same noisy observability window
- Decision latency is the primary risk, not execution speed
**Implication for RC-2J:** Rollback runbook must pre-commit trigger-to-action
intervals, separate authority from interpreter, and define explicit post-rollback
verification that accounts for second coexistence.

---

## 3. Current Observability-Risk Classification

**RC-2I result:** OBSERVABILITY_DECISION_RISKY
**Evidence basis (RC-2H observability-truthfulness doc):**
- All 5 observability routes execute `getShosSnapshot()` → `processDueFeatureFlagReverts()`
- On old instances: GET request = hidden write
- On new instances: GET request = pure read
- During coexistence (T+8 to T+30): same URL returns different suppression states
- T+15 to T+30: divergence shrinks but reliability drops (confidence trap)
- T+30+: trustworthy only after explicit 20-request convergence verification
**Implication for RC-2J:** Observability discipline plan must define mandatory batch
sizes, window-specific trust levels, and operator-visible distrust signals.

---

## 4. Current Coexistence-Risk Classification

**RC-2H result:** Transient but material risk
**Evidence basis:**
- Serverless warm-instance persistence: 5–15 min idle timeout (unknowable exactly)
- Operator monitoring activity refreshes idle timers → extends stale-instance life
- Mixed-instance window duration is unknown in advance
- Hidden writes from old instances are observable only via audit trail queries
- Convergence detection requires batch probing, not single reads
**Implication for RC-2J:** Execution timeline must encode mandatory observation
cadence reductions during HIGH_RISK window to avoid prolonging the coexistence
event via operator-triggered warm-instance refresh.

---

## 5. Current Operator-Readiness Classification

**RC-2I result:** OPERATOR_RISK
**Evidence basis:**
- 15 signals across 5 categories → dense for one operator
- Multi-frequency schedule (heavy T+8-15, light T+15-30, explicit T+30+)
- Confidence-trap window sits mid-cycle, not at start
- T+45 and T+60 create compressive decision pressure
- Rollback hesitation risk is non-trivial
- Role ambiguity under stress is a documented failure mode
**Implication for RC-2J:** Operator choreography must split roles, pre-assign
authority, and pre-commit abort rules to remove in-moment decision burden.

---

## 6. New RC-2J-Specific Risk: Operator Observation Extends Coexistence

**Finding (derived from RC-2H coexistence analysis):**
Every monitoring poll to an observability route that routes to a stale warm instance
refreshes that instance's idle timer. This means:
- The operator's own monitoring activity can delay convergence
- Heavy monitoring in T+8 to T+15 keeps stale instances alive longer
- Reducing monitoring frequency in HIGH_RISK window is safety-critical, not optional
- A single operator running intensive monitoring can extend coexistence 5–10+ minutes
**Consequence:** RC-2J timeline must include explicit monitoring cadence step-down
rules at T+15, and the observability discipline plan must forbid continuous polling.

---

## 7. New RC-2J-Specific Risk: Rollback Creates Second Coexistence

**Finding (new explicit analysis for RC-2J):**
When rollback is executed via Vercel 1-click:
- New deployment begins propagating old code
- While propagation occurs: some instances run new suppressed code, some run rolled-back code
- This is a second mixed-instance event with uncertain duration
- Post-rollback observability reflects this second coexistence, not stable old state
- Operator may incorrectly conclude rollback succeeded when second coexistence is ongoing
**Consequence:** RC-2J rollback runbook must define:
- Explicit second-coexistence-aware post-rollback verification cadence
- Minimum wait interval before declaring rollback stable
- Repeated batch sampling after rollback to detect second coexistence outliers

---

## 8. Production Runtime Status at Cycle Start

- Last deployment: 2026-05-14 commit `9e12ef2` (ATOM-B: auth refactor)
- SHOS suppression: LOCAL_ONLY in `lib/system/shos.js` — never deployed
- All observability routes: execute non-suppressed paths in production
- All mutation dispatchers: execute freely (no gate) in production
- DB state: `system_control_config` singleton = 1 row, pending auto-reverts = 0
- Queue: active but stable
- Crons: 6 confirmed active
- Auth: ATOM-B architecture active

No changes to any of the above occurred during RC-2J planning.

---

## 9. Baseline Authorization Summary for RC-2J Planning

| Classification | RC-2I Value | RC-2J Planning Implication |
|---|---|---|
| Authorization | AUTHORIZED_ONLY_WITH_EXTRA_GUARDS | Must operationalize all 7 guards |
| Operator readiness | OPERATOR_RISK | Must split roles; single-operator forbidden |
| Rollback confidence | LIVE_ROLLBACK_RISKY | Must pre-commit trigger intervals |
| Observability trust | OBSERVABILITY_DECISION_RISKY | Must enforce batch verification windows |
| Production calmness | CALM_ENOUGH_FOR_CANARY (conditional) | Must verify day-of preflight |
| Coexistence risk | TRANSIENT_BUT_MATERIAL | Must minimize operator-driven extension |
| Rollback event risk | SECOND_COEXISTENCE_POSSIBLE | Must define post-rollback verification |

---

## 10. RC-2J Planning Scope Gate

RC-2J produces the exact survivable human-runtime coexistence choreography.
RC-2J does NOT execute deployment.
RC-2J does NOT activate suppression.
RC-2J does NOT modify any production state.

The output of RC-2J is a runbook that, when followed exactly by qualified operators,
is the minimum viable protection layer for the first live coexistence event.
