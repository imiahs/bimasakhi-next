# RC-2C First-Deploy Containment Reconstruction

Date: 2026-05-14
Mode: Containment analysis only

## Objective

Determine first-deploy-safe containment strategy for SHOS without uncontrolled runtime mutation authority.
No deployment, no runtime mutation, no implementation in this cycle.

## Containment Options Reconstructed

### 1) OPERATOR_DISCIPLINE_ONLY
- Safe: NO (insufficient as primary containment)
- Pros: zero code changes
- Cons: authority remains armed; relies on perfect human behavior; hidden GET side effect remains
- Rollback safety: weak (cannot prevent first accidental write)

### 2) FEATURE_FLAG_GATED
- Safe: PARTIAL (depends on gate placement)
- Pros: explicit authority switch possible
- Cons: if gate is only on POST and not on hidden auto-revert path, GET mutation risk remains
- Rollback safety: medium

### 3) READ_ONLY_MODE_REQUIRED
- Safe: YES if enforced at SHOS action layer and GET side effects neutralized
- Pros: enables observability-first rollout
- Cons: requires explicit read-only enforcement design/implementation in separate cycle
- Rollback safety: high

### 4) MUTATION_SUPPRESSION_REQUIRED
- Safe: YES (recommended)
- Pros: directly addresses uncontrolled authority and hidden writes
- Cons: requires dedicated implementation cycle before deploy
- Rollback safety: highest for first deploy

### 5) SPLIT_DEPLOY_REQUIRED
- Safe: CONDITIONAL
- Pros: can deploy observability UI/GET first
- Cons: unsafe if GET still has hidden write side effect
- Rollback safety: medium

### 6) SAFE_FIRST_DEPLOY_POSSIBLE (current code as-is)
- Safe: NO as default posture
- Pros: none beyond speed
- Cons: deploy introduces immediate mutation authority and hidden side-effect risk
- Rollback safety: limited by persisted writes

### 7) NOT_SAFE_FOR_FIRST_DEPLOY
- Safe: classification when no suppression/freeze is applied
- Pros: prevents risky rollout
- Cons: blocks deployment until containment controls are defined
- Rollback safety: n/a

## First-Deploy Safe Mode Analysis

From code-path authority and observability coupling:

- read-only deploy feasibility: not intrinsically safe in current design
- mutation suppression feasibility: required for safe first staged deployment
- operator freeze feasibility: helpful but weaker than suppression
- super_admin-only visibility: partially present, but not sufficient because multiple admin routes consume getShosSnapshot
- explicit action unlock: needed for trustable control boundary
- staged authority enablement: required for safe rollout sequencing

## Rollback Safety Under Containment Options

| Option | Rollback-safe | Queue-safe | Operator-safe | Observability-safe |
|---|---|---|---|---|
| Operator discipline only | Low | Low | Low | Low |
| Feature-flag gated only | Medium | Medium | Medium | Medium |
| Read-only mode required | High | High | High | High |
| Mutation suppression required | High | High | High | High |
| Split deploy only | Medium | Medium | Medium | Low-to-Medium |
| Current code as-is | Low | Low | Low | Low |

## Operator Trust Analysis

### Truthful surfaces
- Explicit POST actions that declare action names and reasons.
- Direct super_admin-only SHOS route signals higher control sensitivity.

### Misleading surfaces
- GET-based observability endpoints that appear read-only but can mutate via auto-revert path.

### Hidden authority surfaces
- processDueFeatureFlagReverts execution inside getShosSnapshot.
- runMappedAction paths that can escalate from alert/error retry into broader mutation actions.

### Dangerous operator assumptions
- Assuming observation routes are non-mutating.
- Assuming rollback undoes data writes.
- Assuming super_admin-only gate fully contains all snapshot-triggered effects.

## Final Containment Decision

SAFE_ONLY_WITH_MUTATION_SUPPRESSION

Reason:

- Mutation authority is broad on first deploy.
- Observation and control are coupled by hidden GET side effect.
- Rollback cannot undo persisted operational writes.
- Mutation suppression is the minimum containment that directly neutralizes uncontrolled first-deploy authority.

## Final Containment Matrix

| Containment Strategy | Safe | Operational Cost | Rollback Safety | Recommended |
|---|---|---|---|---|
| OPERATOR_DISCIPLINE_ONLY | NO | Low | Low | NO |
| FEATURE_FLAG_GATED | PARTIAL | Medium | Medium | NO |
| READ_ONLY_MODE_REQUIRED | YES | Medium | High | YES |
| MUTATION_SUPPRESSION_REQUIRED | YES | Medium | High | YES (PRIMARY) |
| SPLIT_DEPLOY_REQUIRED | PARTIAL | Medium-High | Medium | CONDITIONAL |
| SAFE_FIRST_DEPLOY_POSSIBLE (as-is) | NO | Low | Low | NO |
| NOT_SAFE_FOR_FIRST_DEPLOY | N/A (risk stop-state) | N/A | N/A | CONDITIONAL STOP-STATE |

## Remaining Deployment Risks

1. Hidden auto-revert write path on snapshot GET unless suppressed.
2. Immediate high-authority mutation actions available after deploy.
3. Persisted runtime writes survive code rollback.
4. Operator trust risk if observability is perceived as read-only while authority remains active.

## Collateral Safety Validation

No runtime mutation actions were executed in RC-2C. Production runtime remained unchanged within observed verification window.
