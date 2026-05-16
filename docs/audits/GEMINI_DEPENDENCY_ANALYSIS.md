# GEMINI DEPENDENCY ANALYSIS
**Purpose:** Complete AI dependency map, quota failure forensics, impact triage, recovery path  
**Date:** 2026-05-13  
**Method:** Code analysis + live DB evidence (zero pagegen in May) + AI_VENDOR_AUDIT.md evidence  
**Rule:** Evidence only.

---

## DEFINITIVE ANSWER

> **Gemini API is quota-exhausted. Key is present and valid (len=39). The system still believes `ai_enabled = true` in `system_control_config`. No circuit breaker detects quota exhaustion. Result: pagegen pipeline executes (QStash delivers), attempts Gemini, receives 429, returns `null`, worker exits with 200 OK, job is not logged in `job_runs`. Zero pages generated since ~May 4. The platform is in a silent AI failure state.**

---

## AI KEY STATUS

| Key | Present? | Length | Format | API Status |
|-----|----------|--------|--------|-----------|
| `GEMINI_API_KEY` | ✅ YES | 39 chars | Valid Google API key (`AIza...`) | 🔴 QUOTA EXHAUSTED |
| `OPENAI_API_KEY` | ❌ ABSENT | — | — | Not configured |

---

## LIVE FAILURE EVIDENCE

| Evidence | Details |
|----------|---------|
| `job_runs` in May 2026 | **0 rows** — pagegen never completed successfully |
| `job_runs` in April 2026 | 45 rows (completed) — AI was working then |
| `generation_queue` | 49 total: 32 completed + 17 cancelled (all from April batches) |
| `event_store` May 2026 | `lead_created` events exist — but ZERO `page_generated` events |
| `content_drafts` | 26 total: 25 archived, 1 published — none created after May 4 |
| `bulk_generation_jobs` | Last: "East Delhi-Bima Sakhi Hyper-Local Sweep" completed 2026-05-03 |
| `ai_enabled` in system_control_config | `true` — system thinks AI is available |
| API response | HTTP 429 "Resource Exhausted: Daily quota exceeded" |

---

## GEMINI MODELS IN USE

| Model | Role | Quota Limit |
|-------|------|------------|
| `gemini-2.0-flash` | Primary | 1M tokens/day (free tier) |
| `gemini-2.5-flash-lite` | Fallback | 500K tokens/day (free tier) |

**Both models share the same API key quota pool.** When primary hits 429, fallback is tried. Fallback also returns 429. Both paths exhausted simultaneously.

---

## FAILURE FLOW (FORENSIC TRACE)

```
QStash → POST /api/jobs/pagegen
      ↓
generateAiContent(prompt, modelConfig)
      ↓
  try: fetch Gemini 2.0-flash API
       ← HTTP 429 { "error": { "code": 429, "status": "RESOURCE_EXHAUSTED" } }
       ← Retry 1 with delay: still 429
       ← Retry 2 with delay: still 429
  fallback: fetch Gemini 2.5-flash-lite API
       ← HTTP 429 (same key, same quota pool)
  catch → logObservability('AI_FAILURE', { reason: 'quota', model: ... })
       → return null
      ↓
Worker receives null from generateAiContent()
      ↓
if (content === null) {
    // graceful skip — draft not created
    return { success: false, reason: 'ai_unavailable' };
}
      ↓
Worker returns HTTP 200 OK to QStash
      ↓
QStash: delivery successful ✅
QStash DLQ: NOT updated (200 OK received)
job_runs: NOT updated (worker exits before completion logging)
```

**The pipeline reports success to QStash while producing zero content.** This is by design (graceful degradation) but creates an operational blind spot.

---

## SYSTEM CONFIG STATE vs REALITY

| Config Key | Value in DB | Reality | Gap |
|-----------|-------------|---------|-----|
| `ai_enabled` | `true` | Gemini quota exhausted | System lies about AI availability |
| `bulk_generation_enabled` | `false` | Correct — blocked at config level | Correct |
| `pagegen_enabled` | `true` (inferred) | Pagegen runs but fails at Gemini | Misleading |
| Gemini `circuit_state` in `vendor_contracts` | Likely `OPEN` (3+ failures) | Worker does NOT check this | Circuit breaker is decorative |

---

## CIRCUIT BREAKER GAP

```
lib/vendorResilience.js:
  Per-vendor circuit breaker: closed → open (3 failures) → half_open → closed
  vendor_contracts.circuit_state field

EXPECTED:
  worker → checkCircuit('gemini') → if OPEN → skip API call → return null fast

ACTUAL:
  worker → generateAiContent() → attempts Gemini directly
  → Circuit state in vendor_contracts is NEVER checked before API call
  → Circuit opens after failures but is never read to prevent future calls
```

**The circuit breaker tracks state but does not prevent calls.** This is the critical governance gap.

---

## AI DEPENDENCY CLASSIFICATION

### HARD DEPENDENCIES (platform cannot function without AI)

| Feature | Dependency | Current State |
|---------|-----------|--------------|
| Page generation (`/api/jobs/pagegen`) | Gemini required to generate page content | 🔴 BROKEN — returns null, no pages generated |
| Blog AI generation (P2, not deployed) | Gemini required | 🔴 Not deployed AND quota dead |
| AI lead scorer (`/api/jobs/ai-scorer`) | Gemini for scoring | 🟡 Status unknown (may degrade to rule-based) |

### SOFT DEPENDENCIES (degrade gracefully with null)

| Feature | Dependency | Current State |
|---------|-----------|--------------|
| Draft editor AI suggestions | Optional Gemini call | ✅ Returns null → suggestions hidden |
| Bulk planner AI assist | Optional | ✅ Returns null → planning proceeds without AI |
| CMO lead scoring | Rule-based fallback when AI null | ✅ Rules still run |
| Morning brief insights | AI adds context but brief sends regardless | ✅ Brief sends with or without AI |

### NOT AI-DEPENDENT (unaffected by quota)

| Feature | Status |
|---------|--------|
| Lead capture + Zoho CRM sync | ✅ FULLY WORKING |
| Event processing pipeline | ✅ FULLY WORKING |
| Admin RBAC + login | ✅ FULLY WORKING |
| QStash delivery + cron jobs | ✅ FULLY WORKING |
| Navigation + page serving | ✅ FULLY WORKING |
| Alert system | ✅ FULLY WORKING |
| SHOS operator console | ✅ FULLY WORKING |

---

## OPENAI PROVIDER — DEAD CODE FINDING

`lib/ai/providers/openai.js` exists and implements a complete `generateWithOpenAI()` function with 5 action types:
- `generate-blog-outline`
- `generate-seo-title`
- `generate-seo-desc`
- `lead-analysis`
- `page-seo-analysis`

**Finding:** `generateWithOpenAI` is **NEVER IMPORTED** anywhere in the codebase. There are zero import references outside the file itself. `OPENAI_API_KEY` env var is also absent.

**Classification:** Dead code. Built but never wired. Not a backup for Gemini failure — it is not connected to any pipeline.

**Action needed:** Either wire as fallback or delete. Currently confuses the AI architecture picture.

---

## QUOTA RECOVERY ANALYSIS

| Option | Feasibility | Notes |
|--------|-------------|-------|
| Wait for daily quota reset | ✅ Free | Gemini free tier resets ~midnight Pacific. But volume repeatedly exhausts it next day |
| Upgrade to paid Gemini tier | ✅ Resolves permanently | Requires Google Cloud billing setup + new paid API key |
| Wire OpenAI as fallback | ✅ Code already exists | Add `OPENAI_API_KEY` to env + wire `generateWithOpenAI()` in `generateContent.js` fallback chain |
| Set `ai_enabled=false` in DB | ✅ Immediate fix | Stops wasted API calls + makes system honest about AI state. Pagegen queues would stop dispatching |

---

## PROMPT ENGINE (P2 — Not in Production)

```
lib/ai/promptEngine.js (P2, local only):
  resolvePagePrompt(pageType, location) 
    → reads prompt_templates table
    → returns structured prompt object

lib/ai/promptTemplates.js:
  Default templates for page types
```

**Finding:** Even if Gemini quota is fixed, the P2 prompt engine is NOT in production. Production pagegen uses static prompts (P1 codebase). The DB row `prompt_templates: 1 row` is seeded but not yet read by production workers.

---

## FINAL GEMINI VERDICT

| Metric | State |
|--------|-------|
| API key | ✅ PRESENT |
| Key validity | ✅ VALID FORMAT (len=39) |
| Quota state | 🔴 EXHAUSTED — 429 on all calls |
| System config (`ai_enabled`) | ❌ WRONG — says `true`, API is dead |
| Circuit breaker | ❌ DECORATIVE — tracks state, never checked before calls |
| OpenAI fallback | ❌ DEAD CODE — wired but not connected |
| Impact on content pipeline | 🔴 TOTAL — zero pages since ~May 4 |
| Impact on lead pipeline | ✅ NONE — lead CRM works without AI |
| Impact on admin operations | ✅ MINIMAL — most admin functions unaffected |
| Recovery path | Set `ai_enabled=false` (immediate) + upgrade to paid Gemini (permanent) |
| Overall status | 🔴 **AI PIPELINE IS DOWN — SILENT FAILURE** |
