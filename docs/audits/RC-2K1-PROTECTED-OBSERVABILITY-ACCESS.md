# RC-2K.1 Protected Observability Access Reconstruction

Date: 2026-05-16
Cycle: RC-2K.1 (Protected Observability Access Reconstruction)
Mode: Read-only reconstruction. No deployment. No auth redesign.

---

## 1. Reconstructed Authentication Path

Authoritative path for protected observability access:

1. Operator loads `/admin/login`
2. Client posts email/password to `/api/admin/login`
3. Server validates credentials (real RBAC path via `admin_users` when seeded)
4. Server issues `admin_session` JWT cookie (`httpOnly`, `sameSite=lax`, `path=/`, secure in prod)
5. Middleware validates JWT on `/admin/*` and `/api/admin/*`
6. Route handlers validate again via `withAdminAuth` + `verifyAdminSession`
7. Role policy gate (`super_admin`) allows SHOS/system/observability access

This path is deterministic and already implemented.

---

## 2. Dependency Chain

Protected observability dependency chain:

`/admin/system` or `/api/admin/system|shos|observability`
→ `middleware.js` JWT gate
→ route handler
→ `withAdminAuth`
→ `verifyAdminSession`
→ `getAdminAccessDecision` role policy
→ SHOS/system/observability payload

Any break before role authorization yields redirect (page) or `401` (API).

---

## 3. Production-vs-Local Auth Divergence

Checked auth-path files for local modifications:
- `middleware.js`
- `lib/auth/withAdminAuth.js`
- `lib/auth/verifyAdminSession.js`
- `app/api/admin/login/route.js`

Result: no local modifications in this cycle.

Classification: no code-level auth-path drift identified in current workspace.

---

## 4. Trusted Observability Surface Classification

| Surface | Classification | Why |
|---|---|---|
| `/api/health` | TRUSTED_PUBLIC | Public liveness only; not enough for canary rollback decisions |
| `/admin/system` | TRUSTED_PROTECTED | Canonical protected operator surface when authenticated |
| `/api/admin/system` | TRUSTED_PROTECTED | Protected system snapshot path |
| `/api/admin/system/shos` | TRUSTED_PROTECTED | Canonical SHOS snapshot/action surface; canary-critical |
| `/api/admin/observability` | TRUSTED_PROTECTED | Protected observability ledger/path |
| Any unauthenticated fetch of protected surfaces | EXECUTION_ENVIRONMENT_BLOCKED | Current context receives redirect/401 |

Surface trust for rollback decisions:
- Authoritative: protected SHOS/system/observability surfaces only
- Non-authoritative for rollback decision: public health alone

---

## 5. Required vs Optional Signal Set

### REQUIRED signals (canary-critical)
- Protected SHOS suppression state (`/api/admin/system/shos`)
- Protected mutation suppression outcomes on guarded admin mutation routes
- Protected divergence/coexistence snapshots (`/api/admin/system`, `/api/admin/observability`)
- Protected rollback verification signals (post-rollback protected reads)

### OPTIONAL signals
- Public `/api/health` liveness
- Public homepage reachability

### NICE_TO_HAVE signals
- Additional non-critical admin pages related to operators
- Supplemental audit dashboards outside SHOS/system/observability core

Safe coexistence observation without protected SHOS visibility:

**Not acceptable.** Public-only signals cannot prove suppression truth,
mutation-bypass truth, or hidden-write/coexistence truth.

---

## 6. Safe Observation Access Strategy

Safest strategy for canary observation:

1. Use browser-authenticated operator session on protected surfaces
2. Keep observation and rollback roles separated per RC-2J
3. Use exact RC-2J cadence limits to avoid stale-instance warming distortion
4. Avoid token-based shortcuts for protected admin APIs

Why token/API shortcut is rejected:
- Middleware requires `admin_session` cookie for `/api/admin*`
- Bearer-token support in `verifyAdminSession` does not bypass middleware gate
- Therefore API token-only path is not a viable protected observability method

Forbidden approaches (explicit):
- auth bypass headers
- temporary weakening of middleware checks
- hardcoded admin overrides
- browser-storage hacks or manual token injection shortcuts

---

## 7. Operator Access Choreography

| Responsibility | Role |
|---|---|
| Authenticate to protected admin surface | Signal Observer (ROLE B) and standby observer only |
| Perform protected coexistence/suppression probes | Signal Observer (ROLE B) |
| Confirm rollback triggers from evidence | Rollback Authority (ROLE C) |
| Execute rollback in Vercel | Rollback Authority (ROLE C) |

Session continuity protocol:
- Login before T-15 gate
- Verify protected read on `/api/admin/check` before T-5
- Keep single active browser tab per observer during HIGH_RISK window
- If session expires mid-window: immediate re-auth by ROLE B; ROLE C assumes
  conservative stance while signals are blind

Session fragility risks:
- auth expiration risk
- accidental logout/cookie loss
- redirect-loop risk if stale invalid cookie persists

Mitigation:
- preflight session check
- backup observer session ready but passive
- hard rule: if protected read path is lost during critical decision point,
  rollback priority dominates continuation optimism

---

## 8. Auth-Dependent Rollback Survivability

Classification: **AUTH_DEPENDENT**

Reason:
- Rollback trigger decisions require protected observability truth
- Rollback execution click itself is auth-independent in Vercel dashboard,
  but decision quality is auth-dependent on protected signal continuity

Thus rollback survivability is operationally coupled to session survivability.

---

## 9. Final Access Readiness Classification

**READY_ONLY_WITH_OPERATOR_BROWSER_ACCESS**

Interpretation:
- Auth path is clear and implemented
- Protected observability is usable only with valid authenticated operator session
- Current unauthenticated execution context remains blocked
- No deployment is authorized in RC-2K.1