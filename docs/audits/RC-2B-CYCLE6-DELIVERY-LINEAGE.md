# RC-2B Cycle 6: Delivery Contract Lineage Reconstruction

## Objective
Reconstruct lineage and canonical authority between delivery_failures and external_delivery_logs.

## 1) Historical lineage evidence

### Migration lineage (ordered)
1. 20260427090000_c26_external_delivery_truth.sql
- Creates public.external_delivery_logs
- Adds delivery ledger fields and FKs to event_store and generation_queue
- Adds delivery-focused indexes

2. 20260505090000_shos_operator_control.sql
- Alters public.external_delivery_logs
- Adds operator_status/operator_notes/resolved_at/resolved_by
- Adds idx_external_delivery_logs_operator_status

No migration in repository defines delivery_failures.

## 2) Runtime lineage evidence

Deployed HEAD runtime callers:
- app/api/admin/delivery-logs/route.js -> .from('external_delivery_logs')
- lib/queue/deliveryTruth.js -> read/write/update on external_delivery_logs
- lib/system/codeVisibility.js -> reads external_delivery_logs

No deployed HEAD code calls .from('delivery_failures').

Occurrences of delivery_failures in deployed code are metric labels only:
- delivery_failures_recent fields/messages in health/visibility/vendor checks

## 3) SHOS lineage evidence

Local SHOS implementation (not deployed) uses external_delivery_logs for delivery failure surfaces:
- getDeliveryFailureOverview reads external_delivery_logs
- retry and terminal actions update external_delivery_logs

SHOS does not call .from('delivery_failures').

## 4) Documentation lineage evidence

Recent docs contain both:
- Active runtime descriptions pointing at external_delivery_logs
- Cycle 5 blocker language requiring delivery_failures table

This indicates a stale contract expectation persisted in documentation/process rules while runtime and migrations consolidated on external_delivery_logs.

## 5) Required classification

| Item | Classification |
|---|---|
| external_delivery_logs | AUTHORITATIVE_RUNTIME_TABLE |
| delivery_failures (table expectation) | GHOST_CONTRACT |
| delivery_failures metric names | LEGACY_REFERENCE |
| migrations using external_delivery_logs | AUTHORITATIVE_SCHEMA_LINEAGE |
| docs demanding delivery_failures table | STALE_DOCUMENTATION |
| SHOS delivery contract transition | INCOMPLETE_TRANSITION (docs/process not fully reconciled) |

## 6) Lineage decision

Authoritative operational lineage is:
- external_delivery_logs introduced and evolved by migrations
- external_delivery_logs used by deployed runtime and local SHOS runtime
- delivery_failures never materialized as a schema object in this repository

Therefore delivery_failures is not an abandoned table; it is a stale contract name that did not become real schema.
