# RC-2B CYCLE 7 — ATOM-C DEPENDENCY CLOSURE

**Cycle:** RC-2B Cycle 7  
**Date:** 2026-05-14  
**Type:** DEPLOYMENT READINESS GATING (READ-ONLY)  
**Objective:** Complete import graph + dependency closure for ATOM-C + side-effect surface map  

---

## Section 1 — Dependency Classification Legend

| Classification | Meaning |
|---|---|
| `HARD_REQUIRED` | Missing import = build failure or silent runtime break |
| `SOFT_REQUIRED` | Used at runtime; graceful degradation only if try/caught |
| `OPTIONAL` | Path exists but not on hot path |
| `DANGEROUS_IF_PARTIAL` | Partial deployment (without this dep) creates unpredictable runtime state |

---

## Section 2 — SHOS Core Import Graph (`lib/system/shos.js`)

All 9 direct imports in `lib/system/shos.js`:

| Import | Symbol(s) Used | Deployed in HEAD | Classification | Status |
|---|---|---|---|---|
| `@/utils/supabaseClientSingleton` | `getServiceSupabase` | YES | HARD_REQUIRED | CLEAN |
| `@/lib/system/systemHealth` | `getSystemHealthSnapshot` | YES (modified locally) | HARD_REQUIRED · DEPENDENCY_AMBIGUITY | LOCAL DIFF: +36/-2 lines |
| `@/lib/queue/publisher` | `enqueuePageGeneration` | YES | HARD_REQUIRED | CLEAN |
| `@/lib/monitoring/runbooks` | `executeRunbook` | YES | HARD_REQUIRED | CLEAN |
| `@/lib/queue/qstash` | `getBaseUrl`, `getQStashClient` | YES | HARD_REQUIRED | CLEAN |
| `@/lib/events/eventStore` | `incrementRetry`, `markDispatched`, `markFailed` | YES | HARD_REQUIRED | CLEAN |
| `@/lib/events/triggerMap` | `getTrigger` | YES | HARD_REQUIRED | CLEAN |
| `@/lib/queue/deliveryTruth` | `recordExternalDelivery`, `syncExternalDelivery`, `syncPendingExternalDeliveries` | YES (modified locally) | HARD_REQUIRED · DEPENDENCY_AMBIGUITY | LOCAL DIFF: +26/-23 lines |
| `@/lib/safeLogger` | `safeLog` | YES | SOFT_REQUIRED | CLEAN |

---

## Section 3 — SHOS Route Import Graph (`app/api/admin/system/shos/route.js`)

| Import | Symbol(s) Used | Deployed in HEAD | Classification |
|---|---|---|---|
| `next/server` | `NextResponse` | YES | HARD_REQUIRED |
| `@/lib/auth/withAdminAuth` | `withAdminAuth` | YES (ATOM-B) | HARD_REQUIRED |
| `@/lib/system/shos` | `getShosSnapshot`, `performShosAction` | NO (untracked) | HARD_REQUIRED · BLOCKING_IF_MISSING |

---

## Section 4 — Admin Route Import Graphs (SHOS-Wired)

### `app/api/admin/system/route.js`
| Import | New in local vs HEAD |
|---|---|
| `@/lib/system/shos` → `getShosSnapshot` | YES — not in HEAD |
| Others (supabaseClientSingleton, withAdminAuth) | Pre-existing |

### `app/api/admin/system/health/route.js`
| Import | New in local vs HEAD |
|---|---|
| `@/lib/system/shos` → `getShosSnapshot` | YES — replaces/augments HEAD's `@/lib/system/systemHealth` call |
| `@/lib/auth/withAdminAuth` | Pre-existing |

### `app/api/admin/system-health/route.js`
| Import | New in local vs HEAD |
|---|---|
| `@/lib/system/shos` → `getShosSnapshot` | YES — not in HEAD |
| Others | Pre-existing |

### `app/api/admin/queue/route.js`
| Import | New in local vs HEAD |
|---|---|
| `@/lib/system/shos` → `performShosAction` | YES — not in HEAD |
| Others (publisher, supabase, withAdminAuth) | Pre-existing |

### `app/api/admin/dlq/route.js`
| Import | New in local vs HEAD |
|---|---|
| `@/lib/system/shos` → `performShosAction` | YES — HEAD route had no SHOS import, direct Supabase only |

### `app/api/admin/delivery-logs/route.js`
| Import | New in local vs HEAD |
|---|---|
| `@/lib/system/shos` → `performShosAction` | YES — HEAD had only deliveryTruth imports |
| deliveryTruth imports | Pre-existing |

### `app/api/admin/observability/route.js`
| Import | New in local vs HEAD |
|---|---|
| `@/lib/system/shos` → `getShosSnapshot` | YES — not in HEAD |
| Others | Pre-existing |

---

## Section 5 — Admin UI Import Graph (`features/admin/system/ShosControlCenter.jsx`)

| Import | Symbol(s) Used | Status |
|---|---|---|
| `react` | `startTransition`, `useCallback`, `useEffect`, `useMemo`, `useState` | Framework — CLEAN |
| No external lib imports beyond React observed in first 100 lines | Inline UI only | Pure React component — no extra deps |

> ShosControlCenter.jsx is a `'use client'` React component. It fetches via HTTP (presumably to `/api/admin/system/shos`). No additional untracked file dependencies identified.

---

## Section 6 — Database Dependency Closure

Tables directly accessed by SHOS and their status:

| Table | Access Type | Required | Exists | Risk |
|---|---|---|---|---|
| `system_control_config` | R/W (getControlRow, updateControlRow) | YES | YES (migration 029) | NONE |
| `system_control_actions` | R/W (insertControlAction, getLatestActionsByTarget) | YES | YES (44 rows) | NONE |
| `job_dead_letters` | R/W (fetchDlqRowsForAction, retryDlqEntries) | YES | YES | NONE |
| `generation_queue` | R/W (fetchQueueRowsForAction, retryQueueRows) | YES | YES | NONE |
| `external_delivery_logs` | R/W (fetchDeliveryRowsForAction, retryDeliveryRow) | YES | YES (41 rows) | NONE |
| `event_store` | R/W (fetchEventRowsForAction, retryEventRows) | YES | YES (140 rows) | NONE |
| `job_runs` | W (retryDlqEntries creates new job_run rows) | YES | YES | NONE |
| `generation_logs` | R (getQueueFailureOverview reads logs) | SOFT | YES | NONE |
| `system_alerts` | R (getAlertOverview) | SOFT | YES | NONE |
| `alert_deliveries` | R (getAlertOverview) | SOFT | YES | NONE |
| `system_runtime_errors` | R (getErrorOverview) | SOFT | YES | NONE |
| `system_errors` | R (getErrorOverview) | SOFT | YES | NONE |

> **All required tables EXIST in production DB.** No migration is required before ATOM-C deployment.

---

## Section 7 — Environment Assumption Closure

| Env Variable | Used By | Required | Present in Production |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `getServiceSupabase` | YES | YES (Vercel env) |
| `QSTASH_TOKEN` | `getQStashClient` | YES (for retry dispatch) | YES (Vercel env) |
| `QSTASH_URL` / `NEXT_PUBLIC_SITE_URL` | `getBaseUrl` | YES (for retry URL construction) | YES |
| `GEMINI_API_KEY` | NOT used directly by SHOS core | N/A | N/A |

---

## Section 8 — Side-Effect Surface Map

### 8.1 `getShosSnapshot()` — Called on every GET to 5 routes

| Side Effect | Trigger | Scope | Classification |
|---|---|---|---|
| `processDueFeatureFlagReverts()` | Called on EVERY `getShosSnapshot()` invocation | Writes to `system_control_config` + `system_control_actions` if pending auto-reverts exist | **READ_WITH_GLOBAL_SIDE_EFFECT** |
| DB reads on 8+ tables | Called on snapshot assembly | Read-only for most sections | READ |

> **⚠ CRITICAL FINDING:** `getShosSnapshot()` is not a pure read. It calls `processDueFeatureFlagReverts()` as a side effect on every GET request. This means:
> - Every admin snapshot request can mutate `system_control_config` and `system_control_actions`
> - This fires even if no operator action is taken
> - Must be explicitly acknowledged by operator before first deploy

### 8.2 `performShosAction()` — Write-path actions

| Action Category | Side Effects | DB Writes | Classification |
|---|---|---|---|
| `feature_flag_set` | Updates `system_control_config`, inserts `system_control_actions` | YES | CASCADING (affects all flag-gated subsystems) |
| `dlq_retry` / `dlq_retry_all` | Creates rows in `job_runs`, updates `job_dead_letters`, inserts `system_control_actions` | YES | LOCALIZED (DLQ scope) |
| `dlq_discard` / `dlq_resolve` | Updates `job_dead_letters`, inserts `system_control_actions` | YES | LOCALIZED |
| `queue_retry_failed` / `queue_cancel_failed` | Updates `generation_queue`, dispatches to QStash (enqueuePageGeneration), inserts `system_control_actions` | YES + QStash dispatch | CASCADING (triggers live dispatch) |
| `delivery_retry` | Calls `retryEventStoreDispatch` → QStash publish, updates `external_delivery_logs`, inserts `system_control_actions` | YES + QStash dispatch | CASCADING (triggers live dispatch) |
| `delivery_mark_terminal` | Updates `external_delivery_logs`, inserts `system_control_actions` | YES | LOCALIZED |
| `event_retry` | QStash dispatch, updates `event_store`, inserts `system_control_actions` | YES + QStash dispatch | CASCADING (triggers live dispatch) |
| `event_resolve` | Updates `event_store` status to `skipped`, inserts `system_control_actions` | YES | LOCALIZED |
| `alert_resolve` | Updates `system_alerts` | YES | LOCALIZED |
| `error_resolve` | Updates `system_runtime_errors` or `system_errors` | YES | LOCALIZED |
| `run_runbook` | Calls `executeRunbook` — scope depends on runbook | Depends | POTENTIALLY GLOBAL_RUNTIME |
| `delivery_sync_pending` | Calls `syncPendingExternalDeliveries` — QStash sync | YES + external API | CASCADING |

### 8.3 Auto-Revert Execution Path

```
getShosSnapshot()
  → processDueFeatureFlagReverts()
    → query system_control_actions (WHERE status='applied' AND auto_revert_at <= now)
    → IF overdue reverts found:
        → updateControlRow(system_control_config, previousValue)   ← DB WRITE
        → insertControlAction(system_control_actions, auto_revert)  ← DB WRITE
        → UPDATE system_control_actions SET status='reverted'       ← DB WRITE
```

**Classification: READ_WITH_GLOBAL_SIDE_EFFECT**

This path executes silently on every snapshot GET. If any operator actions were created with `auto_revert_at` set (e.g. from an earlier test or the local SHOS run), the first production GET will fire those reverts.

---

## Section 9 — Circular Dependency Analysis

| Check | Result |
|---|---|
| `lib/system/shos.js` imports from itself | NO |
| Any SHOS dependency imports shos.js back | NO circular detected |
| `performShosAction` calls `runMappedAction` which calls `performShosAction` | YES — internal recursion for mapped alert/error auto-fix actions. Bounded by single-level dispatch (action lookup, not loop). SAFE. |

---

## Section 10 — Dynamic Import Analysis

| File | Dynamic Import | Risk |
|---|---|---|
| `app/api/admin/system-health/route.js` | `await import('@google/generative-ai')` (Gemini probe) | SOFT — not SHOS-related; pre-existing in HEAD |
| `lib/system/shos.js` | None | NONE |

---

## Section 11 — Feature-Flag Assumption Closure

| Flag | SHOS Role | Runtime Impact |
|---|---|---|
| `safe_mode` | Read + write via `feature_flag_set` | Global safety gate — SHOS can enable/disable |
| `pagegen_enabled` | Read + write | Pagegen worker gate |
| `ai_enabled` | Read + write | AI subsystem gate |
| `bulk_generation_enabled` | Read + write | Bulk planner gate |
| `followup_enabled` | Read + write | Followup automation gate |
| `crm_auto_routing` | Read + write | CRM routing gate |
| `queue_paused` | Read + write | Queue dispatch gate |

> **No feature flag is required to be in a specific state for SHOS deployment.**  
> SHOS reads current flag values and presents them — it does not depend on any particular flag being set.

---

## Section 12 — Dependency Ambiguities (Must Resolve Before Manifest Freeze)

| ID | File | Issue | Required Action |
|---|---|---|---|
| DEP-AMB-01 | `lib/queue/deliveryTruth.js` | 49-line diff. SHOS uses `recordExternalDelivery`, `syncExternalDelivery`, `syncPendingExternalDeliveries`. Need to determine if local changes fix a SHOS-critical path or are unrelated. | Audit local diff; classify IN or OUT of ATOM-C |
| DEP-AMB-02 | `lib/system/systemHealth.js` | 38-line addition. SHOS uses `getSystemHealthSnapshot`. Need to determine if local additions change the snapshot shape SHOS depends on. | Audit local diff; classify IN or OUT of ATOM-C |

---

*Artifact created: RC-2B Cycle 7 dependency closure — read-only, no deployment.*
