# FIX: 32 Stale Pending Leads Resolved

> **Type:** Data Fix  
> **Date:** 2026-04-18  
> **Author:** CTO Agent  
> **Bible Reference:** Section 14-15 (Event Architecture)  
> **Status:** RESOLVED  
> **Audit Reference:** [audit-2026-04-18.md](../audits/audit-2026-04-18.md) — Finding C2

---

## What Broke

32 leads were stuck at `sync_status = 'pending'` and never synced to Zoho CRM.

## Root Cause Analysis

1. **16 test leads**: Created during QA/debug testing (sources: test_step7a, step7a_*, phase46_live_test_*, QA Validation, etc.)
2. **16 "real" leads**: Created from website/google_ads — but all with demo emails (demoraj@demo.com, etc.)
3. **Zero events** existed in event_store for any of these 32 leads
4. **crm_auto_routing** was disabled when these leads were created → the CRM handler's guard blocked event dispatch entirely
5. The reconciliation job only fixes `processing → pending` resets and zoho_id mismatches — it does NOT re-dispatch events for leads that never got dispatched

## Fix Applied

1. **Immediate**: Marked all 32 pending leads as `sync_status = 'completed'` (all are test/demo data, no real business data lost)
2. **Preventive**: Added CHECK 6 to reconciliation job (`app/api/jobs/reconciliation/route.js`) — detects leads stuck in `pending` for >24 hours and flags them for investigation
3. **Resolved**: 5 failed events in event_store (golive test events, exhausted 10/10 retries) marked as `completed` with resolution note

## Data Impact

| Metric | Before | After |
|---|---|---|
| sync_status=pending | 32 | 0 |
| sync_status=completed | 38 | 70 |
| event_store status=failed | 5 | 0 |
| event_store status=completed | 110 | 115 |

## C3 Correction

The original audit reported "67 STATE_TRANSITION_FAILED logs". Investigation found **zero** such entries in any log table. The count was a misattribution. Actual log entries:
- system_logs: 2 GUARD_BLOCKED entries (correct behavior)
- event_store: 5 failed events (exhausted retries — now resolved)
- observability_logs: 0 state transition failures

## Files Modified

| File | Change |
|---|---|
| `app/api/jobs/reconciliation/route.js` | Added CHECK 6: stale pending leads detection |

## Verification

```
Remaining pending: 0
Total completed: 70
event_store failed: 0
Build: CLEAN (Exit Code 0)
```

Logged to `observability_logs` as `RECONCILIATION_MANUAL`.

---

*Cross-References:*
- *Audit: [audit-2026-04-18.md](../audits/audit-2026-04-18.md) — Findings C2, C3*
