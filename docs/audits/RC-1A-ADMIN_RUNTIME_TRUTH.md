# RC-1A — ADMIN RUNTIME TRUTH
**Phase:** P2-RC Release Convergence + Runtime Governance  
**Date:** 2026-05-13  
**Method:** Code trace of all admin health/status display logic, feature flag APIs, and UI health derivation paths  
**Rules Applied:** INSPECT ONLY. Evidence-backed only. Gap = stated as gap.

---

## DEFINITIVE ANSWER

> **The admin panel reports `AI: Operational` (or `AI: Paused` depending on `ai_enabled` flag) purely based on DB flag state. No live API health probe exists. With `ai_enabled=true` in `system_control_config` and Gemini quota exhausted since May 4, operators see `AI: Operational` while zero content has been generated for 9+ days. The health truth source and the runtime truth source are completely decoupled. This is the root cause of admin-operator blindness.**

---

## ADMIN HEALTH TRUTH PIPELINE

### Source 1: `/api/admin/system-health` route

**File:** `app/api/admin/system-health/route.js`  
**Consumer:** Admin system health panel

**AI status derivation (exact code):**
```javascript
const aiEnabled = Boolean(snapshot.feature_flags?.find((flag) => flag.key === 'ai_enabled')?.value);
const queuePaused = Boolean(snapshot.feature_flags?.find((flag) => flag.key === 'queue_paused')?.value);

const aiStatus = !aiEnabled
    ? 'Paused'
    : queuePaused ? 'Paused'
    : (failedQueueJobs > 0 || currentDeadLetters > 0) ? 'Degraded' : 'Operational';
```

**Truth source:** `ai_enabled` DB flag + `queue_paused` DB flag + `generation_queue.status=failed` count + `job_dead_letters` count  
**NO live Gemini API call made**

**Current output given production state:**
- `ai_enabled = true` → not "Paused"
- `queue_paused = false` → not "Paused"  
- `failedQueueJobs = 0` (all completed/cancelled from April) → not "Degraded"
- `currentDeadLetters = 0` (cleared May 5) → not "Degraded"
- **Result: `aiStatus = 'Operational'`** ← FALSE

---

### Source 2: SHOS Snapshot

**File:** `lib/system/shos.js`  
**Consumer:** `/api/admin/system/shos` operator control panel

SHOS builds a health snapshot from `lib/system/systemHealth.js` via `getSystemHealthSnapshot()`. The snapshot includes:
- `feature_flags` → array of flag objects including `ai_enabled`
- `metrics` → queue counts, DLQ counts, error counts
- `health.overall_health` → computed from failures, crons, stuck events, etc.

**AI health in SHOS:** Derived from same flag logic. No live probe.

---

### Source 3: `lib/system/systemHealth.js` Health Computation

**Overall health calculation:**
```javascript
// Conditions that cause DEGRADED state (excerpt):
const hasCurrentOperationalIncident =
    recentOpenAlerts.length > 0 ||
    recentErrors > 20 ||
    recentDlqCount > 0 ||
    queueFailedCount > 0 ||
    stuckEvents.length > 0 ||
    deliveryMetrics.delivery_failures_recent > 0 ||
    deliveryMetrics.delivery_stuck_count > 0 ||
    deadRequiredCrons.length > 0;
```

**What DOES trigger degraded health:**
- Open alerts → YES (if any critical alert is unresolved)
- Recent DLQ rows → YES
- Queue failed rows → YES  
- Stuck events → YES

**What does NOT trigger degraded health:**
- Gemini API returning 429 → NOT MONITORED
- AI content generation failing → NOT MONITORED
- `job_runs` having 0 entries → NOT MONITORED
- Content generation count drop → NOT MONITORED

**Current overall_health:** HEALTHY (per QSTASH_OPERATIONAL_AUDIT.md evidence)

---

## MISMATCH ANATOMY

```
OPERATOR SEES:                        RUNTIME REALITY:
┌─────────────────────────────┐       ┌──────────────────────────────────┐
│ AI Status: Operational       │  ≠   │ Gemini API: HTTP 429 (quota dead)│
│ System Health: HEALTHY       │  ≠   │ Content generated in May: ZERO   │
│ Queue Jobs Failed: 0         │  ≈   │ generation_queue: 0 pending rows │
│ Dead Letters: 0              │  ≈   │ job_dead_letters: 0 (cleared)    │
│ ai_enabled: true             │  ≠   │ AI operational: FALSE            │
└─────────────────────────────┘       └──────────────────────────────────┘
```

**Why system shows HEALTHY despite dead AI:**
1. `generation_queue` has NO pending rows → no active failures visible
2. `job_dead_letters` was cleared → no visible DLQ entries
3. `job_runs` having 0 May rows is NOT monitored as an anomaly
4. Gemini quota exhaustion does NOT create an alert, log entry, or circuit state change visible to health monitoring
5. `ai_enabled=true` persists in DB since no automated process updated it

---

## ADMIN UI TRUTH SOURCES — COMPLETE INVENTORY

| Admin UI Element | Truth Source | Live Probe? | Current Accuracy |
|-----------------|-------------|------------|-----------------|
| `aiStatus` (system-health panel) | `ai_enabled` DB flag + DLQ count + failed queue count | ❌ NO | ❌ WRONG — shows Operational |
| `overall_health` (SHOS) | Alerts + errors + DLQ + stuck events | ❌ NO AI probe | ✅ HEALTHY is technically correct (no active incidents) |
| `queue_paused` display | DB flag | ❌ NO | ✅ Accurate |
| `bulk_generation_enabled` display | DB flag | ❌ NO | ✅ Accurate (false) |
| `ai_enabled` toggle in feature flags | DB flag | ❌ NO | ❌ MISLEADING — toggle appears active but AI is dead |
| Content inventory (`/admin/ccc`) | `content_drafts` table | DB query | ✅ Accurate (shows 26 drafts) |
| Generation queue backlog | `generation_queue.status=pending` | DB query | ✅ Accurate (0 pending) |
| Dead letters count | `job_dead_letters` | DB query | ✅ Accurate (0 or 2) |
| Recent errors | `system_runtime_errors` | DB query | ✅ Accurate |

---

## ADMIN AI ROUTES — WHAT THEY RETURN ON GEMINI FAILURE

Operators using admin AI tools (routes EP-2 through EP-7) receive HTTP 500 errors when Gemini fails:

```
POST /api/admin/ai → 500 { "error": "Gemini generation failed" }
POST /api/admin/seo/analyze → 500 { "error": ... }
POST /api/admin/blog → 500 { "error": ... }
```

**Operator experience:** These routes fail visibly at the UI level — the HTTP error is surfaced. Unlike pagegen (which queues and silently fails), admin AI routes DO give immediate failure feedback.

**However:** No admin dashboard element reflects these failures. They are transient HTTP errors with no persistent audit trail (no flag update, no alert, no log aggregation).

---

## FEATURE FLAG UI vs RUNTIME STATE

| Flag | Admin Toggle Shows | DB Value | Runtime Reality |
|------|-------------------|----------|----------------|
| `ai_enabled` | ON (active) | `true` | AI: DEAD (quota) |
| `queue_paused` | OFF (unpaused) | `false` | Queue: ACTIVE (delivers, fails silently) |
| `pagegen_enabled` | ON (active) | `true` (inferred) | Pagegen: DISPATCHES, fails at Gemini |
| `bulk_generation_enabled` | OFF (disabled) | `false` | Bulk: CORRECTLY BLOCKED |
| `safe_mode` | OFF | `false` (inferred) | No halt active |

---

## IDENTIFIED MISMATCH ROOT CAUSES

| Cause ID | Root Cause | Evidence |
|----------|-----------|---------|
| MISMATCH-01 | `ai_enabled` never auto-updated on Gemini failure | No code path exists to set `ai_enabled=false` on 429 |
| MISMATCH-02 | Health check has no live Gemini probe | `system-health/route.js` code — pure flag + count logic |
| MISMATCH-03 | `generateContent.js` logs to `observability_logs` but health check doesn't read it | `safeLog('AI_FAILURE', ...)` goes to `observability_logs`, not to `system_alerts` |
| MISMATCH-04 | Alert scan (`/api/jobs/alert-scan`) does not include AI failure pattern | Alert scan checks leads/queue/DLQ, not AI content generation success rate |
| MISMATCH-05 | `job_runs` zero-count is not monitored | No cron or health check queries "if 0 job_runs in 24h → alert" |
| MISMATCH-06 | `AI_FAILURE` log level is not escalated | `observability_logs` level='AI_FAILURE' — not mapped to `system_alerts` or alert delivery |
