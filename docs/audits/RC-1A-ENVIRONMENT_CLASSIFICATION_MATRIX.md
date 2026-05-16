# RC-1A — ENVIRONMENT CLASSIFICATION MATRIX
**Phase:** P2-RC Release Convergence + Runtime Governance  
**Date:** 2026-05-13  
**Method:** Code trace + existing forensic audit evidence (FORENSIC_DEPLOYMENT_RECONCILIATION.md, LOCAL_VS_PROD_FILE_MATRIX.md, GEMINI_DEPENDENCY_ANALYSIS.md, QSTASH_OPERATIONAL_AUDIT.md, PRODUCTION_REALITY.md)  
**Rules Applied:** INSPECT ONLY. Each subsystem classified independently. No collapsed states. INCONCLUSIVE = stated.

---

## CLASSIFICATION LEGEND

| State | Meaning |
|-------|---------|
| **EXISTS IN CODE** | Code file exists in repository |
| **DEPLOYED** | Code is running on production (bimasakhi.com) |
| **REACHABLE** | Production endpoint responds to requests |
| **EXECUTING** | Code path actively runs for real inputs |
| **FEATURE-GATED** | Blocked by a feature flag or config check |
| **SHADOW ONLY** | Exists in code but not in execution path |
| **FALLBACK ONLY** | Only triggered on primary failure |
| **LOCAL ONLY** | Exists in local files, not deployed to production |
| **DEAD CODE** | Imported nowhere; has no execution path |
| **DECORATIVE** | Implemented but not wired to the path it governs |
| **INCONCLUSIVE** | Evidence insufficient to classify with confidence |

---

## AI SUBSYSTEMS

### 1. Core Gemini Content Generator (`lib/ai/generateContent.js`)

| Classification State | Value |
|---------------------|-------|
| EXISTS IN CODE | ✅ YES |
| DEPLOYED | ✅ YES (P1 code, commit 794013e) |
| REACHABLE | ✅ YES (invoked by pagegen worker, admin routes) |
| EXECUTING | ✅ YES — code executes on each QStash delivery |
| FEATURE-GATED | ❌ NO — not gated by any feature flag |
| QUOTA EXHAUSTED | ✅ YES — HTTP 429 since ~May 4 |
| **Runtime Classification** | **DEPLOYED + EXECUTING + SILENTLY FAILING** |

**Evidence:** `job_runs` = 0 in May. Gemini API returns 429 (confirmed forensically).

---

### 2. OpenAI Provider (`lib/ai/providers/openai.js`)

| Classification State | Value |
|---------------------|-------|
| EXISTS IN CODE | ✅ YES |
| DEPLOYED | ✅ YES (file is on production) |
| REACHABLE | ❌ NO — never imported |
| EXECUTING | ❌ NO — zero callers |
| FEATURE-GATED | N/A |
| `OPENAI_API_KEY` present | ❌ NO |
| **Runtime Classification** | **DEAD CODE** |

**Evidence:** `grep` across entire codebase finds 0 imports of `providers/openai.js`. GEMINI_DEPENDENCY_ANALYSIS.md confirms key absent.

---

### 3. AI Dispatcher (`lib/ai/index.js`)

| Classification State | Value |
|---------------------|-------|
| EXISTS IN CODE | ✅ YES |
| DEPLOYED | ✅ YES |
| REACHABLE | ✅ YES (imported by EP-2, EP-4 through EP-7) |
| EXECUTING | ✅ YES (when admin AI routes are called) |
| **Runtime Classification** | **DEPLOYED + EXECUTING (admin routes) + SILENTLY FAILING (Gemini dead)** |

---

### 4. Prompt Engine (`lib/ai/promptEngine.js`)

| Classification State | Value |
|---------------------|-------|
| EXISTS IN CODE | ✅ YES |
| DEPLOYED | INCONCLUSIVE — P2 promptEngine changes are LOCAL ONLY; P1 version deployed |
| REACHABLE | ✅ YES (called by pagegen worker) |
| EXECUTING | ✅ YES — resolvePagePrompt() runs before every AI call |
| **Runtime Classification** | **DEPLOYED (P1 version) + EXECUTING + P2 VERSION LOCAL ONLY** |

---

### 5. Circuit Breaker — Tool Level (`lib/system/circuitBreaker.js`)

| Classification State | Value |
|---------------------|-------|
| EXISTS IN CODE | ✅ YES |
| DEPLOYED | ✅ YES |
| REACHABLE | ✅ YES (imported by `lib/tools/index.js`) |
| EXECUTING | ✅ YES — for tool execution pipeline (lead scoring) |
| WIRED TO AI CONTENT GEN | ❌ NO |
| **Runtime Classification** | **DEPLOYED + EXECUTING (tool scope only) + DECORATIVE (for AI content generation)** |

---

### 6. Circuit Breaker — Vendor Level (`lib/vendorResilience.js`)

| Classification State | Value |
|---------------------|-------|
| EXISTS IN CODE | ✅ YES |
| DEPLOYED | ✅ YES |
| REACHABLE | ✅ YES (imported by vendor-health-check worker) |
| WIRED TO GEMINI CALLS | ❌ NO |
| `vendor_contracts.circuit_state` | INCONCLUSIVE — not queried |
| **Runtime Classification** | **DEPLOYED + DECORATIVE (for Gemini AI calls)** |

---

### 7. AI Cost Guard (`lib/system/aiCostGuard.js`)

| Classification State | Value |
|---------------------|-------|
| EXISTS IN CODE | ✅ YES |
| DEPLOYED | ✅ YES |
| IMPORTED BY AI ROUTES | ❌ NO |
| EXECUTING | ❌ NO — no callers in AI execution paths |
| **Runtime Classification** | **DEAD CODE (for AI content generation)** |

**Evidence:** `grep` across all AI routes, generateContent.js, lib/ai/index.js = 0 imports of `aiCostGuard`.

---

### 8. Backpressure System (`lib/system/backpressure.js`)

| Classification State | Value |
|---------------------|-------|
| EXISTS IN CODE | ✅ YES |
| DEPLOYED | ✅ YES |
| WIRED TO PAGEGEN | ❌ NO |
| WIRED TO AI ROUTES | ❌ NO |
| EXECUTING | INCONCLUSIVE — may be called elsewhere |
| **Runtime Classification** | **DEPLOYED + DECORATIVE (for AI/content generation paths)** |

---

## QUEUE SUBSYSTEMS

### 9. QStash Publisher (`lib/queue/publisher.js`)

| Classification State | Value |
|---------------------|-------|
| EXISTS IN CODE | ✅ YES |
| DEPLOYED | ✅ YES |
| REACHABLE | ✅ YES |
| EXECUTING | ✅ YES — delivery confirmed 2026-05-13 |
| **Runtime Classification** | **PRODUCTION ACTIVE** |

---

### 10. Pagegen Worker (`app/api/jobs/pagegen/route.js`)

| Classification State | Value |
|---------------------|-------|
| EXISTS IN CODE | ✅ YES |
| DEPLOYED | ✅ YES (P1 version) |
| REACHABLE | ✅ YES |
| EXECUTING | ✅ YES — receives QStash deliveries |
| COMPLETING SUCCESSFULLY | ❌ NO — fails at Gemini |
| **Runtime Classification** | **DEPLOYED + EXECUTING + SILENTLY FAILING** |

---

### 11. Bulk Job Start (`app/api/admin/ccc/bulk/[id]/route.js`)

| Classification State | Value |
|---------------------|-------|
| EXISTS IN CODE | ✅ YES |
| DEPLOYED | ✅ YES |
| REACHABLE | ✅ YES |
| EXECUTING | ❌ NO — `bulk_generation_enabled=false` blocks start |
| **Runtime Classification** | **DEPLOYED + FEATURE-GATED** |

---

### 12. Single Page Generation (`app/api/admin/ccc/generate-single/route.js`)

| Classification State | Value |
|---------------------|-------|
| EXISTS IN CODE | ✅ YES |
| DEPLOYED | ✅ YES |
| REACHABLE | ✅ YES (admin auth required) |
| EXECUTING | INCONCLUSIVE — can be triggered by admin manually |
| ON SUCCESS | Dispatches to pagegen worker → fails at Gemini |
| **Runtime Classification** | **DEPLOYED + REACHABLE + PARTIALLY WIRED** |

---

### 13. Scheduled Publish Cron (`app/api/jobs/scheduled-publish/route.js`)

| Classification State | Value |
|---------------------|-------|
| EXISTS IN CODE | ✅ YES |
| DEPLOYED | ✅ YES |
| REGISTERED IN UPSTASH | ❌ NO |
| EVER EXECUTED | ❌ NEVER |
| **Runtime Classification** | **DEPLOYED + SHADOW ONLY (never registered, never runs)** |

---

## GOVERNANCE SUBSYSTEMS

### 14. `ai_enabled` Feature Flag

| Classification State | Value |
|---------------------|-------|
| EXISTS IN DB | ✅ YES |
| CONTROLS AI-SCORER | ✅ YES |
| CONTROLS PAGEGEN | ❌ NO |
| CONTROLS ADMIN AI ROUTES | ❌ NO |
| CURRENT DB VALUE | `true` (stale — quota dead) |
| **Runtime Classification** | **MISLEADING (value wrong) + PARTIALLY WIRED (scoring only)** |

---

### 15. `pagegen_enabled` Feature Flag

| Classification State | Value |
|---------------------|-------|
| EXISTS IN DB | ✅ YES |
| CONTROLS PAGEGEN | ✅ YES (via isSystemEnabled) |
| CURRENT DB VALUE | `true` (inferred from active delivery) |
| **Runtime Classification** | **PRODUCTION ACTIVE + CORRECTLY WIRED** |

---

### 16. `safe_mode` Flag

| Classification State | Value |
|---------------------|-------|
| EXISTS IN DB | ✅ YES |
| CONTROLS isSystemEnabled() | ✅ YES |
| CURRENT DB VALUE | `false` (inferred — no halt active) |
| **Runtime Classification** | **PRODUCTION ACTIVE + CORRECTLY WIRED** |

---

### 17. SHOS Operator System (`lib/system/shos.js`)

| Classification State | Value |
|---------------------|-------|
| EXISTS IN CODE | ✅ YES |
| DEPLOYED | INCONCLUSIVE — P2 SHOS changes are LOCAL ONLY; P1 SHOS version deployed (May 5) |
| REACHABLE | ✅ YES (admin auth) |
| EXECUTING | ✅ YES (confirmed May 5 live proof) |
| **Runtime Classification** | **DEPLOYED (P1 version) + EXECUTING + P2 ENHANCEMENTS LOCAL ONLY** |

---

## P2 vs PRODUCTION CODE DIVERGENCE

| Component | Production State | Local State | Delta |
|-----------|-----------------|-------------|-------|
| `lib/ai/promptEngine.js` | P1 version | P2 version (DB-backed templates) | P2 LOCAL ONLY |
| `app/api/admin/blog/route.js` | P1 version | P2 version (template engine) | P2 LOCAL ONLY |
| SHOS system | P1 deployed (May 5) | P2 enhanced locally | Delta exists |
| DB migrations | 84 total applied (5 uncommitted) | Same DB | DB AHEAD of repo |
| Feature flags in DB | P2 flags may exist (ai_prompt_templates_enabled) | Same | INCONCLUSIVE |

---

## SUMMARY CLASSIFICATION TABLE

| AI/Runtime Subsystem | Classification |
|---------------------|---------------|
| Gemini content generator | DEPLOYED + EXECUTING + SILENTLY FAILING |
| OpenAI provider | DEAD CODE |
| AI dispatcher (lib/ai/index.js) | DEPLOYED + EXECUTING + SILENTLY FAILING |
| Prompt engine (P1) | PRODUCTION ACTIVE |
| Prompt engine (P2) | LOCAL ONLY |
| Circuit breaker (tool level) | DEPLOYED + DECORATIVE (for AI) |
| Circuit breaker (vendor level) | DEPLOYED + DECORATIVE (for Gemini) |
| AI cost guard | DEAD CODE (for AI generation) |
| Backpressure system | DEPLOYED + DECORATIVE (for AI) |
| QStash publisher | PRODUCTION ACTIVE |
| Pagegen worker | DEPLOYED + EXECUTING + SILENTLY FAILING |
| Bulk job start | DEPLOYED + FEATURE-GATED |
| Single page generator | DEPLOYED + REACHABLE + PARTIALLY WIRED |
| Scheduled publish cron | DEPLOYED + SHADOW ONLY |
| `ai_enabled` flag | MISLEADING + PARTIALLY WIRED |
| `pagegen_enabled` flag | PRODUCTION ACTIVE + CORRECTLY WIRED |
| `safe_mode` flag | PRODUCTION ACTIVE + CORRECTLY WIRED |
| SHOS (P1) | PRODUCTION ACTIVE |
| SHOS (P2 enhancements) | LOCAL ONLY |
| Lead capture / CRM sync | PRODUCTION ACTIVE + HEALTHY |
| QStash delivery | PRODUCTION ACTIVE |
| Admin AI routes (EP-2 through EP-7) | DEPLOYED + REACHABLE + SILENTLY FAILING |
