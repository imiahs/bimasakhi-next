# Fix 018 - May 1 Forensic Truth Reconciliation

## Problem

CCC and INDEX were still describing the April 27 no-cleanup C26 proof window as the current live operating state. That was no longer true on 2026-05-01.

## Root Cause

Historical closure evidence was allowed to remain in the quick-status and scorecard language after current delivery health had moved back into a clean recent window. The historical failed rows remained in `external_delivery_logs`, but `getDeliveryHealthMetrics()` evaluates recent activity, not all retained ledger rows.

## What Was Verified

- Local production build passed on 2026-05-01.
- Production `/api/status` returned `overall_health=HEALTHY` and version `47404cc`.
- Production `/api/admin/system/health` returned `overall_health=HEALTHY` with no hard failures.
- Production `/api/admin/delivery-logs` returned:
  - `delivery_failures_recent=0`
  - `delivery_stuck_count=0`
  - `delivery_success_rate=100`
  - `delivery_terminal_recent=0`
- Direct REST still showed historical failed C26 rows in `external_delivery_logs` with `provider_retry_count=2` for both missing-route proof events.
- Zoho OAuth refresh and lead upsert passed.
- QStash publish passed, but current log lookup remained partial.

## Documentation Corrections Applied

- Quick-status and scorecard wording now distinguish:
  - historical C26 no-cleanup closure proof
  - current live health window truth
- C26 remains closed.
- Current live system mode is now documented as `normal` / `HEALTHY`.
- QStash current-state wording was tightened from implied closure to current partial observability truth.

## Remaining Risk

- C29 Code Visibility Layer 4 remains open.
- C30 Content Version History remains open.
- QStash current log lookup is still partial in the May 1 pass.
- The local build still emits Edge Runtime warnings from `jose`.

## Outcome

Documentation is back in sync with the current live system. Historical proof remains preserved, but it no longer overwrites the present operational truth.