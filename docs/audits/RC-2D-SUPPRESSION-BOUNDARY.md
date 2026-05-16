# RC-2D Suppression Boundary Analysis

Date: 2026-05-14
Scope: Minimal suppression boundary reconstruction only

## Candidate Boundaries Evaluated

| Boundary | Safety | Coupling | Blast Radius | Rollback Boundary Quality | Result |
|---|---|---|---|---|---|
| Route-level only | Medium | High (many routes) | Medium | Medium | Insufficient alone |
| Snapshot-level only | Medium | Medium | Medium | Medium | Insufficient alone |
| Auto-revert-level only | Medium | Low | Low | High | Insufficient alone |
| Feature-flag-level only | Low-Medium | Medium | High if bypassed | Medium | Insufficient |
| Action-dispatch-level | High | Low-Medium | Low | High | Strong candidate |
| performShosAction-level + auto-revert-level | High | Low | Low | High | **Smallest safe boundary** |

## Boundary Decision

Smallest safe suppression boundary:

1. performShosAction-level suppression for all mutation-capable action execution.
2. auto-revert-level suppression in getShosSnapshot path (disable processDueFeatureFlagReverts execution in first-deploy suppression mode).

Why this is minimal and safe:

- It centralizes control in SHOS core rather than touching many routes.
- It neutralizes hidden GET writes and explicit POST writes with the least surface area.
- It preserves observability data assembly paths while removing mutation authority.

## What Must Be Suppressed

| Runtime Behavior | Classification | Reason |
|---|---|---|
| processDueFeatureFlagReverts on GET snapshot | MUST_SUPPRESS | Hidden write on observation path |
| feature_flag_set actions | MUST_SUPPRESS | Global runtime control writes |
| queue_retry/queue_clear/queue_cancel actions | MUST_SUPPRESS | Queue state mutation + dispatch potential |
| dlq_retry/requeue/resolve/discard actions | MUST_SUPPRESS | DLQ lifecycle mutation |
| delivery_retry/retry_all/mark_terminal/sync_pending | MUST_SUPPRESS | Delivery/event side effects + dispatch chains |
| event_retry/event_resolve | MUST_SUPPRESS | Event lifecycle and dispatch mutation |
| alert_fix/retry/resolve | MUST_SUPPRESS | Indirect mapped mutation authority |
| error_retry/error_resolve | MUST_SUPPRESS | Indirect mapped mutation authority |
| run_runbook | MUST_SUPPRESS | Runbook-dependent mutation authority |

## What May Remain Active

| Runtime Behavior | Classification | Reason |
|---|---|---|
| snapshot read aggregation queries (without auto-revert) | SAFE_IF_READ_ONLY | Observability visibility |
| feature-flag state display | SAFE_IF_READ_ONLY | Read-only display only |
| failure list and metrics rendering | SAFE_IF_READ_ONLY | No mutation required |

## Deployment-Blocking if Unsuppressed

- Hidden GET auto-revert behavior remains deployment-blocking for observability-first trust.
- Any unsuppressed performShosAction execution remains deployment-blocking for first deploy safety.

## Final Boundary Classification

MINIMAL_SUPPRESSION_PATH_RECONSTRUCTED

Boundary definition:
- Core-level suppression in lib/system/shos.js at performShosAction and auto-revert invocation point.
- Route wrappers can remain largely unchanged if core suppression is authoritative.
