# INCIDENT: Silent Draft Failure — content_drafts Table Missing

> **Type:** Production Incident  
> **Date Discovered:** 2026-04-18  
> **Severity:** CRITICAL  
> **Author:** CTO Agent  
> **Bible Reference:** Section 9-12 (Pagegen Pipeline), Rule 25 (Traceability)  
> **Status:** RESOLVED  

---

## Summary

The `content_drafts` table does not exist in Supabase. The pagegen worker (`app/api/jobs/pagegen/route.js`) generates AI content successfully, but the code that saves drafts for CEO review fails silently because:

1. The table was never created via migration
2. The insert is wrapped in a try/catch that **swallows the error** (line ~403)
3. No log entry is written for the failure
4. The job still reports SUCCESS despite draft not being saved

**This means Phase 2's core value proposition (generate → draft → review → approve → publish) is completely broken at the draft stage.**

---

## Impact

| Area | Impact |
|---|---|
| Draft Creation | 100% FAILURE — all drafts silently lost |
| CEO Review Flow | BROKEN — no drafts exist to review |
| Approve/Reject | BROKEN — nothing to approve |
| Content Pipeline | PARTIAL — pages generate but can't be managed |
| Data Loss | All generated content metadata lost (only pages table has the content) |

---

## Root Cause Analysis

### Primary Cause: Missing Table
The `content_drafts` table was referenced in code but never created in Supabase. This is a migration gap — the code was written assuming the table would exist.

### Secondary Cause: Silent Error Swallowing
```javascript
// app/api/jobs/pagegen/route.js, line ~403
try {
  await supabase.from('content_drafts').insert({...});
} catch (err) {
  // ERROR IS SILENTLY SWALLOWED HERE
  // No logging, no re-throw, no status update
}
```

This violates **Rule 25** (every failure must be traceable) and basic error handling principles.

### Contributing Factor: No Integration Test
No test or health check verifies that `content_drafts` table exists. The build passes clean because the table is only accessed at runtime.

---

## Timeline

| When | What |
|---|---|
| Phase 2 development | Code written to insert into `content_drafts` |
| Phase 2 development | Table creation SQL never executed |
| Every pagegen run | Insert fails → catch swallows → job reports success |
| 2026-04-18 | Discovered during forensic audit Step 3 (DB verification) |

---

## Files Involved

| File | Role |
|---|---|
| `app/api/jobs/pagegen/route.js` (~line 403) | Contains the silent try/catch |
| `app/api/admin/ccc/drafts/[id]/route.js` | Draft approve/reject endpoint (references content_drafts) |
| `features/admin/ccc/` | Admin UI for content command center (reads content_drafts) |

---

## Resolution Plan

1. **Create `content_drafts` table** — ✅ DONE via [migration-content-drafts-table.md](../migrations/migration-content-drafts-table.md)
2. **Fix silent error swallowing** — ✅ DONE via [fix-pagegen-silent-error.md](../fixes/fix-pagegen-silent-error.md)
3. **Verify fix** — ✅ REST API insert/select verified, build passes clean
4. **Document** — ✅ This incident is now RESOLVED

---

## Lessons Learned

1. **Silent failure = sabse bada failure** — A try/catch that swallows errors is worse than no try/catch at all
2. **Migration verification is mandatory** — Every table referenced in code must be verified to exist
3. **Phase completion requires end-to-end verification** — Phase 2 was marked COMPLETE but the core flow was broken
4. **System memory prevents this** — If this had been documented in the first session, it would have been caught immediately

---

*Cross-References:*
- *Audit: [audit-2026-04-18.md](../audits/audit-2026-04-18.md) — Finding C1*
- *Migration: [migration-content-drafts-table.md](../migrations/migration-content-drafts-table.md)*
- *Bible: Section 9-12 (Content Pipeline), Rule 25 (System Memory)*
