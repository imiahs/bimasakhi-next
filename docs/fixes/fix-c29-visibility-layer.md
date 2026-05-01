# Fix: C29 Code Visibility Layer MVP

Date: 2026-05-02
Status: DEPLOYED + LIVE PROVEN IN REQUESTED SCOPE

## Problem

Phase 14 Layer 4 existed in documentation but not in the codebase. There was no authenticated Code Visibility API, no direct admin page, and no safe static map showing which modules and flows were active, paused, idle, degraded, or failing.

## Root Cause

The repo already had system health, observability, delivery truth, and control-plane helpers, but it had no dedicated read-only visibility layer that assembled those verified owners into one runtime snapshot for admin use.

## What Was Implemented

### 1. Static visibility registry

- Added a static module registry in `lib/system/codeVisibility.js`
- Each module maps to:
  - a label
  - description
  - control links
  - static code anchors

### 2. Read-only admin API

- Added `GET /api/admin/system/code`
- Added `?module=<module_id>` filtering
- Kept reads separate per module and combined only at the response layer
- Reused existing verified owners instead of inventing new truth sources

### 3. Read-only admin UI route

- Added `/admin/system/code`
- Displayed:
  - overall state
  - module cards
  - flow cards
  - control links
  - static code anchors

### 4. Delivery-truth cross-verification support

- Added the delivery-truth read/sync surface used for C29 cross-verification:
  - `app/api/admin/delivery-logs/route.js`
  - `app/api/jobs/delivery-sync/route.js`
  - `lib/queue/deliveryTruth.js`

### 5. Control-link correction

The initial API patch reused a few admin paths that did not exist. That was corrected before final proof.

- `control_plane` now points at real routes:
  - `/admin/settings`
  - `/admin/control/features`
  - `/admin/control/workflow`
- `generation_engine` now points at real routes:
  - `/admin/ai`
  - `/admin/ccc/bulk`
  - `/admin/settings`

### 6. Scoped deployment note

- Production deploy commit: `d0f35c1`
- The live deploy included the C29 runtime surfaces and delivery-truth cross-verification files
- The local sidebar edit in `app/admin/ClientLayout.jsx` was intentionally excluded from the scoped production deploy because that file also contained unrelated local shell changes
- The proved live C29 UI surface is the authenticated direct route `/admin/system/code`

## Live Validation

- `/api/status` reported production version `d0f35c1`
- Real admin login returned `200`, `success=true`, and `role=super_admin`
- Authenticated `GET /api/admin/system/code` returned `200` with `modules.length=6` and `flows.length=5`
- Authenticated `GET /api/admin/system/code?module=event_bus` returned `200` with exactly one `event_bus` module
- Authenticated `GET /admin/system/code` returned `200` with no runtime error markers
- All exposed control links returned `200`
- `delivery_engine.metrics` matched `/api/admin/delivery-logs`
- `event_bus.metrics.stuck_events` matched `/api/admin/observability` at `0`
- `control_plane.metrics.queue_paused` matched `/api/status.feature_flags.queue_paused = true`
- `/api/admin/system/health` remained `HEALTHY` in the current live window; it does not currently emit `queue_paused`, so that one flag was verified against `/api/status`

## Remaining Gap

- C29 is now closed in requested live scope
- Phase 14 remains `PARTIAL` because C30 Content Version History and broader RBAC lifecycle proof still remain

## Outcome

C29 now has a deployed and live-proven Code Visibility MVP. The remaining locked Phase 14 medium issue is C30, not Code Visibility.