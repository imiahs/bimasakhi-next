# RC-FR3 AI Control Plane Reconstruction

Date: 2026-05-16
Cycle: RC-FR3

---

## 1. Scope and Safety Envelope

RC-FR3 is an analysis-and-documentation cycle only.

Explicitly not performed:
- unrestricted AI activation
- resolver-chain restoration
- SHOS widening
- schema or migration changes
- rollback redesign
- observability redesign

## 2. Runtime-Truth Evidence Base

Primary evidence sources:
- `lib/ai/promptEngine.js` (untracked local-only)
- `lib/ai/promptTemplates.js` (tracked, locally modified)
- `lib/ai/generateContent.js`
- `lib/ai/index.js`
- `lib/ai/providers/openai.js`
- `app/api/jobs/pagegen/route.js` (tracked, locally modified)
- `app/api/admin/blog/route.js` (tracked, locally modified)
- `app/api/admin/ccc/generate-single/route.js` (tracked, locally modified)
- `app/api/admin/ai/route.js`
- `app/api/admin/ai/recruiter/route.js`
- `app/api/admin/seo/analyze/route.js`
- `app/api/admin/system-health/route.js`
- `lib/featureFlags.js` (tracked, locally modified)
- `lib/systemConfig.js`
- `app/api/admin/config/route.js` (tracked, locally modified)

Git-state truth captured during RC-FR3:
- local-only/untracked: `lib/ai/promptEngine.js`
- locally modified AI surfaces include `lib/ai/promptTemplates.js`, `app/api/jobs/pagegen/route.js`, `app/api/admin/blog/route.js`, `app/api/admin/ccc/generate-single/route.js`, `lib/featureFlags.js`, and admin control routes

## 3. Step 1 - AI Surface Reconstruction

| Surface | Classification | Provider Coupling | Notes |
|---|---|---|---|
| `lib/ai/generateContent.js` | DEPLOYED, GATED, ROLLBACK_FRAGILE, RECOVERABLE | Direct Gemini hardcoding (`GoogleGenerativeAI`, fixed Gemini model names) | Retry/fallback behavior is Gemini-specific; no provider abstraction boundary. |
| `lib/ai/index.js` | DEPLOYED, GATED, PARTIALLY_WIRED, RECOVERABLE | Gemini wrapper only | Logical action router exists but still dispatches to Gemini-only implementation. |
| `lib/ai/providers/openai.js` | LOCAL_ONLY capability, PARTIALLY_WIRED | OpenAI-specific but not integrated into active router | Wrapper exists physically but is not the active runtime provider path. |
| `lib/ai/promptEngine.js` | LOCAL_ONLY, GATED, PARTIALLY_WIRED, ROLLBACK_FRAGILE, RECOVERABLE | Indirect coupling through downstream Gemini execution | Prompt resolution exists but deploy truth is incomplete because file is untracked local-only. |
| `lib/ai/promptTemplates.js` | PARTIALLY_WIRED, RECOVERABLE | Prompt contract text assumes Gemini system-instruction model | Template system is present but deploy parity is not closed. |
| `app/api/jobs/pagegen/route.js` | DEPLOYED, GATED, ROLLBACK_FRAGILE, RECOVERABLE | Direct Gemini model field persisted (`ai_model: gemini-2.0-flash`) | Guarded by `pagegen_enabled` and `ai_enabled`, but provider coupling remains hardcoded. |
| `app/api/admin/blog/route.js` | DEPLOYED, GATED, PARTIALLY_WIRED, RECOVERABLE | Calls Gemini path through prompt engine + generator | AI generate action guarded by `ai_enabled`; still provider-coupled in execution path. |
| `app/api/admin/ccc/generate-single/route.js` | DEPLOYED, GATED, PARTIALLY_WIRED, RECOVERABLE | Queues pagegen which is Gemini-coupled | Route queues generation and relies on downstream guarded worker. |
| `app/api/admin/ai/route.js` | DEPLOYED, GATED, RECOVERABLE | Uses active Gemini-backed router | Governance gate exists; provider abstraction still absent in active path. |
| `app/api/admin/ai/recruiter/route.js` | DEPLOYED, GATED, ROLLBACK_FRAGILE, RECOVERABLE | Uses Gemini path and strict JSON parsing assumptions | Partial failure is swallowed per-lead; retry semantics are provider/error-shape sensitive. |
| `app/api/admin/seo/analyze/route.js` | DEPLOYED, GATED, PARTIALLY_WIRED, RECOVERABLE | Uses action router over Gemini path | Returns partial state when AI result invalid; no provider-agnostic result normalization layer. |
| `app/api/admin/system-health/route.js` | DEPLOYED, PARTIALLY_WIRED | Direct Gemini probe with provider-specific status mapping | Health truth includes provider probe, but it is Gemini-specific not provider-registry-based. |

Direct Gemini coupling: PRESENT across active execution and health probes.

Missing abstraction layers: provider registry, model registry, task routing abstraction, provider-neutral response adapter, provider-neutral retry policy.

## 4. Step 1.25 - AI Execution Authority Mapping

| Surface Group | Authority Classification | Why |
|---|---|---|
| Admin AI routes (`/api/admin/ai`, recruiter, seo/analyze) | AUTHORITY_WIDENED (if enabled) | Enabling `ai_enabled` immediately enables generation/scoring outcomes affecting admin and lead workflows. |
| Pagegen worker + queue dispatch | AUTHORITY_WIDENED (if enabled) | AI content generation can mutate content tables and publish pipeline state. |
| Prompt engine and templates only | AUTHORITY_PRESERVED | Prompt construction alone does not mutate runtime until generation routes are activated. |
| Health and config routes | AUTHORITY_PRESERVED | Observe/toggle controls, but no direct generation without `ai_enabled` and pagegen guards. |

## 5. Step 1.5 - Control Plane Architecture Mapping

| Capability | Status | Notes |
|---|---|---|
| Provider registry | MISSING_FOUNDATION | No central runtime registry selecting providers by capability/task. |
| Model registry | PARTIALLY_IMPLEMENTED | Model identifiers exist in code/workflow config UI but not enforced as runtime routing policy. |
| Provider switching | MISSING_FOUNDATION | OpenAI wrapper exists but no integrated provider switch in active generation path. |
| Per-task model routing | PARTIALLY_IMPLEMENTED | Action-based prompts exist; provider/model selection remains hardcoded. |
| Credential storage strategy | PARTIALLY_IMPLEMENTED | Env-key based credentials exist; no admin-safe rotation/control plane abstraction. |
| Provider capability mapping | MISSING_FOUNDATION | No contract map for provider feature parity and fallback semantics. |
| AI governance flags | CURRENTLY_IMPLEMENTED | `ai_enabled`, `pagegen_enabled`, `safe_mode`, `ai_prompt_templates_enabled` guards exist. |
| Fallback provider behavior | HIGH_RISK | Fallback is model-level within Gemini, not provider-level across vendors. |

Provider-specific dependency risks remain explicit:
- Gemini-specific response shape assumptions
- Gemini-specific retry and quota handling
- Gemini-specific health probe logic
- Gemini model names persisted in generation metadata

## 6. Step 1.75 - Governance Trust Classification

- rollback trust: PARTIALLY_TRUSTED
- observability trust: PARTIALLY_TRUSTED
- deployment trust: PARTIALLY_TRUSTED
- cost-governance trust: GOVERNANCE_FRAGILE
- provider-switch trust: GOVERNANCE_FRAGILE

Rationale:
- Guards exist and fail-closed defaults exist.
- Provider abstraction is missing in active runtime paths.
- Cost guard exists but is not a centralized mandatory gate on all AI execution paths.

## 7. Step 4 - Safe AI Recovery Grouping

| Recovery Group | Scope | Classification |
|---|---|---|
| G1 Prompt-engine visibility only | prompt preview and template-read visibility with generation blocked | SAFE_TO_RESTORE |
| G2 Governance telemetry hardening | AI status/probe normalization and explicit provider-state surfacing (no activation) | SAFE_TO_RESTORE |
| G3 Provider abstraction skeleton | provider registry + response adapter + task routing contracts without switching production path | REQUIRES_DEPLOYMENT |
| G4 Route-level provider enablement | generation route wiring to provider registry | REQUIRES_RUNTIME_ACTIVATION |
| G5 Full multi-provider failover | live provider switching and fallback under load | HIGH_RISK |
| G6 Resolver-coupled generation recovery | any recovery depending on deferred resolver chain | DO_NOT_RESTORE_YET |

## 8. Step 5 - Final AI Recovery Authorization

Final RC-FR3 authorization: `AI_RECOVERY_REQUIRES_MORE_RECONSTRUCTION`

Reason for downgrade:
- provider-coupled active generation paths remain
- prompt-engine deploy parity remains incomplete (`LOCAL_ONLY` dependency exists)
- governance for provider switching/failover remains structurally incomplete

Production runtime behavior in RC-FR3: UNCHANGED

STOP RULE preserved.
