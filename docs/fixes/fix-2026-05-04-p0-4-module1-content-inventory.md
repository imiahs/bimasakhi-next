# Fix: P0.4 Module 1 Unified Content Inventory Completion

Date: 2026-05-04
Author: CTO (Agent)
Bible Reference: Section 32, Section 40, Section 43, Section 47
Status: DEPLOYED + LIVE PROVEN

## Context

Execution moved from roadmap to implementation with one strict constraint set:

- Module 1 only
- no redesign
- no new feature expansion beyond control completion
- no touching the locked runtime lane

The target was to close the content-control gap across drafts, pages, blog, and resources from one operator surface while preserving the stronger existing admin flows.

## Broken State Before This Fix

- `/admin/ccc` was still a drafts-oriented overview, not a unified content inventory
- blog admin was missing Article 7 MVP inventory behavior:
  - no usable search
  - no filters
  - no pagination
  - hard delete instead of soft archive
  - publish/archive/restore not completed as an inventory workflow
- resources admin was missing the same control model:
  - no status-aware publish model
  - no search/filter/pagination contract
  - no soft delete lifecycle
- public resources rendering was not aligned to a publish-state model
- unified operator visibility across drafts, pages, blog, and resources did not exist in one live admin surface

## Change Set

### 1. Additive schema support for blog and resources

- added `supabase/migrations/20260504150000_p0_4_content_inventory_completion.sql`
- blog posts gained:
  - `updated_at`
  - `published_at`
  - `archived_at`
  - status constraint support
  - supporting index on `updated_at`
- resources gained:
  - `status`
  - `updated_at`
  - `published_at`
  - `archived_at`
  - status constraint support
  - supporting indexes for status and updated time
- existing resources were backfilled to a publish-state truth model

### 2. Blog admin API completion

- rebuilt `app/api/admin/blog/route.js` for Article 7 MVP inventory behavior
- added paginated listing with `status`, `search`, `page`, and `limit`
- added single-record lookup by `id` and `slug`
- added slug normalization and duplicate protection
- converted delete into soft archive instead of hard delete
- completed publish, archive, and restore timestamp handling

### 3. Resources admin API completion

- rebuilt `app/api/admin/resources/route.js` for status-aware inventory control
- added paginated listing with `status`, `search`, `gated`, `page`, and `limit`
- added create and edit flows for title, description, file URL, gating, and status
- converted delete into soft archive instead of hard delete
- completed publish, archive, and restore timestamp handling

### 4. Unified operator surface

- added `features/admin/content/ContentInventoryContent.jsx`
- this one surface now drives:
  - drafts
  - pages
  - blog
  - resources
- added shared controls for:
  - search
  - status filters
  - type or gated secondary filters where applicable
  - pagination
  - create modals
  - row actions
- preserved existing stronger downstream editors instead of replacing them

### 5. Admin route wiring

- updated `/admin/ccc` to keep its existing dashboard controls and append the unified inventory
- updated `/admin/blog` to render the shared inventory in blog mode
- updated `/admin/resources` to render the shared inventory in resources mode

### 6. Public resources truth alignment

- updated `app/resources/page.js` to render published resources only

### 7. Live proof harness

- added `scripts/audit/audit-p0-4-content-inventory-live.mjs`
- the harness proved on production:
  - admin login
  - route reachability
  - list contracts for pages, drafts, blog, resources
  - page create, edit, slug update, publish, archive, restore
  - draft create, edit, slug update, FAQ edit, publish, unpublish, archive, restore
  - blog create, edit, slug update, publish, archive, restore
  - resource create, edit, publish, archive, restore

## Validation

- `npm run db:migrate` passed
- `npm run build` passed
- `vercel --prod --yes` passed
- `node scripts/audit/audit-p0-4-content-inventory-live.mjs` passed
- real browser proof on production confirmed the unified tabs, live search, row actions, and modal open behavior on `/admin/ccc`

## Outcome

Module 1 is now closed in the requested live scope:

- one admin control plane now covers drafts, pages, blog, and resources
- slug editing works where requested
- FAQ editing is preserved in the draft path
- publish works
- archive and restore work
- soft delete behavior replaced hard delete where this module required it
- the deployed UI now exposes a real unified inventory instead of scattered content control

## Remaining Truth

- this closes Module 1 only, not the entire P0.4 roadmap
- broader P0.4 modules still remain open
- C30 live proof still remains open
- the frozen runtime lane stayed untouched during this change set