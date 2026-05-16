# RC-2C Mutation Authority Matrix

Date: 2026-05-14
Scope: First-deploy mutation containment reconstruction
Method: Code-path reconstruction only (no runtime mutation)

## Action Authority Classification

Legend:
- LOCALIZED: bounded to one row/scope
- CONTAINABLE: bounded with operator controls
- HIGH_RISK: broad live impact likely
- GLOBAL_RUNTIME: can alter system-wide behavior

### Final Mutation Authority Matrix

| Action | Blast Radius | Runtime Writes | Queue Impact | Rollback Persistence | First-Deploy Safe |
|---|---|---|---|---|---|
| feature_flag_set (enable/disable/force/validated) | GLOBAL_RUNTIME | system_control_config upsert; system_control_actions insert | Indirect global gates via queue_paused/pagegen/AI flags | Persists in DB; rollback does not revert data | NO |
| processDueFeatureFlagReverts (auto-revert on GET) | GLOBAL_RUNTIME | system_control_config update; system_control_actions insert+update | Indirect via reverted flags | Persists in DB; hidden write on GET path | NO |
| queue_retry_failed | HIGH_RISK | generation_queue update; system_control_actions insert | Requeues failed rows and dispatches pagegen payloads | Queue rows and action history persist | NO |
| queue_cancel_failed / queue_clear_failed | CONTAINABLE | generation_queue update; system_control_actions insert | Alters failed queue lifecycle state | Persists in DB | NO |
| dlq_retry / dlq_retry_all | HIGH_RISK | job_runs insert; job_dead_letters update; system_control_actions insert | Re-introduces work from DLQ | Persists in DB | NO |
| dlq_discard / dlq_clear_all / dlq_resolve | CONTAINABLE | job_dead_letters update; system_control_actions insert | Suppresses/relabels DLQ workload | Persists in DB | NO |
| dlq_requeue | CONTAINABLE | job_dead_letters update; system_control_actions insert | Reactivates previously handled DLQ rows | Persists in DB | NO |
| delivery_retry / delivery_retry_all | HIGH_RISK | external_delivery_logs update; system_control_actions insert; event_store retry writes | Can trigger queue/event dispatch chains | Persists in DB and event state | NO |
| delivery_mark_terminal | LOCALIZED | external_delivery_logs update; system_control_actions insert | No enqueue, but closes delivery rows | Persists in DB | NO |
| delivery_sync_pending | HIGH_RISK | external_delivery_logs sync writes via deliveryTruth | Indirect via delivery retry status updates | Persists in DB | NO |
| event_retry | HIGH_RISK | event_store retry path writes; system_control_actions insert | Dispatches to queue_job trigger endpoints | Persists in DB and message history | NO |
| event_resolve | LOCALIZED | event_store status update; system_control_actions insert | No dispatch, but changes event lifecycle | Persists in DB | NO |
| alert_fix / alert_retry | HIGH_RISK | Indirect writes via mapped action + system_control_actions insert | Depends on mapped action (often retry paths) | Persists in DB | NO |
| alert_resolve | LOCALIZED | system_alerts update; alert_deliveries ack update; system_control_actions insert | No direct queue impact | Persists in DB | NO |
| error_retry | HIGH_RISK | Indirect writes via mapped action + system_control_actions insert | Depends on mapped action | Persists in DB | NO |
| error_resolve | LOCALIZED | system_runtime_errors/system_errors update; system_control_actions insert | No direct queue impact | Persists in DB | NO |
| run_runbook | HIGH_RISK to GLOBAL_RUNTIME | Runbook-dependent writes + system_control_actions insert | Runbook-dependent | Persists in DB and downstream targets | NO |

## Write Targets by Domain

| Domain | Primary Tables/Targets |
|---|---|
| Feature flags and control | system_control_config, system_control_actions |
| Queue | generation_queue, job_runs, system_control_actions |
| DLQ | job_dead_letters, job_runs, system_control_actions |
| Delivery | external_delivery_logs, event_store, system_control_actions |
| Events | event_store, system_control_actions |
| Alerts | system_alerts, alert_deliveries, system_control_actions |
| Errors | system_runtime_errors or system_errors, system_control_actions |
| Dispatch | QStash publishJSON via queue/event retry paths |

## QStash Interaction Summary

- retryEventStoreDispatch publishes new messages to trigger endpoints.
- queue retry may call enqueuePageGeneration (dispatch path).
- delivery retry can cascade into queue/event dispatch behavior.
- these dispatch effects are runtime-active and non-reversible by code rollback alone.

## Containment Signal

Current SHOS action surface is mutation-capable by design on first deploy unless additional containment is applied.
