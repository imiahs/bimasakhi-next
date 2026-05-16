# RC-1A — AI RUNTIME EXECUTION TRACE
**Phase:** P2-RC Release Convergence + Runtime Governance  
**Date:** 2026-05-13  
**Method:** Direct code tracing of every file in the AI call chain + cross-reference with existing forensic evidence  
**Rules Applied:** INSPECT ONLY. No assumptions. Every finding is evidence-backed. Inconclusive = stated explicitly.

---

## DEFINITIVE ANSWER

> **Nine distinct AI execution entry points exist in code. ALL nine resolve to a single provider: Google Gemini via `lib/ai/generateContent.js`. OpenAI provider code exists but is NEVER imported anywhere in the codebase. The pagegen worker — the primary content generation path — does NOT gate on `ai_enabled`. It gates on `queue_paused` + `pagegen_enabled` only. The circuit breaker and cost guard subsystems exist but are NOT wired into any AI call chain. Governance is enforced only at the worker delivery gate, not at the AI execution level. Current runtime state: ALL Gemini calls fail with HTTP 429 (quota exhausted since ~May 4, 2026).**

---

## ENTRY POINT INVENTORY

### EP-1: Pagegen Worker (PRIMARY content generation path)

| Property | Value |
|----------|-------|
| **Entry File** | `app/api/jobs/pagegen/route.js` |
| **Trigger** | QStash POST delivery |
| **Function Called** | `generateAiContent(systemPrompt, userPrompt)` from `lib/ai/generateContent.js` |
| **Provider** | Google Gemini (primary: `gemini-2.0-flash`, fallback: `gemini-2.5-flash-lite`) |
| **Gating Logic** | `queue_paused` (systemConfig) + `pagegen_enabled` (isSystemEnabled) |
| **`ai_enabled` checked?** | ❌ NO — critical governance gap |
| **Circuit breaker?** | ❌ NO |
| **Cost guard?** | ❌ NO |
| **Retry logic** | Internal: 2 attempts × 2 models. QStash: retries=3 delivery. Worker: max_retries=3 → DLQ |
| **Queue involvement** | `generation_queue` → QStash → pagegen route |
| **On AI failure** | Returns `null` → worker returns HTTP 200 → QStash marks delivered ✅ → **no error recorded** |
| **Runtime classification** | DEPLOYED, EXECUTING (delivery confirmed), SILENTLY FAILING (Gemini 429) |

**Call chain:**
```
QStash → POST /api/jobs/pagegen
  → verifySignatureAppRouter (signature check)
  → getSystemConfig() → queue_paused check
  → isSystemEnabled('pagegen_enabled') → safe_mode + pagegen_enabled check
  → SELECT generation_queue WHERE id=queueId
  → resolvePagePrompt() → lib/ai/promptEngine.js
  → generateAiContent(systemPrompt, userPrompt) → lib/ai/generateContent.js
       → GoogleGenerativeAI SDK
       → model.generateContent(userPrompt)
       → HTTP 429 from Gemini API
       → retry × 2 → still 429
       → try fallback model gemini-2.5-flash-lite
       → HTTP 429 → retry × 2 → still 429
       → safeLog('AI_FAILURE', ...) → observability_logs
       → return null
  ← responseText = null
  → throw new Error('AI returned no content for [slug]')
  → markQueueFailed(supabase, queueJob, reason)
  → finalizeJobRun(supabase, jobRunId, 'failed', reason)
  → return { status: 500, body: { error: 'Internal Server Error' } }
```

> **NOTE:** Worker throws on null → returns 500 → QStash retries delivery. This is the CORRECT behavior per code (`if (!responseText) { throw new Error(...) }`). However, QStash `retries=3` means delivery is retried 3 times before DLQ. After 3 QStash retries + worker's own 4 Gemini attempts = up to 12 Gemini API calls per page request, all returning 429.

---

### EP-2: Admin AI General Route

| Property | Value |
|----------|-------|
| **Entry File** | `app/api/admin/ai/route.js` |
| **Trigger** | Admin HTTP POST |
| **Function Called** | `generateAiContent(prompt, aiContext)` from `lib/ai/index.js` |
| **Provider** | Google Gemini via `lib/ai/generateContent.js` |
| **Gating Logic** | `withAdminAuth` (JWT) only |
| **`ai_enabled` checked?** | ❌ NO |
| **Circuit breaker?** | ❌ NO |
| **Cost guard?** | ❌ NO |
| **Runtime classification** | DEPLOYED, REACHABLE, SILENTLY FAILING (Gemini 429) |

**Call chain:**
```
Admin POST /api/admin/ai
  → withAdminAuth (JWT check)
  → generateAiContent(prompt, { action, ...context }) → lib/ai/index.js
       → generateGeminiContent(systemPrompt, userPrompt) → lib/ai/generateContent.js
       → Gemini API → 429 → returns null
  → if (!result) throw new Error('Gemini generation failed')
  → HTTP 500 returned to caller
```

---

### EP-3: Admin Blog AI Generation

| Property | Value |
|----------|-------|
| **Entry File** | `app/api/admin/blog/route.js` |
| **Trigger** | Admin HTTP POST |
| **Function Called** | `generateAiContent(systemPrompt, userPrompt)` from `lib/ai/generateContent.js` (direct) |
| **Provider** | Google Gemini |
| **Gating Logic** | `withAdminAuth` only |
| **`ai_enabled` checked?** | ❌ NO |
| **Runtime classification** | DEPLOYED, REACHABLE, SILENTLY FAILING |

---

### EP-4: Admin SEO Analyzer

| Property | Value |
|----------|-------|
| **Entry File** | `app/api/admin/seo/analyze/route.js` |
| **Trigger** | Admin HTTP POST |
| **Function Called** | `generateAiContent(prompt, { action: 'page-seo-analysis' })` from `lib/ai` |
| **Provider** | Google Gemini |
| **Gating Logic** | `withAdminAuth` only |
| **Runtime classification** | DEPLOYED, REACHABLE, SILENTLY FAILING |

---

### EP-5: Admin AI Pages Route

| Property | Value |
|----------|-------|
| **Entry File** | `app/api/admin/ai/pages/route.js` |
| **Trigger** | Admin HTTP POST |
| **Function Called** | `generateAiContent(systemPrompt, userPrompt)` from `lib/ai` |
| **Provider** | Google Gemini |
| **Gating Logic** | `withAdminAuth` only |
| **Runtime classification** | DEPLOYED, REACHABLE, SILENTLY FAILING |

---

### EP-6: Admin AI CTA Route

| Property | Value |
|----------|-------|
| **Entry File** | `app/api/admin/ai/cta/route.js` |
| **Trigger** | Admin HTTP POST |
| **Function Called** | `generateAiContent(systemPrompt, userPrompt)` from `lib/ai` |
| **Provider** | Google Gemini |
| **Gating Logic** | `withAdminAuth` only |
| **Runtime classification** | DEPLOYED, REACHABLE, SILENTLY FAILING |

---

### EP-7: Admin AI Recruiter Route

| Property | Value |
|----------|-------|
| **Entry File** | `app/api/admin/ai/recruiter/route.js` |
| **Trigger** | Admin HTTP POST |
| **Function Called** | `generateAiContent(systemPrompt, userPrompt)` from `lib/ai` |
| **Provider** | Google Gemini |
| **Gating Logic** | `withAdminAuth` only |
| **Runtime classification** | DEPLOYED, REACHABLE, SILENTLY FAILING |

---

### EP-8: AI Scorer Worker (lead scoring, NOT content generation)

| Property | Value |
|----------|-------|
| **Entry File** | `app/api/jobs/ai-scorer/route.js` |
| **Trigger** | QStash POST delivery |
| **Function Called** | `executeTool('scoreLead', ...)` → `lib/tools/index.js` → `lib/ai/leadScorer.js` |
| **Provider** | Rule-based + `lib/ai/leadScorer.js` (INCONCLUSIVE — may or may not call Gemini) |
| **Gating Logic** | `getSystemConfig().ai_enabled` — THIS one DOES gate on `ai_enabled` |
| **`ai_enabled` checked?** | ✅ YES — only entry point that checks `ai_enabled` before execution |
| **Runtime classification** | DEPLOYED, FEATURE-GATED (ai_enabled), CURRENTLY BLOCKED (ai_enabled=true but quota dead) |

**Note:** ai-scorer gates on `ai_enabled` but the pagegen worker does NOT. This is an asymmetric governance gap. The scoring/routing subsystem is more correctly governed than the content generation subsystem.

---

### EP-9: Bulk Generation Start (indirect, triggers EP-1)

| Property | Value |
|----------|-------|
| **Entry File** | `app/api/admin/ccc/bulk/[id]/route.js` |
| **Trigger** | Admin PATCH action=start/resume |
| **Function Called** | `enqueuePageGeneration()` → QStash → pagegen worker (EP-1) |
| **Gating Logic** | `isSystemEnabled('bulk_generation_enabled')` + `isSystemEnabled('pagegen_enabled')` |
| **`ai_enabled` checked?** | ❌ NO (inherits from EP-1) |
| **Runtime classification** | DEPLOYED, FEATURE-GATED (bulk_generation_enabled=false in production) |

---

## PROVIDER HIERARCHY (RUNTIME TRUTH)

```
ALL AI entry points (EP-1 through EP-7)
  └── lib/ai/index.js  OR  lib/ai/generateContent.js (direct)
        └── lib/ai/generateContent.js
              └── GoogleGenerativeAI SDK (@google/generative-ai)
                    ├── PRIMARY: gemini-2.0-flash  (QUOTA DEAD)
                    └── FALLBACK: gemini-2.5-flash-lite (QUOTA DEAD — same key)

lib/ai/providers/openai.js
  └── NEVER IMPORTED anywhere in codebase → DEAD CODE
  └── OPENAI_API_KEY: NOT present in environment
```

**Evidence:**
- `grep -r "openai" lib/ai/index.js` → 0 matches
- `grep -r "from.*providers/openai"` across all JS → 0 matches
- `OPENAI_API_KEY`: confirmed absent (GEMINI_DEPENDENCY_ANALYSIS.md)

---

## SHOS-TRIGGERED AI ACTIONS

SHOS (`lib/system/shos.js`) is an operator control system. It does NOT directly trigger AI generation. SHOS dispatches `enqueuePageGeneration()` when an operator manually starts a queue, which indirectly invokes EP-1. SHOS itself makes no AI calls.

**SHOS → AI flow:** SHOS action "dispatch_pagegen" → `enqueuePageGeneration()` → QStash → `/api/jobs/pagegen` (EP-1).

---

## SCHEDULED / CRON AI PATHS

| Cron | Triggers AI? | Status |
|------|-------------|--------|
| `/api/jobs/pagegen` (5-min pagegen cron) | ✅ YES — calls Gemini | DELIVERING, FAILING AT GEMINI |
| `/api/jobs/scheduled-publish` (hourly) | ❌ NO — only publishes drafts | NEVER REGISTERED IN UPSTASH |
| `/api/jobs/morning-brief` (daily) | INCONCLUSIVE — may call Gemini for briefing | Unverified |
| `/api/jobs/alert-scan` | ❌ NO | ACTIVE |
| `/api/jobs/event-retry` | ❌ NO | ACTIVE |
| `/api/jobs/vendor-health-check` | ❌ NO | ACTIVE |
| `/api/jobs/reconciliation` | ❌ NO | ACTIVE |

---

## FILES ANALYZED FOR THIS TRACE

- `app/api/jobs/pagegen/route.js` — PRIMARY pagegen worker (full trace)
- `app/api/admin/ai/route.js` — General AI admin route
- `app/api/admin/ai/pages/route.js` — Pages AI route
- `app/api/admin/ai/cta/route.js` — CTA AI route
- `app/api/admin/ai/recruiter/route.js` — Recruiter AI route
- `app/api/admin/blog/route.js` — Blog generation route
- `app/api/admin/seo/analyze/route.js` — SEO analyzer
- `app/api/jobs/ai-scorer/route.js` — Lead scoring worker
- `app/api/admin/ccc/bulk/[id]/route.js` — Bulk start (indirect AI trigger)
- `lib/ai/index.js` — AI dispatcher (Gemini wrapper)
- `lib/ai/generateContent.js` — Core Gemini execution
- `lib/ai/providers/openai.js` — OpenAI stub (dead code)
- `lib/ai/promptEngine.js` — Prompt assembly (called by pagegen)
- `lib/queue/publisher.js` — QStash dispatch
- `lib/system/shos.js` — Operator control (AI trigger path only)
