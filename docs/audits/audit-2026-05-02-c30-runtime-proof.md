# Audit: C30 Content Version History Runtime Proof

Date: 2026-05-02
Captured at: 2026-05-02T05:21:42+05:30
Verdict: PASS_DB_APPLIED_LOCAL_RUNTIME_PROVEN

## Scope

This proof covers the requested finalization sequence for C30 without skipping steps:

- apply `20260502050000_c30_content_version_history.sql`
- validate `public.content_version_history` exists with the required columns
- run a real authenticated local draft save/save/restore flow through the admin API
- query `content_version_history` directly to verify stored rows and version sequencing
- record any issue found during the proof run

## Step 1: Migration Proof

- Target migration: `20260502050000_c30_content_version_history.sql`
- Pre-apply ledger check showed this was the only pending migration and there were no earlier gaps.
- Direct PostgreSQL apply completed successfully and was recorded in `public.schema_migrations`.
- Ledger row:
  - `migration_name = 20260502050000_c30_content_version_history.sql`
  - `executed_at = 2026-05-01T23:41:16.792Z`
- `public.content_version_history` now exists.
- Required columns confirmed present:
  - `id`
  - `draft_id`
  - `snapshot`
  - `version_number`
  - `created_at`
- Full observed columns:
  - `id`
  - `draft_id`
  - `version_number`
  - `saved_by`
  - `snapshot`
  - `change_summary`
  - `created_at`
- Migration result: no SQL conflicts and no apply errors.

## Step 2: Runtime Flow Proof

- Local app surface: `http://localhost:3000`
- Real admin login to `POST /api/admin/login` succeeded.
- Proof draft selected from existing editable drafts with zero prior history rows:
  - `draft_id = 8ad8c681-ca98-42ad-a5b1-b8299a8fdb06`
  - `slug = new-page-1776650009929`
  - `status = draft`

### 1. Open existing draft

- Authenticated `GET /api/admin/ccc/drafts/8ad8c681-ca98-42ad-a5b1-b8299a8fdb06` returned `200`
- Initial version list length was `0`

### 2. Save draft (version 1)

- Authenticated `PATCH /api/admin/ccc/drafts/8ad8c681-ca98-42ad-a5b1-b8299a8fdb06` updated `page_title` to `New Page [C30_RUNTIME_PROOF_1777679391731_V1]`
- Draft re-read returned the updated title
- Version history length became `1`
- Stored version number: `1`

### 3. Modify content and save again (version 2)

- Authenticated `PATCH /api/admin/ccc/drafts/8ad8c681-ca98-42ad-a5b1-b8299a8fdb06` updated `page_title` to `New Page [C30_RUNTIME_PROOF_1777679391731_V2]`
- Draft re-read returned the updated title
- Version history length became `2`
- Stored version number: `2`

### 4. Fetch version history

- Authenticated `GET /api/admin/ccc/drafts/8ad8c681-ca98-42ad-a5b1-b8299a8fdb06?versionId=5c3a2da7-916d-4089-adbb-b52b3fef2b4d` returned snapshot `page_title = New Page`
- Authenticated `GET /api/admin/ccc/drafts/8ad8c681-ca98-42ad-a5b1-b8299a8fdb06?versionId=7e2b3f33-a15e-48b2-92e9-6860d2a98234` returned snapshot `page_title = New Page [C30_RUNTIME_PROOF_1777679391731_V1]`
- Result: stored snapshots matched the exact pre-update states.

### 5. Restore version 1

- Authenticated `PATCH /api/admin/ccc/drafts/8ad8c681-ca98-42ad-a5b1-b8299a8fdb06` with `action = restore_version` succeeded
- Draft re-read returned `page_title = New Page`
- Version history length became `3`
- New stored version number: `3`
- Authenticated `GET /api/admin/ccc/drafts/8ad8c681-ca98-42ad-a5b1-b8299a8fdb06?versionId=9147c761-1a7e-4039-abd6-e65d516eadd6` returned snapshot `page_title = New Page [C30_RUNTIME_PROOF_1777679391731_V2]`
- Result: restore rewrote the draft to version 1 while preserving the pre-restore state as version 3.

## Step 3: Direct DB Verification

- Direct query executed:

```sql
select id, draft_id, version_number, saved_by, change_summary, snapshot->>'page_title' as snapshot_page_title, created_at
from public.content_version_history
where draft_id = '8ad8c681-ca98-42ad-a5b1-b8299a8fdb06'
order by version_number asc;
```

- Row count: `3`
- Multiple versions exist: `true`
- Correct `draft_id` mapping: `true`
- `version_number` incrementing sequentially: `true`

Observed rows:

| version_number | id | change_summary | snapshot_page_title |
|---|---|---|---|
| 1 | `5c3a2da7-916d-4089-adbb-b52b3fef2b4d` | `C30 runtime proof save 1` | `New Page` |
| 2 | `7e2b3f33-a15e-48b2-92e9-6860d2a98234` | `C30 runtime proof save 2` | `New Page [C30_RUNTIME_PROOF_1777679391731_V1]` |
| 3 | `9147c761-1a7e-4039-abd6-e65d516eadd6` | `C30 runtime proof restore version 1` | `New Page [C30_RUNTIME_PROOF_1777679391731_V2]` |

## Integrity Verdict

- Version records were stored correctly.
- Snapshot content matched the expected saved states.
- Restore rewrote the draft correctly.
- No duplicate writes were observed.
- No data corruption was observed in the tracked draft fields.

## Issue Found During Proof

- The first automated mutation probe omitted same-origin headers and correctly received `403 {"error":"CSRF token missing or origin mismatch."}` from admin middleware.
- This was a proof-harness issue, not a product defect.
- Rerunning the exact flow with `Origin` and `Referer` matching `http://localhost:3000` passed without any code change.

## Artifact

- Proof artifact: `scripts/audit/results/2026-05-02T05-21-42-c30-proof.json`

## Final Status

- Migration proof: COMPLETE
- Runtime flow proof: COMPLETE
- Direct DB verification: COMPLETE
- C30 implementation status: DB applied and local runtime proven
- C30 live status: still OPEN in live scope until deployed production proof is captured