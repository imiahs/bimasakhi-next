# RC-2B Cycle 2: BEFORE Snapshot — ATOM-A Governance Routes

| Field | Value |
|---|---|
| Phase | RC-2B Cycle 2 |
| Date | 2026-05-14 |
| Purpose | Authoritative pre-deployment state before ATOM-A mutation |
| Production commit | `c8334d3` (ATOM-G, 2026-05-14) |
| Branch | `main` — HEAD = origin/main (synchronized) |
| Selected ATOM | **ATOM-A** — 3 AI governance routes |
| Authority | RC-2B Cycle 2 BEFORE snapshot — immutable once mutation begins |

---

> **CONSTRAINT:** No mutation allowed before this document exists. This document was created BEFORE any git staging.

---

## Selected Deployment Group: ATOM-A

**Rationale:**
1. GSB-01 resolved (ATOM-G complete) — sequencing prerequisite met
2. All imports fully tracked — zero untracked dependencies
3. OPB-01 resolution — closes AI governance gap for 3 admin routes
4. Lowest risk after ATOM-G: additive-only changes to 3 admin-only routes
5. `ai_enabled=false` already active in production — gates will fire immediately upon deploy
6. ATOM-B (auth pair) deferred — requires auth diff review before deploy

---

## Production State BEFORE Deployment

| System | State |
|---|---|
| Production commit | `c8334d3` |
| `ai_enabled` | `false` (since 2026-05-13T18:01:03Z, RC-1B.1) |
| `queue_paused` | `false` |
| `crm_auto_routing` | `true` |
| `followup_enabled` | `true` |
| Public routing | Operational — `app/[...slug]/page.js` at deployed P1 version |
| Admin auth | Operational — `middleware.js` + `withAdminAuth.js` at deployed P1 version |
| QStash (6 crons) | All active (verified RC-1C) |
| Homepage | 200, full content (validated ATOM-G) |

### Current Production Admin AI Route Behavior (BEFORE)

| Route | Current Behavior (Deployed P1 version) | Local Version Behavior |
|---|---|---|
| `POST /api/admin/ai` | Calls Gemini directly — NO `ai_enabled` gate | Returns `AI_DISABLED` (503) when `ai_enabled=false` |
| `POST /api/admin/ai/recruiter` | Calls Gemini directly — NO `ai_enabled` gate | Returns `AI_DISABLED` (503) when `ai_enabled=false` |
| `POST /api/admin/seo/analyze` | Calls Gemini directly — NO `ai_enabled` gate | Returns `AI_DISABLED` (503) when `ai_enabled=false` |

**Production governance gap:** All 3 routes currently bypass `ai_enabled` flag. They will call Gemini and fail silently with 429 errors. ATOM-A closes this gap.

---

## ATOM-A Deployment Scope

### Exact File Set (3 files only)

| File | Change | Import Chain | Safety |
|---|---|---|---|
| `app/api/admin/ai/route.js` | Add `getSystemConfig` import + `ai_enabled` gate (6 lines) | `lib/ai/index.js` → `lib/ai/generateContent.js` → `@google/generative-ai`. `lib/systemConfig.js` → `utils/supabaseClientSingleton.js`. All tracked. | ✅ Additive only |
| `app/api/admin/ai/recruiter/route.js` | Add `getSystemConfig` import + `ai_enabled` gate (6 lines) | Same chain as above + `utils/supabaseClientSingleton.js`. All tracked. | ✅ Additive only |
| `app/api/admin/seo/analyze/route.js` | Add `getSystemConfig` import + `ai_enabled` gate (6 lines) | Same chain + `utils/supabase.js`. All tracked. | ✅ Additive only |

### Import Chain Verification

| Dependency | Tracked in Git | Notes |
|---|---|---|
| `@/lib/ai` → `lib/ai/index.js` | ✅ YES | Does NOT import `promptEngine.js` (verified) |
| `lib/ai/generateContent.js` | ✅ YES | Only imports `@google/generative-ai` + `safeLogger` |
| `@/lib/systemConfig` | ✅ YES | Imports only `supabaseClientSingleton` |
| `@/lib/auth/withAdminAuth` | ✅ YES | Tracked, deployed — using PRODUCTION version at `c8334d3` |
| `@/utils/supabaseClientSingleton` | ✅ YES | Tracked, deployed |
| `@/utils/supabase` | ✅ YES | Tracked, deployed |
| `lib/ai/promptEngine.js` | ❌ UNTRACKED | NOT imported by any ATOM-A file (verified) |

### Explicitly Excluded From ATOM-A

| File | ATOM Group | Reason Excluded |
|---|---|---|
| `middleware.js` | ATOM-B | Auth pair — requires diff review |
| `lib/auth/withAdminAuth.js` | ATOM-B | Auth pair — coupled deployment |
| `app/api/admin/blog/route.js` | ATOM-H | Not ATOM-A |
| `app/api/admin/system-health/route.js` | ATOM-H | Not ATOM-A |
| `app/api/jobs/pagegen/route.js` | ATOM-D/H | Not ATOM-A |
| All other modified files | ATOM-B/C/D/E/F/H/I | Not ATOM-A |

---

## Staging Area Verification

Pre-deploy staging area: **CLEAN** (zero files staged)

```
git diff --cached --name-only → (empty)
```

---

## Rollback Plan

| Step | Action | Time |
|---|---|---|
| 1 | `git revert HEAD --no-edit` | < 5 seconds |
| 2 | `git push origin main` | < 30 seconds |
| 3 | Vercel build | ~2 minutes |
| **Total** | **3 admin routes revert to P1 deployed behavior** | **< 3 minutes** |

No schema changes. No queue changes. No auth changes. Rollback is fully atomic.
