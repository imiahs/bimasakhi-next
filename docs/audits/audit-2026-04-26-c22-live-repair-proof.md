# C22 Live Repair Proof - 2026-04-26

**Status:** CURRENT TRUTH FOR C22  
**Audit Type:** Targeted production DB repair + authenticated runtime verification  
**Primary Reference:** `docs/fixes/fix_007_admin_users_schema_repair.md`  
**Secondary References:** `docs/CONTENT_COMMAND_CENTER.md`, `docs/INDEX.md`, `app/api/admin/users/route.js`, `supabase/migrations/001_admin_auth_schema.sql`, `supabase/migrations/041_real_rbac_admin_users.sql`, `supabase/migrations/20260426010000_admin_users_schema_repair.sql`  
**Execution Window:** 2026-04-26 UTC / IST  
**Data Rule:** No audit data was written beyond existing admin auth/session use.  

## 1. Executive Summary

C22 is resolved in production. The live `admin_users` table was missing `is_active`, `last_login_at`, `updated_at`, and `assigned_cities`, which caused `/api/admin/users` to fail on the current handler. A targeted repair was executed live, the migration registry drift was corrected, and authenticated runtime proof now shows `/api/admin/users` returning 200.

The local POST hardening patch in `app/api/admin/users/route.js` is still useful but was not required to clear the live GET failure. The next dependency step remains C31: remove legacy shared-password auth and prove real RBAC live.

## 2. Evidence Files

- `scripts/audit/results/2026-04-26T11-27-05-144Z-admin-users-schema-before.json`
- `scripts/audit/results/2026-04-26T11-35-16-887Z-admin-users-schema-after.json`
- `scripts/audit/results/2026-04-26T11-35-25-832Z-c22-admin-users-live-proof.json`

## 3. Root Cause Chain

1. `app/api/admin/users/route.js` GET selects `is_active` and `last_login_at`.
2. `supabase/migrations/001_admin_auth_schema.sql` created legacy `admin_users` with `active` and without `last_login_at`.
3. `supabase/migrations/041_real_rbac_admin_users.sql` uses `CREATE TABLE IF NOT EXISTS`, so it does not alter an existing legacy table.
4. On older installs, `041` is not safe as the first repair step because it creates an index on `is_active` before that column exists.
5. `supabase/migrations/20260426010000_admin_users_schema_repair.sql` is the actual repair vehicle for legacy production tables.

## 4. Pre-Fix Proof

The pre-fix schema snapshot showed only these live columns on `public.admin_users`:

- `id`
- `email`
- `name`
- `password_hash`
- `role`
- `active`
- `created_at`

This matched the production 500 failure against the current handler expectations.

## 5. Execution Record

1. Captured a pre-fix production schema snapshot.
2. Attempted `041_real_rbac_admin_users.sql` first and confirmed it fails on legacy installs with `column "is_active" does not exist`.
3. Applied `20260426010000_admin_users_schema_repair.sql` in production.
4. Confirmed the schema change was live even though migration recording failed.
5. Identified the recording failure cause: `schema_migrations_id_seq` lagged behind `MAX(id)` and produced a duplicate primary key on insert.
6. Re-synced the `schema_migrations` sequence, recorded `20260426010000_admin_users_schema_repair.sql`, then applied and recorded `041_real_rbac_admin_users.sql`.
7. Triggered PostgREST schema reload and re-ran authenticated runtime proof.

## 6. Post-Fix Proof

Post-fix schema snapshot confirms these columns now exist on `public.admin_users`:

- `id`
- `email`
- `name`
- `password_hash`
- `role`
- `active`
- `created_at`
- `is_active`
- `last_login_at`
- `updated_at`
- `assigned_cities`

Post-fix migration registry proof confirms these entries are now recorded:

- `041_real_rbac_admin_users.sql`
- `20260426010000_admin_users_schema_repair.sql`

Authenticated production runtime proof confirms:

- Admin login returned `200`
- Session cookie was issued
- `/api/admin/users` returned `200`
- Response body contained the live admin user row

## 7. Drift State After Step 1

A post-fix `npm run db:check-drift` recheck reported:

- Repo migrations: `71`
- Live `schema_migrations`: `67`
- Remaining repo-only migrations:
  - `038_observability_source_enforcement.sql`
  - `20260419_fix1f_media_draft_fk.sql`
  - `20260420_priority_r_schema_fixes.sql`
  - `20260426000000_navigation_menu.sql`

These are unrelated to C22 and were intentionally left out of the Step 1 execution path.

## 8. Verdict

**C22 status:** RESOLVED LIVE

What is now proven:

- Production `admin_users` schema matches the current GET path expectations.
- `/api/admin/users` no longer returns 500.
- Step 1 was closed without running the full repo migration set.

What remains outside this fix:

- Legacy shared-password auth is still active in production.
- The local users POST hardening patch is still pending deploy as cleanup.
- Other unrelated migration drift remains for later strict-order steps.