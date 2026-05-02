# Fix: P0.3 Role-Based Visibility + Access Control

Date: 2026-05-02
Status: DEPLOYED + LIVE PROVEN

## Problem

The admin console had strong session auth, but it did not have one live access-control layer that matched the CEO hierarchy.

That left three security gaps:

- any authenticated session could still see the full active admin sidebar
- admin pages were session-protected, but not consistently role-protected
- many admin APIs depended on per-route `allowedRoles` usage rather than one fail-closed policy

## Current State Audit

Roles defined in the live codebase:

- `super_admin`
- `admin`
- `editor`
- `agent`

Live inventory before temporary proof seeding:

- only `super_admin` was present as an active live row

Concrete missing restrictions before the fix:

- `middleware.js` authenticated `/admin/*`, but it did not apply a role-based page policy
- `app/admin/ClientLayout.jsx` rendered the entire active shell navigation to any authenticated user
- `lib/auth/withAdminAuth.js` only enforced authorization when an individual route remembered to pass `allowedRoles`

## What Was Implemented

### 1. Central role policy

- added `lib/auth/adminAccessControl.js`
- defined one module-level access model for:
  - session/profile
  - dashboard
  - content
  - CRM/leads
  - locations/geo
  - analytics
  - navigation
  - feature flags
  - workflow/settings
  - users
  - system
- added deterministic role landing paths:
  - `super_admin -> /admin`
  - `admin -> /admin/crm`
  - `editor -> /admin/ccc`
  - `agent -> /admin/profile`

### 2. API authorization without per-route drift

- `lib/auth/withAdminAuth.js` now resolves every request through the central access policy
- unmapped admin APIs fail closed to `super_admin`
- explicit route-level role arrays still work as a fallback when no central module match exists

### 3. Page-route authorization in middleware

- `middleware.js` now enforces role access on `/admin/*`
- unauthorized page access redirects to the role landing page with `?access=denied`
- unauthorized admin API access now returns `403`
- middleware now forwards `x-admin-email` along with `x-admin-role` and `x-admin-user`

### 4. Role-aware active admin shell

- `context/AdminContext.jsx` now keeps the authenticated role in client state
- `app/admin/ClientLayout.jsx` now filters the live shell navigation by role
- non-super-admin roles fall back to the registry map and only render the routes they are allowed to see

### 5. Repeatable proof harness

- added `scripts/audit/audit-p0-3-role-access-control.mjs`
- the harness:
  - confirms deployed version
  - seeds deterministic temporary `admin`, `editor`, and `agent` users
  - tests allowed page/API pairs
  - tests denied page/API pairs
  - tests invalid-session behavior
  - tests concurrent multi-role sessions
  - supports cleanup of the temporary audit users

## Access Model

| Module | View | Create | Edit | Delete |
|---|---|---|---|---|
| Session + Profile | `super_admin`, `admin`, `editor`, `agent` | session actions only | `super_admin`, `admin`, `editor`, `agent` | none |
| Dashboard / Mission Control | `super_admin` | `super_admin` | `super_admin` | `super_admin` |
| Content (`CCC`, drafts, bulk, pages, blog, media, resources, SEO) | `super_admin`, `admin`, `editor` | `super_admin`, `admin`, `editor` | `super_admin`, `admin`, `editor` | `super_admin`, `admin` |
| CRM / Leads | `super_admin`, `admin` | `super_admin`, `admin` | `super_admin`, `admin` | `super_admin` |
| Locations / Geo | `super_admin`, `admin`, `editor` | `super_admin`, `admin`, `editor` | `super_admin`, `admin`, `editor` | `super_admin`, `admin` |
| Analytics | `super_admin`, `admin` | none | none | none |
| Navigation | `super_admin` | `super_admin` | `super_admin` | `super_admin` |
| Feature Flags | `super_admin` | `super_admin` | `super_admin` | `super_admin` |
| Workflow / Settings | `super_admin` | `super_admin` | `super_admin` | `super_admin` |
| Users | `super_admin` | `super_admin` | `super_admin` | `super_admin` |
| System (`logs`, `audit`, `health`, `code`, `alerts`, `workers`, `DLQ`, `automation`, `tools`) | `super_admin` | `super_admin` | `super_admin` | `super_admin` |

Security note:

- `agent` remains profile-only in the current live admin surface because there is still no safe ownership mapping between `admin_users` and business entities that would support an honest “agent sees only their own CRM data” rule.
- P0.3 closes the security requirement by blocking that surface rather than fabricating a partial ownership scope.

## Validation

- Local `npm run build`: PASS
- Local production-bundle runtime proof: PASS
- Local proof artifact: `scripts/audit/results/2026-05-02T08-54-34-872Z-p0-3-role-access-control-proof.json`
- Production proof artifact: `scripts/audit/results/2026-05-02T09-02-05-605Z-p0-3-role-access-control-proof.json`
- Production audit record: `docs/audits/audit-2026-05-02-p0-3-role-access-control-live-proof.md`

Live browser proof:

- editor landed at `/admin/ccc?access=denied`, saw only `Profile + Content + Locations`, and was redirected back to `/admin/ccc?access=denied` when trying `/admin/users`
- super-admin landed at `/admin` and saw the full restricted control links including `Navigation`, `Features`, `Workflow`, `Users`, and `Code`

## Remaining Gap

- Phase 25 still lacks drag-drop ordering, preview-before-save, and broader editor ergonomics
- `components/admin/AdminLayout.jsx` remains a legacy inactive shell surface and was intentionally left untouched
- a future agent-scoped CRM experience requires a safe ownership map first; that is a later feature, not a security blocker for P0.3

## Outcome

The admin shell now exposes only the routes each role is allowed to see, direct `/admin/*` route bypasses are blocked and redirected, direct `/api/admin/*` bypass attempts return `403`, invalid sessions fail correctly, and the full model is proven live in production without widening into a redesign.