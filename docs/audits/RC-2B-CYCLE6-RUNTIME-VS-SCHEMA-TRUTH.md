# RC-2B Cycle 6: Runtime vs Schema Truth

## 1) Runtime-active truth vs schema truth

### Runtime-active (deployed HEAD)
- Delivery ledger table usage: external_delivery_logs
- Event retry lineage: event_store
- Operator action ledger in deployed code paths: not active via SHOS (SHOS not deployed)
- Observability ledger: observability_logs

### Schema truth (live DB)
- external_delivery_logs exists with FKs and indexes, row count 41
- event_store exists, row count 140
- system_control_actions exists, row count 44
- observability_logs exists, row count 20640
- delivery_failures table missing

Conclusion:
- Runtime-active table authority and schema authority both converge on external_delivery_logs
- delivery_failures is neither runtime-active nor schema-present

## 2) SHOS authority boundary (exact)

Boundary evaluated for SHOS code path (local implementation):

| Domain | Authority | Current deployment state |
|---|---|---|
| Queues | CONTROL/OVERRIDE (queue_retry_failed, queue_clear_failed, queue_cancel_failed) | Locally implemented, production-unused |
| DLQ | CONTROL/OVERRIDE (dlq_retry/discard/resolve/requeue) | Locally implemented, production-unused |
| Delivery retries | CONTROL/OVERRIDE (delivery_retry, delivery_retry_all, delivery_mark_terminal) | Locally implemented, production-unused |
| Feature flags | GLOBAL_CONTROL (feature_flag_set with optional auto-revert) | Locally implemented, production-unused |
| Event resolution | CONTROL/OVERRIDE (event_retry, event_resolve) | Locally implemented, production-unused |
| Observability actions | CONTROL (via runbooks and downstream logging) | Locally implemented, production-unused |

Deployed production APIs currently run without SHOS imports in HEAD admin APIs.

## 3) Mismatch matrix (migrations vs runtime vs docs)

| Layer | Truth | Mismatch |
|---|---|---|
| Migrations | external_delivery_logs canonical | None with runtime |
| Runtime (deployed HEAD) | external_delivery_logs canonical | None with migrations |
| Runtime (local SHOS) | external_delivery_logs canonical | None with migrations |
| Docs/process requirement | delivery_failures required table | Mismatch (stale contract) |

## 4) Contract decision impact options

### Option A: adopt delivery_failures as canonical
- Requires schema creation/translation later (not allowed in this cycle)
- Breaks present runtime assumptions
- Introduces global coupling and high rollback complexity
- Blast radius: GLOBAL_RUNTIME

### Option B: adopt external_delivery_logs as canonical
- Aligns with existing migrations
- Aligns with deployed runtime and local SHOS runtime
- Minimizes coupling risk
- Blast radius for contract decision itself: NONE/LOCAL (documentation/process alignment only)

## 5) Future ATOM-C prerequisites (no deployment in this cycle)

1. Freeze canonical contract: external_delivery_logs is delivery ledger authority.
2. Reconcile process docs/rules to remove required-table expectation for delivery_failures.
3. Define and lock atomic SHOS deployment set (core lib + SHOS route + all SHOS-coupled admin routes).
4. Keep schema expectation unchanged (no new delivery_failures table requirement).
5. Validate rollback target and runtime smoke tests before any future SHOS rollout.

## 6) Residual ambiguities

- Whether any external/internal SOP still mandates delivery_failures outside repository docs cannot be proven from code/db alone.
- SHOS local code remains undeployed, so SHOS authority is validated as implemented-but-production-unused.

## 7) Final truth

Runtime and schema are already aligned on external_delivery_logs.
The blocker is contract/documentation staleness, not runtime table drift.
