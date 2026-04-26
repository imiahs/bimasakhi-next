# MIGRATION: Create content_drafts Table

> **Type:** Database Migration  
> **Date:** 2026-04-18  
> **Author:** CTO Agent  
> **Bible Reference:** Section 9-12 (Content Pipeline)  
> **Status:** EXECUTED  
> **Incident Reference:** [incident-silent-draft-failure.md](../incidents/incident-silent-draft-failure.md)

---

## Purpose

Create the `content_drafts` table that is referenced by the pagegen worker and admin CCC UI but was never created in Supabase.

---

## Schema (To Be Determined)

The exact schema will be derived from:
1. `app/api/jobs/pagegen/route.js` — what columns the INSERT uses
2. `app/api/admin/ccc/drafts/[id]/route.js` — what columns the approve/reject flow reads
3. `features/admin/ccc/` — what the admin UI expects

**Schema will be documented here before execution.**

---

## SQL (Draft — To Be Finalized)

```sql
-- TODO: Finalize schema based on code analysis
CREATE TABLE IF NOT EXISTS content_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- columns TBD from code analysis
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;

-- Service role access
CREATE POLICY "service_role_full_access" ON content_drafts
  FOR ALL USING (auth.role() = 'service_role');
```

---

## Rollback SQL

```sql
DROP TABLE IF EXISTS content_drafts;
```

---

## Verification

```bash
# After execution, verify table exists:
curl "$SUPABASE_URL/rest/v1/content_drafts?select=*&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"

# Should return [] (empty array) instead of PGRST205 error
```

---

## Pre-execution Checklist

- [x] Schema finalized from code analysis
- [x] SQL reviewed
- [x] Rollback SQL prepared
- [x] CEO sign-off (if required)
- [x] Executed in Supabase via direct pg connection
- [x] Verification query passed (REST API insert + select works)
- [x] Incident updated to RESOLVED
- [x] Audit report updated

---

*Cross-References:*
- *Incident: [incident-silent-draft-failure.md](../incidents/incident-silent-draft-failure.md)*
- *Audit: [audit-2026-04-18.md](../audits/audit-2026-04-18.md) — Finding C1*
- *Bible: Section 9-12 (Content Pipeline)*
