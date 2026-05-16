# RC-2B CYCLE 7 — ATOM-C DEPLOYMENT LOCK MATRIX

**Cycle:** RC-2B Cycle 7  
**Date:** 2026-05-14  
**Type:** DEPLOYMENT READINESS GATING (READ-ONLY)  
**Objective:** Exact atomic deployment boundary + coupling lock + rollback determinism  

---

## Section 1 — Atomic Deployment Boundary

### What CANNOT be deployed separately

| Coupling Pair | Reason | Consequence of Partial Deploy |
|---|---|---|
| `lib/system/shos.js` + ALL 7 wired routes | All 7 routes import from shos.js. Without shos.js deployed, every route has an unresolved import. | Build failure or serverless cold-start crash on all 7 routes |
| `app/admin/system/page.js` + `features/admin/system/ShosControlCenter.jsx` | page.js imports ShosControlCenter. | Next.js build failure (missing module) |
| `app/api/admin/system/shos/route.js` + `lib/system/shos.js` | Route imports from shos.js. | Build failure |
| `lib/queue/deliveryTruth.js` (if IN manifest) + `lib/system/shos.js` | SHOS calls syncExternalDelivery etc. If local deliveryTruth changes are load-bearing for SHOS, partial deploy breaks delivery retry path. | Silent delivery retry failure |
| `lib/system/systemHealth.js` (if IN manifest) + `lib/system/shos.js` | SHOS calls getSystemHealthSnapshot. If local additions change snapshot shape expected by SHOS, partial deploy returns wrong health data. | Incorrect health metrics in SHOS snapshot |

---

## Section 2 — Mandatory Atomic Commit Contents

The following files MUST be in ONE git commit for ATOM-C:

```
MANDATORY (untracked — must git add):
  lib/system/shos.js
  app/api/admin/system/shos/route.js
  features/admin/system/ShosControlCenter.jsx

MANDATORY (tracked, modified — must commit):
  app/admin/system/page.js
  app/api/admin/system/route.js
  app/api/admin/system/health/route.js
  app/api/admin/system-health/route.js
  app/api/admin/queue/route.js
  app/api/admin/dlq/route.js
  app/api/admin/delivery-logs/route.js
  app/api/admin/observability/route.js

PENDING RESOLUTION (classify IN or OUT before commit):
  lib/queue/deliveryTruth.js   [DEP-AMB-01]
  lib/system/systemHealth.js   [DEP-AMB-02]
```

No files outside this boundary may appear in the ATOM-C staging area (Rule 26).

---

## Section 3 — Read-Path Classification

### `getShosSnapshot()` — Called on GET to 5 admin routes

| Classification | Evidence |
|---|---|
| **READ_WITH_GLOBAL_SIDE_EFFECT** | `processDueFeatureFlagReverts()` is called inside `getShosSnapshot()` unconditionally. It writes to `system_control_config` and `system_control_actions` when overdue auto-reverts exist. |

> This is the single most critical deployment safety finding in ATOM-C.  
> Every snapshot GET can silently mutate production feature flags.

### Detailed Auto-Revert Side Effect Path

```
HTTP GET /api/admin/system/shos
  → getShosSnapshot()
    → processDueFeatureFlagReverts(supabase)
      → SELECT FROM system_control_actions WHERE auto_revert_at <= now()
      → IF rows found:
          → updateControlRow(system_control_config, {flag: previousValue})  ← WRITES feature flag
          → insertControlAction(system_control_actions, {...})               ← WRITES audit trail
          → UPDATE system_control_actions SET status='reverted'             ← WRITES action record
```

**Mitigation required before first deploy:**  
Operator must verify `system_control_actions` has zero rows with `status='applied'` AND `auto_revert_at IS NOT NULL` AND `reverted_at IS NULL`. If any exist, first GET will fire their reverts silently.

### `performShosAction()` — Called on POST to 3 admin routes

| Classification | Evidence |
|---|---|
| `PURE_READ` | NO — all action paths write to at least one table |
| Mutation surface | Queue writes, DLQ writes, QStash dispatch, event_store writes, feature-flag writes, delivery_logs writes, all write to system_control_actions for audit |

---

## Section 4 — Deployment Lock Matrix

| File | Required | Production Reachable | Coupled To | Rollback Critical | Deploy Alone Safe |
|---|---|---|---|---|---|
| `lib/system/shos.js` | YES | NO (not a route) | All 7 routes + shos route + all manifest files | YES | **NO** |
| `app/api/admin/system/shos/route.js` | YES | YES (`/api/admin/system/shos`) | shos.js | YES | **NO** |
| `features/admin/system/ShosControlCenter.jsx` | YES | NO (UI component) | app/admin/system/page.js | YES | **NO** |
| `app/admin/system/page.js` | YES | YES (`/admin/system`) | ShosControlCenter.jsx | YES | **NO** |
| `app/api/admin/system/route.js` | YES | YES (`/api/admin/system`) | shos.js | YES | **NO** |
| `app/api/admin/system/health/route.js` | YES | YES (`/api/admin/system/health`) | shos.js | YES | **NO** |
| `app/api/admin/system-health/route.js` | YES | YES (`/api/admin/system-health`) | shos.js | YES | **NO** |
| `app/api/admin/queue/route.js` | YES | YES (`/api/admin/queue`) | shos.js | YES | **NO** |
| `app/api/admin/dlq/route.js` | YES | YES (`/api/admin/dlq`) | shos.js | YES | **NO** |
| `app/api/admin/delivery-logs/route.js` | YES | YES (`/api/admin/delivery-logs`) | shos.js | YES | **NO** |
| `app/api/admin/observability/route.js` | YES | YES (`/api/admin/observability`) | shos.js | YES | **NO** |
| `lib/queue/deliveryTruth.js` | PENDING (DEP-AMB-01) | NO (library) | delivery-logs route, shos.js | PENDING | **NO if IN** |
| `lib/system/systemHealth.js` | PENDING (DEP-AMB-02) | NO (library) | system/route, shos.js | PENDING | **NO if IN** |

---

## Section 5 — First-Deploy Operational Requirements

Before ATOM-C can be deployed (even as staged/read-only), the following operational constraints MUST be met:

| # | Requirement | Why |
|---|---|---|
| OPDEP-01 | Verify `system_control_actions` has 0 pending auto-reverts (`status='applied' AND auto_revert_at IS NOT NULL AND reverted_at IS NULL`) | `processDueFeatureFlagReverts()` fires silently on first snapshot GET |
| OPDEP-02 | Resolve DEP-AMB-01 (deliveryTruth.js local diff) | Manifest cannot be frozen without this |
| OPDEP-03 | Resolve DEP-AMB-02 (systemHealth.js local diff) | Manifest cannot be frozen without this |
| OPDEP-04 | Confirm `system_control_config` has exactly one row (singleton_key=true) | SHOS upserts on it; missing row creates cold-start write on first snapshot |
| OPDEP-05 | `super_admin` role must exist in session for any operator to reach SHOS routes | Auth guard enforces this already |
| OPDEP-06 | No mutation-suppression feature flag gate has been added to SHOS routes | SHOS performShosAction has NO built-in rate-limit or mutation freeze |

---

## Section 6 — Rollback Determinism Analysis

### Can rollback remain under 60 seconds?

| Item | Assessment |
|---|---|
| Vercel 1-click rollback to `9e12ef2` | YES — ~2 minutes (standard Vercel) |
| Removes SHOS import from all routes | YES — all 7 coupled routes revert to HEAD versions |
| Removes /admin/system ShosControlCenter | YES — page reverts to SystemHealthContent |
| Removes /api/admin/system/shos endpoint | YES — route is untracked, disappears |

### Rollback Blockers

| Item | Blocker? | Notes |
|---|---|---|
| Code rollback | NO | Vercel 1-click — all SHOS files removed |
| Queue integrity | **PARTIAL** — rows mutated by SHOS actions remain | Rollback removes code but NOT data mutations |
| DLQ integrity | **PARTIAL** — same as queue | DLQ status changes persist in DB |
| `system_control_actions` | PERSISTENT | All audit trail rows remain after rollback |
| `system_control_config` | **RISK** — auto-reverts may have changed feature flags | Flag state after rollback depends on any auto-revert fires |
| Orphan operator actions | LOW RISK | `system_control_actions` rows are append-only audit records |

### Rollback Classification

| Dimension | Status |
|---|---|
| Code rollback | DETERMINISTIC |
| Auth safety | SAFE (auth system unchanged) |
| Cron safety | SAFE (cron routes unmodified) |
| Queue data safety | PARTIALLY SAFE (mutations persist) |
| Feature-flag state | **RISK IF AUTO-REVERTS FIRED** |
| Under 60 seconds (code) | YES |
| Under 60 seconds (data) | NO — DB data mutations cannot be rolled back via Vercel |

### Rollback Order

1. Vercel 1-click rollback to `9e12ef2`
2. Verify public routes (/, /blog, /api/health) return 200
3. Verify admin auth protection active (401 without session)
4. Verify `/api/admin/system` returns non-SHOS response (if it returns `canonical_source` from SHOS snapshot that's a sign of partial state)
5. Manually inspect `system_control_config` flag values vs expected baseline if auto-reverts may have fired

---

## Section 7 — Operational Blast-Radius Containment

### Capability-Level Classification

| SHOS Capability | Blast Radius | Classification |
|---|---|---|
| Feature flag read | Admin panel only | SAFE |
| Feature flag `force_enable` / `disable` | All gated subsystems (pagegen, AI, bulk, CRM, followup, queue) | **GLOBAL_RUNTIME** |
| Feature flag `enable_with_validation` | Same but gated by DLQ/queue/health checks | CONTAINABLE |
| Feature flag auto-revert | Fires on any snapshot GET without user action | **HIGH_RISK** |
| DLQ retry (single) | One job re-enters job_runs | LOCALIZED |
| DLQ retry_all | All pending DLQ items re-queued | HIGH_RISK |
| Queue retry_failed | Failed queue rows reset + QStash dispatch fired | HIGH_RISK (live dispatch) |
| Queue cancel_failed | Queue rows cancelled | CONTAINABLE |
| Delivery retry | QStash dispatch + event_store retry | HIGH_RISK (live dispatch) |
| Delivery mark_terminal | Delivery row marked terminal, no dispatch | SAFE |
| Event retry | QStash dispatch + event_store retry | HIGH_RISK (live dispatch) |
| Event resolve | Event status → skipped | LOCALIZED |
| Alert resolve | Alert marked resolved | LOCALIZED |
| Error resolve | Error marked resolved | LOCALIZED |
| Run runbook | Depends on runbook — could be global | POTENTIALLY GLOBAL_RUNTIME |

### Containment Options

| Option | How |
|---|---|
| Mutation freeze for first deploy | No built-in gate exists in SHOS. Would require a separate feature flag (`shos_actions_enabled`) or operator discipline. |
| Read-only mode for first deploy | Not implemented. getShosSnapshot already has side effects (auto-reverts). |
| Staged rollout | Not applicable — Vercel deploys atomically. |
| Operator restriction | Deploy with `super_admin` role held by a single trusted operator initially. |

---

## Section 8 — Deployment Authorization Decision

| Classification | **BLOCKED_PENDING_REVIEW** |
|---|---|
| **Primary Blockers** | DEP-AMB-01 and DEP-AMB-02 (dependency ambiguities not resolved) |
| **Secondary Blockers** | OPDEP-01 (pending auto-reverts not verified), OPDEP-04 (system_control_config singleton confirmed but row count not independently verified this cycle) |
| **Safety Concern** | Auto-revert side effect in getShosSnapshot() must be explicitly acknowledged by operator before first deploy |

**BLOCKED_PENDING_REVIEW does NOT mean code is wrong.** It means the exact manifest cannot be frozen and two OPDEP gates have not been cleared. Once those 4 items are resolved, the ATOM-C manifest can be frozen and deployment authorization can proceed.

---

*Artifact created: RC-2B Cycle 7 deployment lock matrix — read-only, no deployment.*
