# Fix: C31 RBAC Cutover — Remove Legacy Shared-Password Auth

**Date:** 2026-04-26  
**Author:** CTO (Agent)  
**Bible Reference:** Section 32, Section 40, Rule 25  
**Status:** RESOLVED LIVE

## Context
After C22 was closed live, the next locked priority was C31: remove legacy shared-password auth and prove real RBAC live. Production runtime proof showed that `/api/admin/login` still accepts password-only requests and issues a session token with `email: admin@system`, which proves the legacy fallback is still live in production.

## Baseline Proof
Step 2 baseline evidence captured three critical facts:

1. Password-only login still succeeds in production.
2. Email+password also succeeds today, but it still returns a legacy fallback token instead of a real `admin_users` identity.
3. The current seeded live admin user can authenticate under real RBAC with the same shared password, so cutover is safe once the code is deployed.

## Deployed Change Set
The cutover code is now deployed and verified live:

1. Updated `app/api/admin/login/route.js`.
   - Real `admin_users` auth now becomes the default whenever the table is already seeded.
   - Legacy `ADMIN_PASSWORD` fallback is restricted to bootstrap-only use before `admin_users` exists.
2. Updated `features/admin/login/LoginContent.jsx`.
   - The live admin login form already collects email; it now actually sends `email + password` to the login API.
3. Updated `lib/auth/verifyAdminSession.js`.
   - JWT verification no longer falls back to `ADMIN_PASSWORD` as a signing secret.
4. Updated `lib/adminApi.js`.
   - Shared admin login helper now posts `email + password`.
5. Updated the admin runtime proof scripts.
   - Audit and validation scripts now authenticate with `email + password`, so post-cutover runtime proof will remain valid.

## Verification
- Live baseline proof: `scripts/audit/results/2026-04-26T11-59-54-052Z-c31-login-mode-baseline.json`
  - password-only login: `200`
  - email+password login: `200`
  - both token payloads still show `email: admin@system`, proving legacy fallback remains live
- Deployment proof:
  - commit `7335ece` was pushed to `main`
  - `/api/status` reported `version: 7335ece` before the post-deploy proof ran
- Live cutover proof: `scripts/audit/results/2026-04-26T12-25-38-729Z-c31-rbac-cutover-live-proof.json`
  - password-only login: `400`
  - email+password login: `200`
  - session payload email: `admin@bimasakhi.com`
- Browser login proof: `scripts/audit/results/2026-04-26T12-26-50-000Z-c31-admin-ui-browser-proof.json`
  - `/admin/login` submitted successfully in the live browser flow
  - browser landed on `/admin`
  - dashboard title and control-surface markers were visible
- Live admin user readiness proof:
  - seeded `admin@bimasakhi.com` row is active
  - stored password hash matches the current shared admin password
- Local code validation:
  - `npm run build` passed after the cutover changes
- Proof-tooling validation:
  - `scripts/audit/results/2026-04-26T11-57-33-646Z-admin-systems-read-ps.json` passed after updating the audit login payload

## Outcome
All four strict post-deploy conditions passed in production:

1. password-only login fails
2. email + password returns `200`
3. session payload no longer contains `admin@system`
4. admin UI login works end-to-end

That means the seeded-production path now authenticates through real `admin_users` RBAC rather than the legacy shared-password fallback.

## Result
**C31 status:** RESOLVED LIVE

Remaining Phase 14 gaps are now narrower and separate from C31:

- Code Visibility Layer 4
- Content Version History
- broader RBAC lifecycle/admin-user management hardening beyond the login cutover

## Cross-References
- Related audit: `docs/audits/audit-2026-04-26-c31-rbac-cutover-baseline.md`
- Related audit: `docs/audits/audit-2026-04-26-c31-rbac-cutover-live-proof.md`
- Related fix: `docs/fixes/fix_007_admin_users_schema_repair.md`
- Related audit: `docs/audits/audit-2026-04-26-c22-live-repair-proof.md`
