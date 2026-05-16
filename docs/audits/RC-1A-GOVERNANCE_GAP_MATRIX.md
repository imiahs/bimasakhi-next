# RC-1A — GOVERNANCE GAP MATRIX
**Phase:** P2-RC Release Convergence + Runtime Governance  
**Date:** 2026-05-13  
**Method:** Code trace of all governance mechanisms across every AI entry point  
**Rules Applied:** INSPECT ONLY. No fixes. Evidence-backed only. INCONCLUSIVE stated explicitly.

---

## DEFINITIVE ANSWER

> **The governance layer is asymmetrically implemented. Seven of nine AI entry points bypass `ai_enabled`. The pagegen worker — the highest-volume AI path — checks only `queue_paused` + `pagegen_enabled` and proceeds to call Gemini regardless of AI health. The circuit breaker and cost guard subsystems exist in code but are wired to zero AI execution paths. Governance is mechanically functional for lead scoring (EP-8) only. All content generation paths are ungoverned at the AI execution level.**

---

## GOVERNANCE MECHANISM INVENTORY

### 1. `system_control_config` Table (Master Control Plane)

**Authority:** Single DB row, `singleton_key=true`  
**File:** `lib/systemConfig.js` (`getSystemConfig()`), `lib/featureFlags.js` (`isSystemEnabled()`, `getFeatureFlag()`)

| Flag | Default (Code) | Last Known DB Value | Purpose |
|------|---------------|---------------------|---------|
| `ai_enabled` | `false` | `true` (misleading — quota dead) | AI scoring and routing |
| `queue_paused` | `true` | `false` (active) | Pause all queue dispatches |
| `pagegen_enabled` | `false` | `true` (inferred) | Enable page generation workers |
| `bulk_generation_enabled` | `false` | `false` | Enable bulk job planner |
| `crm_auto_routing` | `false` | `false` | Auto CRM routing |
| `followup_enabled` | `false` | `false` | Followup automation |
| `safe_mode` | `false` | `false` (inferred) | Emergency halt, all automation |

**Evidence source:** `backups/2026-05-04T06-15-09-082Z/system_control_config.json`, GEMINI_DEPENDENCY_ANALYSIS.md, PRODUCTION_REALITY.md

---

### 2. Two Flag-Reading Code Paths (GOVERNANCE CONFUSION)

Two separate libraries read the same `system_control_config` table with different logic:

```
Path A: lib/systemConfig.js → getSystemConfig()
  - Returns raw DB values for: ai_enabled, queue_paused, batch_size, crm_auto_routing, followup_enabled
  - Safe defaults: { ai_enabled: false, queue_paused: true, ... }
  - Does NOT combine safe_mode
  - Used by: ai-scorer worker, policyEngine.js

Path B: lib/featureFlags.js → isSystemEnabled(flagKey)
  - Combines: checkSafeMode() AND getFeatureFlag(flagKey)
  - Returns false if EITHER safe_mode=true OR flagKey=false
  - Used by: pagegen worker, bulk start route
```

**Gap:** These two paths are not interchangeable. A caller using Path A for `ai_enabled` will miss safe_mode. A caller using Path B for `ai_enabled` would see `false` if safe_mode is on — but NO caller uses Path B for `ai_enabled`.

---

## AI ENTRY POINT GOVERNANCE MATRIX

| Entry Point | File | `ai_enabled` check | `queue_paused` check | `pagegen_enabled` check | `safe_mode` check | Circuit Breaker | Cost Guard |
|-------------|------|--------------------|---------------------|------------------------|-------------------|-----------------|------------|
| EP-1: pagegen worker | `app/api/jobs/pagegen/route.js` | ❌ MISSING | ✅ Via getSystemConfig | ✅ Via isSystemEnabled | ✅ (inside isSystemEnabled) | ❌ | ❌ |
| EP-2: admin AI route | `app/api/admin/ai/route.js` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| EP-3: admin blog | `app/api/admin/blog/route.js` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| EP-4: admin SEO | `app/api/admin/seo/analyze/route.js` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| EP-5: admin AI pages | `app/api/admin/ai/pages/route.js` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| EP-6: admin AI CTA | `app/api/admin/ai/cta/route.js` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| EP-7: admin AI recruiter | `app/api/admin/ai/recruiter/route.js` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| EP-8: ai-scorer worker | `app/api/jobs/ai-scorer/route.js` | ✅ Via getSystemConfig | ✅ (implied by flow) | N/A | ❌ | ❌ | ❌ |
| EP-9: bulk start | `app/api/admin/ccc/bulk/[id]/route.js` | ❌ | ✅ Via isSystemEnabled | ✅ Via isSystemEnabled | ✅ | ❌ | ❌ |

**Governance score: 1/9 entry points correctly gated on `ai_enabled`**

---

## GOVERNANCE MECHANISM ANALYSIS

### A. `ai_enabled` Flag — WHERE IT WORKS vs WHERE IT FAILS

**Works:**
- `app/api/jobs/ai-scorer/route.js` — checks `config.ai_enabled` before any execution
- `lib/system/policyEngine.js` — checks `config.ai_enabled` for event-bus AI events (`event.requires_ai`)
- Admin UI display (`lib/system/systemHealth.js`) — reads `ai_enabled` for health status display

**Fails:**
- `app/api/jobs/pagegen/route.js` — ABSENT. Worker calls Gemini regardless.
- `app/api/admin/ai/route.js` — ABSENT.
- All 5 other admin AI routes — ABSENT.

**Root cause:** The pagegen worker's governance was written to check `queue_paused` + `pagegen_enabled`, treating content generation as a queue/scheduling concern rather than an AI availability concern. The `ai_enabled` flag was apparently intended for lead scoring AI (CRM automation), not content generation.

---

### B. Circuit Breaker — DECORATIVE FOR AI

**Evidence:**

`lib/system/circuitBreaker.js`:
- In-memory state, resets on cold start
- Tracks failures per tool_name
- Persists open state to `tool_configs.enabled` on threshold
- Used by: `lib/tools/index.js` (tool execution framework)
- NOT used by: `lib/ai/generateContent.js`, `lib/ai/index.js`

`lib/vendorResilience.js`:
- Per-vendor circuit breaker (closed → open → half_open)
- Persists to `vendor_contracts.circuit_state`
- Tracks failure counts in memory (per cold start)
- NOT called from `lib/ai/generateContent.js`
- NOT called from any AI route

**Classification: DECORATIVE for AI content generation paths**

The circuit breakers would trip for tool execution (lead scoring tool) but have zero effect on Gemini content generation calls. Gemini quota exhaustion generates no circuit state change.

---

### C. Cost Guard — DISCONNECTED

**Evidence:**

`lib/system/aiCostGuard.js`:
- `checkAICostBudget(toolName)` — queries `observability_logs` for TOOL_SUCCESS/TOOL_FAILURE metadata with `cost` field
- Returns `{ allowed: true/false, recommended_model: ... }`
- Budget: $5/day daily, $1/tool per-tool
- Fallback threshold: 80% daily spend → recommend cheaper model

**Called from:** NOT called from `lib/ai/generateContent.js`, NOT called from any AI route.

**Classification: DISCONNECTED — exists in isolation**

The cost guard relies on `observability_logs` entries with `cost` metadata. The `generateContent.js` does log `AI_FAILURE` via `safeLog()` on null return but does NOT log cost metadata. Therefore cost guard data is perpetually 0 and will never trigger.

---

### D. Policy Engine — PARTIAL

**Evidence:** `lib/system/policyEngine.js` line 21: `if (event.requires_ai && !config.ai_enabled)`

This gate applies ONLY to events routed through the event bus (`lib/events/bus.js`). Direct AI calls (EP-1 through EP-7) bypass the event bus entirely and therefore bypass this policy check.

**Classification: PARTIAL — applies to event-bus AI only, NOT to direct content generation**

---

### E. Provider Fallback Governance — MISLEADING

`lib/ai/generateContent.js` has a built-in fallback: `modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL]`. This is framed as resilience, but both models share the same API key and the same quota pool. When primary fails, fallback also fails. The fallback is structurally sound but operationally meaningless when quota is exhausted.

---

## GOVERNANCE GAP SUMMARY TABLE

| Gap ID | Description | Severity | Evidence |
|--------|-------------|----------|---------|
| GOV-01 | pagegen worker does NOT check `ai_enabled` | CRITICAL | Code: no `config.ai_enabled` check in pagegen route |
| GOV-02 | 6 admin AI routes have zero governance checks | HIGH | Code: only `withAdminAuth` present |
| GOV-03 | Circuit breaker not wired to AI content generation | HIGH | Code: `generateContent.js` does not import `circuitBreaker.js` or `vendorResilience.js` |
| GOV-04 | Cost guard not wired to any AI path | HIGH | Code: `aiCostGuard.js` never imported by AI routes |
| GOV-05 | Two flag-reading paths create ambiguity | MEDIUM | Code: `getSystemConfig()` vs `isSystemEnabled()` — different logic, same DB table |
| GOV-06 | `ai_enabled` flag semantics ambiguous (scoring vs content) | MEDIUM | Evidence: only ai-scorer checks it, content gen does not |
| GOV-07 | Gemini fallback model shares same quota pool | MEDIUM | Both models use same `GEMINI_API_KEY` — fallback is false resilience |
| GOV-08 | Policy engine gate applies only to event-bus AI | LOW | `policyEngine.js` line 21 — bypass for direct callers |
| GOV-09 | Worker returns HTTP 200 on AI null (before retry fix) | MEDIUM | `generateContent.js` returns null → worker throws → HTTP 500 (correct behavior, but only after all retries) |

---

## WHERE GOVERNANCE WORKS

| Mechanism | Status | Scope |
|-----------|--------|-------|
| `queue_paused` gating (pagegen) | ✅ WORKS | Stops all queue dispatch when paused |
| `pagegen_enabled` + safe_mode gating | ✅ WORKS | Stops pagegen worker from accepting jobs |
| `bulk_generation_enabled` + `pagegen_enabled` gating (bulk) | ✅ WORKS | Stops bulk starts (currently: bulk_gen=false in production) |
| `ai_enabled` gating (ai-scorer) | ✅ WORKS | Correctly stops CRM AI scoring |
| QStash signature verification | ✅ WORKS | Prevents unauthorized worker triggers |
| Admin JWT auth on all AI admin routes | ✅ WORKS | Prevents unauthorized AI access |
| Retry + dead-letter after max_retries | ✅ WORKS | Catches stuck jobs in DLQ |

## WHERE GOVERNANCE IS BYPASSED

| Mechanism | Status | Impact |
|-----------|--------|--------|
| `ai_enabled` flag for content generation | ❌ BYPASSED | Setting `ai_enabled=false` does NOT stop pagegen Gemini calls |
| Circuit breaker for Gemini | ❌ BYPASSED | Quota exhaustion creates no circuit state |
| Cost guard for content generation | ❌ BYPASSED | AI spend is not tracked or limited for pagegen |

## WHERE GOVERNANCE IS MISLEADING

| Mechanism | Status | Explanation |
|-----------|--------|-------------|
| `ai_enabled = true` in DB | ❌ MISLEADING | Flag says AI is on; Gemini has been dead since May 4 |
| Admin health `aiStatus = 'Operational'` | ❌ MISLEADING | Derived from `ai_enabled` flag, not from live API probe |
| Gemini model fallback | ❌ MISLEADING | Fallback model shares same quota — provides false resilience |
