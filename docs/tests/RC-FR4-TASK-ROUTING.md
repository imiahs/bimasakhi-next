# RC-FR4 Task Routing Validation

Date: 2026-05-16
Cycle: RC-FR4

---

## 1. Validation Objective

Define bounded task-routing architecture and classify survivability/trust without broad AI activation.

## 2. Task Routing Truth Matrix

| Task | Current Provider | Future Routing | Fallback | Risk |
|---|---|---|---|---|
| Blog generation | Gemini path (`admin/blog`) | Task policy: `blog_generation -> provider_registry` | Provider-aware fallback chain | HIGH |
| SEO analysis | Gemini path (`admin/seo/analyze`) | Task policy: `seo_analysis -> provider_registry` | Provider-aware fallback chain | MEDIUM-HIGH |
| CRM summarization/lead analysis | Gemini action path (`lib/ai/index`) | Task policy: `lead_analysis -> provider_registry` | Provider-aware fallback chain | HIGH |
| Recruiter flows | Gemini path (`admin/ai/recruiter`) | Task policy: `recruiter_analysis -> provider_registry` | Provider-aware fallback chain | HIGH |
| Media generation prompts | Not fully runtime-authoritative | Task policy: `media_generation -> provider_registry` | Deferred until provider contracts mature | HIGH |
| Moderation | No provider-neutral runtime layer | Task policy: `moderation -> provider_registry` | Required preflight moderation adapter | HIGH |
| Embeddings | No active routing lane | Task policy: `embeddings -> provider_registry` | Deferred | HIGH |
| Future automation flows | Ad-hoc/global AI gate dependent | Task policy per automation class | Provider-aware fallback + guard coupling | HIGH |

## 3. Task-Routing Reachability Classification

| Dimension | Classification |
|---|---|
| Physically possible | YES (architecture can be added without activation) |
| Runtime reachable | PARTIAL (current routes are reachable but not provider-routed) |
| Operationally trusted | PARTIALLY_TRUSTED |
| Deployment-authorized | LIMITED (foundation-only, no runtime switch) |
| Rollback-safe | PARTIAL (safe for foundation scaffolding, not for live multi-provider switch) |

## 4. Survivability Checks

| Failure case | Current survivability |
|---|---|
| Provider outage | PARTIAL (global disable and degraded states, no provider switch) |
| Malformed response | PARTIAL (route-specific parsing, inconsistent contracts) |
| Quota exhaustion | PARTIAL (Gemini-specific handling only) |
| Retry storm | PARTIAL (some guarded behavior, not provider-normalized) |
| Partial provider degradation | GOVERNANCE_FRAGILE |

## 5. Task Routing Foundation Grouping

- SAFE_TO_IMPLEMENT: task policy contract definitions and provider-neutral route interfaces.
- REQUIRES_DEPLOYMENT: admin task-routing config visibility and validation tooling.
- REQUIRES_RUNTIME_ACTIVATION: binding live tasks to new provider-router execution path.
- HIGH_RISK: automatic task migration across providers under degraded conditions.
- DO_NOT_ENABLE_YET: queue-wide provider routing activation without outage/rollback drills.

## 6. Final Task-Routing Classification

`LIMITED_FOUNDATION_ONLY`
