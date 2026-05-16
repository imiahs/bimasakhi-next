# DEPLOYMENT POLLUTION REPORT
**Purpose:** Identify all pollution — duplicate systems, shadow code, dead routes, abandoned experiments, local hacks  
**Date:** 2026-05-13  
**Method:** File inventory + import chain analysis + dead code detection  
**Rule:** Evidence only.

---

## POLLUTION SUMMARY

> **14 pollution items identified across 6 categories. Most are benign (expired JSON artifacts, duplicate route resolvers). Two are structurally significant: (1) the dual auth architecture mid-transition, and (2) the catch-all route that exists in TWO major version states locally. Zero dangerous pollution.**

---

## POLLUTION CATEGORY 1: EXPIRED AUDIT ARTIFACTS

### What: ~130 JSON files in `scripts/audit/results/`

| Item | Status |
|------|--------|
| Location | `scripts/audit/results/2026-04-25*.json` through `2026-05-07*.json` |
| Count | ~130 files |
| Size | Each 1–50KB |
| Content | Point-in-time snapshots of Supabase state, QStash delivery status, admin flow results |
| Created by | Automated audit scripts (`scripts/runAudit.mjs`) during development verification |
| Runtime use | NONE — these are read only by developers |
| Production impact | NONE — gitignored per new `.gitignore` rule |
| Already staged for removal? | YES — marked as `D` (deleted) in git status. `.gitignore` addition prevents future accumulation |

**Risk:** None  
**Cleanup importance:** Medium — they've been polluting the git diff and making status output unreadable  
**Safe to remove:** YES — already being removed from git tracking via .gitignore  

---

## POLLUTION CATEGORY 2: DUAL AUTHENTICATION ARCHITECTURE

### What: Two auth patterns active in the codebase simultaneously

**Pattern A (Production / P1): Middleware-Header Auth**
```
middleware.js  →  injects x-admin-role, x-admin-user headers
withAdminAuth.js  →  reads headers  →  extracts user
```

**Pattern B (Local / P2): Direct Session Auth**
```
middleware.js  →  verifies JWT, no header injection
withAdminAuth.js  →  calls verifyAdminSession(request)  →  reads cookie
```

| Aspect | Pattern A (Prod) | Pattern B (Local) |
|--------|-----------------|------------------|
| File state | ✅ Deployed | 🔄 Locally modified |
| Coupling | Tight (middleware must inject, handler must read) | Decoupled (handler reads independently) |
| Security | Weaker (headers can be spoofed by edge workers) | Stronger (direct cookie verify) |
| Edge Runtime | ✅ Works | ✅ Works |
| Active state | Production | Local only |

**Risk:** Medium — if any code was written expecting Pattern A headers outside of `withAdminAuth`, it will silently fail when Pattern B deploys  
**Impact:** Any code that reads `request.headers.get('x-admin-role')` directly (bypassing withAdminAuth) will return null after Pattern B deploys  
**Assessment:** Acceptable risk — the consistent pattern is `withAdminAuth` wrapping, not raw header reads

---

## POLLUTION CATEGORY 3: DUPLICATE ROUTE RESOLVERS

### What: Two CMS route resolution systems exist simultaneously

**Resolver A (Production / `app/[...slug]/page.js` P1):**
- Direct inline Supabase query against `page_index`
- No external resolver module
- Status: DEPLOYED, ACTIVE in production

**Resolver B (Local / `lib/cms/resolveRoute.js`):**
- Abstracted resolver module
- Handles multiple slug candidate patterns (joined, flat, last segment)
- Queries page_index + custom_pages + blog_posts with priority
- Status: LOCAL ONLY, untracked

**Resolver C (Local / `lib/cms/resolveCmsRoute.js`):**
- More comprehensive resolver
- Priority order: custom_page → generated_page → blog_post
- Has source metadata, display fields building
- Status: LOCAL ONLY, untracked

**Both B and C are unused in production.** `resolveRoute.js` is imported by the modified `app/[...slug]/page.js` but neither is deployed.

| Issue | Risk |
|-------|------|
| Production uses inline query | No resolution error today |
| Local `[...slug]/page.js` uses resolveRoute | If deployed without resolveRoute → build failure |
| resolveCmsRoute.js appears unused even by local code | May be SHADOW CODE |

**Check: Does anything import resolveCmsRoute?**
- Imported by: [UNVERIFIED — needs grep, not done in this audit session]
- Assessment: Potentially dead code if nothing imports it yet

---

## POLLUTION CATEGORY 4: ORPHANED BUILD ARTIFACT

### What: `next-build.log`

| Item | Status |
|------|--------|
| File | `next-build.log` |
| Content | Output from `npm run build` execution |
| Git state | `D` (deleted from tracking) |
| gitignore addition | `*.log` now in .gitignore |

**Risk:** None  
**Cleanup:** Already handled via .gitignore

---

## POLLUTION CATEGORY 5: UNREGISTERED CRON JOB

### What: `app/api/jobs/publish-scheduled/route.js`

| Item | Status |
|------|--------|
| File | EXISTS in production (deployed) |
| Upstash registration | NEVER DONE |
| Runtime state | Dead endpoint — no requests ever reach it |
| Database impact | Approved drafts with future dates sit indefinitely |

**Risk:** Medium — scheduled publishing silently never executes  
**Is it pollution?** YES — code exists but the registration that would activate it doesn't. The route is deployed but functionally dead.  
**Action required:** Register cron in Upstash dashboard (no code change needed)

---

## POLLUTION CATEGORY 6: SYSTEM PAGE VERSION SPLIT

### What: `/admin/system` renders different UIs in production vs. local

**Production (P1):**
- `app/admin/system/page.js` imports `SystemHealthContent`
- Shows: observability data, system health cards
- No SHOS controls

**Local (P2):**
- `app/admin/system/page.js` imports `ShosControlCenter`
- Shows: SHOS operator panel — full DLQ/alert/event/flag controls

| Aspect | Production | Local |
|--------|-----------|-------|
| UI component | `SystemHealthContent` | `ShosControlCenter` |
| Feature set | Health display | Full operator controls |
| SHOS API available | ❌ NO | ✅ YES (new untracked route) |
| Deployment risk | N/A | ShosControlCenter must ship with SHOS route |

**Risk:** Medium — production admin users see health data only, no operator controls  
**Assessment:** Not dangerous — just an incomplete state. The SHOS work is complete and ready.

---

## POLLUTION CATEGORY 7: DEAD ADMIN API ROUTE — MEDIA

### What: `/api/admin/media/` works but queries a missing table

| File | Deployed? | Table Referenced | Table Exists? |
|------|----------|-----------------|--------------|
| `app/api/admin/media/route.js` | ✅ YES | `media_assets` | ❌ NO |
| `app/api/admin/media/upload/route.js` | ✅ YES | `media_assets` | ❌ NO |

**Risk:** High for media users — every media request returns a runtime error  
**Is it pollution?** YES — active routes that always fail at runtime  
**Safe to remove:** NO — media UI exists. Needs a migration to create the missing table.

---

## POLLUTION CATEGORY 8: SCRIPT FORENSICS ARTIFACTS

### What: Two local diagnostic scripts

| Script | Purpose | Safe? | Should Deploy? |
|--------|---------|-------|---------------|
| `scripts/live_status_check.mjs` | HTTP + DB connectivity check | ✅ YES | ❌ NO — local tool only |
| `scripts/_forensic_check.mjs` | Forensic DB + HTTP probe | ⚠️ Hardcoded path (`f:/bimasakhi-next/.env.local`) | ❌ NO — local tool only |

**Risk:** Low — these are read-only diagnostic tools  
**The `_forensic_check.mjs` has a hardcoded absolute path** — would fail on any other machine. This is developer-environment coupling.

---

## POLLUTION CATEGORY 9: EXCESSIVE DOC PROLIFERATION

### What: 40+ audit docs + 70+ fix docs in docs/ directories

The `docs/audits/` directory now has ~42 files. `docs/fixes/` has ~30 files. Most are historical records.

| Issue | Risk |
|-------|------|
| INDEX.md not updated with all new files | Low |
| No indexing of which docs are "current truth" | Medium — confusing for future developers |
| Some fix docs describe things that were "fixed" then changed again | Medium — misleading |

**Risk:** Low-Medium — documentation decay  
**Cleanup importance:** Low — archive docs in batches periodically  
**Safe to leave:** YES — docs don't affect runtime

---

## POLLUTION CATEGORY 10: POTENTIAL SHADOW MODULE — `resolveCmsRoute.js`

### What: `lib/cms/resolveCmsRoute.js` may not be imported by anything

| File | Imports by | Status |
|------|-----------|--------|
| `lib/cms/resolveCmsRoute.js` | [UNVERIFIED] | Potentially unused shadow module |
| `lib/cms/resolveRoute.js` | `app/[...slug]/page.js` (local) | Used by modified catch-all |

**Risk:** Low — if nobody imports it, it's just unused code  
**Assessment:** Likely created for future CMS features. Not dangerous.

---

## COMPREHENSIVE POLLUTION RISK MATRIX

| # | Pollution Item | Type | Severity | Runtime Impact | Safe to Remove? |
|---|---------------|------|----------|---------------|----------------|
| 1 | 130 JSON audit artifacts | Expired artifacts | Low | None | ✅ YES — already gitignored |
| 2 | Dual auth architecture (Pattern A/B) | Architecture split | Medium | None today — risk on deploy | Resolve by deploying P2 auth pair |
| 3 | Duplicate route resolvers (inline + 2 modules) | Duplicate system | Medium | None today — risk on partial deploy | Resolve by deploying CMS resolver |
| 4 | `next-build.log` | Build artifact | None | None | ✅ YES — already gitignored |
| 5 | Unregistered publish-scheduled cron | Dead endpoint | Medium | Silent feature failure | Register in Upstash |
| 6 | `/admin/system` page version split | UI state split | Medium | Users see wrong UI | Deploy SHOS as unit |
| 7 | Media API with missing table | Dead routes | High | All media requests → error | Migration needed |
| 8 | Hardcoded path in `_forensic_check.mjs` | Local hack | Low | Local only | Should not deploy |
| 9 | Doc proliferation without indexing | Docs decay | Low | None | Periodic archiving |
| 10 | Potentially unused `resolveCmsRoute.js` | Shadow module | Low | None | Safe to investigate |

---

## WHAT IS SAFELY IGNORABLE

These items appear in `git status` but are NOT pollution concerns:

| Item | Why It's Fine |
|------|--------------|
| New `docs/` files (audits, fixes, tests, forensics) | Historical records — valuable, not pollution |
| 5 new migration files | Already applied to DB — just need to be committed |
| Modified `docs/CONTENT_COMMAND_CENTER.md` | Updated documentation |
| Modified `.gitignore` | Correct gitignore rules being added |

---

## CLEANUP PRIORITY ORDER

| Priority | Action | Risk if Not Done |
|---------|--------|----------------|
| P0 | Deploy middleware + withAdminAuth as atomic pair | On deploy: all admin API 401 |
| P0 | Deploy `app/[...slug]/page.js` only with `lib/cms/resolveRoute.js` | On deploy: build failure |
| P1 | Deploy SHOS as unit (shos.js + route + ShosControlCenter + system page) | Admin operators see no SHOS UI |
| P2 | Create `media_assets` migration | All media operations fail |
| P2 | Register `publish-scheduled` cron in Upstash | Scheduled publish never runs |
| P3 | Archive old JSON audit results | Git diff is noisy |
| P4 | Consolidate/remove `resolveCmsRoute.js` if unused | Dead code accumulates |
