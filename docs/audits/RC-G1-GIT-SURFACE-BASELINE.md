# RC-G1 Git Surface Baseline

Date: 2026-05-16
Cycle: RC-G1 (Git Segregation & Deployment Baseline Restoration)
Mode: read-only git-state reconstruction

---

## Scope Lock

No production deployment, no runtime mutation, no feature activation, no schema/migration change, and no auth/middleware/rollback/observability redesign occurred in RC-G1.

## 1. Authoritative Git State

Repository state at baseline capture:

- branch: `main`
- HEAD: `52ce7d0bf4f082dc042aaa28bd58ab5340b38eb7`
- git state: DIRTY

Counts from parsed porcelain baseline:

- `total_dirty_count=271`
- `tracked_modified_count=131`
- `untracked_count=140`
- `deleted_count=89`

Path-bucket classification counts:

- `runtime_critical=27`
- `admin_surface=18`
- `docs_only=132`
- `scripts_tools=4`
- `config_infra=1`
- `generated_or_logs=89`
- `tests_only=0`
- `unknown_other=0`

Result: no dirty file remained operationally unclassified (`unknown_other=0`).

## 1.1 Surface Classification Definitions

- runtime-critical files: production behavior-capable app/lib/middleware/config execution surfaces
- deploy-safe files: independently deployable files with no unsafe runtime coupling in current scope
- docs-only files: documentation artifacts under `docs/**` (plus static documentation roots)
- experimental/local-only files: local scaffolds, probes, or prototype files not yet release-authorized
- abandoned/generated files: logs/result artifacts not intended for production deployment
- rollback-critical files: files whose deployment changes rollback path or authority semantics

## 1.2 Runtime-Critical Outside Deterministic Grouping

Yes. Runtime-critical surfaces currently exist outside deterministic deployment grouping in dirty state, including app/lib/admin runtime files mixed with docs and generated artifacts.

Operational implication:

- deploy-surface ambiguity remains high until runtime-critical files are isolated into explicit atomic groups.

## 1.5 Operational Authority Mapping

### Authority Ownership (current operational contract)

- runtime mutation authority: SHOS runtime action surfaces + runtime mutation-capable handlers (bounded by RC-3A limits)
- SHOS authority: SHOS control/route/core surfaces (bounded to limited expansion)
- rollback authority: deployment + rollback execution authority (human role separation retained)
- observability authority: protected admin system/health/observability surfaces
- deployment authority: git commit grouping + deployment trigger ownership

### Surface Sensitivity Classification

- authority-expanding files:
  - SHOS core/route/control surfaces (`lib/system/shos.js`, `app/api/admin/system/shos/route.js`, SHOS-wired admin system routes/pages)
  - auth gate and middleware surfaces (`middleware.js`, auth wrappers)
- authority-neutral files:
  - docs-only and static reporting artifacts
- rollback-sensitive files:
  - middleware/auth pair
  - SHOS control-plane route/core set
  - system health and observability aggregation files
- observability-sensitive files:
  - `app/api/admin/system/health/route.js`
  - `app/api/admin/system/route.js`
  - `app/api/admin/observability/route.js`
  - `lib/system/systemHealth.js`
  - delivery/queue truth helpers feeding those routes

### Implicit Authority Widening Check

- finding: dirty mixed runtime state can implicitly widen operational authority if deployed without strict grouping
- RC-G1 requirement: all authority-expanding surfaces must be atomically grouped or explicitly blocked.

## Baseline Classification

GIT_SURFACE_CLASSIFICATION: DIRTY_MIXED_SURFACES_WITH_ZERO_UNKNOWN_PATHS
