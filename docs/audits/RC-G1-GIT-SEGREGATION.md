# RC-G1 Git Segregation

Date: 2026-05-16
Cycle: RC-G1

---

## 2. Deployment Surface Segregation

### Deterministic Grouping Model

#### Group A — Runtime-Critical Deployment Surface

Classification: `ATOMIC_ONLY` or `REVIEW_REQUIRED` per subgroup.

- A1 Auth Atomic Pair (`ATOMIC_ONLY`):
  - `middleware.js`
  - `lib/auth/withAdminAuth.js`

- A2 SHOS Canary/Control Atomic Surface (`ATOMIC_ONLY`):
  - `lib/system/shos.js`
  - `app/api/admin/system/shos/route.js`
  - `features/admin/system/ShosControlCenter.jsx`
  - `app/admin/system/page.js`
  - `app/api/admin/system/route.js`
  - `app/api/admin/system/health/route.js`
  - `app/api/admin/system-health/route.js`
  - `app/api/admin/queue/route.js`
  - `app/api/admin/dlq/route.js`
  - `app/api/admin/delivery-logs/route.js`
  - `app/api/admin/observability/route.js`

- A3 Health/Truth Aggregation Coupled Surface (`REVIEW_REQUIRED` before independent deploy):
  - `lib/system/systemHealth.js`
  - `lib/queue/deliveryTruth.js`
  - any dependent admin health/observability API routes

#### Group B — Docs-Only Surface

Classification: `SAFE_DEPLOYABLE`

- `docs/**`
- documentation-only top-level markdown files

Operational rule:

- docs-only commits may deploy independently because they do not mutate runtime behavior.

#### Group C — Admin-Only UI Surface (non-authority expanding)

Classification: `REVIEW_REQUIRED` by dependency closure.

- `app/admin/**`
- `features/admin/**`

Operational rule:

- deploy-safe only if no authority-expanding backend coupling is included.

#### Group D — Local Experimental/Forensic Surface

Classification: `LOCAL_ONLY` or `DO_NOT_DEPLOY`

- local probes/scripts not production-authorized
- generated logs and audit result artifacts (e.g., `next-build.log`, `scripts/audit/results/**`)
- throwaway forensic artifacts

## 2.1 Coexistence / Rollback Ambiguity Checks

Potential ambiguity reintroduction vectors if grouping is violated:

- mixed deployment of SHOS-wired routes without SHOS core
- independent auth/middleware deployment split
- observability route changes without matching truth-helper updates

Conclusion:

- deterministic atomic grouping is mandatory to avoid stale-runtime divergence and rollback ambiguity.

## 3. Rollback Clarity Restoration

### Rollback-Safe Deployment Groups

- docs-only commits (independent reversible, low risk)
- auth atomic pair (must revert atomically)
- SHOS atomic surface (must revert atomically)

### Rollback-Dangerous Mixed Surfaces

- mixed runtime + docs + generated artifacts in one deployment
- partial SHOS/control-plane deploys
- partial health/observability truth deploys

### Undeployed Drift Risk

- high when dirty runtime-critical files coexist with large untracked docs/generated files
- drift remains until operational and non-operational surfaces are cleanly segregated in git

## 4. Deployment Baseline Restoration

Smallest clean operational deployment baseline definition:

- production-equivalent runtime-critical files only
- explicitly grouped as atomic where required
- docs isolated into independent docs-only commits
- local/generated artifacts excluded from deploy surface

Intentionally deferred surfaces:

- experimental/local-only files
- generated logs/result artifacts
- review-required cross-coupled runtime surfaces pending dependency closure

Deferred-surface safety requirements:

- documented
- operationally isolated
- rollback-independent

## 4.5 Deployment Trust Boundary Restoration

Trust-boundary evaluation:

- rollback trust: restored only if atomic grouping enforced
- observability trust: preserved when observability-sensitive files deploy with dependency closure
- coexistence trust: preserved when no partial authority-expanding deploy occurs
- deployment authority clarity: improved by explicit group taxonomy; not fully restored while dirty mixed state persists

Trust classification:

PARTIALLY_RESTORED

## 5. Final Git Authorization

Final classification:

REQUIRES_MANUAL_GIT_INTERVENTION

Reason:

- repository remains materially dirty with mixed runtime/docs/generated surfaces
- deterministic grouping model is defined, but baseline cleanliness requires explicit human git segregation actions (staging/commit partitioning and artifact cleanup)

## Final Deployment Matrix

| Surface | Classification | Deploy Safe | Rollback Safe | Notes |
|---|---|---|---|---|
| Auth atomic pair | ATOMIC_ONLY | Yes (atomic only) | Yes (atomic only) | Split deploy forbidden |
| SHOS control/canary atomic set | ATOMIC_ONLY | Yes (atomic only) | Yes (atomic only) | Partial deploy recreates ambiguity |
| Health/observability truth helpers with dependents | REVIEW_REQUIRED | Conditional | Conditional | Dependency closure required |
| Admin-only UI with no backend authority expansion | REVIEW_REQUIRED | Conditional | Conditional | Verify no hidden authority coupling |
| Docs-only surface | SAFE_DEPLOYABLE | Yes | Yes | Independent docs commits allowed |
| Local probes/experiments | LOCAL_ONLY | No | N/A | Keep out of production deploy |
| Generated logs/audit result artifacts | DO_NOT_DEPLOY | No | N/A | Remove or archive outside deploy surface |

## Final Git-State Matrix

| Category | Count | Risk | Operational Impact |
|---|---:|---|---|
| runtime_critical | 27 | High | Direct runtime/deploy ambiguity risk if mixed |
| admin_surface | 18 | Medium-High | Can widen operator/authority behavior if coupled |
| docs_only | 132 | Low | Safe when isolated; noisy when mixed |
| scripts_tools | 4 | Medium | Tooling/probe drift risk |
| config_infra | 1 | Medium | Deployment behavior influence possible |
| generated_or_logs | 89 | Medium | Pollutes git/deploy clarity; non-runtime artifacts |
| unknown_other | 0 | Low | No unclassified path remains |
| total_dirty_count | 271 | High | Manual segregation required before deterministic baseline claims |

## Final Authority Matrix

| Surface | Authority Type | Rollback Sensitivity | Deploy Coupling | Isolation Status |
|---|---|---|---|---|
| `middleware.js` + `lib/auth/withAdminAuth.js` | Access/Deployment authority | High | Atomic required | Partially isolated (policy defined) |
| SHOS core + SHOS route + SHOS-wired admin routes | Runtime mutation / SHOS authority | High | Atomic required | Partially isolated (policy defined) |
| admin health/observability routes + truth helpers | Observability authority | Medium-High | Coupled with helpers | Review-required |
| queue/dlq/delivery admin routes | Operational governance authority | Medium-High | Coupled with SHOS/health truth | Review-required |
| docs surfaces | Documentation authority | Low | Independent | Isolated |
| generated logs/audit artifacts | No production authority | None | Must not deploy | Not yet physically segregated |

## Remaining Blockers

- physically dirty mixed git state remains
- runtime-critical and non-runtime artifacts still co-resident in dirty working tree
- review-required coupled runtime surfaces need explicit staging discipline

## Remaining Operational Ambiguities

- exact per-file commit partitioning is still operator-executed, not automated
- some cross-coupled runtime helpers require case-by-case dependency confirmation before independent deployment

## Production Runtime Status

Unchanged by RC-G1 (read-only git segregation cycle).

## Final Git Restoration State

REQUIRES_MANUAL_GIT_INTERVENTION
