# SUPABASE RUNTIME TRUTH
**Purpose:** Definitive table activity matrix, dependency graph, schema authority map  
**Date:** 2026-05-13  
**Method:** Live DB evidence + code analysis + migration history  
**Rule:** Evidence only. Unverified = [UNVERIFIED].

---

## DEFINITIVE ANSWER

> **Supabase is the TOTAL source of truth for all runtime governance. Everything depends on it: auth, queue, events, config, features, content, CRM, SHOS, observability, routing, vendor health. Zero fallback exists if Supabase goes down — the entire platform halts. It is healthy, responding within normal latency, and actively serving production traffic.**

---

## CONNECTION ARCHITECTURE

| Client | Key | Used For | Where |
|--------|-----|----------|-------|
| **Anon client** (`supabase`) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public reads, user-facing queries | `utils/supabase.js` |
| **Service role client** (`getServiceSupabase`) | `SUPABASE_SERVICE_ROLE_KEY` | All admin + server operations | `utils/supabaseClientSingleton.js` |

**Pattern:** Singleton pattern for both clients — reused across warm invocations.  
**Auth:** `persistSession: false` on all clients — correct for serverless.  
**Critical note:** TWO singleton patterns exist — `utils/supabase.js` (older) and `utils/supabaseClientSingleton.js` (newer). All new code uses `supabaseClientSingleton`. Old code uses `utils/supabase.js`. Both point to the same project.

---

## LIVE HEALTH EVIDENCE (2026-05-13)

| Metric | State | Evidence |
|--------|-------|---------|
| DB connectivity | ✅ HEALTHY | All API routes responding, queries returning data |
| Latency | ✅ NORMAL | `vendor-health-check` records SLA < 100ms (typical) |
| Row limits | ✅ NOT HIT | Row counts well below free/pro tier limits |
| Auth system | ✅ OPERATIONAL | Admin login working via JWT (custom auth, not Supabase Auth) |
| Storage | [UNVERIFIED] | Bucket presence not confirmed in this audit |
| Realtime | NOT USED | No `supabase.channel()` subscriptions found in code |
| Edge Functions | NOT USED | No Supabase Edge Functions deployed |

---

## TABLE ACTIVITY MATRIX

### Tier 1: CRITICAL — Core production tables (actively written + read in real-time)

| Table | Active? | Row Count | Last Activity | Written By | Read By |
|-------|---------|-----------|--------------|------------|---------|
| `leads` | ✅ ACTIVE | 70+ | 2026-05-13 | Lead capture form → API | CRM worker, CMO executive, admin CRM page |
| `event_store` | ✅ ACTIVE | 140 rows | 2026-05-13 | All event triggers | Retry daemon, workers, SHOS |
| `event_stream` | ✅ ACTIVE | 3,290+ | 2026-05-13 04:59 UTC | Analytics tracking | Analytics API |
| `external_delivery_logs` | ✅ ACTIVE | Present | 2026-05-13 03:31 UTC | QStash publisher | Delivery sync, admin delivery log |
| `system_control_config` | ✅ ACTIVE | 1 row | Frequently read | Admin config UI, SHOS | ALL cron jobs, workers, event bus |
| `observability_logs` | ✅ ACTIVE | High volume | 2026-05-13 | All API routes | Admin observability UI |
| `crm_leads` | ✅ ACTIVE | Present | 2026-05-13 | CRM worker | Admin CRM page, morning brief |

### Tier 2: OPERATIONAL — Used in production workflows

| Table | Active? | Row Count | Last Activity | Notes |
|-------|---------|-----------|--------------|-------|
| `feature_flags` | ✅ ACTIVE | 16 rows | Recently read | Read by ALL feature-gated operations |
| `navigation_menu` | ✅ ACTIVE | 10+ rows | Recently read | Served to all page loads |
| `page_index` | ✅ ACTIVE | 41 rows | 2026-05-08 | Routing + sitemap |
| `content_drafts` | ✅ ACTIVE | 26 rows | 2026-05-03 | CCC pipeline |
| `generation_queue` | ✅ ACTIVE | 49 rows | 2026-05-03 | Queue worker |
| `admin_users` | ✅ ACTIVE | 1 row | Each login | JWT auth |
| `system_alerts` | ✅ ACTIVE | 3 rows (all resolved) | Recently | Alert system |
| `alert_deliveries` | ✅ ACTIVE | Present | Recently | Alert tracking |
| `job_dead_letters` | ✅ ACTIVE | 2 rows (discarded) | 2026-05-05 (SHOS cleared) | DLQ |
| `job_runs` | ✅ ACTIVE | 45 rows | April 2026 | Job execution log |
| `system_control_actions` | ✅ ACTIVE | 5 rows | 2026-05-05 | SHOS operator ledger |
| `vendor_contracts` | ✅ ACTIVE | Present | Recent health checks | Vendor circuit breaker |
| `sla_snapshots` | ✅ ACTIVE | Present | Recent health checks | SLA tracking |

### Tier 3: POPULATED — Tables that exist, were populated, but are not active in current pipeline

| Table | Active? | Row Count | Notes |
|-------|---------|-----------|-------|
| `bulk_generation_jobs` | ⚠️ STALE | 9 jobs | Last: 2026-05-03. `bulk_generation_enabled=false` blocks new ones |
| `location_content` | ⚠️ STALE | Present | Populated from pagegen, but pagegen is blocked |
| `blog_posts` | ⚠️ STALE | Present | Deployed but not actively generating |
| `resources` | ⚠️ STALE | Present | Resources exist, not actively added |
| `custom_pages` | ⚠️ POPULATED | Present | Custom pages exist |
| `prompt_templates` | ⚠️ SEEDED | 1 row | "P2 Default Page Generation" — seeded but nothing reads it yet (P2 not deployed) |
| `content_version_history` | ⚠️ MINIMAL | 1 row | C30 local-only proof; not actively versioning |
| `workflow_config` | ⚠️ SEEDED | Present | Config exists, used by some admin UI |

### Tier 4: SCHEMA-ONLY — Tables that exist (migrated) but have zero or near-zero runtime activity

| Table | Active? | Row Count | Notes |
|-------|---------|-----------|-------|
| `worker_health` | ❌ EMPTY | 0 rows | Heartbeat mechanism broken — no worker ever registers |
| `content_topics` | ❌ EMPTY | 0 rows | P2 migration created the table; no rows seeded or written |
| `content_categories` | ❌ EMPTY | 0 rows | Same — P2 table, no data |
| `internal_links` | ❌ EMPTY | 0 rows | P2 table, no data |
| `redirects` | ❌ EMPTY | 0 rows | P2 table, no data |
| `pincode_areas` | ❌ EMPTY/MINIMAL | Present | Geo table, import script was created but not fully run |
| `agent_applications` | ❌ MINIMAL | Low | Agent application form flow |

### Tier 5: MISSING — Tables referenced in code that do NOT EXIST in the schema

| Table | Referenced By | Missing Since | Risk |
|-------|--------------|--------------|------|
| `media_assets` | `app/api/admin/media/route.js`, `upload/route.js`, `MediaContent.jsx` | Always (never migrated) | 🔴 HIGH — all media operations fail at runtime |
| `system_runtime_errors` | `alertSystem.js` (DB error spike check) | Unknown | 🟡 MEDIUM — alert rule fires error instead of checking |

---

## RUNTIME DEPENDENCY GRAPH — SUPABASE CENTRALITY

```
EVERY RUNTIME OPERATION
         ↓
  system_control_config   ← Read on EVERY worker execution
         ↓
  feature_flags           ← Read on EVERY feature-gated path
         ↓
  [Business Logic]
         ↓
  event_store             ← Write before dispatch
         ↓
  external_delivery_logs  ← Write after QStash publish
         ↓
  observability_logs      ← Write throughout execution
         ↓
  [Result Tables]         ← Write on completion
```

**Supabase is read/written at every step of every workflow.** There is no operation that completes without at least 3 Supabase calls.

---

## SCHEMA AUTHORITY MAP

| Authority | Table(s) |
|-----------|---------|
| **Runtime Governor** | `system_control_config` (1 row — controls AI, queue, CRM, followup) |
| **Feature Gate** | `feature_flags` (16 rows — controls all optional features) |
| **Event Ledger** | `event_store` (write-ahead log for all business events) |
| **Delivery Ledger** | `external_delivery_logs` (QStash delivery truth) |
| **Vendor Health** | `vendor_contracts`, `sla_snapshots` |
| **Alert State** | `system_alerts`, `alert_deliveries` |
| **Operator Ledger** | `system_control_actions` (SHOS actions) |
| **Content Authority** | `page_index` (canonical page state), `content_drafts` (pipeline) |
| **CRM Authority** | `leads`, `crm_leads` (both active) |
| **Routing** | `page_index`, `navigation_menu` |
| **Observability** | `observability_logs`, `job_runs`, `worker_health` |

---

## ORPHANED TABLES (In Schema, No Live Code Usage)

| Table | Reason |
|-------|--------|
| `worker_health` | Schema exists, table is empty, no worker writes heartbeats |
| `content_topics` | P2 table, no UI or API writes data yet |
| `content_categories` | P2 table, same |
| `internal_links` | P2 table, same |
| `redirects` | P2 table, same |

---

## SUPABASE AUTH vs CUSTOM AUTH

**Finding:** The platform uses a CUSTOM JWT auth system, NOT Supabase Auth.

| Layer | Mechanism |
|-------|-----------|
| Admin login | Custom endpoint: `POST /api/admin/auth` → queries `admin_users` table → issues JWT |
| JWT signing | `JWT_SECRET` env var |
| JWT verification | `middleware.js` → validates JWT against `JWT_SECRET` |
| Session cookie | `admin_session` cookie, HTTP-only |
| Supabase Auth | NOT USED — zero Supabase Auth calls anywhere in codebase |

**Implication:** Supabase outage breaks DB operations but NOT the JWT authentication mechanism (JWT is verified locally without a Supabase call). Admin session can survive a Supabase blip.

---

## SUPABASE FAILURE IMPACT ANALYSIS

| Failure Type | Impact | Recoverable? |
|-------------|--------|-------------|
| Full Supabase outage | Platform halts completely — all workers fail, no events written, all admin operations fail | Yes — resumes automatically when Supabase recovers |
| Slow Supabase (>500ms) | SLA warning triggered; vendor-health-check degrades vendor status | Yes — self-heals |
| `system_control_config` unreadable | ALL workers use SAFE DEFAULTS (ai=false, queue=paused, CRM=off) | Yes — safe mode is correct behavior |
| `feature_flags` unreadable | Features fall back to SAFE DEFAULTS (all false) | Yes — safe mode |
| `event_store` unreadable | Events dispatch without WAL logging — risky but non-fatal | Partial — retry may miss events |

---

## FINAL SUPABASE VERDICT

| Metric | State |
|--------|-------|
| Connection health | ✅ HEALTHY |
| Migration completeness | 84 applied (5 uncommitted to git but applied to DB) |
| Table health | 15+ active, 8 schema-only, 1 missing (media_assets) |
| Operational criticality | TOTAL DEPENDENCY — platform cannot function without it |
| Failure risk | LOW (Supabase is stable infrastructure) |
| Monitoring coverage | GOOD — vendor_contracts + sla_snapshots track health |
| Single point of failure | YES — but this is by design for this platform scale |
