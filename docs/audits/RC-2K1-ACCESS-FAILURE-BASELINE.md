# RC-2K.1 Access Failure Baseline

Date: 2026-05-16
Cycle: RC-2K.1 (Protected Observability Access Reconstruction)
Mode: Read-only runtime analysis. No deployment. No runtime mutation.

---

## Objective

Capture authoritative PRE-T0 access failures for protected observability surfaces,
including redirect behavior, status behavior, cookie/session behavior, and middleware
auth-path behavior.

---

## 1. Surface Verification Results

| Surface | Probe Method | Result |
|---|---|---|
| `/admin/system` | Browser fetch with credentials | Redirected to `/admin/login?redirect_to=%2Fadmin%2Fsystem` |
| `/api/admin/system` | Browser fetch + direct fetch | `401 Unauthorized` with `{"error":"Unauthorized"}` |
| `/api/admin/system/shos` | Browser fetch + direct fetch | `401 Unauthorized` with `{"error":"Unauthorized"}` |
| `/api/admin/observability` | Browser fetch + direct fetch | `401 Unauthorized` with `{"error":"Unauthorized"}` |

Interpretation:
- Protected page flow is redirect-based when session is absent/invalid.
- Protected API flow is hard `401` JSON when session is absent/invalid.

---

## 2. Redirect Behavior

- Admin page surfaces (`/admin/*`) redirect unauthenticated requests to login.
- Middleware appends `redirect_to` for route return after successful login.
- Token-expired page requests redirect with `error=session_expired`.

This behavior is consistent with middleware page-guard logic.

---

## 3. Cookie Behavior

Observed state in current browser execution context:
- `document.cookie` is empty at login page.

Expected session cookie behavior from server code:
- Cookie name: `admin_session`
- Set by: `POST /api/admin/login`
- Flags: `httpOnly`, `sameSite=lax`, `path=/`, `secure` in production
- Expiration source: JWT `exp` claim (`24h` from issuance)

Because cookie is `httpOnly`, client JavaScript cannot reliably inspect its value.

---

## 4. Auth-State Behavior

For missing/invalid session:
- Page guard path: redirect to login
- API guard path: `401` JSON

For valid session:
- Middleware verifies JWT before request reaches handler
- Route-level `withAdminAuth` verifies again through `verifyAdminSession`
- Role policy enforcement applied via `getAdminAccessDecision`

Protected SHOS/system/observability routes are `super_admin` surfaces.

---

## 5. Middleware Behavior Baseline

Middleware checks for `/api/admin*`:
- Requires `admin_session` cookie except explicit public path `/api/admin/login`
- Returns `401` when cookie missing/invalid

Middleware checks for `/admin*`:
- Requires `admin_session` cookie except `/admin/login` and debug path exemptions
- Redirects to `/admin/login` when missing/invalid

This explains browser/API divergence in response form (redirect vs JSON) while both
are auth failures.

---

## 6. Session Persistence Behavior

Session continuity dependencies:
- Cookie remains present and valid (`exp` not reached)
- Middleware continues to validate JWT
- No logout call clearing cookie

Potential session-break outcomes:
- Cookie expires: page redirects with `session_expired`
- Cookie cleared: protected APIs return `401`

---

## 7. Flow-Difference Classification

| Flow Type | Behavior | Classification |
|---|---|---|
| Browser page flow (`/admin/system`) | Redirect to login when unauthenticated | AUTH_BLOCKED_REDIRECT |
| Browser/API fetch flow (`/api/admin/*`) | `401` JSON when unauthenticated | AUTH_BLOCKED_401 |
| Serverless protected route handler flow | Not reached when middleware fails | MIDDLEWARE_PREEMPTED |
| Protected SSR/admin page flow | Redirect-based auth gate | AUTH_BLOCKED_REDIRECT |

Conclusion:

Auth failure semantics differ by surface type (redirect vs 401), not by ambiguity in
security model.

---

## 8. Baseline Classification

**Classification:** EXECUTION_ENVIRONMENT_BLOCKED (for protected observability use)

Reason:
- Protected observability surfaces are alive and guarded.
- Current execution context lacks a valid authenticated admin session.
- Therefore canary-critical protected observation cannot be performed from this
  context until operator authentication succeeds.