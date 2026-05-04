# Fix — 2026-05-05 Core Runtime Stabilization

## Summary

This slice closes the stop-order core runtime defects in local scope and replaces two placeholder/broken surfaces with real working paths.

## Changes

### Fix 1 — CCC draft editor build blocker

**File:** `app/admin/ccc/drafts/[id]/page.js`

**Root cause:** Helper text under the FAQ editor rendered raw JSON example text directly inside JSX, which broke the Next.js production build parser.

**Fix applied:** Escaped the example so the helper text renders safely.

**Result:** `npm run build` now completes successfully again.

### Fix 2 — CRM scoring source fallback

**File:** `lib/ai/leadScorer.js`

**Root cause:** The scorer only read `marketing_source`, but the live CRM ingress stores lead source in `source` and `conversion_source`.

**Fix applied:** Added `effectiveSource` fallback across `marketing_source`, `source`, and `conversion_source`, then used that normalized source for scoring.

**Result:** Real worker proof now differentiates lead scores again (`organic=65`, `website=55`).

### Fix 3 — AI admin pages runtime import

**File:** `app/api/admin/ai/pages/route.js`

**Root cause:** `crypto.randomUUID()` was used without importing Node `crypto`.

**Fix applied:** Added `import crypto from 'crypto';`.

**Result:** Authenticated POST to `/api/admin/ai/pages` now returns 200 with generated block payload.

### Fix 4 — Backup API manual snapshot creation

**File:** `app/api/admin/backups/route.js`

**Root cause:** The route could only list snapshot directories. The admin UI had no real creation path.

**Fix applied:**

- added shared backup directory helpers
- added recursive size calculation
- added `POST /api/admin/backups`
- snapshot writes now create `manifest.json` plus JSON exports for core operational tables
- GET now reuses one listing helper for consistent results

**Result:** Real authenticated POST now creates a manual backup and GET immediately returns it.

### Fix 5 — Backup UI no longer simulates success

**File:** `features/admin/settings/BackupsContent.jsx`

**Root cause:** The button used `setTimeout` plus a fake success object instead of calling the API.

**Fix applied:** Replaced the simulated path with a real `fetch('/api/admin/backups', { method: 'POST' })` call.

**Result:** The existing admin surface now triggers actual snapshot creation instead of a placeholder delay.

## Runtime Findings That Required Proof, Not New Code

### Rejected archive path

`app/api/admin/ccc/drafts/[id]/route.js` already handled reject and archive transitions correctly. The issue was lack of authenticated API proof. That proof now passes.

### Page generation happy path

`app/api/jobs/pagegen/route.js` already handled a valid one-page queue row correctly once the control plane allowed processing. A controlled proof window now shows queue completion plus generated `content_drafts`, `page_index`, and `location_content` rows.

### SEO module

`app/api/admin/seo/route.js` was already functional. The degraded claim was caused by broader system-status reporting, not an SEO API defect.

## Safety Notes

- Backup snapshots are local filesystem artifacts. This is a real working path for local/runtime proof, but it is not a cross-instance persistent storage system.
- No public route contracts changed.
- No schema changes were required in this slice.
- Deployment remains blocked until live proof is captured for the same checks.