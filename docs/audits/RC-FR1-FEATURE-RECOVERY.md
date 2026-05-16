# RC-FR1 Feature Recovery and Deployment Reconstruction

Date: 2026-05-16
Cycle: RC-FR1

---

## 1. Scope and Method

Objective: reconstruct the true recoverable runtime/admin/product surface after RC stabilization and RC-G2 physical segregation.

Evidence sources:
- current working tree (`git status --short`): 49 paths
- runtime/admin/product dirty surfaces under `app/**`, `features/**`, `lib/**`
- gating/suppression evidence in runtime code (`ai_enabled`, `pagegen_enabled`, `safe_mode`, SHOS suppression)

No deployment, runtime mutation, schema mutation, migration, or SHOS widening was executed.

## 2. Surface Reconstruction

### Dirty surface inventory (post RC-G2)

- Modified tracked: 41
- Untracked: 8

Untracked recovery-critical surfaces:
- `app/api/admin/cms/structure/route.js`
- `features/admin/content/ContentInventoryContent.jsx`
- `lib/ai/promptEngine.js`
- `lib/cms/resolveRoute.js`
- `lib/cms/resolveCmsRoute.js`
- plus 4 local scripts (forensic/probe)

### RC-FR1 state classification

- `DEPLOYED_AND_ACTIVE`: existing production-backed admin/runtime baselines (auth middleware chain, current published routes, worker lanes)
- `LOCAL_ONLY`: all untracked recovery-critical code and local scripts
- `PARTIALLY_WIRED`: tracked files importing untracked surfaces (CCC/CMS/prompt-engine routes)
- `FEATURE_GATED`: AI and generation surfaces gated by control-plane flags
- `SUPPRESSED`: SHOS mutation actions suppressed for safety in current recovery era
- `ORPHANED`: route-registry references/UI paths without guaranteed deployed dependency parity
- `RECOVERABLE`: CMS/CCC/media/prompt-engine/admin surfaces are recoverable with staged grouped deployment

## 3. Authority Surface Mapping

- authority-neutral: docs and local scripts
- authority-expanding: admin config/actions, system control APIs, CCC generation endpoints, worker dispatch interfaces
- rollback-sensitive: catch-all resolver (`app/[...slug]/page.js` + `lib/cms/*`), pagegen/prompt-engine chain, delivery/system health helpers
- observability-sensitive: `lib/system/systemHealth.js`, `features/admin/system/ObservabilityContent.jsx`, SHOS-backed admin system routes
- coexistence-sensitive: SHOS mutation paths and admin action routes that touch queue/DLQ/delivery/error lanes

## 4. Recovery Trust

- `TRUSTED_RECOVERY`: media metadata/UI polish and isolated admin UI that does not widen control-plane authority
- `PARTIALLY_TRUSTED`: CCC/CMS inventory and prompt-template UX requiring undeployed dependencies and control-plane gates
- `RECOVERY_FRAGILE`: resolver/catch-all + prompt-engine + pagegen + worker/control surfaces where rollback and observability coupling are high

## 5. Deployment Reconstruction Findings

Likely feature-disappearance causes in RC era:
- deployment divergence between tracked modified files and missing untracked dependencies
- deliberate suppression of SHOS mutation execution paths
- AI execution gates (`ai_enabled=false`) causing expected runtime non-activation
- feature-flag gating (`pagegen_enabled`, `bulk_generation_enabled`, `ai_prompt_templates_enabled`)

Ghost-visibility risk confirmed:
- admin route/menu surfaces advertise capabilities that can be local-only or gated in current runtime state

## 6. Safe Recovery Grouping

### Group FR-A (lowest risk)
- Admin UI-only route wrappers and non-authority-expanding UX polish
- Classification: `SAFE_TO_RESTORE`

### Group FR-B (CMS/CCC dependency closure)
- `features/admin/content/ContentInventoryContent.jsx`
- `app/api/admin/cms/structure/route.js`
- dependent `app/admin/ccc/page.js`, `app/admin/blog/page.js`, `app/admin/resources/page.js`
- Classification: `REQUIRES_DEPLOYMENT`

### Group FR-C (Prompt engine chain)
- `lib/ai/promptEngine.js`
- dependent blog/pagegen/admin generation routes
- Classification: `REQUIRES_DEPLOYMENT` + `REQUIRES_RUNTIME_ACTIVATION` (gated by `ai_enabled` and template flag)

### Group FR-D (Resolver chain)
- `lib/cms/resolveRoute.js`, `lib/cms/resolveCmsRoute.js`
- dependent catch-all `app/[...slug]/page.js`
- Classification: `HIGH_RISK` (rollback-coupled)

### Group FR-E (Control/observability sensitive)
- `lib/system/systemHealth.js`, `lib/queue/deliveryTruth.js`, admin system/action APIs
- Classification: `DO_NOT_RESTORE_YET` unless isolated and co-reviewed as atomic rollback-sensitive set

## 7. Authorization

Final RC-FR1 authorization classification: `LIMITED_RECOVERY_ONLY`

Rationale:
- recoverability is real, but several surfaces remain rollback-sensitive, suppression-fragile, or deployment-ambiguous unless grouped and deployed with strict dependency closure.
