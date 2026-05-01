# FIX: Silent Draft Error Swallowing in Pagegen

> **Type:** Bug Fix  
> **Date:** 2026-04-18  
> **Author:** CTO Agent  
> **Bible Reference:** Rule 25 (System Memory), Section 9-12 (Content Pipeline)  
> **Status:** RESOLVED  
> **Audit Reference:** [audit-2026-04-18.md](../audits/audit-2026-04-18.md) — Finding C1 (secondary)

---

## What Broke

The pagegen worker (`app/api/jobs/pagegen/route.js`) had a try/catch around the `content_drafts` insert that:
1. Used JavaScript `try/catch` but Supabase client returns `{data, error}` — the catch **never fires**
2. Never checked the `error` property from the Supabase response
3. Logged `[PAGEGEN SUCCESS]` even when the draft insert failed
4. Used `newPage.id` as `draftId` in success log (wrong — that's the page_index ID, not the draft ID)

## Root Cause

Misunderstanding of Supabase client behavior. The `@supabase/supabase-js` client does NOT throw on query errors — it returns `{data: null, error: {...}}`. Wrapping in try/catch is meaningless.

## Fix Applied

**File:** `app/api/jobs/pagegen/route.js` (line ~385-410)

Before:
```javascript
try {
    await supabase.from('content_drafts').insert({...});
    console.log(`[PAGEGEN SUCCESS] ... draftId=${newPage.id} ...`);
} catch (draftErr) {
    console.error(`[PageGen] content_drafts insert failed ... (non-fatal):`, draftErr.message);
}
```

After:
```javascript
const { data: draftData, error: draftErr } = await supabase.from('content_drafts').insert({...}).select('id').single();

if (draftErr) {
    console.error(`[PageGen] content_drafts insert FAILED for ${slug}: ${draftErr.message} (code: ${draftErr.code})`);
    await writeGenerationLog(supabase, queueJob.id, 'draft_insert_failed', `Draft insert failed for ${slug}: ${draftErr.message}`);
} else {
    console.log(`[PAGEGEN SUCCESS] ... draftId=${draftData?.id} ...`);
}
```

## Changes
- Removed useless try/catch
- Properly destructured `{data, error}` from Supabase response
- Added error logging via `writeGenerationLog` (creates traceable audit trail)
- Fixed draftId in success log to use actual draft ID from insert response
- Added error code to log for debugging

## Verification
- Build passes clean (Exit Code 0)
- `content_drafts` table now exists (C1 fix)
- Next pagegen run will properly log success/failure

---

*Cross-References:*
- *Incident: [incident-silent-draft-failure.md](../incidents/incident-silent-draft-failure.md)*
- *Migration: [migration-content-drafts-table.md](../migrations/migration-content-drafts-table.md)*
- *Audit: [audit-2026-04-18.md](../audits/audit-2026-04-18.md)*
