# Fix: P0.1 Route Registry and Sidebar Rebuild

Date: 2026-05-02
Status: IMPLEMENTED + LOCAL RUNTIME PROVEN

## Problem

The active admin shell still owned a hardcoded sidebar list. That hid many already-implemented admin routes from the operator surface, duplicated route knowledge inside the layout, and produced incorrect parent-and-child double highlighting on nested pages.

## Root Cause

`app/admin/ClientLayout.jsx` contained the route list inline and each link decided its own active state with broad prefix matching. That meant discoverability lived in one brittle file and nested paths like `/admin/ccc/bulk` could mark both the parent and child routes as active.

## What Was Implemented

### 1. Central admin route registry

- Added `app/admin/routeRegistry.js`
- Moved the shell route map into one module
- Registered:
  - `3` pinned routes
  - `4` grouped sections
  - `53` total links

### 2. Shell rendering from the registry

- `app/admin/ClientLayout.jsx` now renders pinned links and grouped sections from the registry
- Top-bar title and note now come from the resolved active route instead of layout-local branching

### 3. Deepest-only active-route resolution

- Precomputed active-route ordering once inside the registry
- Added pathname-level caching for repeated active-route resolution
- Changed sidebar highlighting to use the resolved deepest route instead of per-link prefix checks

Result:

- `/admin/ccc/bulk` highlights `Bulk Planner` only
- `/admin/settings/backups` highlights `Backups` only

## CEO Usage

What it does:

- gives the CEO/operator one visible control surface for already-built admin pages
- groups the shell into `Content`, `System`, `Control`, and `Analytics`
- prevents nested pages from showing ambiguous double-active navigation

Input:

- operator clicks any admin route in the sidebar

Output:

- the shell opens the chosen page
- the top bar shows the correct route label and note
- only the deepest matching nav entry remains highlighted

Example:

- open `/admin/settings/backups`
- expected shell result:
  - heading = `Backups`
  - `Backups` is active
  - `Settings` is not active

## Safety Guardrails

- No route renames
- No auth flow changes
- No database schema changes
- No backend API contract changes
- Registry links were verified against real `app/admin/**/page.js` files before proof closure
- Login route still bypasses the admin shell entirely

Failure behavior:

- unknown paths do not falsely match the root dashboard route
- nested siblings like `/admin/ccc-bulk` do not falsely activate `/admin/ccc`

Recovery path:

- if a route highlight regresses again, the owning slice is now isolated to:
  - `app/admin/routeRegistry.js`
  - `app/admin/ClientLayout.jsx`

## Validation

- Happy flow: PASS
- Edge case: PASS
- Failure case: PASS
- Load case: PASS
- Proof artifact: `scripts/audit/results/2026-05-02T04-42-55-000Z-p0-1-route-registry-sidebar-proof.json`
- Full audit record: `docs/audits/audit-2026-05-02-p0-1-route-registry-sidebar-proof.md`

## Files Changed

- `app/admin/ClientLayout.jsx`
- `app/admin/routeRegistry.js`

## Remaining Gap

- P0.1 only closes the admin route-registry and sidebar slice locally.
- Phase 25 remains partial because footer/public-navigation unification and later CEO-control modules are still open.
- P0.1 did not include deployment proof.

## Outcome

The admin shell now uses one route registry, exposes the hidden implemented pages, and resolves nested active states correctly. P0.1 is locally proven and ready to hand off to P0.2.