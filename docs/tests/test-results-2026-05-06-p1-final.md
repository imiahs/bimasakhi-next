# Test Results: P1 Final

Date: 2026-05-06
Verdict: PASS

## What Was Broken

- Archived draft `DELETE` removed rows instead of retaining archived records.
- Draft state transitions were not stable across repeated valid transitions after state changes.
- Production deploy was blocked by a syntax error in `app/admin/crm/page.js`.

## What Was Fixed

- Archived draft `DELETE` now returns `soft_deleted=true` and retains the archived row.
- Draft approve/archive/unpublish transitions now use state-aware idempotency keys.
- `app/admin/crm/page.js` build-blocking callback syntax was repaired.

## What Was Proven

### Local Final Validation

- Authenticated runtime target: `http://127.0.0.1:3001`
- Critical delete validation: PASS
  - Draft ID: `6d078c72-80d4-455b-a583-c44da47e3e48`
  - delete response: `200`, `success=true`, `soft_deleted=true`, `draft.status=archived`
  - follow-up read: `200`, `status=archived`
  - archived list query: row present
- Pages flow: PASS
  - create
  - edit
  - slug edit
  - archive
  - restore
  - proof page ID: `1b8663da-18af-4d01-9533-92de5f34ce35`
  - final state: `status=draft`, `slug=page-finalp1-1778080769357-edit`
- Drafts flow: PASS
  - create
  - edit
  - FAQ edit
  - publish
  - archive
  - restore
  - delete soft
  - proof draft ID: `defc3860-c843-4723-81dd-a3e4dbb31b7f`
  - final state: `status=archived`

### Production Final Validation

- `npm run build`: PASS
- `vercel deploy --prod --yes`: PASS
- Production alias: `https://bimasakhi.com`
- Production admin login: PASS
- Production `/admin/pages`: PASS
  - proof page ID: `120e9f6d-b4de-4df7-8b8e-3630ce66432f`
  - final slug after edit: `prod-p2-page-1778084810233-edit`
  - publish: PASS
  - archive: PASS
  - restore: PASS
  - final state after restore: `status=draft`
- Production `/admin/ccc/drafts`: PASS
  - proof draft ID: `a26802ce-c020-435e-92f7-831b02103daf`
  - slug persisted: PASS (`prod-p2-draft-1778084923171-slug`)
  - FAQ persisted: PASS
  - publish: PASS (`published`, `page_index_id=aca2edf9-c0a6-490c-a1d0-8ee34628d9e6`)
  - archive: PASS
  - restore: PASS
  - delete soft: PASS (`soft_deleted=true`)
  - final state after delete: `status=archived`
  - archived visibility after delete: PASS
- Public URL proof: PASS
  - proof draft ID: `4e2d4393-d41b-449d-b872-0d246daab534`
  - slug: `/prod-p2-live-1778084958547-slug`
  - `GET` status: `200`
  - rendered marker present: `prod-p2-live-1778084958547 live marker`

## Final Result

P1 final validation passed in the requested local and production scope.