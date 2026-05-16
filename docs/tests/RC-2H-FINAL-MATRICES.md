# RC-2H Final Execution & Monitoring Matrices

Date: 2026-05-15
Mode: Final matrix compilation for operational reference

---

## Final Canary Execution Matrix

This matrix provides the single authoritative reference for the entire canary choreography.

| Phase | Time Window | Step | Action | Verification Required | Rollback Critical | Freeze Required | Authority |
|---|---|---|---|---|---|---|---|
| 0 | T = -2 hrs | 0.1 | Confirm deployment authority | Authority owner identified | N/A | N/A | CTO |
| 0 | T = -2 hrs | 0.2 | Capture baseline parity | Production health = HEALTHY | YES | YES | Operator |
| 0 | T = -2 hrs | 0.3 | Verify observability routes | All 5 routes responding | YES | YES | Operator |
| 0 | T = -2 hrs | 0.4 | Verify mutation endpoints | POST accessible, no mutations | YES | YES | Operator |
| 0 | T = -2 hrs | 0.5 | Verify DB schema | 12 tables present, clean | YES | YES | Operator |
| 0 | T = -2 hrs | 0.6 | Team communication sent | #alerts notified, runbook ready | NO | NO | Operator |
| 1 | T = -5 min | 1.1 | Final authority confirmation | Operator confirms YES | YES | YES | Operator |
| 2 | T = 0:00 | 2.1 | Stage + commit 11 files | Git commit succeeds | YES | YES | Operator |
| 2 | T = 0:00 | 2.2 | Push to main | GitHub shows commit | YES | YES | Operator |
| 2 | T = 0:00 | 2.3 | Monitor Vercel build start | Build status = IN_PROGRESS | YES | YES | Monitor |
| 3 | T = +1 to +3 min | 3.1 | Build completes | Vercel status = READY | YES | NO | Monitor |
| 3 | T = +1 to +3 min | 3.2 | Verify build artifacts | All 11 files in deployment | YES | NO | Monitor |
| 4 | T = +3 to +8 min | 4.1 | Monitor instance rollout | Vercel shows deployment progress | NO | YES | Monitor |
| 4 | T = +8 to +15 min | 4.2 | Detect divergence (SAFE_OBS) | Run 5-request batches every 2-3 min | YES | YES | Operator |
| 4 | T = +8 to +15 min | 4.3 | Verify suppression logging | DB shows shos_suppression entries | YES | YES | Monitor |
| 4 | T = +8 to +15 min | 4.4 | Check mutation suppression | POST probes return {suppressed: true} | YES | YES | Monitor |
| 4 | T = +8 to +15 min | 4.5 | Detect metric jumps | DLQ/Queue/Delivery counts stable | YES | YES | Monitor |
| 4 | T = +10 min | 4.6 | Simulate operator polling | Run 3x rapid GET /shos calls | NO | NO | Monitor |
| 4 | T = +15 min | 4.7 | Operator status report | Post phase results to team | NO | NO | Operator |
| 5 | T = +15 to +30 min | 5.1 | Reduce monitoring frequency | HIGH_RISK window begins | YES | YES | Operator |
| 5 | T = +15 to +30 min | 5.2 | Continue convergence tracking | Run divergence test every 5 min | YES | YES | Monitor |
| 5 | T = +20 min | 5.3 | Convergence checkpoint | Most instances should be suppressed | YES | YES | Monitor |
| 5 | T = +30 min | 5.4 | Explicit convergence test | Run 20-request batch | YES | NO | Operator |
| 5 | T = +30 min | 5.5 | Query audit trail | Count shos_suppression entries | NO | NO | Monitor |
| 5 | T = +30 min | 5.6 | Detect hidden auto-reverts | Query system_control_actions | NO | NO | Monitor |
| 5 | T = +35 min | 5.7 | Consistency check | Control state row count = 1 | YES | NO | Monitor |
| 5 | T = +40 min | 5.8 | Health metrics stable | DLQ/Queue/Health consistent | NO | NO | Monitor |
| 5 | T = +45 min | 5.9 | Final stabilization report | Post complete phase results | NO | NO | Operator |
| 6 | T = +45 min | 6.1 | Final checklist | All phases complete, no issues | YES | YES | Operator |
| 6 | T = +45 min | 6.2 | Operator decision | PROCEED / ROLLBACK | YES | N/A | CTO/Lead |
| 6 | T = +50 min | 6.3 | Formal approval | Signed-off by authority | YES | N/A | CTO |
| 7 | T = varies | 7.1 (if triggered) | Rollback decision | Specific trigger identified | YES | YES | Operator |
| 7 | T = varies | 7.2 (if triggered) | 1-click Vercel rollback | Promote previous deployment | YES | YES | Operator |
| 7 | T = varies | 7.3 (if triggered) | Rollback verification | Old code active on all instances | YES | YES | Monitor |
| 7 | T = varies | 7.4 (if triggered) | Post-rollback analysis | Document findings | NO | NO | Team |
| — | T = +60 min | — | MANDATORY ROLLBACK WINDOW | If no decision by this time | YES | YES | Automatic |

### Key Matrix Interpretations

**Rollback Critical = YES:** Failure of this step requires immediate rollback
**Freeze Required = YES:** Operator must explicitly approve before proceeding
**Authority:** Who has final decision authority for this step

---

## Final Signal Monitoring Matrix

This matrix provides the single authoritative reference for all 15 monitoring signals.

| Category | Signal | Source | Criticality | Window Start | Window End | Frequency | Rollback Trigger | Truth Confidence |
|---|---|---|---|---|---|---|---|---|
| A | A1: Suppression Status | GET /api/system/shos | CRITICAL | T+8 | T+30 | Every 2-3 min | Consistently false for 5+ requests | Medium (HIGH during T+8-15) |
| A | A2: Suppression Logging | DB: observability_logs | CRITICAL | T+0 | T+30 | Every 5 min | Zero entries at T+10 min | High |
| A | A3: Auto-Revert Activity | DB: system_control_actions | IMPORTANT | T+8 | T+30 | Every 5 min | Spike >10 entries in 5 min | Medium |
| B | B1: Queue Mutation Test | POST /api/admin/queue probe | CRITICAL | T+8 | T+20 | Every 3 min | All responses show unsuppressed | High |
| B | B2: DLQ Mutation Test | POST /api/admin/dlq probe | CRITICAL | T+8 | T+20 | Every 3 min | All responses show unsuppressed | High |
| B | B3: Delivery Mutation Test | POST /api/admin/delivery-logs probe | CRITICAL | T+8 | T+20 | Every 3 min | All responses show unsuppressed | High |
| B | B4: Metric Jump Detection | GET /api/system/shos metrics | IMPORTANT | T+8 | T+20 | Every 2 min | DLQ/Queue jump >50% in single reading | Medium |
| C | C1: Convergence Progress | 5-request batch suppressed count | IMPORTANT | T+8 | T+30 | Every 5 min | <50% suppressed at T+20 | Medium-High |
| C | C2: Instance Age Distribution | Vercel dashboard | IMPORTANT | T+3 | T+30 | Every 5 min | Deployment stalled past T+15 | High |
| C | C3: Last Old Instance | 20-request outlier detection | IMPORTANT | T+15 | T+30 | Every 10 min | Still detecting outliers at T+30 | Medium |
| D | D1: Control State | DB: COUNT(system_control_config) | CRITICAL | T+30 | T+45 | Once at T+30 | Row count != 1 | Very High |
| D | D2: Orphaned Records | DB: COUNT(orphaned actions) | IMPORTANT | T+30 | T+45 | Once at T+30 | Orphaned records found | Very High |
| D | D3: Feature Flags | DB: system_control_config flags | IMPORTANT | T+30 | T+45 | Once at T+30 | Flags in unexpected state | High |
| E | E1: Response Divergence | 5-request divergence_index | IMPORTANT | T+8 | T+30 | Every 5 min | Divergence index >3 past T+20 | Medium |
| E | E2: Gemini Independence | GET /api/system-health probe | INFORMATIONAL | T+8 | T+30 | Every 10 min | Repeated Gemini failures | High |

### Signal Categorization

**CRITICAL (immediate rollback if violated):**
- A1, A2, B1, B2, B3, D1

**IMPORTANT (investigate, possibly rollback):**
- A3, B4, C1, C2, C3, D2, D3, E1

**INFORMATIONAL (for context only):**
- E2

---

## Final Deployment Choreography Timeline

```
PRE-DEPLOYMENT (T = -2 hrs to 0)
├─ T = -2:00 → Authority checkpoint
├─ T = -2:00 → Baseline capture (all 6 steps)
├─ T = -0:05 → Final authority confirmation
└─ Ready for deployment trigger

DEPLOYMENT BUILD (T = 0 to +3 min) — 3 MINUTES
├─ T = 0:00 → Code push to main
├─ T = 0:00 → Vercel build triggered
├─ T = +1:00 → Build in progress
├─ T = +2:30 → Build completing
└─ T = +3:00 → Build verified ready (CRITICAL VERIFICATION)

INSTANCE ROLLOUT (T = +3 to +20 min) — 17 MINUTES (HIGHEST RISK)
├─ T = +3:00 → First instances deployed
├─ T = +5:00 → Divergence detection begins
├─ T = +8:00 → SAFE_OBSERVATION_WINDOW begins ← KEY MONITORING WINDOW
├─ T = +10:00 → Peak divergence expected
├─ T = +12:00 → Convergence should start showing
├─ T = +15:00 → SAFE_OBSERVATION_WINDOW ends; HIGH_RISK_WINDOW begins
├─ T = +15:00 → Operator reduces monitoring frequency
└─ T = +20:00 → Convergence checkpoint

CONVERGENCE (T = +20 to +45 min) — 25 MINUTES
├─ T = +20:00 → Convergence still tracking
├─ T = +25:00 → Last old instances should be rare
├─ T = +30:00 → CONVERGENCE_WINDOW begins; explicit verification phase starts
├─ T = +30:00 → 20-request convergence test (should see 20/20 suppressed)
├─ T = +35:00 → Audit trail analysis
├─ T = +40:00 → Health metrics verification
└─ T = +45:00 → CONVERGENCE_WINDOW ends

OPERATOR DECISION (T = +45 to +60 min) — 15 MINUTES DECISION WINDOW
├─ T = +45:00 → Final checklist verification
├─ T = +50:00 → CTO/lead decision: PROCEED or ROLLBACK
├─ T = +55:00 → Formal approval documented
└─ T = +60:00 → MANDATORY_ROLLBACK_WINDOW (auto-rollback if no decision)

TOTAL TIME WITHOUT ROLLBACK: 77 minutes (1 hour 17 minutes)
TOTAL TIME WITH ROLLBACK: ~95 minutes (includes rollback execution + verification)
```

---

## Final Risk Taxonomy

### High-Impact Risks (Could Cause Rollback)

| Risk | Probability | Detection Timing | Mitigation |
|---|---|---|---|
| Suppression gate never activates | LOW | T+10 min (signal A1) | Clear rollback trigger |
| Mutation authority bypassed | LOW-MEDIUM | T+10 min (signal B1-B3) | Test probes verify gate |
| Uncontrolled mutations execute | MEDIUM | T+15 min (signal B4) | Monitor metric jumps |
| Data corruption occurs | LOW | T+30 min (signal D1-3) | Explicit verification |
| Observability becomes incoherent | LOW | T+15 min (signal E1) | Divergence detection |

### Medium-Impact Risks (Could Extend Timeline)

| Risk | Probability | Detection Timing | Mitigation |
|---|---|---|---|
| Convergence delayed past T+25 | MEDIUM | T+20 min (signal C1) | Reduced monitoring helps |
| Hidden writes exceed expectations | MEDIUM | T+30 min (signal A3) | Audit trail explains them |
| Stale instances persist beyond T+30 | MEDIUM-HIGH | T+30 min (signal C3) | Hard stop at T+60 |

### Low-Impact Risks (Observable but Manageable)

| Risk | Probability | Detection Timing | Mitigation |
|---|---|---|---|
| Occasional metric fluctuations | HIGH | Every poll (signal B4) | Expected during coexistence |
| Response divergence during coexistence | HIGH | Every poll (signal A1) | Expected and observable |
| Latency increases during rollout | MEDIUM | Every poll | Expected due to load |

---

## Success Criteria Checklist

**Canary execution is SUCCESSFUL if:**

- [ ] All phases completed without triggering rollback
- [ ] Convergence verified explicitly at T+30+ (20/20 suppressed)
- [ ] Audit trail shows expected suppression logging
- [ ] Control state remains consistent (1 row, no orphans)
- [ ] Feature flags in expected state (or documented changes)
- [ ] System health stable (not CRITICAL, improved vs. baseline)
- [ ] No catastrophic failures observed
- [ ] Observability was trustworthy after explicit verification

**Canary execution is QUESTIONABLE if:**

- [ ] Coexistence extended past T+45 without clear convergence
- [ ] Hidden auto-reverts exceeded expectations
- [ ] Observability divergence was extreme (E1 > 3 for extended period)
- [ ] Decision to proceed was made without explicit convergence verification

**Canary execution FAILED if:**

- [ ] Rollback was triggered (operator loss of confidence)
- [ ] Explicit convergence test shows <95% suppressed at T+30+
- [ ] Data corruption detected at any point
- [ ] System entered CRITICAL health that didn't recover

---

## Authority & Decision Checkpoints

### Authority Hierarchy

1. **CTO** — Final deployment authority; can approve/reject canary
2. **Deployment Lead** — Operational owner; conducts choreography
3. **Super-Admin Lead** — Rollback executor; knows Vercel dashboard
4. **Monitoring Team** — Signal collectors; real-time alerting

### Critical Checkpoints Requiring Explicit Approval

- **T = -0:05:** Final authority confirmation (Deployment Lead confirms YES with CTO)
- **T = +3:00:** Build verified (Monitoring Team confirms READY)
- **T = +15:00:** Enter HIGH_RISK window (Operator confirms monitoring reduced)
- **T = +30:00:** Begin explicit verification (Operator runs convergence test)
- **T = +45:00:** Final decision checkpoint (CTO decides PROCEED or ROLLBACK)

### Escalation Triggers

| Event | When | Escalate To | Action |
|---|---|---|---|
| Build fails | T+3 | CTO | Abort + analyze |
| Suppression never activates | T+10 | CTO | Rollback |
| Mutation authority bypassed | T+10 | CTO | Rollback |
| Data corruption | T+30 | CTO + DB Team | Rollback + post-mortem |
| Convergence stalled >T+30 | T+30 | CTO | Wait/Rollback decision |
| Operator uncomfortable | Any time | CTO | Rollback (override not required) |

---

## Final Checklist: Before Canary Can Begin

**Infrastructure:**
- [ ] Vercel rollback tested (can 1-click back to previous version)
- [ ] Monitoring tools ready (queries, dashboards, scripts)
- [ ] Communication channels open (#alerts subscribed, team informed)
- [ ] Database access verified (can query observability_logs, system_control_actions)

**Code:**
- [ ] All 11 files staged locally (lib/shos.js, route.js, ShosControlCenter.jsx, etc.)
- [ ] Build verified locally (npm run build passes)
- [ ] Git authentication working (can push to main)
- [ ] Commit message prepared ("RC-2H: SHOS suppression deployment canary")

**Authority:**
- [ ] Deployment lead confirmed
- [ ] Rollback authority identified
- [ ] CTO briefed and available
- [ ] Team lead aware

**Runbook:**
- [ ] This document reviewed by team
- [ ] Rollback procedure practiced
- [ ] Monitoring dashboard prepared
- [ ] Team knows exact roles during canary

**If ANY item unchecked: DO NOT PROCEED.** Address gaps first.

---

## Conclusion

**This is the complete operational specification for RC-2H canary execution.**

Use these matrices as:
1. **Real-time reference** — During canary, consult execution matrix for next action
2. **Monitoring guide** — Use signal matrix to know what to measure when
3. **Decision support** — Use matrices to decide go/no-go at each checkpoint

**Success is not guaranteed. Vigilance is required.**

But with explicit choreography, comprehensive monitoring, and clear rollback triggers, the canary has the best possible chance of success with manageable risk.
