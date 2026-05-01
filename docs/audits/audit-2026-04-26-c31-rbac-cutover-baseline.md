# C31 RBAC Cutover Baseline - 2026-04-26

**Status:** CURRENT TRUTH FOR C31  
**Audit Type:** Live auth baseline + local cutover readiness proof  
**Primary Reference:** `docs/fixes/fix_008_c31_rbac_cutover_remove_legacy_shared_password.md`  
**Secondary References:** `docs/CONTENT_COMMAND_CENTER.md`, `docs/INDEX.md`, `app/api/admin/login/route.js`, `features/admin/login/LoginContent.jsx`, `lib/auth/verifyAdminSession.js`  
**Execution Window:** 2026-04-26 UTC / IST  

## 1. Executive Summary

C31 is not fixed live yet, but the next cutover step is now fully proven and locally prepared.

Production still accepts shared-password login. More importantly, even when login is attempted with `email + password`, the returned session token still contains `email: admin@system`, which proves the live route is still running the legacy fallback path rather than real `admin_users` authentication.

Local code is now ready to cut over to real RBAC without relying on `ADMIN_USERS_ENABLED=true`, and the admin proof scripts have been updated so the runtime evidence path will survive the cutover.

## 2. Evidence Files

- `scripts/audit/results/2026-04-26T11-59-54-052Z-c31-login-mode-baseline.json`
- `scripts/audit/results/2026-04-26T11-57-33-646Z-admin-systems-read-ps.json`

## 3. Live Baseline Proof

Captured production runtime showed:

- password-only login returned `200`
- email+password login also returned `200`
- both resulting session tokens decoded to `email: admin@system`

That means the live route still ignores the provided email and is authenticating through the legacy shared-password branch.

## 4. Local Readiness Proof

The following local cutover changes were completed:

1. `app/api/admin/login/route.js`
   - seeded `admin_users` presence now forces real auth by default
   - legacy fallback is bootstrap-only
2. `features/admin/login/LoginContent.jsx`
   - login form now submits `email + password`
3. `lib/auth/verifyAdminSession.js`
   - JWT verification no longer falls back to `ADMIN_PASSWORD`
4. `lib/adminApi.js`
   - shared login helper now submits `email + password`
5. audit/validation scripts
   - updated to authenticate with `email + password`

Local executable validation:

- `npm run build` passed
- updated PowerShell admin systems audit passed
- updated Node admin auth smoke test passed against the current live system

## 5. Cutover Safety Proof

Direct database proof confirmed the current live admin user is already compatible with real RBAC:

- `admin@bimasakhi.com` exists in `admin_users`
- the row is active
- the stored bcrypt hash matches the current shared admin password

This means the real-auth path can succeed immediately after deployment.

## 6. Blocker

C31 cannot be closed without deploying the staged code changes.

Why deploy is mandatory for this step:

- current production UI still submits password-only
- current production route still allows the legacy fallback
- setting env or changing DB alone would not complete the user-facing cutover safely

## 7. Verdict

**C31 status:** IN_PROGRESS

What is proven now:

- legacy shared-password auth is still live in production
- the local replacement path is code-complete and build-clean
- the live admin account is ready for real RBAC
- the runtime proof scripts are ready for post-deploy validation

What is still required:

- deploy the staged Step 2 code
- prove live that password-only auth is rejected and email+password auth succeeds under real RBAC
