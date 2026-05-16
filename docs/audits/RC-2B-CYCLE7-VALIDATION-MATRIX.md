# RC-2B CYCLE 7 — ATOM-C VALIDATION MATRIX

**Cycle:** RC-2B Cycle 7  
**Date:** 2026-05-14  
**Type:** DEPLOYMENT READINESS GATING (READ-ONLY)  
**Objective:** Exact validation matrix for future ATOM-C deployment  

---

## Section 1 — Validation Phase Definitions

| Phase | Name | Purpose |
|---|---|---|
| **PRE** | Pre-deploy gate | Run BEFORE deploying. Block if any check fails. |
| **SMOKE** | Post-deploy smoke | Run immediately after deploy. Catch build/cold-start failures. |
| **RUNTIME** | Runtime integrity | Verify SHOS routes serve correct responses. |
| **BLAST** | Blast-radius proof | Confirm no unintended side effects fired. |
| **ROLLBACK** | Rollback proof | Verify rollback path is intact after deploy. |

---

## Section 2 — PRE-DEPLOY GATES (Must all PASS before commit is created)

| # | Gate | Check | Pass Condition | Failure Action |
|---|---|---|---|---|
| PRE-01 | Dependency ambiguity resolved | DEP-AMB-01: `lib/queue/deliveryTruth.js` local diff classified | Decision documented (IN or OUT of ATOM-C) | Block deployment |
| PRE-02 | Dependency ambiguity resolved | DEP-AMB-02: `lib/system/systemHealth.js` local diff classified | Decision documented (IN or OUT of ATOM-C) | Block deployment |
| PRE-03 | Auto-revert safety gate | `SELECT COUNT(*) FROM system_control_actions WHERE status='applied' AND auto_revert_at IS NOT NULL AND reverted_at IS NULL` | Result = 0 | Block if > 0; investigate pending reverts |
| PRE-04 | system_control_config singleton | `SELECT COUNT(*) FROM system_control_config WHERE singleton_key=true` | Result = 1 | Block if 0 (needs a row); verify if > 1 |
| PRE-05 | Manifest scope check | `git status --short` of all 11+ ATOM-C files | All REQUIRED files tracked and staged; no EXTRA files in staging area | Block if extraneous files staged |
| PRE-06 | Build gate | `npm run build` passes locally with ATOM-C files tracked | Zero build errors | Block if build fails |
| PRE-07 | No active operator mutations | Queue and DLQ in stable state | `queue_failed = 0` or documented as acceptable | Proceed with awareness if > 0 |

---

## Section 3 — SMOKE TESTS (Run within 2 minutes of deploy)

| # | Test | URL / Command | Expected | Failure Action |
|---|---|---|---|---|
| SM-01 | Homepage 200 | GET `https://bimasakhi.com/` | 200 | Immediate rollback |
| SM-02 | Blog 200 | GET `https://bimasakhi.com/blog` | 200 | Immediate rollback |
| SM-03 | Admin redirect | GET `https://bimasakhi.com/admin` (no cookie) | 302/401 | Immediate rollback if 200 |
| SM-04 | SHOS route reachable | GET `https://bimasakhi.com/api/admin/system/shos` (no cookie) | 401 Unauthorized | Immediate rollback if 200 or 500 |
| SM-05 | Queue route reachable | GET `https://bimasakhi.com/api/admin/queue` (no cookie) | 401 Unauthorized | Immediate rollback |
| SM-06 | DLQ route reachable | GET `https://bimasakhi.com/api/admin/dlq` (no cookie) | 401 Unauthorized | Immediate rollback |
| SM-07 | Vercel deployment logs | Check Vercel deployment status page | No build errors, zero failed function calls in first 2 min | Rollback if function errors present |

---

## Section 4 — RUNTIME INTEGRITY TESTS (Run within 10 minutes of deploy with valid super_admin session)

| # | Test | Action | Expected | Notes |
|---|---|---|---|---|
| RT-01 | SHOS snapshot returns | GET `/api/admin/system/shos` (with auth) | 200 + JSON with `feature_flags`, `metrics`, `health`, `dlq`, `queue_failures` sections | Validates shos.js import resolved |
| RT-02 | SHOS source field | Check `snapshot.source` in RT-01 response | `"shos"` or canonical source string | Confirms SHOS is serving the snapshot |
| RT-03 | System route returns | GET `/api/admin/system` (with auth) | 200 + `statuses`, `overall`, `metrics`, `canonical_source` | Validates system route SHOS wire |
| RT-04 | System health route returns | GET `/api/admin/system/health` (with auth) | 200 + `overall_health`, `operator_metrics`, `consistency` | Validates health route SHOS wire |
| RT-05 | Observability returns | GET `/api/admin/observability` (with auth) | 200 + `recovery` section present | Validates observability route SHOS wire |
| RT-06 | Queue GET returns | GET `/api/admin/queue` (with auth) | 200 + queue summary counts | Validates queue route still functional |
| RT-07 | DLQ GET returns | GET `/api/admin/dlq` (with auth) | 200 + DLQ list data | Validates DLQ route still functional |
| RT-08 | Delivery logs GET returns | GET `/api/admin/delivery-logs` (with auth) | 200 + delivery log data | Validates delivery-logs route still functional |
| RT-09 | Admin system page loads | GET `/admin/system` (browser, with auth) | Page renders ShosControlCenter UI | Validates page + ShosControlCenter coupling |
| RT-10 | Feature flags visible | Check ShosControlCenter UI or RT-01 JSON | Feature flags listed with correct keys | Confirms system_control_config readable |

---

## Section 5 — BLAST-RADIUS PROOF (Run after RT tests complete)

| # | Proof | Check | Pass Condition |
|---|---|---|---|
| BL-01 | Auto-revert did not fire unexpectedly | `SELECT COUNT(*) FROM system_control_actions WHERE source='auto_revert' AND created_at > [deploy_timestamp]` | 0 unless pre-approved reverts were pending |
| BL-02 | No unintended queue dispatches | Check QStash delivery log after deploy | No new dispatches unless operator triggered |
| BL-03 | DLQ state unchanged | `SELECT COUNT(*) FROM job_dead_letters WHERE operator_status='retried' AND updated_at > [deploy_timestamp]` | 0 unless operator triggered retry |
| BL-04 | Feature flags unchanged | `SELECT * FROM system_control_config WHERE singleton_key=true` | All flag values match pre-deploy baseline |
| BL-05 | system_control_actions row count | `SELECT COUNT(*) FROM system_control_actions WHERE created_at > [deploy_timestamp]` | Only rows from auto-revert (if any pending) or explicit operator actions |
| BL-06 | Cron routes unaffected | Check cron execution logs (QStash) | All 6 crons still firing on schedule |
| BL-07 | Public route parity | Run SM-01 through SM-03 again | Same results as smoke test |

---

## Section 6 — ROLLBACK PROOF (Keep ready; do not execute unless smoke/runtime fails)

| # | Step | Action | Pass Condition |
|---|---|---|---|
| RB-01 | Initiate rollback | Vercel dashboard → Deployments → rollback to `9e12ef2` | Rollback completes |
| RB-02 | Verify homepage | GET `https://bimasakhi.com/` | 200 |
| RB-03 | Verify admin auth | GET `/admin` without cookie | 302/401 |
| RB-04 | Verify SHOS gone | GET `/api/admin/system/shos` | 404 (route no longer exists) |
| RB-05 | Verify system route reverted | GET `/api/admin/system` (with auth) | 200 WITHOUT `canonical_source` field from SHOS |
| RB-06 | Verify flag state | `SELECT * FROM system_control_config` | Compare to pre-deploy baseline |
| **RB-07** | **Verify no partial state** | Check all blast-radius tables for unexpected mutations | All tables match pre-deploy snapshot |

---

## Section 7 — OPERATOR TRUTH VALIDATION

| # | Check | Action |
|---|---|---|
| OT-01 | SHOS snapshot is authoritative | RT-01 response should be the single truth for all system health |
| OT-02 | system_control_actions audit trail clean | After deploy, no orphan actions in unknown/stale states |
| OT-03 | Feature-flag history present | After first operator action via SHOS, verify action appears in `system_control_actions` with correct actor_id, reason, source fields |
| OT-04 | Rollback path documented | Rollback SHA `9e12ef2` confirmed reachable in Vercel deployments list |

---

## Section 8 — Validation Matrix Summary

| Phase | Count | Gate Condition |
|---|---|---|
| PRE-DEPLOY | 7 gates | ALL must PASS before commit |
| SMOKE | 7 tests | ALL must PASS within 2 min of deploy |
| RUNTIME INTEGRITY | 10 tests | ALL must PASS within 10 min of deploy |
| BLAST-RADIUS PROOF | 7 proofs | ALL must PASS before declaring deploy stable |
| ROLLBACK PROOF | 7 steps | Pre-prepared; execute ONLY on failure |
| OPERATOR TRUTH | 4 checks | Complete after first operator action |
| **TOTAL** | **42 checks** | |

---

## Section 9 — Deployment Authorization Decision Gate

ATOM-C may be **authorized for deployment** ONLY when:

1. PRE-01 through PRE-07: ALL PASS
2. DEP-AMB-01 and DEP-AMB-02: BOTH RESOLVED and DOCUMENTED
3. OPDEP-01 (auto-revert pre-check): VERIFIED CLEAR
4. OPDEP-04 (system_control_config singleton): VERIFIED
5. CTO signs off on auto-revert side effect acknowledgment
6. This document is updated with PRE-DEPLOY gate results

**Until all 6 conditions above are met: BLOCKED_PENDING_REVIEW.**

---

*Artifact created: RC-2B Cycle 7 validation matrix — read-only, no deployment.*
