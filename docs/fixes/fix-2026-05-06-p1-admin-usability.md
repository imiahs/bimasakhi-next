# Fix: P1 Admin Usability

Date: 2026-05-06
Status: IMPLEMENTED + PROVEN

## What Was Broken

- Archived draft `DELETE` removed rows instead of retaining archived records.
- Draft approve/archive/unpublish transitions were keyed too broadly to support repeated valid transitions after state changes.
- Draft UI copy still described delete behavior as destructive after the backend contract changed.
- Production deployment was blocked by a malformed `handleConvert` callback declaration in `app/admin/crm/page.js`.

## What Was Fixed

- `app/api/admin/ccc/drafts/[id]/route.js`
	- state-aware idempotency keys were introduced for approve/archive/unpublish.
	- archived-draft `DELETE` was changed to retained-row soft delete with `soft_deleted=true`.
- `app/admin/ccc/drafts/[id]/page.js`
	- archived-delete confirmation copy was aligned to retained-row behavior.
- `app/admin/ccc/drafts/page.js`
	- list copy was aligned to retained-row behavior.
	- bulk delete label was clarified as hard delete.
- `app/admin/crm/page.js`
	- `handleConvert` callback declaration and dependency list were repaired so production build succeeds.

## What Was Proven

- Local authenticated runtime validation passed for the requested closure scope on `http://127.0.0.1:3001`.
- Critical draft delete proof retained the archived row:
	- Draft ID `6d078c72-80d4-455b-a583-c44da47e3e48`
	- `status=archived` after delete
	- row remained visible in archived list
- `npm run build` passed after the CRM repair.
- Vercel production deploy passed and updated the production alias to `https://bimasakhi.com`.
- Production live admin validation passed for `/admin/pages` and `/admin/ccc/drafts`.
- Public generated-page proof passed with `GET /prod-p2-live-1778084958547-slug = 200`.