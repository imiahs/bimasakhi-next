# RC-FR4 AI Governance Execution Foundation

Date: 2026-05-16
Cycle: RC-FR4

---

## 1. Scope and Safety Boundary

RC-FR4 is a governance-foundation reconstruction cycle only.

Not performed:
- unrestricted AI activation
- autonomous publishing
- resolver-chain restoration
- queue-wide AI execution widening
- SHOS widening
- rollback redesign
- observability redesign

Runtime behavior in RC-FR4: unchanged.

## 2. Runtime-Truth Architecture Reconstruction

Primary active AI execution path:
- `app/api/admin/ai/route.js` -> `lib/ai/index.js` -> `lib/ai/generateContent.js` (Gemini only)
- `app/api/admin/blog/route.js` -> `lib/ai/promptEngine.js` + `lib/ai/generateContent.js`
- `app/api/jobs/pagegen/route.js` -> `lib/ai/promptEngine.js` + `lib/ai/generateContent.js`
- `app/api/admin/seo/analyze/route.js` -> `lib/ai/index.js` action path
- `app/api/admin/ai/recruiter/route.js` -> `lib/ai/index.js` action path

Global gates present:
- `ai_enabled` via `getSystemConfig()`
- `pagegen_enabled` + `safe_mode` via `isSystemEnabled()` in pagegen/bulk lanes

## 3. Step 1 - Provider Governance Reconstruction

### 3.1 Capability status

| Capability | Current State | Classification |
|---|---|---|
| Provider registry | Missing in runtime path | GOVERNANCE_FRAGILE |
| Model registry | UI/config hints only; not bound to provider abstraction | PARTIALLY_IMPLEMENTED |
| Credential storage strategy | Env-key based, route-level reads | PARTIALLY_IMPLEMENTED |
| Provider enable/disable | Only global AI enable/disable exists | PARTIALLY_IMPLEMENTED |
| Provider capability mapping | Missing contract map | GOVERNANCE_FRAGILE |
| Provider fallback rules | Gemini model fallback only, no provider fallback | GOVERNANCE_FRAGILE |
| Provider health-state tracking | Gemini probe implemented; provider-neutral health absent | PARTIALLY_IMPLEMENTED |

### 3.2 Remaining provider coupling

| Coupling area | Current truth |
|---|---|
| Retry semantics | Gemini-specific retry/quota handling in `lib/ai/generateContent.js` |
| Response parsing | JSON cleanup assumptions differ per route, not provider-normalized |
| Token accounting | No provider-normalized token accounting in active runtime path |
| Moderation assumptions | No provider-agnostic moderation contract layer |
| Error classification | Gemini string-pattern error handling, no unified taxonomy |

### 3.3 Explicit hardcoding findings

- Remaining Gemini hardcoding: PRESENT (`GoogleGenerativeAI`, Gemini model constants, Gemini probe in system health).
- Provider-coupled execution paths: PRESENT across admin AI/blog/seo/recruiter/pagegen.
- Provider-specific response assumptions: PRESENT (route-specific JSON parsing fallbacks).
- Provider-specific retry assumptions: PRESENT (429/quota/retry timings tied to Gemini path).
- Provider-specific formatting assumptions: PRESENT (prompt/system instruction flow shaped to Gemini path).

### 3.4 Foundation classification

`PARTIALLY_IMPLEMENTED` with `GOVERNANCE_FRAGILE` risk envelope.

## 4. Step 1.25 - AI Authority Topology Mapping

| Authority domain | RC-FR4 result |
|---|---|
| Runtime mutation authority | AUTHORITY_PRESERVED in this cycle (analysis/docs only) |
| Publishing authority | AUTHORITY_PRESERVED |
| Deployment authority | AUTHORITY_PRESERVED |
| Automation authority | AUTHORITY_PRESERVED |
| Queue authority | AUTHORITY_PRESERVED |

Note: Future provider-routing activation would widen authority if not separately gated.

## 5. Step 1.5 - Provider Governance Trust Classification

| Trust domain | Classification |
|---|---|
| Rollback trust | PARTIALLY_TRUSTED |
| Deployment trust | PARTIALLY_TRUSTED |
| Observability trust | PARTIALLY_TRUSTED |
| Provider-switch trust | GOVERNANCE_FRAGILE |
| Outage survivability trust | GOVERNANCE_FRAGILE |

## 6. Step 3 - Admin AI Control Plane Reconstruction

Current admin control surfaces:
- `/api/admin/config` (global controls including `ai_enabled`)
- `/api/admin/workflow-config` + UI (`/admin/control/workflow`) for config keys including model-like values
- `/api/admin/system-health` exposes AI status with Gemini-specific probe

Gaps for implementation-ready foundation:
- no provider registry admin surface
- no credential manager surface with provider scoping
- no task-router policy surface
- no provider-level kill switches independent from global `ai_enabled`
- no provider-neutral health panel

Control-plane survivability under events:
- provider rotation: FRAGILE
- credential rotation: PARTIAL
- provider removal: FRAGILE
- provider degradation: PARTIAL
- feature-flag reload: PARTIAL
- queue/runtime restart: PARTIAL
- admin-session renewal: PARTIAL

## 7. Step 4 - Safe Implementation Grouping

| Group | Scope | Classification |
|---|---|---|
| G1 Provider registry schema-in-code and adapters | Add provider registry contracts and provider-neutral interfaces without switching runtime path | SAFE_TO_IMPLEMENT |
| G2 Model registry and task-policy contract layer | Add explicit task->provider/model mapping contracts in code + config read paths | SAFE_TO_IMPLEMENT |
| G3 Admin settings read-only provider view | Expose provider/task/model governance state in admin UI, no activation controls | REQUIRES_DEPLOYMENT |
| G4 Credential manager workflow shell | Add bounded credential metadata management flow (without replacing env runtime) | REQUIRES_DEPLOYMENT |
| G5 Runtime router activation | Route live AI tasks through new provider registry/task router | REQUIRES_RUNTIME_ACTIVATION |
| G6 Provider fallback live failover | Enable automated cross-provider failover in production execution | HIGH_RISK |
| G7 Queue-wide AI/runtime activation expansion | Any broad worker/pagegen activation coupled with new routing | DO_NOT_ENABLE_YET |

Dependency closure proof requirement retained for all activation groups.

## 8. Step 5 - Final Authorization

Final RC-FR4 authorization:
`FOUNDATION_REQUIRES_MORE_RECONSTRUCTION`

Downgrade reason:
- provider governance remains provider-coupled in active runtime path
- task-routing architecture is still missing in runtime-authoritative form
- provider-switch and outage survivability controls are not independently trusted

## 9. Hard Stop

RC-FR4 stops here. No unrestricted AI generation or mass worker enablement is authorized.
