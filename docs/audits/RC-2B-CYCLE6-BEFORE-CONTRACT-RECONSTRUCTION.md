# RC-2B Cycle 6: Before Snapshot - SHOS Contract Reconstruction

| Field | Value |
|---|---|
| Date | 2026-05-14 |
| Mode | Forensic-only, read-only |
| Production SHA | 9e12ef2188931a12b2157ace4dce9c6d355edc20 |
| Prior SHOS state | BLOCKED_PENDING_REVIEW |

## 1) Current blocker context

Cycle 5 blocker carried into Cycle 6:
- Required table contract expected delivery_failures
- Runtime implementation references external_delivery_logs

## 2) Table existence truth (authoritative DB probe)

| Table | Exists |
|---|---|
| delivery_failures | NO |
| external_delivery_logs | YES |
| event_store | YES |
| system_control_actions | YES |
| observability_logs | YES |

## 3) Row count truth

| Table | Rows |
|---|---:|
| delivery_failures | MISSING |
| external_delivery_logs | 41 |
| event_store | 140 |
| system_control_actions | 44 |
| observability_logs | 20640 |

## 4) Schema and FK truth

external_delivery_logs:
- 32 columns
- FK event_store_id -> event_store.id
- FK generation_queue_id -> generation_queue.id
- 9 indexes including status/published_at and operator_status/status/published_at

event_store:
- 17 columns
- 8 indexes

system_control_actions:
- 19 columns
- 4 indexes

observability_logs:
- 6 columns
- 4 indexes

delivery_failures:
- table missing, no columns, no indexes, no FKs

## 5) Runtime dependency truth (deployed HEAD callsites)

Direct table callers in HEAD:
- external_delivery_logs is called by:
  - app/api/admin/delivery-logs/route.js
  - lib/queue/deliveryTruth.js
  - lib/system/codeVisibility.js
- delivery_failures appears only as metric name/string fields (delivery_failures_recent), not as a DB table caller

SHOS deployment truth in HEAD:
- lib/system/shos.js: absent in HEAD
- app/api/admin/system/shos/route.js: absent in HEAD
- No performShosAction/getShosSnapshot imports in HEAD admin API files

## 6) Migration truth baseline

- external_delivery_logs introduced by 20260427090000_c26_external_delivery_truth.sql
- external_delivery_logs extended for operator state by 20260505090000_shos_operator_control.sql
- No migration creates delivery_failures

## 7) Collateral safety baseline

Non-mutating runtime checks during this cycle:
- GET / = 200
- GET /blog = 200
- GET /api/admin/queue (no auth) = 401
- GET /admin (no auth) = 307
- GET /favicon.ico = 200
- HEAD unchanged during checks: 9e12ef2188931a12b2157ace4dce9c6d355edc20

No runtime mutation actions were executed.
