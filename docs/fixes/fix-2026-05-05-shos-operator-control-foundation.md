# Fix: 2026-05-05 SHOS Operator Control Foundation

> Status: HISTORICAL FOUNDATION BASELINE - SUPERSEDED BY SHOS COMPLETE OPERATOR SYSTEM
> Scope: Section 32, Section 39, Section 40, Section 47, Section 49
> Superseded By: `docs/fixes/fix-2026-05-05-shos-complete-operator-system.md`

---

## Problem

System control was fragmented across multiple admin pages and APIs. Feature flags, DLQ actions, queue recovery, delivery recovery, alerts, errors, and health counts were split across different abstractions and used inconsistent metrics windows. Several old operator actions were destructive and did not preserve reversible history.

During validation, SHOS also exposed three concrete runtime blockers that had to be removed before the operator surface could be proven locally: authenticated admin routes depended on brittle middleware-injected identity headers, the target database still lacked the new SHOS migration contract, and SHOS queue reads assumed `generation_queue.updated_at`, which does not exist in the real schema.

---

## Fix

1. Added a SHOS action ledger: `system_control_actions`.
2. Added additive operator-state columns so SHOS can resolve/clear/mark-terminal flows without deleting historical rows.
3. Added `lib/system/shos.js` as the unified control-plane assembly and action executor.
4. Added `/api/admin/system/shos` as the canonical SHOS API.
5. Replaced `/admin/system` with a SHOS console UI.
6. Updated legacy DLQ, queue, delivery, system-health, and system routes to use SHOS semantics or SHOS metrics.
7. Redirected `/admin/system/alerts` to the canonical SHOS console.
8. Removed authenticated admin reliance on middleware-injected headers and verified sessions directly inside `withAdminAuth`.
9. Patched admin routes that recorded actors so they use the verified user identity rather than `x-admin-user`.
10. Applied `20260505090000_shos_operator_control.sql` to remove the missing-table contract gap.
11. Aligned SHOS queue reads/writes to `generation_queue.created_at` / `completed_at` instead of the nonexistent `updated_at` column.
12. Added a repeatable local runtime harness with a small authenticated SHOS burst probe.

---

## Files Changed

1. `supabase/migrations/20260505090000_shos_operator_control.sql`
2. `lib/system/shos.js`
3. `app/api/admin/system/shos/route.js`
4. `features/admin/system/ShosControlCenter.jsx`
5. `app/admin/system/page.js`
6. `app/api/admin/dlq/route.js`
7. `app/api/admin/queue/route.js`
8. `app/api/admin/delivery-logs/route.js`
9. `app/api/admin/system-health/route.js`
10. `app/api/admin/system/route.js`
11. `app/api/admin/system/health/route.js`
12. `app/api/admin/errors/route.js`
13. `app/admin/system/dlq/page.js`
14. `app/admin/system/alerts/page.js`
15. `middleware.js`
16. `lib/auth/withAdminAuth.js`
17. `app/api/admin/config/route.js`
18. `app/api/admin/actions/route.js`
19. `scripts/audit/audit-shos-local-runtime.mjs`

---

## Validation Result

1. `npm run build`: PASS.
2. Focused IDE error checks on touched SHOS files: PASS.
3. `node scripts/applyTargetedMigration.js 20260505090000_shos_operator_control.sql`: PASS.
4. Unauthenticated SHOS route access: PASS (`401` as expected).
5. Local `npm run start`: PASS.
6. Local `POST /api/admin/login`: PASS (`200`, secure admin session cookie present).
7. Authenticated `GET /api/admin/queue`: PASS.
8. Authenticated `GET /api/admin/system/shos?limit=3`: PASS.
9. Authenticated SHOS burst probe: PASS (`8/8`, average `437ms`, max `720ms`).
10. Authenticated `/admin/ccc` and `/admin/system`: PASS.

---

## Safety Notes

1. No existing user changes were reverted.
2. No destructive git operations were used.
3. The SHOS migration executed in this session is additive and preserves reversible operator-state tracking.
4. No deployment was performed in this session.
5. Browser login on plain `http://localhost` still will not persist the admin cookie because it is `Secure`; local API-level auth proof is authoritative unless HTTPS is used.