# RC-1B Minimal Governance Alignment
**Phase:** RC-1B — Release Convergence + Runtime Governance  
**Date:** May 13, 2026  
**Classification:** SURGICAL — runtime truth alignment only, no architecture changes  
**Status:** COMPLETE

---

## STEP 1.5 — Authoritative AI Health Source Definition

### Authoritative AI Runtime Truth Source

| State | Determining Signal | Authority |
|-------|-------------------|-----------|
| `PAUSED` | `ai_enabled = false` (DB flag) | Definitive — no probe needed |
| `PAUSED` | `queue_paused = true` (DB flag) | Definitive |
| `DEGRADED` | live Gemini probe returns `QUOTA_EXHAUSTED` | Authoritative (provider truth) |
| `DEGRADED` | live Gemini probe returns `TIMEOUT` | Authoritative (provider truth) |
| `DEGRADED` | live Gemini probe returns `PROVIDER_ERROR` | Authoritative (provider truth) |
| `DEGRADED` | live Gemini probe returns `NO_API_KEY` | Authoritative (config truth) |
| `DEGRADED` | failed queue jobs > 0 OR dead letters > 0 | Supporting signal |
| `OPERATIONAL` | live Gemini probe returns `OK` AND queue clean | Deterministic |

### Signals Explicitly Rejected as Sole Truth Source

| Signal | Reason Rejected |
|--------|----------------|
| Admin UI label (`ai_status`) | Derived display — not source of truth |
| Stale `ai_enabled=true` flag alone | Flag can be outdated (demonstrated: ~9 days stale) |
| Empty DLQ | Does not prove Gemini is alive |
| Queue idle state | Does not prove Gemini is alive |
| `observability_logs.AI_FAILURE` | NOT written to DB (`logSystemEvent` not exported — RC-1A finding) |
| OpenAI provider | Dead code — never imported |

### Probe Specification (implemented in `system-health/route.js`)

```javascript
probeGeminiProvider(timeoutMs = 2000)
// Returns: 'OK' | 'QUOTA_EXHAUSTED' | 'TIMEOUT' | 'PROVIDER_ERROR' | 'NO_API_KEY' | 'SKIPPED'
// Probe only runs when ai_enabled=true AND queue_paused=false
// Single generateContent call with maxOutputTokens=1 (minimal quota impact)
// Bounded by Promise.race + setTimeout(timeoutMs)
// Fails CLOSED: any non-OK → aiStatus='Degraded'
// No retries, no background loops, no schema dependencies
```

---

## Root Cause

From RC-1A forensics:
1. **GOV-01**: `pagegen` worker never checked `ai_enabled` — Gemini called regardless of flag state
2. **MISMATCH-02**: Health endpoint derived `aiStatus` from `ai_enabled` flag alone — no live probe
3. **GOV-02**: All 5 direct admin AI routes bypassed `ai_enabled` check entirely
4. **Compound effect**: `ai_enabled=true` (stale) + empty DLQ → admin shows "Operational" while Gemini quota has been dead for 9 days

---

## Mutations Applied

### Mutation 1: pagegen worker ai_enabled gate
**File:** `app/api/jobs/pagegen/route.js`  
**Location:** After `getServiceSupabase()`, before queue fetch `try` block  
**Position in execution:** Fires after `queue_paused` + `pagegen_enabled` guards, before ANY Gemini call  

**BEFORE:**
```javascript
const supabase = getServiceSupabase();
let queueJob = null;
let jobRunId = null;
try {
    const queueRes = await supabase.from('generation_queue')
```

**AFTER:**
```javascript
const supabase = getServiceSupabase();

// RC-1B: Gate AI execution on ai_enabled flag — fires before any Gemini call
if (!config.ai_enabled) {
    await logSystemAction('GUARD_BLOCKED', { guard: 'ai_enabled', route: '/api/jobs/pagegen', queue_id: queueId });
    await supabase.from('generation_queue')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', queueId)
        .neq('status', 'completed');
    await markFailed(currentEventStoreId, 'AI generation disabled via ai_enabled flag.', {
        queue_id: queueId,
        retriable: false,
        guard: 'ai_enabled',
    });
    return {
        status: 200,
        body: { success: false, blocked: true, reason: 'AI_DISABLED' },
    };
}

let queueJob = null;
let jobRunId = null;
try {
    const queueRes = await supabase.from('generation_queue')
```

**Why HTTP 200:** QStash treats non-2xx as delivery failure and retries. Returning 200 prevents retry storm. AI_DISABLED is not a temporary condition — retrying is wasteful and wrong.  
**Queue integrity:** Row marked `failed` with `completed_at` timestamp. Not orphaned. Not silently discarded. Visible in admin queue view.

---

### Mutation 2: system-health probeGeminiProvider + aiStatus fix
**File:** `app/api/admin/system-health/route.js`  
**Added:** `probeGeminiProvider()` helper function (inline, removable)  
**Changed:** `aiStatus` computation to use live probe result  
**Added:** `gemini_probe` field in response for operator visibility  

**BEFORE `aiStatus`:**
```javascript
const aiStatus = !aiEnabled
    ? 'Paused'
    : queuePaused ? 'Paused'
    : (failedQueueJobs > 0 || currentDeadLetters > 0) ? 'Degraded' : 'Operational';
```

**AFTER `aiStatus`:**
```javascript
let geminiProbeStatus = 'SKIPPED';
if (aiEnabled && !queuePaused) {
    geminiProbeStatus = await probeGeminiProvider(2000);
}

const aiStatus = !aiEnabled
    ? 'Paused'
    : queuePaused ? 'Paused'
    : (geminiProbeStatus !== 'OK' && geminiProbeStatus !== 'SKIPPED') ? 'Degraded'
    : (failedQueueJobs > 0 || currentDeadLetters > 0) ? 'Degraded'
    : 'Operational';
```

**With current runtime state** (`ai_enabled=true`, quota dead): probe returns `QUOTA_EXHAUSTED` → `aiStatus='Degraded'` ✓  
**Probe constraint compliance:** 2s timeout, single call, no retries, no background loops, fail-closed, removable.

---

### Mutation 3: admin/ai route gate
**File:** `app/api/admin/ai/route.js`  
**Added:** `import { getSystemConfig } from '@/lib/systemConfig'`  
**Added:** `ai_enabled` check returning HTTP 503 `{ error: 'AI_DISABLED' }` before any Gemini call

---

### Mutation 4: admin/seo/analyze route gate
**File:** `app/api/admin/seo/analyze/route.js`  
**Added:** `import { getSystemConfig } from '@/lib/systemConfig'`  
**Added:** `ai_enabled` check returning HTTP 503 `{ error: 'AI_DISABLED' }` before any Gemini call

---

### Mutation 5: admin/blog route gate (generate action only)
**File:** `app/api/admin/blog/route.js`  
**Added:** `import { getSystemConfig } from '@/lib/systemConfig'`  
**Added:** `ai_enabled` check at start of `generate` action block, returning HTTP 503 `{ error: 'AI_DISABLED' }` before Gemini call  
**GET handler for blog listing:** UNAFFECTED — no AI calls in GET path

---

### Mutation 6: admin/ai/recruiter route gate
**File:** `app/api/admin/ai/recruiter/route.js`  
**Added:** `import { getSystemConfig } from '@/lib/systemConfig'`  
**Added:** `ai_enabled` check returning HTTP 503 `{ error: 'AI_DISABLED' }` after Supabase check, before lead fetch loop

---

## Files Touched

| File | Change Type | Lines Changed |
|------|------------|---------------|
| `app/api/jobs/pagegen/route.js` | Gate added | +14 lines |
| `app/api/admin/system-health/route.js` | Probe function + aiStatus logic | +30 lines |
| `app/api/admin/ai/route.js` | Import + gate | +5 lines |
| `app/api/admin/seo/analyze/route.js` | Import + gate | +5 lines |
| `app/api/admin/blog/route.js` | Import + gate | +6 lines |
| `app/api/admin/ai/recruiter/route.js` | Import + gate | +6 lines |

**Total files modified:** 6  
**Total lines added:** ~66  
**Files intentionally NOT touched:** all lead/CRM/SHOS/routing/queue-publisher files

---

## AI Entry Points — Governance Coverage AFTER RC-1B

| Entry Point | ai_enabled Gate | Gate Type | Notes |
|-------------|----------------|-----------|-------|
| `pagegen` worker (QStash) | ✅ | HTTP 200 + queue.failed | No QStash retry |
| `admin/ai` route | ✅ | HTTP 503 AI_DISABLED | Admin-only |
| `admin/seo/analyze` route | ✅ | HTTP 503 AI_DISABLED | Admin-only |
| `admin/blog` (generate action) | ✅ | HTTP 503 AI_DISABLED | Admin-only, GET unaffected |
| `admin/ai/recruiter` route | ✅ | HTTP 503 AI_DISABLED | Admin-only |
| `jobs/ai-scorer` (CRM) | ✅ (pre-existing) | HTTP 503 | Was already gated |

**Governance coverage AFTER: 6 of 6 direct AI execution paths (100%)**

---

## Execution Paths Intentionally Left Unchanged

| Path | Reason Not Changed |
|------|--------------------|
| `lib/ai/generateContent.js` | Core generator — no governance logic belongs here per RC-1B scope |
| `app/api/admin/ccc/generate-single/route.js` | Enqueues to queue only; pagegen worker gate is terminal enforcement |
| `app/api/admin/ccc/bulk/[id]/route.js` | Same as above; already gated on `bulk_generation_enabled=false` |
| `lib/system/circuitBreaker.js` | Decorative for AI — wiring deferred to P3 |
| `lib/vendorResilience.js` | Decorative for AI — wiring deferred to P3 |
| `lib/system/aiCostGuard.js` | Dead for AI paths — wiring deferred to P3 |
| `safeLog` → `AI_FAILURE` chain | `logSystemEvent` not exported — fix deferred to P3 |

---

## Queue Integrity Proof

When `ai_enabled=false` and pagegen is triggered:
1. QStash delivers message to pagegen worker ✓
2. `queue_paused` check: passes (queue not paused) ✓
3. `pagegen_enabled` check: passes ✓
4. `ai_enabled` check: **BLOCKED** ✓
5. `generation_queue` row: updated to `status='failed', completed_at=<timestamp>` ✓ (not orphaned)
6. `event_store` record: marked failed with `retriable: false` ✓
7. `observability_logs`: `GUARD_BLOCKED` entry written ✓
8. HTTP response: `200 { blocked: true, reason: 'AI_DISABLED' }` ✓
9. QStash: receives 200 → does NOT retry ✓
10. Gemini API calls: **ZERO** ✓

Queue row semantics preserved. No hidden discard. No infinite retry.

---

## Intentionally Deferred Governance Gaps

| Gap | ID | Deferred To |
|-----|-----|-------------|
| Wire circuit breaker to generateContent | GOV-03 | P3 |
| Wire cost guard to AI paths | GOV-04 | P3 |
| Fix safeLog → AI_FAILURE DB write chain | MISMATCH-03 | P3 |
| Register scheduled-publish cron in Upstash | MISMATCH-04 | RC-2 |
| Add generate-single/bulk pre-dispatch AI gate | Optional | P3 |
| OpenAI implementation or removal | DEAD-01 | P3 |
| Auto-update ai_enabled on Gemini failure | GOV-06 | P3 |

---

## Rollback Procedure

**Target:** Revert all 6 RC-1B mutations. Rollback time: < 60 seconds with git.

### Option A — Git Revert (preferred)
```bash
# Identify RC-1B commit hash after it is committed
git revert <RC-1B-commit-hash>
```

### Option B — Manual flag rollback (if code cannot be reverted)
Set `ai_enabled=true` in `system_control_config` — this bypasses the new gates  
(gates only fire when `ai_enabled=false`)

### Option C — Manual per-file revert
For each of the 6 files, remove the `// RC-1B:` comment block and associated import line.  
Each mutation is labeled `// RC-1B:` for instant identification.

### Zero Data Loss Guarantee
- No schema changes made
- No existing table rows modified beyond `generation_queue` status updates (which are operational state, not permanent records)
- All existing queue rows remain readable
- All historical job records untouched
- Published content rendering: UNAFFECTED (no routing, CMS, or rendering logic touched)

---

## Remaining Risks After RC-1B

| Risk | Severity | Notes |
|------|---------|-------|
| `ai_enabled=true` in DB (still stale) | HIGH | Operator must set `ai_enabled=false` to activate gates. Code gates only fire when flag=false. |
| `probeGeminiProvider` adds ~0-2s latency to admin health check | LOW | Probe is instant when quota dead (immediate 429). Only matters when quota alive. |
| generate-single/bulk still enqueue when AI disabled | LOW | Pagegen gate handles terminal enforcement; queue gets `failed` rows but no Gemini waste |
| safeLog AI_FAILURE not writing to DB | MEDIUM | Cannot detect AI failures via DB; probe is only detection mechanism |
| Scheduled-publish cron never registered | HIGH | Not in RC-1B scope |

---

*All mutations are reversible. No destructive operations. No schema changes. No deployment included in RC-1B.*
