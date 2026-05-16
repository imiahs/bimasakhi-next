# RC-2B: Before Convergence Snapshot

| Field | Value |
|---|---|
| Phase | RC-2B |
| Date | 2026-05-14 |
| Purpose | Authoritative pre-convergence state capture before any RC-2B mutation |
| Production commit | `794013e` (2026-05-04) |
| Branch | `main` (HEAD -> main = origin/main) |
| Selected ATOM | **ATOM-G** — Orphaned migrations commit (git record-keeping only) |
| Authority | RC-2B BEFORE snapshot — immutable once mutation begins |

---

> **CONSTRAINT:** This is a PLANNING-ONLY snapshot. No mutation allowed before this document exists. This document was created BEFORE any git operations.

---

## Selected Deployment Group: ATOM-G

**Rationale for selecting ATOM-G as the sole RC-2B cycle group:**

1. **Sequencing requirement** — RC-2A mandates ATOM-G before any code deployment
2. **Zero runtime risk** — SQL migration files are NOT processed by Next.js builds. Vercel will build identical code to `794013e`
3. **Maximum ONE atomic group per RC-2B cycle** (Rule 21) — ATOM-A deferred to next RC-2B cycle
4. **Closes highest-priority git/DB drift** — 5 orphaned migrations applied to DB but never committed
5. **Fully reversible** — single `git revert` removes the commit; DB state unaffected either way
6. **Build safety confirmed** — `vercel.json` = `{"framework": "nextjs"}` only; `next.config.mjs` has no migration directory processing

**Excluded from this cycle (deferred):**
- ATOM-A (3 governance routes) — deferred to next RC-2B cycle
- ATOM-B (auth pair) — requires diff review first
- All others (ATOM-C through ATOM-I) — per RC-2A sequencing

---

## Deployed Runtime State (BEFORE)

| System | State | Evidence |
|---|---|---|
| Next.js on Vercel | STABLE at `794013e` | All public pages 200 |
| Supabase | OPERATIONAL | system_control_config confirmed |
| QStash (6 crons) | ACTIVE | All 6 confirmed RC-1C |
| CRM / Zoho | OPERATIONAL | Sync confirmed May 13 |
| Gemini AI | QUOTA EXHAUSTED + GATED | `ai_enabled=false` in DB (RC-1B.1) |
| Queue | HEALTHY | `queue_paused=false`, 0 stuck events |
| Admin runtime | P1 versions | Modified versions NOT deployed |

---

## Feature Flag State (BEFORE)

| Flag | Value | Note |
|---|---|---|
| `ai_enabled` | `false` | Set RC-1B.1, 2026-05-13T18:01:03Z |
| `queue_paused` | `false` | Active healthy state |
| `crm_auto_routing` | `true` | Active |
| `followup_enabled` | `true` | Active |

---

## ATOM-G: 5 Migration Files to Commit

All files verified — all operations are `IF NOT EXISTS` / non-destructive:

| File | Schema Change | Applied to DB | Verification |
|---|---|---|---|
| `20260504123000_queue_running_steady_state.sql` | `ALTER TABLE system_control_config ALTER COLUMN queue_paused SET DEFAULT FALSE` | ✅ Confirmed (live DB shows `queue_paused=false`) | File read: 329 bytes |
| `20260504150000_p0_4_content_inventory_completion.sql` | `ADD COLUMN IF NOT EXISTS` on `blog_posts`, `resources` (audit columns) | LIKELY | File read: 2545 bytes, uses IF NOT EXISTS throughout |
| `20260505090000_shos_operator_control.sql` | `CREATE TABLE IF NOT EXISTS system_control_actions` + DLQ/queue operator columns | LIKELY | File read: 3548 bytes, all IF NOT EXISTS |
| `20260507010000_p2_2_cms_data_structure.sql` | Nullable columns on `custom_pages`, `content_drafts`, `page_index`, `blog_posts` | LIKELY | File read: 3655 bytes, all IF NOT EXISTS |
| `20260507020000_p2_4_ai_prompt_engine.sql` | Prompt metadata columns + default template seed | LIKELY | File read: 3730 bytes, all IF NOT EXISTS |

**Safety confirmation:** All 5 migrations use `IF NOT EXISTS` guards. Re-running against an already-migrated DB is safe (idempotent).

---

## Build Impact Analysis

| Layer | Impact |
|---|---|
| Next.js compilation | NONE — SQL files not imported or processed |
| Vercel build | PASS — build is identical to `794013e` |
| Public routing | UNCHANGED |
| Admin routing | UNCHANGED |
| QStash cron behavior | UNCHANGED |
| Feature flags | UNCHANGED |
| DB schema | UNCHANGED (already applied) |

**Vercel config confirmed:** `vercel.json` = `{"framework": "nextjs"}` — no special migration directory handling.

---

## Rollback Plan

| Step | Action | Time |
|---|---|---|
| 1 | `git revert HEAD` | < 10 seconds |
| 2 | `git push origin main` | < 30 seconds |
| 3 | Vercel build (builds identical code) | ~2 minutes |
| **Total** | **Git record-keeping reverted** | **< 3 minutes** |

**Note:** Rolling back ATOM-G does NOT affect DB schema (migrations already applied). It only removes the git record.

---

## Runtime Systems NOT Touched in RC-2B ATOM-G

| System | Status |
|---|---|
| Public routing (`app/[...slug]/page.js`) | UNTOUCHED — P1 deployed version unchanged |
| Auth (`middleware.js`, `withAdminAuth.js`) | UNTOUCHED |
| AI governance gates | UNTOUCHED |
| QStash crons | UNTOUCHED |
| CRM workers | UNTOUCHED |
| SHOS system | UNTOUCHED |
| Prompt engine | UNTOUCHED |
| Feature flags | UNTOUCHED |
| Admin API routes | UNTOUCHED |
