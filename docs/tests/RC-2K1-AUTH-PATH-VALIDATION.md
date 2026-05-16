# RC-2K.1 Auth Path Validation

Date: 2026-05-16
Cycle: RC-2K.1
Mode: Validation-only. No deployment.

---

## Validation Summary

| Check | Result |
|---|---|
| `/admin/system` unauthenticated behavior | Redirect to login with `redirect_to` |
| `/api/admin/system` unauthenticated behavior | `401` JSON |
| `/api/admin/system/shos` unauthenticated behavior | `401` JSON |
| `/api/admin/observability` unauthenticated behavior | `401` JSON |
| Middleware JWT gating present for `/admin*` and `/api/admin*` | PASS |
| Route-level auth verification (`withAdminAuth`) present | PASS |
| Role gate (`super_admin`) on SHOS/system health paths | PASS |
| Auth-path files locally drifted in this cycle | NO |

---

## Classification

- Protected surface path: CONDITIONALLY_ACCESSIBLE
- Current execution context: EXECUTION_ENVIRONMENT_BLOCKED
- Auth-chain clarity: AUTHORIZATION_PATH_CLEAR

---

## Final Access Matrix

| Surface | Access Method | Runtime Dependency | Observation Criticality | Status |
|---|---|---|---|---|
| `/api/health` | Public GET | Public runtime only | Optional | ACCESSIBLE |
| `/admin/system` | Browser login + `admin_session` cookie | Middleware JWT + role policy | Required | CONDITIONALLY_ACCESSIBLE |
| `/api/admin/system` | Authenticated cookie request | Middleware JWT + withAdminAuth + role policy | Required | CONDITIONALLY_ACCESSIBLE |
| `/api/admin/system/shos` | Authenticated cookie request | Middleware JWT + withAdminAuth + `super_admin` role | Required (highest) | CONDITIONALLY_ACCESSIBLE |
| `/api/admin/observability` | Authenticated cookie request | Middleware JWT + withAdminAuth + role policy | Required | CONDITIONALLY_ACCESSIBLE |
| Protected APIs via bearer token only | Token header | Blocked by middleware cookie gate | Not valid for canary | EXECUTION_ENVIRONMENT_BLOCKED |