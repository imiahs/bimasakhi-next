# RC-2B CYCLE 7 — ATOM-C MANIFEST FREEZE

**Cycle:** RC-2B Cycle 7  
**Date:** 2026-05-14  
**Type:** DEPLOYMENT READINESS GATING (READ-ONLY)  
**Objective:** Authoritative atomic manifest for ATOM-C (SHOS) deployment unit  

---

## Section 1 — Manifest Classification Legend

| Classification | Meaning |
|---|---|
| `REQUIRED` | Must be in deploy commit; missing = build failure |
| `OPTIONAL` | Improves operator experience; missing = degraded but functional |
| `LOCAL_ONLY` | Exists only in local working tree |
| `SHADOW_ONLY` | Deployed to DB/infra but not via git deploy |
| `DECORATIVE` | No runtime function; display/cosmetic only |
| `DEAD` | Unreachable at runtime |
| `BLOCKING_IF_MISSING` | Breaks import chain on first serverless cold start |
| `PRODUCTION_REACHABLE` | Routable in production via admin or API |
| `PRODUCTION_UNREACHABLE` | Not routable without additional manifest items |
| `DEPENDENCY_AMBIGUITY` | Modified but classification requires resolution before freeze |

---

## Section 2 — Authoritative ATOM-C Manifest

### Group A: SHOS Core Files (ALL UNTRACKED — must be git-added)

| # | File | Classification | Status | Notes |
|---|---|---|---|---|
| 1 | `lib/system/shos.js` | REQUIRED · LOCAL_ONLY · BLOCKING_IF_MISSING | UNTRACKED | 1478-line SHOS control plane. All 7 coupled routes will fail cold-start without it. |
| 2 | `app/api/admin/system/shos/route.js` | REQUIRED · LOCAL_ONLY · PRODUCTION_REACHABLE | UNTRACKED | Dedicated SHOS snapshot + action API. `super_admin` guarded. |
| 3 | `features/admin/system/ShosControlCenter.jsx` | REQUIRED · LOCAL_ONLY · BLOCKING_IF_MISSING | UNTRACKED | SHOS UI component. `app/admin/system/page.js` imports it. Missing = build failure. |

### Group B: Admin System Page (TRACKED, MODIFIED)

| # | File | Classification | Status | Notes |
|---|---|---|---|---|
| 4 | `app/admin/system/page.js` | REQUIRED · PRODUCTION_REACHABLE | TRACKED+MODIFIED | Imports `ShosControlCenter`. HEAD imports `SystemHealthContent`. Must deploy with Group A file #3 or build breaks. |

### Group C: SHOS-Wired Admin API Routes (ALL TRACKED, MODIFIED — must be committed)

| # | File | SHOS Function Used | Classification | Notes |
|---|---|---|---|---|
| 5 | `app/api/admin/system/route.js` | `getShosSnapshot` | REQUIRED · PRODUCTION_REACHABLE | Composite system status endpoint. Callers include admin dashboard. |
| 6 | `app/api/admin/system/health/route.js` | `getShosSnapshot` | REQUIRED · PRODUCTION_REACHABLE | Returns SHOS health fields directly. `super_admin` guarded. |
| 7 | `app/api/admin/system-health/route.js` | `getShosSnapshot` | REQUIRED · PRODUCTION_REACHABLE | Full system-health endpoint for admin panel. |
| 8 | `app/api/admin/queue/route.js` | `performShosAction` | REQUIRED · PRODUCTION_REACHABLE | POST queue action path now routes through SHOS. |
| 9 | `app/api/admin/dlq/route.js` | `performShosAction` | REQUIRED · PRODUCTION_REACHABLE | POST DLQ reprocess/discard routes through SHOS. |
| 10 | `app/api/admin/delivery-logs/route.js` | `performShosAction` | REQUIRED · PRODUCTION_REACHABLE | POST delivery retry action routes through SHOS. |
| 11 | `app/api/admin/observability/route.js` | `getShosSnapshot` | REQUIRED · PRODUCTION_REACHABLE | Returns SHOS recovery fields in observability response. |

### Group D: Modified Dependency Libraries (TRACKED, MODIFIED — DEPENDENCY_AMBIGUITY)

| # | File | Classification | Status | Notes |
|---|---|---|---|---|
| 12 | `lib/queue/deliveryTruth.js` | **DEPENDENCY_AMBIGUITY** | TRACKED+MODIFIED (+26/-23) | SHOS imports `recordExternalDelivery`, `syncExternalDelivery`, `syncPendingExternalDeliveries`. HEAD version may provide these symbols. LOCAL changes must be audited: if they fix SHOS-critical bugs they MUST be in ATOM-C; if they are unrelated they MAY be deferred. |
| 13 | `lib/system/systemHealth.js` | **DEPENDENCY_AMBIGUITY** | TRACKED+MODIFIED (+36/-2) | SHOS imports `getSystemHealthSnapshot`. HEAD version provides this. LOCAL additions (+36 lines) must be audited: if they extend the snapshot shape that SHOS relies on, they MUST be in ATOM-C. |

### Group E: Clean Deployed Dependencies (NO ACTION REQUIRED)

| # | File | Classification | Status |
|---|---|---|---|
| 14 | `lib/auth/withAdminAuth.js` | REQUIRED (already deployed ATOM-B) | CLEAN |
| 15 | `utils/supabaseClientSingleton.js` | REQUIRED (already deployed) | CLEAN |
| 16 | `lib/queue/publisher.js` | REQUIRED (already deployed) | CLEAN |
| 17 | `lib/monitoring/runbooks.js` | REQUIRED (already deployed) | CLEAN |
| 18 | `lib/queue/qstash.js` | REQUIRED (already deployed) | CLEAN |
| 19 | `lib/events/eventStore.js` | REQUIRED (already deployed) | CLEAN |
| 20 | `lib/events/triggerMap.js` | REQUIRED (already deployed) | CLEAN |
| 21 | `lib/safeLogger.js` | REQUIRED (already deployed) | CLEAN |

---

## Section 3 — Files Explicitly EXCLUDED from ATOM-C

These appear SHOS-adjacent but are out of scope:

| File | Reason for Exclusion |
|---|---|
| `features/admin/system/SystemHealthContent.jsx` | HEAD system page imports this; ATOM-C replaces it; no deploy needed |
| `lib/ai/promptEngine.js` | ATOM-E scope (separate hard blocker) |
| `lib/cms/resolveRoute.js` | ATOM-D scope (CMS resolver chain) |
| `features/admin/content/ContentInventoryContent.jsx` | ATOM-F scope (admin content UI) |
| Any media / AI recovery files | EXPLICITLY excluded per cycle rules |

---

## Section 4 — Deployment Order Within ATOM-C

**Mandatory atomic commit:** ALL files in Groups A, B, C must be in ONE git commit.  
Groups A + B + C are coupled such that partial deployment of any sub-group results in build failure or broken import chains.

**Required resolution before freeze:** Files in Group D must be classified IN or OUT before the commit can be constructed.

---

## Section 5 — Manifest Readiness Summary

| Group | Files | Blockers |
|---|---|---|
| A — SHOS Core (untracked) | 3 | None (tracked by ATOM-C commit) |
| B — System Page | 1 | Coupled to Group A #3 |
| C — Wired Routes | 7 | Coupled to Group A #1 |
| D — Ambiguous Deps | 2 | **MUST RESOLVE** before commit |
| E — Clean Deps | 8 | None |

**Total ATOM-C files once D is resolved:** 11 minimum, up to 13.

---

## Section 6 — Manifest Freeze Blockers

| # | Blocker | Severity |
|---|---|---|
| MFB-01 | `lib/queue/deliveryTruth.js` local changes not classified (IN or OUT) | HIGH |
| MFB-02 | `lib/system/systemHealth.js` local changes not classified (IN or OUT) | HIGH |

Until MFB-01 and MFB-02 are resolved, the manifest CANNOT be fully frozen for deployment.

---

*Artifact created: RC-2B Cycle 7 ATOM-C manifest — read-only, no deployment.*
