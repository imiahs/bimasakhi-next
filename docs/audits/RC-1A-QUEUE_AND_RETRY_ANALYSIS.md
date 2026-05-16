# RC-1A — QUEUE AND RETRY ANALYSIS
**Phase:** P2-RC Release Convergence + Runtime Governance  
**Date:** 2026-05-13  
**Method:** Code trace of `lib/queue/publisher.js`, `app/api/jobs/pagegen/route.js`, QStash configuration, and cross-reference with QSTASH_OPERATIONAL_AUDIT.md forensic evidence  
**Rules Applied:** INSPECT ONLY. No queue changes. Evidence-backed only.

---

## DEFINITIVE ANSWER

> **The queue and retry stack is structurally sound. QStash delivery is operational (confirmed 2026-05-13 03:31 UTC). The retry mechanism works correctly: pagegen worker throws on AI null, returns HTTP 500, QStash retries delivery up to 3 times. After 3 failed deliveries, QStash sends to its DLQ. The pagegen worker ALSO has its own max_retries=3 counter in `generation_queue`, creating a compounded retry loop. Under current Gemini quota exhaustion, each page request triggers up to 12 Gemini API calls (3 QStash retries × 4 Gemini attempts per delivery). No recursive retry storm detected. Dead-letter table is clean (2 rows, both cleared May 5). No stuck jobs confirmed.**

---

## QUEUE ARCHITECTURE

```
ADMIN / CRON
  │
  ├── [Direct] Admin triggers single/bulk page generation:
  │     POST /api/admin/ccc/generate-single
  │     PATCH /api/admin/ccc/bulk/[id] (action=start)
  │           │
  │           └── INSERT generation_queue { status: 'pending', task_type: 'pagegen' }
  │                 │
  │                 └── enqueuePageGeneration({ queueId }) → lib/queue/publisher.js
  │                       │
  │                       └── publishQueueMessage('/api/jobs/pagegen', { queueId })
  │                             │
  │                             └── qstashClient.publishJSON({ url, body, retries: 3 })
  │                                   │
  │                                   └── QStash delivers → POST /api/jobs/pagegen
  │
  └── [Cron] Pagegen triggered by 5-minute Upstash schedule (registered in Upstash)
              → POST /api/jobs/pagegen with queueId
```

---

## RETRY MECHANISM — LAYER BY LAYER

### Layer 1: Gemini Internal Retry (inside `lib/ai/generateContent.js`)

| Model | Attempts | Delay | On 429 |
|-------|----------|-------|--------|
| `gemini-2.0-flash` (primary) | 2 | 1500ms base, 3000ms on 429 | Tries twice, then moves to fallback |
| `gemini-2.5-flash-lite` (fallback) | 2 | 1500ms base, 3000ms on 429 | Tries twice, then returns null |

**Total API attempts per worker invocation: 4 Gemini calls** (2 per model × 2 models)  
**Behavior on 404:** Breaks from model immediately, tries next model  
**Behavior on 429:** Waits 3000ms, retries once more, then breaks to next model  
**On all exhausted:** `safeLog('AI_FAILURE', ...)` + return `null`

### Layer 2: Pagegen Worker Error Handling

```javascript
// In executePagegenJob():
if (!responseText) {
    throw new Error(`AI returned no content for ${slug}`)
    // → markQueueFailed(supabase, queueJob, reason)
    // → finalizeJobRun(supabase, jobRunId, 'failed', reason)
    // → return { status: 500, body: { error: 'Internal Server Error' } }
}
```

**HTTP 500 returned to QStash on AI failure**

**`markQueueFailed()` logic:**
```javascript
const retryCount = (queueJob.retry_count || 0) + 1;
const shouldDeadLetter = retryCount >= (queueJob.max_retries || 3);
const nextStatus = shouldDeadLetter ? 'failed' : 'pending';
// UPDATE generation_queue SET status=nextStatus, retry_count=retryCount
```

**After 3 worker invocations with failures:** `generation_queue.status = 'failed'` (dead-lettered in queue table)

### Layer 3: QStash Delivery Retry

```javascript
// In publishQueueMessage():
qstashClient.publishJSON({ url: targetUrl, body, retries: 3 })
```

**QStash retries=3:** On HTTP 5xx response, QStash retries up to 3 times with exponential backoff  
**After 3 QStash retries:** QStash sends to QStash DLQ (Upstash console)

---

## COMPOUNDED RETRY MATH (Current Failure Mode)

Under current Gemini quota exhaustion:

```
Per page request:
  QStash delivery attempt 1:
    Worker invocation 1:
      Gemini 2.0-flash attempt 1 → 429
      Gemini 2.0-flash attempt 2 → 429
      Gemini 2.5-flash-lite attempt 1 → 429
      Gemini 2.5-flash-lite attempt 2 → 429
      → Worker returns HTTP 500
  QStash delivery attempt 2:
    Worker invocation 2: (same 4 attempts)
      → Worker returns HTTP 500
  QStash delivery attempt 3:
    Worker invocation 3: (same 4 attempts)
      → Worker returns HTTP 500
  → QStash sends to QStash DLQ

Total Gemini API calls per page request: 12
```

**Each Gemini call on 429 costs ~3 seconds delay (wait logic in generateContent.js)**  
**Total runtime per page request failure: ~36-48 seconds**  
**This is not a retry storm** — it is bounded and terminates after QStash's 3 retries

---

## QUEUE TABLE STATE (Evidence from Forensics)

| Table | Metric | Value | Source |
|-------|--------|-------|--------|
| `generation_queue` | Total rows | 49 | GEMINI_DEPENDENCY_ANALYSIS.md |
| `generation_queue` | Status: completed | 32 | GEMINI_DEPENDENCY_ANALYSIS.md |
| `generation_queue` | Status: cancelled | 17 | GEMINI_DEPENDENCY_ANALYSIS.md |
| `generation_queue` | All from | April 2026 batches | GEMINI_DEPENDENCY_ANALYSIS.md |
| `generation_queue` | New since May 4 | 0 (no new dispatches from bulk) | Forensic evidence |
| `job_runs` | May 2026 | 0 rows | GEMINI_DEPENDENCY_ANALYSIS.md |
| `job_runs` | April 2026 | 45 rows (completed) | GEMINI_DEPENDENCY_ANALYSIS.md |
| `job_dead_letters` | Total | 2 rows | QSTASH_OPERATIONAL_AUDIT.md |
| `job_dead_letters` | State | Both cleared (May 5) | QSTASH_OPERATIONAL_AUDIT.md |
| `job_dead_letters` | New since May 5 | INCONCLUSIVE (no live query executed) | — |

**Note:** The `generation_queue` having 0 new entries since May 4 suggests the pagegen cron is either:  
(a) Not re-dispatching because no pending rows exist (most likely — queue completed/cancelled in April), OR  
(b) Not running (INCONCLUSIVE — cron schedule registration in Upstash unverified for pagegen specifically)

---

## DEAD-LETTER BEHAVIOR

### `job_dead_letters` table (internal DLQ)

Populated by `finalizeJobRun()` when `status='failed'`:
```javascript
await supabase.from('job_dead_letters').insert({
    job_run_id: jobRunId,
    job_class: 'pagegen',
    payload: { ... },
    failure_reason: failureReason,
    error: failureReason,
    failed_at: finishedAt
});
```

**Also populated by:** `generation_queue.status='failed'` path in `markQueueFailed()` — indirectly writes DLQ row when job runs = 0 or jobRunId is null.

### QStash Native DLQ

QStash has its own dead-letter queue in the Upstash console. After 3 failed deliveries (HTTP 5xx), QStash stops retrying and logs to Upstash DLQ.  
**Access:** Upstash console → Dead Letter Queue tab  
**Current state:** Cannot be verified from code analysis (requires Upstash console access)

---

## STUCK JOB ANALYSIS

**Evidence from GEMINI_DEPENDENCY_ANALYSIS.md and QSTASH_OPERATIONAL_AUDIT.md:**
- No stuck events confirmed in `event_store` (all lead/contact events are completing)
- `generation_queue`: all rows in completed/cancelled state — no processing/pending stuck rows  
- `job_dead_letters`: 2 rows, both cleared May 5 by SHOS operator action

**Classification: NO STUCK JOBS confirmed as of forensic evidence date**

---

## SILENT RETRY / WASTED CYCLES

**Finding:** When `generation_queue` has no pending rows, the pagegen cron trigger arrives but immediately returns 200 (no work to do). This is correct behavior.

**Wasted cycles identified:**
1. **Gemini quota retries:** Each failed page request burns 12 Gemini API calls instead of failing fast on first 429. The retry delay logic (3000ms on 429) is counter-productive — quota is daily, not per-request. Retrying in the same invocation wastes time but doesn't burn extra quota beyond the attempt.
2. **QStash retries on known-dead Gemini:** QStash has no knowledge of Gemini quota state. It retries because the worker returns 500. Each QStash retry invocation is a new serverless function cold start.

**Neither constitutes an unbounded retry storm.** Both terminate within defined limits.

---

## QUEUE DISPATCH GUARDS (What DOES block dispatch)

| Guard | Mechanism | Status |
|-------|-----------|--------|
| `queue_paused = true` | pagegen worker returns 503, logs GUARD_BLOCKED | Currently: `queue_paused = false` (active) |
| `pagegen_enabled = false` OR `safe_mode = true` | pagegen worker returns 503, logs GUARD_BLOCKED | INCONCLUSIVE — DB value unconfirmed for May 13 |
| `bulk_generation_enabled = false` | bulk start route blocks dispatch | CONFIRMED: `false` in production |
| Missing `QSTASH_TOKEN` | publisher throws hard error | Token present (confirmed by delivery) |

---

## OUTBOX / DISPATCH PATTERN

`dispatchPagegenOutbox()` from `lib/events/dispatchPagegenOutbox.js` is called AFTER a page is processed to dispatch the NEXT page in the queue. This is the event-store-based chaining mechanism (one page per QStash message, then re-dispatch for next).

```
pagegen worker processes page N
  → rule16_finalize_generation_queue (DB stored procedure)
      → if more pages remain: inserts event_store row
  → dispatchPagegenOutbox(event_store_id, { queueId }) 
      → enqueuePageGeneration({ queueId })
          → QStash publishes next page job
```

**This chaining is correct.** Under current Gemini failure, the chain breaks at page 0 and never advances. No infinite loop risk — each dispatch requires successful processing to chain.

---

## RETRY CLASSIFICATION BY SUBSYSTEM

| Subsystem | Retry Type | Bounded? | Evidence |
|-----------|-----------|---------|----------|
| Gemini API calls (generateContent.js) | Internal: 2 per model × 2 models | ✅ Bounded (4 max) | Code: `for (const modelName of modelsToTry)` + `for attempt in MAX_RETRIES` |
| Pagegen worker queue failure | Queue retry: 3 max | ✅ Bounded | Code: `markQueueFailed()` → max_retries=3 |
| QStash delivery retry | Delivery retry: 3 | ✅ Bounded | Publisher config: `retries: 3` |
| Event-store retry daemon | `/api/jobs/event-retry` cron | ✅ Bounded | Separate cron, not cascading |
| Dead-letter requeue (SHOS) | Manual operator action | ✅ Manual | SHOS operator control |

**No unbounded retry loops found.**

---

## QUEUE HEALTH ASSESSMENT

| Component | Status | Classification |
|-----------|--------|---------------|
| QStash delivery | ✅ Operational | PRODUCTION ACTIVE |
| `generation_queue` state | 49 rows, all completed/cancelled | IDLE (no new work since May 4) |
| `job_dead_letters` | 2 rows, cleared May 5 | CLEAN |
| `job_runs` activity | 0 in May | SILENT FAILURE (AI dead, not queue dead) |
| Retry storm risk | None detected | SAFE |
| Queue backpressure | None (idle) | N/A |
