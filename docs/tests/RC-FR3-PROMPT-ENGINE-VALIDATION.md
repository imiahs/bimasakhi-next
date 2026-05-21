# RC-FR3 Prompt Engine Validation

Date: 2026-05-16
Cycle: RC-FR3

---

## 1. Validation Objective

Determine whether prompt-engine recovery is:
- physically existing
- runtime reachable
- operationally trusted
- deployment-authorized
- rollback-safe

## 2. Prompt-Engine Dependency Map

Primary chain:
1. Admin generate surfaces (`/api/admin/blog`, `/api/admin/ccc/generate-single`) prepare payload.
2. Worker (`/api/jobs/pagegen`) calls `resolvePagePrompt`.
3. `resolvePagePrompt` depends on:
   - `getFeatureFlag('ai_prompt_templates_enabled')`
   - prompt template rows from `prompt_templates`
   - fallback prompt body from `lib/ai/promptTemplates.js`
4. AI execution still depends on Gemini-coupled generator path.

## 3. Classification by Dimension

| Dimension | Classification | Evidence |
|---|---|---|
| Physically existing | YES | `lib/ai/promptEngine.js` and template utilities exist locally. |
| Runtime reachable | PARTIAL | Reachable from pagegen/blog generation paths when queued/triggered; blocked by guards when `ai_enabled=false`. |
| Operationally trusted | PARTIALLY_TRUSTED | Guarding and fallback logic exist, but provider coupling and local-only state reduce trust. |
| Deployment-authorized | NO (bounded) | Prompt engine file is currently local-only/untracked in RC-FR3 git truth. |
| Rollback-safe | PARTIAL | Bounded if visibility-only; not safe for broad generation restoration while provider coupling remains. |

## 4. Dependency Risk Checks

| Risk Area | Result |
|---|---|
| Undeployed resolver dependency required for prompt engine | NO direct resolver dependency in prompt engine itself |
| Gated runtime path dependency | YES (`ai_enabled`, `pagegen_enabled`, `safe_mode`, `ai_prompt_templates_enabled`) |
| Pagegen coupling | YES (prompt engine is invoked in pagegen worker chain) |
| Admin generation UI coupling | YES (blog/single generation entry points) |
| Worker/runtime coupling | YES (QStash queue and pagegen worker path) |
| Suppressed generation path sensitivity | YES (guarded stop behavior depends on runtime control flags) |
| Local-only runtime assumptions | YES (`lib/ai/promptEngine.js` not yet deployment-coherent) |
| Stale feature-flag risk | PARTIAL (mixed control-plane + legacy feature flags still coexist) |

## 5. Survivability Assessment

| Survivability Type | Status | Notes |
|---|---|---|
| Rollback survivability | PARTIAL | Visibility-only recovery survivable; activation path remains provider-coupled. |
| Deployment survivability | LOW_TO_PARTIAL | Local-only prompt-engine state prevents clean deploy confidence. |
| Observability survivability | PARTIAL | Guard-block logging exists; provider-neutral observability does not. |
| Coexistence survivability | PARTIAL | Safe while AI remains gated; risk rises when enabling generation without abstraction. |

## 6. Prompt-Engine Recovery Grouping

- SAFE_TO_RESTORE: prompt template visibility, prompt preview, non-mutating prompt inspection.
- REQUIRES_DEPLOYMENT: deploy-coherent prompt-engine file state and template parity.
- REQUIRES_RUNTIME_ACTIVATION: any live generation path using prompt engine.
- HIGH_RISK: activation with direct Gemini coupling and no provider-neutral adapter.
- DO_NOT_RESTORE_YET: prompt-engine paths that require deferred resolver-chain restoration.

## 7. Final Prompt-Engine Classification

`LIMITED_AI_RECOVERY_ONLY`

Interpretation:
- Prompt-engine visibility is recoverable in bounded mode.
- Prompt-engine activation for broad generation is not yet authorization-safe.
