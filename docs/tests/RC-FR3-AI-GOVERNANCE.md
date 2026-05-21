# RC-FR3 AI Governance Validation

Date: 2026-05-16
Cycle: RC-FR3

---

## 1. Governance Objective

Evaluate whether current AI governance can survive:
- provider outage
- quota exhaustion
- malformed responses
- partial provider degradation

Without widening authority or violating rollback isolation.

## 2. Current Governance Capabilities

| Capability | Current State | Classification |
|---|---|---|
| Global AI enable/disable (`ai_enabled`) | Implemented in runtime config and enforced in major AI routes | CURRENTLY_IMPLEMENTED |
| Page generation gate (`pagegen_enabled` + `safe_mode`) | Implemented before pagegen execution | CURRENTLY_IMPLEMENTED |
| Prompt template gate (`ai_prompt_templates_enabled`) | Implemented in prompt engine | CURRENTLY_IMPLEMENTED |
| Admin-controlled switching | Runtime toggle exists via `/api/admin/config` | PARTIALLY_IMPLEMENTED |
| Provider-level enable/disable | No per-provider runtime controls | MISSING_FOUNDATION |
| Model-level routing policy | UI/workflow config exists but not bound to runtime provider abstraction | PARTIALLY_IMPLEMENTED |
| Task-level routing policy | Action prompts exist; no provider-neutral routing fabric | PARTIALLY_IMPLEMENTED |
| Credential rotation control plane | Environment-key based only, no first-class admin rotation workflow | MISSING_FOUNDATION |
| Cost governance hard enforcement | Cost guard utility exists, not mandatory at all AI execution entrypoints | PARTIALLY_IMPLEMENTED |
| Fallback provider behavior | Model fallback inside Gemini only | HIGH_RISK |

## 3. Failure-Mode Survivability

| Failure Mode | Current Outcome | Survivability |
|---|---|---|
| Provider outage (Gemini unavailable) | Degraded/failed AI paths; guard may still allow attempts when enabled | PARTIAL |
| Quota exhaustion | Explicit probe and retry paths detect exhaustion; generation can still fail hard | PARTIAL |
| Malformed responses | Several routes attempt JSON parse cleanup with partial fallback | PARTIAL |
| Partial provider degradation | No provider switch lane in active runtime; degradation remains coupled | LOW |

## 4. Trust Classification

| Trust Domain | Classification | Notes |
|---|---|---|
| Rollback trust | PARTIALLY_TRUSTED | Gating allows fast disable, but provider coupling complicates controlled re-enable paths. |
| Observability trust | PARTIALLY_TRUSTED | Health probes and logs exist; provider-neutral truth model is missing. |
| Deployment trust | PARTIALLY_TRUSTED | Mixed local/modified AI surfaces reduce deployment confidence. |
| Cost-governance trust | GOVERNANCE_FRAGILE | Cost instrumentation not enforced as mandatory preflight for all AI routes. |
| Provider-switch trust | GOVERNANCE_FRAGILE | OpenAI wrapper exists but no integrated provider registry/routing. |

## 5. Required Governance Reconstruction (Future-Safe)

Minimum foundation required before broader activation:
1. Provider registry with explicit provider health/capability contract.
2. Task-router that selects provider+model by policy, not hardcoded call sites.
3. Provider-neutral response adapter and error taxonomy.
4. Provider-level kill switches and model-level controls in runtime control plane.
5. Mandatory cost and quota preflight gate for all generation entrypoints.

## 6. Final Governance Classification

`GOVERNANCE_FRAGILE`

Authorization consequence:
- AI control-plane restoration is limited to bounded visibility and architecture reconstruction.
- Runtime broad AI recovery remains unauthorized in RC-FR3.
