# RC-2A: Deployment Convergence Plan

| Field | Value |
|---|---|
| Phase | RC-2A |
| Date | 2026-05-14 |
| Purpose | Phased deployment strategy to safely converge all local P2 work to production |
| Scope | Planning only — no deployment actions in RC-2A |
| Authority | Supersedes all prior deployment prescriptions (FORENSIC_DEPLOYMENT_RECONCILIATION.md, RC-1D ATOM definitions) |

---

> **Core Principle:** Deployment convergence is NOT "push everything." It is the ordered, validated, atomic reduction of the gap between production commit `794013e` and local P2 state — without causing any runtime regression, partial state, or atomic dependency breakage.

---

## Phasing Summary

| Phase | Name | Scope | Risk | Status |
|---|---|---|---|---|
| RC-2A | Deployment Convergence Planning | Analysis + documentation only | NONE | ✅ COMPLETE (this document) |
| RC-2B | Safe Runtime Convergence | ATOM-G + ATOM-A + ATOM-B | LOW-MEDIUM | NOT STARTED |
| RC-2C | Core Subsystem Convergence | ATOM-C, ATOM-F, ATOM-H, ATOM-I, ATOM-D (deferred), ATOM-E (last) | MEDIUM-HIGH | NOT STARTED |
| RC-2D | Cleanup and Archive | Docs commit, scripts archive, deprecated file cleanup | LOW | NOT STARTED |

---

## RC-2B: Safe Runtime Convergence

### Objective
Close the governance gap (AI routes without `ai_enabled` gate), commit orphaned migrations to git, and deploy the auth pair.

### Scope
- **ATOM-G:** Commit 5 orphaned migrations (git record-keeping — DB already has these)
- **ATOM-A:** Deploy 3 governance routes (`admin/ai`, `admin/ai/recruiter`, `admin/seo/analyze`)
- **ATOM-B:** Deploy auth pair (`middleware.js` + `lib/auth/withAdminAuth.js`)

### Risk Level
- ATOM-G: NONE (no Vercel deploy, git-only)
- ATOM-A: LOW (additive guard, returns 503 when AI disabled)
- ATOM-B: MEDIUM (auth is foundational — requires manual diff review first)

### Rollback Strategy
- ATOM-A: `git revert <commit>` + Vercel redeploy. Reverts to un-gated AI routes. Acceptable (AI quota exhausted).
- ATOM-B: `git revert <commit>` + Vercel redeploy. Auth reverts to P1 behavior. ~2 min recovery.

### Runtime Impact
- ATOM-G: No Vercel deploy. Zero runtime impact.
- ATOM-A: `ai_enabled=false` → these routes return 503 immediately. Closes governance gap.
- ATOM-B: All admin sessions re-validate against new auth logic. No public route impact.

### Deployment Scope
3 separate commits recommended (G, A, B in sequence). Each commit triggers one Vercel deploy.

### Validation Requirements
```
ATOM-G validation:
  [ ] git log shows 5 migration files committed
  [ ] No Vercel deploy triggered (migrations dir should be excluded from Vercel build or no-op)

ATOM-A validation:
  [ ] Vercel build: SUCCESS
  [ ] POST /api/admin/ai → { error: 'AI_DISABLED' }, status 503
  [ ] POST /api/admin/seo/analyze → { error: 'AI_DISABLED' }, status 503
  [ ] POST /api/admin/ai/recruiter → { error: 'AI_DISABLED' }, status 503
  [ ] Public routes unaffected

ATOM-B validation:
  [ ] Vercel build: SUCCESS
  [ ] Admin login: works end-to-end
  [ ] Non-admin request to /api/admin/* → 401/403
  [ ] Public routes (homepage, blog, /api/jobs/*) unaffected
  [ ] QStash cron routes unaffected
```

### Pre-Phase Blockers
None — RC-2B can proceed immediately after RC-2A sign-off. ATOM-G and ATOM-A have no blockers. ATOM-B requires manual auth diff review.

---

## RC-2C: Core Subsystem Convergence

### Objective
Deploy all remaining P2 subsystems: SHOS operator system, CCC content UI, safe admin UI batch, worker routes, prompt engine (deferred), and CMS resolver (last/highest risk).

### Sub-phases (within RC-2C)

#### RC-2C.1: SHOS + CCC Deployment

**Scope:** ATOM-C (SHOS system, 12 files) + ATOM-F (CCC UI, 2 files)

**Prerequisite:** RC-2B complete and stable; `system_control_actions` table confirmed in DB.

**Risk:** MEDIUM (admin-only routes, no public impact)

**Rollback:** Single `git revert` per ATOM. Admin system/CCC pages revert to P1 behavior.

**Runtime Impact:** Admin system page gains full SHOS operator surface. CCC page gains content inventory. Public routes unaffected. QStash crons unaffected.

**Validation:**
```
  [ ] Vercel build: SUCCESS
  [ ] GET /api/admin/system/shos → returns snapshot (not 500)
  [ ] Admin system page renders ShosControlCenter
  [ ] Admin CCC page renders ContentInventoryContent
  [ ] GET /api/admin/delivery-logs → returns data (not build failure / 500)
  [ ] GET /api/admin/queue → returns data
```

#### RC-2C.2: Safe Admin UI Shadow Batch

**Scope:** ATOM-H (~26 files — safe UI improvements, no untracked imports)

**Prerequisite:** RC-2B complete. No other blockers.

**Risk:** LOW. All files are safe divergence with tracked imports only.

**Rollback:** Single `git revert`.

**Runtime Impact:** UI/UX improvements to admin pages and API routes. No structural changes.

**Validation:** Admin pages load; spot-check 3-5 pages for regression.

#### RC-2C.3: Worker Routes

**Scope:** ATOM-I (2 worker routes — active CRM production routes)

**Prerequisite:** CRM compatibility review complete. Manual diff reviewed.

**Risk:** MEDIUM (active production routes touching Zoho API)

**Rollback:** Single `git revert`. CRM workers revert to P1 behavior. No data loss expected.

**Runtime Impact:** CRM sync behavior may change per diff. Requires verification.

**Validation:** CRM sync fires on next QStash delivery; Zoho record updated; no 500s in worker logs.

#### RC-2C.4: Prompt Engine (DEFERRED — Conditional)

**Scope:** ATOM-D (7 files — prompt engine system)

**Prerequisite:** RC-2C.1 complete; AI strategy resolved (Gemini quota replenished OR OpenAI fallback configured); DB columns from migration 20260507020000 confirmed.

**Risk:** MEDIUM. `pagegen` is a QStash-triggered worker — deploying this activates the AI content generation path. Requires `ai_enabled` gate inside `promptEngine.js` to be verified.

**HARD CONDITION:** Do NOT deploy ATOM-D while AI quota is exhausted AND `promptEngine.js` does not internally gate on `ai_enabled`. If deployed in this state, pagegen calls would silently fail or produce 429 errors.

**Rollback:** Single `git revert`. Content generation reverts to direct Gemini calls. With `ai_enabled=false`, this is still safe.

**Validation:**
```
  [ ] ai_enabled=false in DB
  [ ] GET /api/jobs/pagegen with ai_enabled=false → returns graceful "AI disabled" response
  [ ] POST /api/admin/ccc/generate-single → returns 503 AI_DISABLED (not 500)
```

#### RC-2C.5: CMS Resolver (LAST — Highest Blast Radius)

**Scope:** ATOM-E (4 files — unified CMS route resolver replaces ALL public page routing)

**Prerequisite:** ALL of RC-2C.1 through RC-2C.4 complete and stable; ATOM-E itself extensively tested; DB columns from migration 20260507010000 confirmed; `resolveRoute.js` and `resolveCmsRoute.js` manually reviewed end-to-end; Vercel preview deployment tested first.

**Risk:** HIGH. This replaces `app/[...slug]/page.js` — the catch-all for ALL public pages. Any regression = all public pages 404 or 500.

**Rollback Strategy (MUST BE PREPARED IN ADVANCE):**
1. Have `git revert` command ready BEFORE deploying
2. Target rollback time: < 3 minutes from detection to recovery
3. Vercel redeploy after revert: ~2 minutes
4. Total recovery window: ~5 minutes max

**Runtime Impact:**
- All public page loads switch from inline Supabase queries to unified resolver
- If resolver has bugs: ALL public pages fail until rollback
- CMS structure API also activates

**Validation (Mandatory Pre-Deploy):**
```
  [ ] Vercel Preview URL: test ALL major public page types
  [ ] Homepage (/) → loads correctly
  [ ] Known blog URL → loads correctly  
  [ ] Known static page URL → loads correctly
  [ ] Unknown URL → returns 404 page (not 500)
  [ ] /api/admin/cms/structure → returns topics/categories
```

**Validation (Post-Deploy — Must Pass Within 5 Minutes):**
```
  [ ] Production homepage loads
  [ ] Production blog post loads
  [ ] Production static page loads
  [ ] Unknown URL → 404
  [ ] No 500 errors in Vercel function logs
```

---

## RC-2D: Cleanup and Archive Phase

### Objective
Commit all documentation, archive temporary scripts, and establish clean git history representing the full P2 work.

### Scope
- Commit all untracked documentation (`docs/audits/*.md`, `docs/fixes/*.md`, `docs/tests/*.md`)
- Commit updated `docs/INDEX.md` and `docs/CONTENT_COMMAND_CENTER.md` (already modified)
- Commit deleted `scripts/audit/results/*.json` (staged deletions)
- Archive or stash one-time scripts (`rc1b1_ai_pause.mjs`, `rc1c_register_scheduled_publish.mjs`)
- Decide on `scripts/_forensic_check.mjs` and `scripts/live_status_check.mjs` (keep or stash)

### Risk
NONE — documentation only. No Vercel deploy triggered.

### Rollback
N/A — documentation commits are trivially reversible.

### Runtime Impact
NONE.

### Validation
```
  [ ] git status shows clean working tree (or intentional remaining items)
  [ ] git log shows clean P2 commit history
  [ ] No orphaned untracked code files remain
  [ ] All 5 orphaned migrations committed (from ATOM-G)
```

---

## Deployment Sequencing — Master Order

```
1. RC-2A  [NOW]     Deployment convergence planning — COMPLETE
2. RC-2B  [NEXT]    ATOM-G → ATOM-A → ATOM-B (separate commits, sequence matters)
3. RC-2C  [AFTER]   In order:
                    RC-2C.1: ATOM-C (SHOS) + ATOM-F (CCC UI)
                    RC-2C.2: ATOM-H (safe admin UI batch)
                    RC-2C.3: ATOM-I (worker routes)
                    RC-2C.4: ATOM-D (prompt engine — conditional on AI strategy)
                    RC-2C.5: ATOM-E (CMS resolver — LAST)
4. RC-2D  [FINAL]   Documentation commit + archive
```

---

## No-Assumption Zones

> Areas where RC-2A explicitly refuses to make assumptions and requires verification before deployment.

| Zone | Assumption Refused | Required Verification |
|---|---|---|
| SHOS migration | "system_control_actions table exists" | Must query Supabase production before ATOM-C |
| Prompt engine columns | "content_drafts.prompt_inputs exists" | Must query Supabase production before ATOM-D |
| CMS resolver columns | "custom_pages.full_slug exists" | Must query Supabase production before ATOM-E |
| Auth pair logic | "middleware change has no regression" | Must read full diff before ATOM-B |
| Worker route CRM compatibility | "P2 changes are backward compatible with Zoho" | Must read full diff before ATOM-I |
| promptEngine.js ai_enabled gate | "promptEngine has internal ai_enabled check" | Must read promptEngine.js before ATOM-D |
| ATOM-E fallback behavior | "resolver returns proper 404 on unknown routes" | Must trace code path before ATOM-E |

---

## Deployment Readiness State

| Phase | Readiness | Condition |
|---|---|---|
| RC-2B (ATOM-G) | READY | No blockers |
| RC-2B (ATOM-A) | READY | No blockers |
| RC-2B (ATOM-B) | READY AFTER REVIEW | Requires auth diff review |
| RC-2C.1 (ATOM-C) | BLOCKED | Requires RC-2B complete + DB table verification |
| RC-2C.1 (ATOM-F) | BLOCKED | Requires ATOM-C (admin system stable) |
| RC-2C.2 (ATOM-H) | READY AFTER RC-2B | Low risk; can proceed after auth stable |
| RC-2C.3 (ATOM-I) | BLOCKED (manual review) | Requires CRM compatibility diff |
| RC-2C.4 (ATOM-D) | BLOCKED (conditional) | Requires AI strategy decision + DB verification |
| RC-2C.5 (ATOM-E) | BLOCKED (all prior) | Highest risk; requires all prior stable + Vercel preview test |
| RC-2D | BLOCKED (all prior) | Can start after ATOM-G (migrations committed) |
