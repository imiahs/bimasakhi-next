# RC-FR6 Governance-Safe Provider Registry and Task-Policy Foundation

Date: 2026-05-16
Cycle: RC-FR6

---

## 1. Scope and Safety Envelope

RC-FR6 is a bounded governance-foundation reconstruction cycle only.

Not performed:
- unrestricted AI activation
- provider switching/failover activation
- queue-wide runtime cutover
- autonomous publishing activation
- SHOS widening
- rollback redesign
- observability redesign

Runtime behavior in RC-FR6: unchanged.

## 2. Step 1 - Provider Registry Foundation

Runtime-truth summary:
- active execution remains Gemini-coupled through `lib/ai/generateContent.js` and `lib/ai/index.js`
- provider wrappers exist physically, but runtime-authoritative provider registry does not exist
- admin config/workflow surfaces provide control-plane values but not execution-authoritative provider routing

| Provider registry concern | Current state | Classification |
|---|---|---|
| Runtime provider authority | Missing central runtime registry | HIGH_RISK |
| Capability map by task/mode | Not runtime-authoritative | HIGH_RISK |
| Provider selection policy | Hardcoded active path | PROVIDER_COUPLED |
| Control-plane visibility | Partial via config/flags | PARTIALLY_IMPLEMENTED |
| Deployment safety | Foundation-only feasible | LIMITED_FOUNDATION_ONLY |

Step 1 classification: `FOUNDATION_PRESENT_BUT_NON_AUTHORITATIVE`.

## 3. Step 1.1 - Primitive Survivability

| Primitive | Current survivability | Classification |
|---|---|---|
| Missing provider registry row | No runtime fallback contract | FRAGILE |
| Unknown provider capability | No neutral negotiation layer | FRAGILE |
| Registry schema drift | No authoritative drift sentinel in execution lane | PARTIAL |
| Provider credential invalidation | Surface-level failure only | PARTIAL |

Step 1.1 classification: `PARTIALLY_SURVIVABLE`.

## 4. Step 1.25 - Authority Mapping

Authority mapping (runtime truth):
- execution authority: provider-coupled generation path
- governance authority: partial global controls (`ai_enabled`, `pagegen_enabled`, `safe_mode`, `queue_paused`)
- registry authority: not runtime-authoritative
- task-policy authority: not runtime-authoritative

Step 1.25 classification: `AUTHORITY_PARTIAL_AND_SPLIT`.

## 5. Step 1.4 - Trust Boundaries

| Boundary | Classification | Notes |
|---|---|---|
| Control plane -> execution | PARTIALLY_TRUSTED | Global gates exist, but route-level symmetry gaps remain. |
| Provider registry -> execution | NOT_TRUSTED | Registry not execution-authoritative yet. |
| Model policy -> execution | NOT_TRUSTED | No task-bound model authority runtime. |
| Health telemetry -> routing decisions | PARTIALLY_TRUSTED | Provider probe exists but Gemini-specific. |

Step 1.4 classification: `TRUST_BOUNDARIES_PARTIAL`.

## 6. Step 1.5 - Execution Envelope Foundation

Required neutral execution-envelope components:
- provider-neutral request envelope
- normalized response envelope
- normalized error envelope
- retry taxonomy envelope
- escalation envelope

Runtime-truth state:
- envelope pieces are route-local or provider-coupled today
- no single authoritative execution envelope exists

Step 1.5 classification: `ENVELOPE_FOUNDATION_INCOMPLETE`.

## 7. Step 1.75 - Envelope Authority Model

| Envelope layer | Authority status |
|---|---|
| Request normalization | PARTIAL |
| Response normalization | PARTIAL |
| Error normalization | PARTIAL |
| Retry taxonomy normalization | FRAGILE |
| Escalation policy normalization | FRAGILE |

Step 1.75 classification: `LIMITED_ENVELOPE_AUTHORITY`.

## 8. Step 2 - Task Policy Foundation

Runtime-truth summary:
- task selection is prompt/action mapping, not runtime provider-task policy routing
- no runtime-authoritative task-policy registry for provider/model constraints

| Task-policy concern | Current state | Classification |
|---|---|---|
| Task-to-provider policy | Missing runtime authority | HIGH_RISK |
| Task-to-model policy | Missing runtime authority | HIGH_RISK |
| Policy precedence | Implicit/ad hoc | PARTIAL |
| Policy observability | Partial by logs and guards | PARTIAL |

Step 2 classification: `LIMITED_FOUNDATION_ONLY`.

## 9. Step 2.5 - Symmetry Validation

Route-level governance symmetry check:
- routes with explicit `ai_enabled` gate in-route: present on several admin/worker paths
- known asymmetry: `app/api/admin/ai/pages/route.js`, `app/api/admin/ai/landing/route.js` do not enforce explicit in-route `ai_enabled`

Step 2.5 classification: `SYMMETRY_INCOMPLETE`.

## 10. Step 2.75 - Drift Detection

Drift classes detected:
- governance drift: global control exists, route-level enforcement is inconsistent
- authority drift: control-plane visibility exceeds execution-plane authority
- provider drift: health probes and retry semantics are Gemini-biased
- policy drift: task-policy intent is documented but not runtime-authoritative

Step 2.75 classification: `DRIFT_PRESENT_REQUIRES_HARDENING`.

## 11. Step 3 - Retry Taxonomy and Failure Governance

Runtime-truth summary:
- retry semantics in `lib/ai/generateContent.js` remain provider-coupled (`429`, `quota`, model-not-found branches)
- no neutral retry taxonomy shared across all AI execution surfaces

| Failure domain | Current state | Classification |
|---|---|---|
| Retry class taxonomy | Provider-coupled | FRAGILE |
| Error normalization | Partial/string-based | PARTIAL |
| Escalation policy | Mixed route behavior | PARTIAL |
| Backoff governance | Provider-specific assumptions | FRAGILE |

Step 3 classification: `FAILURE_GOVERNANCE_PARTIAL_AND_COUPLED`.

## 12. Step 3.5 - Failure Governance Trust Model

| Trust area | Classification |
|---|---|
| Retry trust | LOW |
| Error-contract trust | PARTIAL |
| Outage survivability trust | PARTIAL |
| Cross-provider portability trust | LOW |

Step 3.5 classification: `TRUST_LIMITED`.

## 13. Step 4 - Safe Grouping

| Group | Scope | Classification |
|---|---|---|
| G1 Provider/task/model registry interfaces (disabled) | Add registry contracts and schema validators without runtime cutover | SAFE_TO_IMPLEMENT |
| G2 Neutral execution envelope contracts | Central response/error/retry envelope types and validators | SAFE_TO_IMPLEMENT |
| G3 Symmetry hardening at route gates | Add missing in-route `ai_enabled` gates | SAFE_TO_IMPLEMENT |
| G4 Drift detection sentinels | Add governance and policy drift probes, non-blocking mode | REQUIRES_DEPLOYMENT |
| G5 Shadow policy resolver | Compute routing decisions in shadow path only | REQUIRES_DEPLOYMENT |
| G6 Active runtime provider/task cutover | Make registry/policy execution-authoritative | REQUIRES_RUNTIME_ACTIVATION |
| G7 Automated provider failover | Enable autonomous switching under load | HIGH_RISK |

## 14. Step 5 - Survivability

Survivability under bounded RC-FR6 foundation state:
- provider outage survivability: PARTIAL
- quota exhaustion survivability: PARTIAL
- policy corruption survivability: FRAGILE
- route-gate asymmetry survivability: FRAGILE
- control-plane drift survivability: PARTIAL

Step 5 classification: `PARTIALLY_SURVIVABLE_WITH_FRAGILE_ZONES`.

## 15. Step 6 - Final Authorization

Final RC-FR6 authorization:
`FOUNDATION_REQUIRES_MORE_RECONSTRUCTION`

Downgrade basis:
- provider registry and task policy remain non-authoritative in active execution
- retry taxonomy and failure governance remain provider-coupled
- route-level gate symmetry remains incomplete
- drift detection is not execution-authoritative

## 16. Hard Stop

RC-FR6 stops here. No live provider switching or runtime cutover is authorized.
