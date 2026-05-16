# Audit: P1 Complete

Date: 2026-05-06
Verdict: PASS

## Scope

This audit locks the final P1 admin-usability truth in the requested scope:

- `/admin/pages`
- `/admin/ccc/drafts`
- production deploy validation on `https://bimasakhi.com`
- public generated-page response proof

## What Was Broken

- Archived draft `DELETE` physically removed rows instead of retaining an archived record.
- Draft approve/archive/unpublish transitions used lifetime-stable idempotency keys, so repeated valid transitions after state changes were not reliable.
- Production deployment was blocked by a malformed callback declaration in `app/admin/crm/page.js`.

## What Was Fixed

- `app/api/admin/ccc/drafts/[id]/route.js`
  - approve/archive/unpublish now use state-aware idempotency keys.
  - `DELETE` on archived drafts now returns `soft_deleted=true` and retains the archived row.
- `app/admin/ccc/drafts/[id]/page.js`
  - archived-delete copy was aligned to retained-row behavior.
- `app/admin/ccc/drafts/page.js`
  - list copy was aligned to retained-row behavior.
  - bulk delete label was clarified as hard delete.
- `app/admin/crm/page.js`
  - `handleConvert` callback syntax was repaired so `npm run build` succeeds.

## What Was Proven

### Local Authenticated Validation

- Authenticated runtime target: `http://127.0.0.1:3001`
- `/admin/pages` full flow passed: create, edit, slug edit, archive, restore.
- `/admin/ccc/drafts` full flow passed: create, edit, FAQ edit, publish, archive, restore, delete soft.
- Critical delete proof passed:
  - Draft ID: `6d078c72-80d4-455b-a583-c44da47e3e48`
  - delete response: `200`, `success=true`, `soft_deleted=true`, `draft.status=archived`
  - follow-up read: `200`, `status=archived`
  - archived list query: draft present
- Direct DB proof was captured:
  - Page ID `1b8663da-18af-4d01-9533-92de5f34ce35` ended as `status=draft`, `slug=page-finalp1-1778080769357-edit`
  - Draft ID `defc3860-c843-4723-81dd-a3e4dbb31b7f` ended as `status=archived`

### Production Validation

- `npm run build`: PASS
- Vercel production deploy: PASS
- Production alias: `https://bimasakhi.com`
- Production admin login succeeded.
- Production `/admin/pages` live flow passed against page ID `120e9f6d-b4de-4df7-8b8e-3630ce66432f`:
  - create
  - edit
  - slug edit
  - publish
  - archive
  - restore
- Production `/admin/ccc/drafts` live flow passed against draft ID `a26802ce-c020-435e-92f7-831b02103daf`:
  - create
  - edit
  - slug edit
  - FAQ edit
  - publish
  - archive
  - restore
  - delete soft
  - archived delete retention remained true after delete
- Public generated-page proof passed:
  - Draft ID `4e2d4393-d41b-449d-b872-0d246daab534` published to `/prod-p2-live-1778084958547-slug`
  - `GET /prod-p2-live-1778084958547-slug` returned `200`
  - rendered body contained marker `prod-p2-live-1778084958547 live marker`

## Final Result

P1 is COMPLETE in the requested scope.