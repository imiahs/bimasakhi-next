# RC-FR5 Provider-Neutral AI Execution Fabric

Date: 2026-05-16
Cycle: RC-FR5

---

## 1. Scope and Safety Envelope

RC-FR5 is a provider-neutral execution-fabric reconstruction cycle only.

Not performed:
- unrestricted AI activation
- provider failover activation
- autonomous provider switching
- queue-wide routing activation
- resolver-chain restoration
- autonomous publishing
- SHOS widening

Runtime behavior in RC-FR5: unchanged.

## 2. Step 1 - Provider Adapter Contract Reconstruction

### 2.1 Contract status by concern

| Concern | Current State | Classification |
|---|---|---|
| Generation response contract | Mixed route-level parsing; no central normalized envelope | PARTIALLY_COUPLED |
| Structured output contract | Ad-hoc per route (`JSON.parse` cleanup variants) | PARTIALLY_COUPLED |
| Retry semantics | Gemini-specific retry and quota branches in `lib/ai/generateContent.js` | GEMINI_COUPLED |
| Error taxonomy | String-pattern checks and route-specific fallback behavior | PARTIALLY_COUPLED |
| Token accounting | No provider-neutral runtime token contract | HIGH_RISK |
| Moderation behavior | No provider-neutral moderation adapter layer | HIGH_RISK |
| Quota handling | Gemini-specific quota semantics (`429`, `quota`) | GEMINI_COUPLED |
| Provider capability mapping | Missing runtime-authoritative map | HIGH_RISK |

### 2.2 Remaining provider coupling

- response parsing: route-specific and coupled
- retry timing: Gemini-coupled
- quota semantics: Gemini-coupled
- prompt formatting: partially coupled to current provider behavior
- tool-call assumptions: no provider-neutral tool-call normalization
- moderation assumptions: no provider-neutral moderation contract

### 2.3 Provider-neutral contract classification

`PARTIALLY_COUPLED` with multiple `GEMINI_COUPLED` and `HIGH_RISK` subdomains.

## 3. Step 1.1 - Execution Semantics Reconstruction

| Semantic area | Classification | Notes |
|---|---|---|
| Response lifecycle | PARTIALLY_COUPLED | Completion/parse contracts vary by route. |
| Partial output handling | PROVIDER_COUPLED | No normalized partial lifecycle contract. |
| Retry lifecycle | PROVIDER_COUPLED | Retry/backoff is coupled to Gemini error semantics. |
| Moderation flow | PROVIDER_COUPLED | No independent moderation layer. |
| Structured-output assumptions | PARTIALLY_COUPLED | JSON expectations and repairs are route-specific. |
| Provider-specific parsing | PROVIDER_COUPLED | Parsing cleanup logic is duplicated and inconsistent. |

Final step 1.1 classification: `PROVIDER_COUPLED`.

## 4. Step 1.25 - Execution Authority Fabric Mapping

RC-FR5 cycle authority result: `AUTHORITY_PRESERVED` (analysis/documentation only).

Runtime-truth hazard observed:
- Some admin AI surfaces (`app/api/admin/ai/pages/route.js`, `app/api/admin/ai/landing/route.js`) do not enforce `ai_enabled` in-route, creating governance inconsistency risk if those routes are used.

## 5. Step 1.4 - Provider Failure Semantics

| Failure mode | Current survivability | Classification |
|---|---|---|
| Malformed partial output | Inconsistent per-route cleanup | PARTIALLY_SURVIVABLE |
| Inconsistent structured output | Route-local JSON repair only | PARTIALLY_SURVIVABLE |
| Hallucinated tool calls | No neutral validation envelope | FABRIC_FRAGILE |
| Quota exhaustion | Gemini-specific handling only | PARTIALLY_SURVIVABLE |
| Degraded latency | Timeout/retry logic exists but provider-coupled | PARTIALLY_SURVIVABLE |
| Partial streaming collapse | No normalized streaming contract | FABRIC_FRAGILE |

Final step 1.4 classification: `PARTIALLY_SURVIVABLE` with fragile zones.

## 6. Step 1.5 - Provider Contract Trust Classification

| Trust domain | Classification |
|---|---|
| Rollback trust | PARTIALLY_TRUSTED |
| Deployment trust | PARTIALLY_TRUSTED |
| Observability trust | PARTIALLY_TRUSTED |
| Provider-switch trust | FABRIC_FRAGILE |
| Outage survivability trust | FABRIC_FRAGILE |

## 7. Step 2 - Task-Router Execution Fabric

Current authoritative execution:
- task routing is action-based prompt selection only (`lib/ai/index.js`), not provider-neutral task routing.
- no runtime-authoritative provider/model task router exists.

Task-router authority distinctions:
- execution-authoritative: NO
- governance-authoritative: PARTIAL (global flags only)
- rollback-authoritative: PARTIAL
- observability-authoritative: PARTIAL

Survivability of current task routing:
- recursive retry survivability: PARTIAL
- malformed structured-output survivability: PARTIAL
- provider degradation survivability: FRAGILE
- fallback storm survivability: FRAGILE
- queue amplification survivability: PARTIAL
- provider outage survivability: FRAGILE
- quota exhaustion survivability: PARTIAL

## 8. Step 3 - Governance-Safe Execution Layer

Current governance-safe execution is incomplete:
- provider selection: not provider-neutral
- model selection: not runtime-authoritative by task
- task routing: missing runtime-authoritative router
- fallback handling: provider-internal only
- degradation handling: partial and provider-coupled
- credential rotation: no provider-governed control-plane workflow
- AI health monitoring: Gemini probe only
- quota governance: partial utility, not universal execution preflight

Survivability under governance events:
- provider removal: FRAGILE
- provider timeout storms: PARTIAL
- credential corruption: PARTIAL
- runtime cache poisoning: UNCLEAR/PARTIAL
- stale routing policies: FRAGILE
- provider rotation: FRAGILE
- queue restart: PARTIAL
- runtime restart: PARTIAL
- feature-flag reload: PARTIAL

## 9. Step 3.5 - Execution Fabric Trust Boundaries

| Boundary | Classification |
|---|---|
| Provider adapters | PARTIALLY_TRUSTED |
| Normalized responses | FABRIC_FRAGILE |
| Retry taxonomy | FABRIC_FRAGILE |
| Routing governance | PARTIALLY_TRUSTED |
| Fallback governance | FABRIC_FRAGILE |

## 10. Step 4 - Safe Implementation Grouping

| Group | Scope | Classification |
|---|---|---|
| G1 Provider adapter interface + normalized envelope types | Introduce provider-neutral response/error/retry contracts in code only | SAFE_TO_IMPLEMENT |
| G2 Retry taxonomy + error normalization layer | Centralize retry states, escalation levels, and provider-neutral error classes | SAFE_TO_IMPLEMENT |
| G3 Provider registry runtime (disabled path) | Add runtime registry with capability map and policy fetch, not active switch | REQUIRES_DEPLOYMENT |
| G4 Model registry runtime (disabled path) | Add model policy resolver by task class, no live cutover | REQUIRES_DEPLOYMENT |
| G5 Task-router runtime (shadow mode) | Route planning and dry-run resolution only, no execution switch | REQUIRES_DEPLOYMENT |
| G6 Governance execution layer wiring | Bind gates, health, quota preflight into neutral layer for non-authoritative shadow path | REQUIRES_DEPLOYMENT |
| G7 Live execution cutover to neutral fabric | Switch active routes/workers to registry+router execution | REQUIRES_RUNTIME_ACTIVATION |
| G8 Cross-provider fallback activation | Automated provider failover under live load | HIGH_RISK |
| G9 Queue-wide multi-task routing enablement | Broad worker/task activation over new fabric | DO_NOT_ENABLE_YET |

## 11. Step 5 - Final Execution Fabric Authorization

Final RC-FR5 authorization:
`FABRIC_REQUIRES_MORE_RECONSTRUCTION`

Downgrade basis:
- provider-coupled execution semantics remain
- retry and failure taxonomy remain provider-coupled
- task-router is not runtime-authoritative
- governance consistency is incomplete across AI routes

## 12. Hard Stop

RC-FR5 stops here. No multi-provider runtime activation is authorized.
