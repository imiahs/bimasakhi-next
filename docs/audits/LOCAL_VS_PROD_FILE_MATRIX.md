# LOCAL VS PRODUCTION FILE MATRIX
**Purpose:** Definitive per-file truth about what exists where  
**Date:** 2026-05-13  
**Method:** git status --short + git diff + deployed May 6 Vercel build vs local workspace  
**Rule:** Evidence only.

---

## LEGEND

| Symbol | Meaning |
|--------|---------|
| ✅ | Confirmed present/working |
| ❌ | Absent/broken |
| ⚠️ | Present but differs from local |
| 🔄 | Modified locally — version mismatch between local and production |
| ~~crossed~~ | Only one version exists |

## State Vocabulary

| Term | Exact Meaning |
|------|--------------|
| **EXISTS** | The file/table/record physically exists |
| **DEPLOYED** | The file was included in a Vercel production build |
| **ACTIVE** | The deployed code is currently being served to requests |
| **WIRED** | The code has all its dependencies satisfied (can run) |
| **FEATURE-FLAGGED** | Works when a flag is set to true |
| **SHADOW MODE** | Code exists but is never called (unreachable path) |
| **PRODUCTION-PROVEN** | Was actually executed in production with a live result |
| **LOCAL-PROVEN** | Was tested on localhost only |
| **DEAD CODE** | Code that cannot be reached by any current code path |
| **PARTIAL IMPLEMENTATION** | Implementation is incomplete — missing pieces documented |

---

## CRITICAL SUMMARY

| Category | Count |
|----------|-------|
| Files where local = production (no change) | ~380 (all unmodified tracked files) |
| Files where local ≠ production (modified tracked) | **54** |
| Files that exist local only (new, never deployed) | **11 code + ~35 docs + 5 migrations** |
| Files that production serves but local may differ | 0 (Vercel serves from last build = P1 commit) |

---

## MATRIX — MODIFIED TRACKED FILES (Local ≠ Production)

For each file: What is running in production NOW vs what exists locally.

### Authentication Layer

| File | Prod (P1 — May 6 deploy) | Local (P2 — May 7 changes) | Risk if Partial Deploy |
|------|--------------------------|---------------------------|----------------------|
| `middleware.js` | Injects `x-admin-role/user/email` headers after JWT verify | Verifies JWT → no header injection → returns `NextResponse.next()` | **P0 RISK**: Deploy without paired withAdminAuth → all admin API 401 |
| `lib/auth/withAdminAuth.js` | Reads user from `request.headers.get('x-admin-role')` | Calls `verifyAdminSession(request)` directly from cookie | **P0 RISK**: Must deploy with middleware change |

**AUTH STATE:** P1 uses two-hop auth (middleware → header → route handler). P2 uses direct auth (route handler reads cookie directly). Both are valid. P2 is more secure and resilient. They are a COUPLED PAIR.

---

### Core Content Routing

| File | Prod (P1) | Local (P2) | Deployment State |
|------|-----------|------------|-----------------|
| `app/[...slug]/page.js` | Inline Supabase query against `page_index` — no CMS resolver | Imports `resolveRoute` from `@/lib/cms/resolveRoute` — unified resolution | ❌ **CANNOT DEPLOY ALONE** |
| `app/pages/[slug]/page.js` | Custom pages renderer | Enhanced custom pages renderer | ✅ Safe to deploy alone |

---

### CCC System

| File | In Prod? | Local Version | Deployed Version | Both Wired? |
|------|----------|--------------|-----------------|-------------|
| `app/admin/ccc/page.js` | ✅ DEPLOYED (P1) | Imports `ContentInventoryContent` + prompt preview | Simple overview, no ContentInventory import | ❌ Local: NOT WIRED (ContentInventory untracked) |
| `app/admin/ccc/drafts/page.js` | ✅ DEPLOYED | Enhanced filters + display | P1 version | ✅ Safe to deploy |
| `app/admin/ccc/drafts/[id]/page.js` | ✅ DEPLOYED | P2 enhancements | P1 version | ✅ Safe to deploy |
| `app/admin/ccc/bulk/page.js` | ✅ DEPLOYED | Enhanced bulk planner | P1 version | ✅ Safe to deploy |
| `app/api/admin/ccc/generate-single/route.js` | ✅ DEPLOYED | Imports `normalizePromptInputs` from `promptEngine` | Inline prompt build, no promptEngine | ❌ Local: NOT WIRED (promptEngine untracked) |
| `app/api/admin/ccc/drafts/route.js` | ✅ DEPLOYED | Enhanced | P1 version | ✅ Safe to deploy |
| `app/api/admin/ccc/bulk/route.js` | ✅ DEPLOYED | Enhanced | P1 version | ✅ Safe to deploy |

---

### SHOS System

| File | In Prod? | Local State | Notes |
|------|----------|-------------|-------|
| `lib/system/shos.js` | ❌ NOT DEPLOYED | EXISTS locally (new, untracked) | Full implementation, all DB deps verified. PRODUCTION-PROVEN indirectly (DB has 5 live actions) |
| `app/api/admin/system/shos/route.js` | ❌ NOT DEPLOYED | EXISTS locally (new, untracked) | GET + POST handlers, withAdminAuth protected |
| `features/admin/system/ShosControlCenter.jsx` | ❌ NOT DEPLOYED | EXISTS locally (new, untracked) | Full SHOS UI — calls `/api/admin/system/shos` |
| `app/admin/system/page.js` | ✅ DEPLOYED (P1 imports SystemHealthContent) | LOCAL imports ShosControlCenter | ⚠️ VERSION MISMATCH — Prod shows SystemHealthContent, local shows SHOS UI |

---

### AI Engine

| File | In Prod? | Local State | Notes |
|------|----------|-------------|-------|
| `lib/ai/promptEngine.js` | ❌ NOT DEPLOYED | EXISTS locally (new, untracked) | Complete P2 prompt normalization + DB-backed template loading |
| `lib/ai/promptTemplates.js` | ✅ DEPLOYED (P1) | MODIFIED locally (P2 enhancements) | Prod uses P1 version. Local version has enhanced normalization |

---

### CMS Routing Layer

| File | In Prod? | Local State | Notes |
|------|----------|-------------|-------|
| `lib/cms/resolveRoute.js` | ❌ NOT DEPLOYED | EXISTS locally (new, untracked) | Path normalization + route lookup against page_index/custom_pages/blog |
| `lib/cms/resolveCmsRoute.js` | ❌ NOT DEPLOYED | EXISTS locally (new, untracked) | Priority-ordered CMS resolution: custom_page → generated_page → blog_post |

---

### Admin System Panel

| File | In Prod? | Local State | Notes |
|------|----------|-------------|-------|
| `features/admin/system/ObservabilityContent.jsx` | ✅ DEPLOYED (P1) | MODIFIED (P2 enhancements) | Enhanced observability UI |
| `features/admin/content/ContentInventoryContent.jsx` | ❌ NOT DEPLOYED | EXISTS locally (new, untracked) | Unified inventory tabs (drafts/pages/blog/resources) |

---

### Feature Flags / Config

| File | In Prod? | Local State | Notes |
|------|----------|-------------|-------|
| `lib/featureFlags.js` | ✅ DEPLOYED (P1) | MODIFIED — enhanced CONTROL_PLANE_FLAGS | Safe to deploy — additive change |
| `app/api/admin/config/route.js` | ✅ DEPLOYED (P1) | MODIFIED | Safe to deploy |

---

### Queue / Delivery

| File | In Prod? | Local State | Notes |
|------|----------|-------------|-------|
| `lib/queue/deliveryTruth.js` | ✅ DEPLOYED (P1) | MODIFIED — enhanced error handling, isMissingTableError guard | Safe to deploy |
| `app/api/jobs/pagegen/route.js` | ✅ DEPLOYED | MODIFIED | Safe to deploy |
| `app/api/workers/lead-sync/route.js` | ✅ DEPLOYED | MODIFIED | Safe to deploy |
| `app/api/workers/contact-sync/route.js` | ✅ DEPLOYED | MODIFIED | Safe to deploy |

---

### System Health

| File | In Prod? | Local State | Notes |
|------|----------|-------------|-------|
| `lib/system/systemHealth.js` | ✅ DEPLOYED (P1) | MODIFIED — enhanced CRON_DEFINITIONS, ACTIVE_DLQ_FILTER uses `operator_status` | Safe to deploy. P2 migration adds `operator_status` column. |

---

### Media System

| File | In Prod? | Local State | Table Exists? | Status |
|------|----------|-------------|--------------|--------|
| `app/api/admin/media/route.js` | ✅ DEPLOYED | MODIFIED | `media_assets` ❌ MISSING | PARTIAL — runtime error on any media request |
| `app/api/admin/media/upload/route.js` | ✅ DEPLOYED | MODIFIED | `media_assets` ❌ MISSING | PARTIAL — runtime error on upload |
| `features/admin/media/MediaContent.jsx` | ✅ DEPLOYED | MODIFIED | N/A | PARTIAL — UI works but API fails |
| `features/admin/media/Media.css` | ✅ DEPLOYED | MODIFIED | N/A | SAFE — CSS only |

---

### Admin Pages / Blog / Resources

| File | In Prod? | Local State | Notes |
|------|----------|-------------|-------|
| `app/admin/blog/page.js` | ✅ DEPLOYED | MODIFIED | Safe to deploy |
| `app/admin/crm/page.js` | ✅ DEPLOYED | MODIFIED | Safe to deploy |
| `app/admin/resources/page.js` | ✅ DEPLOYED | MODIFIED | Safe to deploy |
| `app/admin/routeRegistry.js` | ✅ DEPLOYED | MODIFIED — adds SHOS route entry | Safe to deploy (fallback present if SHOS not available) |
| `app/admin/settings/page.js` | ✅ DEPLOYED | MODIFIED | Safe to deploy |
| `app/admin/system/alerts/page.js` | ✅ DEPLOYED | MODIFIED | Safe to deploy |
| `app/admin/system/dlq/page.js` | ✅ DEPLOYED | MODIFIED | Safe to deploy |
| `app/resources/page.js` | ✅ DEPLOYED | MODIFIED | Safe to deploy |
| `features/admin/ai/AiBlogContent.jsx` | ✅ DEPLOYED | MODIFIED | Safe to deploy |
| `features/admin/pages/PagesContent.jsx` | ✅ DEPLOYED | MODIFIED | Safe to deploy |
| `features/admin/pages/PageEditorContent.jsx` | ✅ DEPLOYED | MODIFIED | Safe to deploy |

---

## WIRING TRUTH SUMMARY

| System | Code Exists? | DB Schema Exists? | API Exists? | UI Exists? | Fully Wired? | PROD PROVEN? |
|--------|-------------|------------------|------------|-----------|-------------|--------------|
| SHOS | ✅ local | ✅ live | ✅ local | ✅ local | ✅ LOCAL ONLY | ✅ DB evidence (5 actions) |
| CMS Resolver | ✅ local | ✅ live | N/A | N/A | ❌ NOT WIRED in prod | ❌ |
| Prompt Engine | ✅ local | ✅ live (templates table) | ✅ local | ✅ local (partial) | ✅ LOCAL ONLY | ✅ LOCAL-PROVEN |
| CMS Structure API | ✅ local | ✅ live | ✅ local | ❌ no UI yet | ✅ LOCAL ONLY | ❌ |
| Content Inventory | ✅ local | ✅ live | ✅ deployed | ✅ local | ✅ LOCAL ONLY | ✅ LOCAL-PROVEN |
| Draft Pipeline | ✅ deployed | ✅ live | ✅ deployed | ✅ deployed | ✅ FULLY WIRED | ✅ PRODUCTION-PROVEN |
| Bulk Planner | ✅ deployed | ✅ live | ✅ deployed | ✅ deployed | ✅ FULLY WIRED | ✅ PRODUCTION-PROVEN |
| Lead Capture | ✅ deployed | ✅ live | ✅ deployed | ✅ deployed | ✅ FULLY WIRED | ✅ PRODUCTION-PROVEN |
| Zoho CRM | ✅ deployed | ✅ live | ✅ deployed | ✅ deployed | ✅ FULLY WIRED | ✅ PRODUCTION-PROVEN |
| Media Upload | ✅ deployed | ❌ MISSING TABLE | ✅ deployed | ✅ deployed | ❌ BROKEN | ❌ |

---

## PRODUCTION STATE — WHAT IS ACTUALLY SERVING REQUESTS RIGHT NOW

```
bimasakhi.com (Vercel — P1 build from May 6)
├── app/[...slug]/page.js          ← P1 version (inline queries, no resolveRoute)
├── app/admin/system/page.js       ← P1 version (SystemHealthContent, no SHOS UI)
├── app/admin/ccc/page.js          ← P1 version (no ContentInventory)
├── app/api/admin/ccc/generate-single/route.js  ← P1 version (no promptEngine)
├── middleware.js                  ← P1 version (header injection)
├── lib/auth/withAdminAuth.js      ← P1 version (reads x-admin-role header)
├── lib/system/shos.js             ← NOT DEPLOYED (SHOS runs from local only)
├── lib/ai/promptEngine.js         ← NOT DEPLOYED
├── lib/cms/resolveRoute.js        ← NOT DEPLOYED
└── All other modified files       ← P1 versions serving production
```

**SHOS API endpoint `/api/admin/system/shos` does NOT exist in production.** The 5 system_control_actions in the DB were written by SHOS running locally (either during development or via a local admin session hitting production Supabase directly).
