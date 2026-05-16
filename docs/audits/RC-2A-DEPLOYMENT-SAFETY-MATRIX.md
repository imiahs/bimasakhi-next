# RC-2A: Deployment Safety Matrix

| Field | Value |
|---|---|
| Phase | RC-2A |
| Date | 2026-05-14 |
| Purpose | Per-subsystem deployment risk, rollback complexity, observability, coupling, blast radius, and recovery confidence |
| Authority | Evidence-backed — all states confirmed via git analysis, import chain verification, live operational checks |

---

> **Rating Scale:**
> - Risk: LOW / MEDIUM / HIGH / CRITICAL
> - Coupling Severity: NONE / WEAK / MODERATE / STRONG / ABSOLUTE
> - Blast Radius: ISOLATED / ADMIN / ADMIN+JOBS / ALL
> - Recovery Confidence: HIGH (< 3 min) / MEDIUM (3–15 min) / LOW (> 15 min)
> - Observability Maturity: FULL / PARTIAL / MINIMAL / BLIND

---

## Subsystem 1: Public Routing (app/[...slug]/page.js)

| Attribute | Value |
|---|---|
| **Deployment Risk** | 🔴 CRITICAL — any regression takes ALL public pages down |
| **Rollback Complexity** | LOW — single `git revert` + Vercel redeploy (~2 min) |
| **Observability Maturity** | PARTIAL — Vercel function logs; no active monitoring for 404 rate |
| **Coupling Severity** | ABSOLUTE — tightly coupled to `resolveRoute.js` + `resolveCmsRoute.js` |
| **Blast Radius** | ALL — all public page loads |
| **Recovery Confidence** | HIGH — rollback path is clear, tested, and fast |
| **Current State** | P1 inline Supabase logic — STABLE in production |
| **Local State** | Modified to use `resolveRoute.js` — cannot deploy without it |
| **Deployment Group** | ATOM-E (last to deploy) |
| **Deferred Safely** | YES — production is working; no urgency |
| **Pre-Deploy Gate** | Vercel Preview URL must pass all page type tests before production merge |

---

## Subsystem 2: Unified CMS Resolver (lib/cms/resolveRoute.js + resolveCmsRoute.js)

| Attribute | Value |
|---|---|
| **Deployment Risk** | HIGH — if resolver has logic errors, ALL pages broken until rollback |
| **Rollback Complexity** | LOW — revert routing file to P1 inline logic |
| **Observability Maturity** | MINIMAL — no dedicated resolver health check; relies on page load errors |
| **Coupling Severity** | ABSOLUTE — resolveRoute imports resolveCmsRoute; catch-all page imports resolveRoute |
| **Blast Radius** | ALL (public routing) |
| **Recovery Confidence** | HIGH — fast rollback; P1 version is stable fallback |
| **Current State** | LOCAL ONLY — never deployed; not tracked |
| **Deployment Group** | ATOM-E |
| **Deferred Safely** | YES |
| **Pre-Deploy Gate** | Manual code review of both files; DB column verification; staging test |

---

## Subsystem 3: Auth (middleware.js + lib/auth/withAdminAuth.js)

| Attribute | Value |
|---|---|
| **Deployment Risk** | MEDIUM — auth regression would lock admin users out or create security gap |
| **Rollback Complexity** | LOW — single revert of ATOM-B commit |
| **Observability Maturity** | PARTIAL — admin login logs exist; no automated auth health check |
| **Coupling Severity** | STRONG — both files must change together; logic spans both |
| **Blast Radius** | ADMIN — all admin routes; public routes use middleware passthrough (low impact) |
| **Recovery Confidence** | HIGH — revert is fast; P1 auth is known-good fallback |
| **Current State** | Modified locally (P2.1 + RC-1B changes); P1 version deployed and working |
| **Import Chain** | ✅ All dependencies tracked (confirmed RC-2A) |
| **Deployment Group** | ATOM-B |
| **Deferred Safely** | Until manual diff review complete |
| **Pre-Deploy Gate** | Full diff review required — JWT path, role check, rate limit logic |

---

## Subsystem 4: Queue Workers (event-retry, reconciliation, alert-scan, vendor-health-check, morning-brief, scheduled-publish)

| Attribute | Value |
|---|---|
| **Deployment Risk** | LOW — these 6 routes are UNMODIFIED since production commit. No local changes. |
| **Rollback Complexity** | N/A — not being deployed |
| **Observability Maturity** | FULL — 6 QStash crons with delivery confirmation |
| **Coupling Severity** | NONE — each cron route is independent |
| **Blast Radius** | ISOLATED — each route is self-contained |
| **Recovery Confidence** | HIGH |
| **Current State** | ✅ STABLE, EXECUTING in production. Confirmed unmodified by RC-1D collateral check. |
| **Action in RC-2** | NONE — do not touch these routes |
| **Cron Schedule** | All 6 confirmed active (RC-1C audit) |

---

## Subsystem 5: Pagegen Worker (app/api/jobs/pagegen/route.js)

| Attribute | Value |
|---|---|
| **Deployment Risk** | MEDIUM — QStash-triggered worker; deploying activates AI content generation path |
| **Rollback Complexity** | LOW — revert ATOM-D commit |
| **Observability Maturity** | PARTIAL — QStash delivery logs; no pagegen output monitoring |
| **Coupling Severity** | STRONG — imports `promptEngine.js` (untracked) |
| **Blast Radius** | ADMIN+JOBS — pagegen + 4 content routes |
| **Recovery Confidence** | MEDIUM — pagegen has no cron; only fires on explicit QStash message |
| **Current State** | Has `ai_enabled` gate (LOCAL) + `promptEngine` import (LOCAL). Cannot deploy without ATOM-D. |
| **Deployment Group** | ATOM-D |
| **Deferred Safely** | YES — no cron, AI disabled. Defer until AI strategy resolved. |

---

## Subsystem 6: SHOS Operator System (lib/system/shos.js + 7 routes + 2 UI files)

| Attribute | Value |
|---|---|
| **Deployment Risk** | MEDIUM — admin-only; public routes unaffected |
| **Rollback Complexity** | LOW — revert ATOM-C commit; 7 routes + 2 UI revert to P1 behavior |
| **Observability Maturity** | PARTIAL — SHOS is designed TO BE the observability surface; without it, admin visibility is P1 level |
| **Coupling Severity** | STRONG — 7 routes import `shos.js`; UI calls shos route via fetch |
| **Blast Radius** | ADMIN — 7 admin API routes + 2 admin pages |
| **Recovery Confidence** | HIGH — rollback clear, admin-only impact |
| **Current State** | `lib/system/shos.js` is LOCAL ONLY. 7 routes locally modified. |
| **DB Dependency** | `system_control_actions` table — LIKELY exists but unconfirmed (INCONCLUSIVE) |
| **Deployment Group** | ATOM-C |
| **Deferred Safely** | YES — production admin works on P1 versions |
| **Pre-Deploy Gate** | Verify `system_control_actions` table in production Supabase before deploying |

---

## Subsystem 7: QStash Infrastructure

| Attribute | Value |
|---|---|
| **Deployment Risk** | NONE — QStash configuration is managed via Upstash dashboard/API, not code |
| **Rollback Complexity** | N/A |
| **Observability Maturity** | FULL — all 6 crons confirmed, delivery history available |
| **Coupling Severity** | NONE — cron registration is independent of code deploy |
| **Blast Radius** | NONE |
| **Recovery Confidence** | HIGH |
| **Current State** | ✅ FULLY OPERATIONAL — 6/6 crons confirmed (RC-1C) |
| **Action in RC-2** | NONE — do not reconfigure crons |

---

## Subsystem 8: AI Governance (RC-1B gates + ai_enabled flag)

| Attribute | Value |
|---|---|
| **Deployment Risk** | LOW for ATOM-A (additive gate only) |
| **Rollback Complexity** | LOW — revert ATOM-A |
| **Observability Maturity** | PARTIAL — DB flag visible; code enforcement not deployed yet |
| **Coupling Severity** | NONE — ATOM-A files are independent of each other |
| **Blast Radius** | ISOLATED — 3 admin API routes |
| **Recovery Confidence** | HIGH |
| **Current State** | ⚠ GOVERNANCE GAP — gates LOCAL ONLY, production has no `ai_enabled` check |
| **Production Mitigation** | `ai_enabled=false` in DB + Gemini quota exhausted |
| **Deployment Group** | ATOM-A (immediate) |
| **Deferred Safely** | NO — must deploy ATOM-A BEFORE any AI re-enablement |

---

## Subsystem 9: CRM / Zoho Integration

| Attribute | Value |
|---|---|
| **Deployment Risk** | MEDIUM — active production routes with Zoho API contract |
| **Rollback Complexity** | LOW — revert ATOM-I |
| **Observability Maturity** | PARTIAL — Zoho sync confirmation visible; no real-time error monitoring |
| **Coupling Severity** | WEAK — two worker routes are independent but both touch CRM |
| **Blast Radius** | ISOLATED — CRM sync workers only |
| **Recovery Confidence** | HIGH — rollback fast; missed syncs can be re-triggered |
| **Current State** | P1 versions executing correctly in production. Local P2 modifications undeployed. |
| **Deployment Group** | ATOM-I |
| **Deferred Safely** | YES — P1 CRM sync is working |
| **Pre-Deploy Gate** | Manual diff review to verify Zoho API contract unchanged |

---

## Subsystem 10: Admin Systems (Admin UI pages + admin API)

| Attribute | Value |
|---|---|
| **Deployment Risk** | LOW for ATOM-H (safe divergence files); MEDIUM for ATOM-C (SHOS coupling) |
| **Rollback Complexity** | LOW for ATOM-H; LOW-MEDIUM for ATOM-C |
| **Observability Maturity** | PARTIAL — no automated admin regression testing |
| **Coupling Severity** | NONE for ATOM-H (all tracked imports); STRONG for ATOM-C |
| **Blast Radius** | ADMIN (no public impact) |
| **Recovery Confidence** | HIGH |
| **Current State** | P1 versions working; P2 UI improvements local |
| **Deployment Group** | ATOM-H (safe batch) + ATOM-C (SHOS) |
| **Deferred Safely** | YES |

---

## Subsystem 11: Feature Flags (lib/featureFlags.js + system_control_config)

| Attribute | Value |
|---|---|
| **Deployment Risk** | LOW — `lib/featureFlags.js` modified locally but has NO untracked imports |
| **Rollback Complexity** | LOW |
| **Observability Maturity** | FULL — `system_control_config` singleton in DB; readable via config API |
| **Coupling Severity** | WEAK — consumed by many routes but logic is read-only flag check |
| **Blast Radius** | ADMIN+JOBS (governance gates; no structural routing change) |
| **Recovery Confidence** | HIGH |
| **Current State** | P2 version local; P1 version executing |
| **Deployment Group** | ATOM-H (safe admin batch) |
| **Deferred Safely** | YES |

---

## Deployment Safety Matrix Summary

| Subsystem | Deploy Risk | Rollback Complexity | Observability | Coupling | Blast Radius | Recovery Confidence | Ready to Deploy? |
|---|---|---|---|---|---|---|---|
| Public Routing | 🔴 CRITICAL | LOW | PARTIAL | ABSOLUTE | ALL | HIGH | NO (ATOM-E last) |
| CMS Resolver | HIGH | LOW | MINIMAL | ABSOLUTE | ALL | HIGH | NO (ATOM-E last) |
| Auth Pair | MEDIUM | LOW | PARTIAL | STRONG | ADMIN | HIGH | After diff review |
| Queue Workers (6 crons) | NONE | N/A | FULL | NONE | NONE | HIGH | ✅ STABLE, no action |
| Pagegen Worker | MEDIUM | LOW | PARTIAL | STRONG | ADMIN+JOBS | MEDIUM | NO (defer AI strategy) |
| SHOS System | MEDIUM | LOW | PARTIAL | STRONG | ADMIN | HIGH | After DB verify |
| QStash Infra | NONE | N/A | FULL | NONE | NONE | HIGH | ✅ STABLE, no action |
| AI Governance | LOW | LOW | PARTIAL | NONE | ISOLATED | HIGH | ✅ READY (ATOM-A) |
| CRM/Zoho | MEDIUM | LOW | PARTIAL | WEAK | ISOLATED | HIGH | After diff review |
| Admin Systems | LOW–MEDIUM | LOW | PARTIAL | NONE–STRONG | ADMIN | HIGH | ATOM-H ready; ATOM-C after DB verify |
| Feature Flags | LOW | LOW | FULL | WEAK | ADMIN+JOBS | HIGH | YES (ATOM-H) |

---

## Deployment Confidence Ranking (Safest to Riskiest)

1. **ATOM-G** — Migrations commit only, no runtime change. CONFIDENCE: HIGHEST.
2. **ATOM-A** — 3 independent routes, additive gate. CONFIDENCE: VERY HIGH.
3. **ATOM-H** — ~26 safe files, no untracked imports. CONFIDENCE: HIGH.
4. **ATOM-B** — Auth pair, foundational but fast rollback. CONFIDENCE: HIGH (after diff review).
5. **ATOM-F** — 2 admin files, isolated blast radius. CONFIDENCE: HIGH.
6. **ATOM-C** — SHOS system, admin-only, table verification required. CONFIDENCE: MEDIUM-HIGH.
7. **ATOM-I** — Active CRM workers, requires diff review. CONFIDENCE: MEDIUM.
8. **ATOM-D** — Prompt engine, requires AI strategy + DB verification. CONFIDENCE: MEDIUM (conditional).
9. **ATOM-E** — CMS resolver, ALL public pages. CONFIDENCE: HIGH only after staging test. Otherwise: CRITICAL RISK.

---

## Highest-Risk Deployment Zones

### Zone 1: Public Page Routing (ATOM-E)
Any error in `resolveRoute.js` or `resolveCmsRoute.js` causes 100% public page failure. Mitigation: Vercel preview required; rollback plan prepared in advance; deploy last.

### Zone 2: Auth Layer (ATOM-B)
Auth regression could lock all admin users out or introduce a bypass. Mitigation: Full diff review required; no deploy without it.

### Zone 3: Pagegen + promptEngine (ATOM-D)
Pagegen is a QStash-triggered worker. Deploying activates AI content generation. If `promptEngine.js` does not gate on `ai_enabled`, AI calls fire with exhausted quota. Mitigation: Verify gate before deploy; defer until AI strategy resolved.

---

## Remaining Ambiguities

| Ambiguity | Classification | Impact if Unresolved |
|---|---|---|
| `system_control_actions` table exists in production? | INCONCLUSIVE | ATOM-C fails at runtime if table missing |
| `content_drafts.prompt_inputs` column exists in production? | INCONCLUSIVE | ATOM-D fails at runtime if column missing |
| `custom_pages.full_slug` column exists in production? | INCONCLUSIVE | ATOM-E resolver fails if column missing |
| `promptEngine.js` internally checks `ai_enabled`? | NOT VERIFIED in RC-2A | ATOM-D activates AI calls without governance if missing |
| Auth pair diff introduces regression? | NOT READ in RC-2A | ATOM-B blocks all admin if regression present |
| Worker routes change Zoho API contract? | NOT READ in RC-2A | CRM sync breaks if contract changed |

> **Note:** These ambiguities are NOT blockers for RC-2A planning. They are pre-execution verification requirements that must be resolved in RC-2B and RC-2C before each ATOM deploys.
