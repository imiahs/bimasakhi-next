# C31 RBAC Cutover Live Proof - 2026-04-26

**Status:** CURRENT TRUTH FOR C31  
**Audit Type:** Post-deploy runtime proof  
**Primary Reference:** `docs/fixes/fix_008_c31_rbac_cutover_remove_legacy_shared_password.md`  
**Secondary References:** `docs/audits/audit-2026-04-26-c31-rbac-cutover-baseline.md`, `docs/CONTENT_COMMAND_CENTER.md`, `docs/INDEX.md`  
**Execution Window:** 2026-04-26 UTC / IST  

## 1. Executive Summary

C31 is now resolved live.

Commit `7335ece` was deployed to production and confirmed through `/api/status`. After deployment, all four required conditions passed:

1. password-only admin login failed
2. email + password admin login returned `200`
3. the session payload no longer used `admin@system`
4. the browser login flow successfully landed on the live `/admin` dashboard

This closes the legacy shared-password auth path for seeded `admin_users` installs and proves real RBAC is now live in production.

## 2. Evidence Files

- `scripts/audit/results/2026-04-26T11-59-54-052Z-c31-login-mode-baseline.json`
- `scripts/audit/results/2026-04-26T12-25-38-729Z-c31-rbac-cutover-live-proof.json`
- `scripts/audit/results/2026-04-26T12-26-50-000Z-c31-admin-ui-browser-proof.json`

## 3. Deployment Proof

Production deployment was verified before the auth proof ran:

- `/api/status` returned `version: 7335ece`
- the auth proof was executed only after that live version check passed

## 4. Strict Post-Deploy Conditions

### Condition 1: Password-only login must fail

Passed.

- `POST /api/admin/login` with `{ "password": "..." }`
- response status: `400`
- response body: `Email and password are required`

### Condition 2: Email + password login must return 200

Passed.

- `POST /api/admin/login` with `{ "email": "admin@bimasakhi.com", "password": "..." }`
- response status: `200`
- response body: `{ success: true, role: "super_admin" }`

### Condition 3: Session payload must not contain `admin@system`

Passed.

Decoded JWT payload from the returned session cookie showed:

- `sub: 4dcaed28-d730-49b3-a030-db70996a3ae1`
- `email: admin@bimasakhi.com`
- `role: super_admin`

This proves the live session identity now comes from `admin_users`, not the legacy fallback token.

### Condition 4: Admin UI login must work end-to-end

Passed.

Browser proof captured:

- login page title: `Admin Login | Bima Sakhi`
- successful navigation to: `https://bimasakhi.com/admin`
- post-login page title: `Bima Sakhi OS | Business Control | Bima Sakhi`
- authenticated dashboard markers visible:
  - `Dashboard`
  - `CRM`
  - `Content`
  - `Features`
  - `Workflow`
  - `Production control panel for the real growth engine.`

## 5. Verdict

**C31 status:** RESOLVED LIVE

What is now proven:

- password-only shared admin auth is rejected on the live seeded system
- email + password login succeeds through real RBAC
- session identity is now `admin@bimasakhi.com`, not `admin@system`
- admin UI login works end-to-end in the live browser flow

Next locked execution order remains:

1. C23 - fix sitemap localhost URLs
2. C21 - restore navigation deploy parity and `/api/navigation`