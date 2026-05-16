# RC-G2 Deployment Topology and Boundaries

Date: 2026-05-16
Cycle: RC-G2

---

## 1. Physical Authority Topology Mapping

| Surface | Authority Type | Rollback Coupling | Deploy Coupling | Isolation Confidence |
|---|---|---|---|---|
| docs-only (`docs/**`) | Documentation authority | None | Independent | High |
| generated artifacts (`next-build.log`, `scripts/audit/results/**`) | Non-deployable artifacts | None | Must stay excluded | High |
| auth pair (`middleware.js`, `lib/auth/withAdminAuth.js`) | Access authority | High | Atomic-only | Medium (preserved, untouched) |
| SHOS canary/control set | Runtime mutation authority | High | Atomic-only | Medium (preserved, untouched) |
| observability/delivery truth helpers (`lib/system/systemHealth.js`, `lib/queue/deliveryTruth.js`) | Observability authority | Medium-High | Coupled with dependent admin APIs | Low-Medium |
| admin surfaces (`app/admin/**`, `app/api/admin/**`, `features/admin/**`) | Operator authority | Medium | Often coupled to lib truth helpers | Medium |
| local scripts (`scripts/_forensic_check.mjs`, `scripts/live_status_check.mjs`, `scripts/rc1b1_ai_pause.mjs`, `scripts/rc1c_register_scheduled_publish.mjs`) | Local-only operator probes | None | Deployment-independent | High |

## 2. Deploy-Boundary Validation

- docs-only boundary: isolated and committed.
- generated boundary: isolated and committed.
- runtime/admin boundary: still dirty and review-required.
- local-only scripts: isolated from deploy commits.

## 3. Topology Trust Decision

- deployment trust: PARTIALLY_RESTORED
- rollback trust: PARTIALLY_RESTORED
- observability trust: PARTIALLY_RESTORED
- authority isolation trust: PARTIALLY_RESTORED

Final deployment-topology classification: `PARTIALLY_RESTORED`
