# Fix: C22 Admin Users Schema Repair — Step 1 Live Resolution

**Date:** 2026-04-26  
**Author:** CTO (Agent)  
**Bible Reference:** Section 32, Section 40, Rule 25  
**Status:** RESOLVED

## Context
April 26 live proof showed that production `/api/admin/users` returned 500 even though the route existed and admin login succeeded. Code-level proof showed schema drift in `admin_users`: the current API expects `is_active` and `last_login_at`, while the original table from migration 001 only created `active` and never added the newer columns.

## Details
Step 1 is now resolved live. The production repair was completed with runtime proof, and the local POST compatibility patch remains a later safety cleanup rather than a blocker for the fix.

1. Added migration `supabase/migrations/20260426010000_admin_users_schema_repair.sql`.
   - Adds `is_active`, `last_login_at`, `updated_at`, and `assigned_cities` when missing.
   - Backfills `is_active` from legacy `active`.
   - Preserves nullable `name` because the current production admin UI keeps `name` optional.
   - Creates the expected indexes and enables RLS on the repaired table.
2. Applied the targeted production DB repair for C22.
   - Captured a pre-fix schema snapshot showing the legacy 001 table shape only.
   - Proved `041_real_rbac_admin_users.sql` is not legacy-safe as the first step on older installs because it indexes `is_active` before that column exists.
   - Applied `20260426010000_admin_users_schema_repair.sql` live.
   - Found and corrected a second production defect: `schema_migrations_id_seq` lagged behind `MAX(id)`, so migration recording initially failed with a duplicate primary key.
   - Re-synced the migration sequence, recorded the repair migration, and then applied/recorded `041_real_rbac_admin_users.sql`.
3. Kept `app/api/admin/users/route.js` POST hardening patch as a non-blocking follow-up deploy.
   - Normalizes email once.
   - Always writes a non-empty display name when this new code is deployed.
   - This patch is no longer required to clear the live GET failure.
4. Re-aligned the truth layer in `docs/INDEX.md`, `docs/CONTENT_COMMAND_CENTER.md`, and the targeted audit record.
   - C22 is now documented as resolved live.
   - The next dependency step remains C31: end shared `ADMIN_PASSWORD` auth and prove real RBAC live.

## Files Modified
- `supabase/migrations/20260426010000_admin_users_schema_repair.sql` — schema repair for legacy `admin_users` installs
- `app/api/admin/users/route.js` — non-null admin display name write path
- `docs/fixes/fix_007_admin_users_schema_repair.md` — Step 1 live resolution record
- `docs/INDEX.md` — C22 status closure + fix tracking
- `docs/CONTENT_COMMAND_CENTER.md` — truth section reflects live runtime result
- `docs/audits/audit-2026-04-26-c22-live-repair-proof.md` — targeted live repair proof

## Verification
- Local code path verified against current route expectations in `app/api/admin/users/route.js` and `app/api/admin/login/route.js`.
- Pre-fix production schema snapshot: `scripts/audit/results/2026-04-26T11-27-05-144Z-admin-users-schema-before.json`
- Post-fix production schema snapshot: `scripts/audit/results/2026-04-26T11-35-16-887Z-admin-users-schema-after.json`
- Live authenticated runtime proof: `scripts/audit/results/2026-04-26T11-35-25-832Z-c22-admin-users-live-proof.json`
- `npm run db:check-drift` rerun after Step 1 showed only four unrelated pending migrations remain: `038_observability_source_enforcement.sql`, `20260419_fix1f_media_draft_fk.sql`, `20260420_priority_r_schema_fixes.sql`, `20260426000000_navigation_menu.sql`
- Runtime proof now shows production `/api/admin/users` returns 200 with user data instead of 500.

## Remaining
- Deploy the local `app/api/admin/users/route.js` POST hardening patch later as Phase 14 cleanup.
- Execute Step 2: end legacy shared-password auth in production and prove real RBAC live.
- Keep unrelated pending migrations out of Step 1; they belong to later strict-order work.

## Cross-References
- Related audit: `docs/audits/audit-2026-04-26-c22-live-repair-proof.md`
- Related audit: `docs/audits/audit-2026-04-26-cto-live-proof-refresh.md`
- Related audit: `docs/audits/verified-live-system-audit-2026-04-26.md`
- Bible section: Section 32, Section 40