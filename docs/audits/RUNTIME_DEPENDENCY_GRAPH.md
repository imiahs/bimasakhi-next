# RUNTIME DEPENDENCY GRAPH
**Purpose:** End-to-end flow tracing — every user action through the full external system stack  
**Date:** 2026-05-13  
**Method:** Code analysis of all API routes, workers, event handlers  
**Rule:** Evidence only. Flows marked with [WORKING] / [BROKEN] / [UNVERIFIED] based on live evidence.

---

## OVERVIEW

```
                    ┌─────────────────────────────────────────┐
                    │           bimasakhi.com                  │
                    │         (Vercel / Next.js 14)            │
                    └─────────────┬───────────────────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                       │
     [User Traffic]         [Admin Panel]          [Cron / Queue]
            │                     │                       │
            ▼                     ▼                       ▼
    ┌───────────────┐    ┌─────────────────┐    ┌──────────────────┐
    │   Supabase    │    │    Supabase      │    │  QStash/Upstash  │
    │ (DB reads)    │    │ (auth + config)  │    │  (cron trigger)  │
    └───────────────┘    └─────────────────┘    └──────────────────┘
                                                         │
                                            ┌────────────┼────────────┐
                                            │            │            │
                                         Supabase     Zoho CRM     Gemini AI
                                       (write WAL)   (CRM sync)   (content gen)
```

---

## FLOW 1: USER LEAD SUBMISSION [WORKING]

```
User fills form on bimasakhi.com
      │
      ▼
POST /api/leads/create (or equivalent contact form handler)
      │
      ├── 1. SUPABASE: INSERT INTO leads (full_name, mobile, email, ...)
      │         └── leads.id = <new_lead_id>
      │
      ├── 2. SUPABASE: event_store.writeEvent('lead_created', { leadId })
      │         └── event_store.id = <event_id>, status = 'pending'
      │
      ├── 3. QSTASH: publishQueueMessage('/api/workers/lead-sync', { leadId, eventId })
      │         ├── Records to external_delivery_logs
      │         └── Returns qstash_message_id
      │
      └── Response: 200 OK to user
                │
                └── [QStash delivers asynchronously → lead-sync worker]

QStash → POST /api/workers/lead-sync
      │
      ├── verifySignatureAppRouter ✅
      ├── getSystemConfig() → SUPABASE: system_control_config
      ├── CMO executive: lib/executives/cmo.js
      │     └── lead scoring + routing (rule-based, no AI dependency)
      ├── loadLeadForSync() → SUPABASE: SELECT FROM leads
      ├── getZohoAccessToken() → ZOHO: OAuth token refresh if expired
      ├── axios.post → ZOHO API: /crm/v2/Leads
      │     └── Returns zoho_id
      ├── SUPABASE: UPDATE leads SET zoho_id=..., zoho_synced_at=now()
      ├── SUPABASE: INSERT INTO crm_leads (CRM record)
      └── SUPABASE: event_store UPDATE status='completed'

EVIDENCE: Confirmed working 2026-05-13 03:31 UTC
EXTERNAL SYSTEMS: Supabase ✅, QStash ✅, Zoho CRM ✅
```

---

## FLOW 2: PAGE VIEW / TRAFFIC [WORKING]

```
User visits bimasakhi.com/<slug>
      │
      ▼
Next.js App Router: [...slug]/page.js
      │
      ├── SUPABASE: SELECT FROM page_index WHERE slug = <slug> AND status = 'published'
      │
      ├── If page found: render page content
      │
      └── SUPABASE: INSERT INTO event_stream (page_view event)
                └── analytics tracking

EVIDENCE: event_stream has page_view at 2026-05-13T04:59:29
EXTERNAL SYSTEMS: Supabase ✅
```

---

## FLOW 3: PAGE GENERATION (AI CONTENT PIPELINE) [BROKEN]

```
Trigger: generation_queue has pending items
      │
QStash → POST /api/jobs/pagegen (5-min poll or event-triggered)
      │
      ├── verifySignatureAppRouter ✅
      ├── getSystemConfig() → SUPABASE: system_control_config
      │     └── ai_enabled = true (misleading — quota dead)
      ├── getFeatureFlag('pagegen_enabled') → SUPABASE: feature_flags
      ├── validatePageGenJob() → pick next item from generation_queue
      ├── resolvePagePrompt() → SUPABASE: prompt_templates (P2 - not in prod)
      │     └── Production uses static prompt (P1 path)
      ├── generateAiContent(prompt) → GEMINI API
      │     ├── Primary: gemini-2.0-flash → 429 QUOTA EXCEEDED ❌
      │     ├── Retry 1: 429 ❌
      │     ├── Retry 2: 429 ❌
      │     ├── Fallback: gemini-2.5-flash-lite → 429 ❌
      │     └── Returns: null
      ├── if (content === null) → exit gracefully → return 200 OK
      └── SUPABASE: observability_logs INSERT (AI_FAILURE event)

EVIDENCE: Zero job_runs in May. Zero page_generated in event_store.
EXTERNAL SYSTEMS: Supabase ✅, QStash ✅, Gemini ❌ QUOTA DEAD
STATUS: 🔴 PIPELINE STALLED
```

---

## FLOW 4: ALERT MONITORING (5-MINUTE CYCLE) [WORKING]

```
Every 5 minutes:
QStash cron → POST /api/jobs/alert-scan
      │
      ├── verifySignatureAppRouter ✅
      ├── runAlertScan()
      │     ├── SUPABASE: SELECT FROM event_store WHERE status='failed' (count)
      │     ├── SUPABASE: SELECT FROM job_runs WHERE status='failed' (count)
      │     ├── SUPABASE: SELECT FROM system_runtime_errors (count) — MAY FAIL (table missing?)
      │     ├── Evaluate 7 alert rules
      │     ├── For each breach:
      │     │     ├── SUPABASE: INSERT INTO system_alerts
      │     │     ├── SUPABASE: INSERT INTO alert_deliveries
      │     │     └── TELEGRAM: sendTelegramAlert(message) [UNVERIFIED live delivery]
      │     └── Return alert_count
      │
      ├── evaluateRunbooks() → automated remediation checks
      │
      └── runEscalationCheck()
            ├── SUPABASE: SELECT unresolved P0 alerts > 5 min
            ├── TELEGRAM: sendTelegramAlert(P0 escalation) [UNVERIFIED]
            ├── SUPABASE: SELECT unresolved P1 alerts > 15 min
            └── TELEGRAM: sendTelegramAlert(P1 escalation) [UNVERIFIED]

EXTERNAL SYSTEMS: Supabase ✅, Telegram ❓ (structurally correct, live unverified)
```

---

## FLOW 5: VENDOR HEALTH CHECK (5-MINUTE CYCLE) [WORKING]

```
Every 5 minutes:
QStash cron → POST /api/jobs/vendor-health-check
      │
      ├── SUPABASE: SELECT 1 (ping query) → measure latency
      │     └── If > 500ms → status = 'degraded'
      │     └── If error → status = 'down'
      │     └── Write to sla_snapshots
      │
      ├── SUPABASE: UPDATE vendor_contracts SET last_check=now(), circuit_state=...
      │
      └── Return health summary

EXTERNAL SYSTEMS: Supabase ✅
```

---

## FLOW 6: MORNING BRIEF (DAILY 7:30 AM IST) [WORKING — TELEGRAM UNVERIFIED]

```
Daily 02:30 UTC:
QStash cron → POST /api/jobs/morning-brief
      │
      ├── verifySignatureAppRouter ✅
      ├── SUPABASE: SELECT leads WHERE created_at > 24h ago (COUNT)
      ├── SUPABASE: SELECT content_drafts WHERE created_at > 24h ago (COUNT)
      ├── SUPABASE: SELECT observability_logs WHERE level='ERROR', 24h ago (COUNT)
      ├── SUPABASE: SELECT system_alerts WHERE resolved=false (COUNT)
      ├── SUPABASE: SELECT event_store WHERE status='pending' (COUNT)
      ├── Compose markdown message
      └── TELEGRAM: sendTelegramAlert(dailyBriefMessage)
                └── CEO receives daily brief [UNVERIFIED live delivery]

EXTERNAL SYSTEMS: Supabase ✅, Telegram ❓
```

---

## FLOW 7: ADMIN LOGIN [WORKING]

```
Admin visits /admin
      │
POST /api/admin/auth
      ├── SUPABASE: SELECT FROM admin_users WHERE email = ? (password check)
      ├── bcrypt.compare(password, hash) — local operation
      ├── jwt.sign({ userId, role }) with JWT_SECRET — local operation
      └── Set cookie: admin_session = <JWT>

Subsequent requests:
      ├── middleware.js: jwt.verify(cookie, JWT_SECRET) — local operation
      └── No Supabase call needed for session validation

EXTERNAL SYSTEMS: Supabase ✅ (only for password lookup — subsequent requests are JWT-local)
```

---

## FLOW 8: CONTENT DRAFT PIPELINE (CCC) [DEGRADED]

```
Admin creates draft in CCC
      │
POST /api/admin/cms/draft
      ├── SUPABASE: INSERT INTO content_drafts (status='pending_review')
      └── [No QStash/AI involvement at draft creation]

Admin approves draft:
      ├── SUPABASE: UPDATE content_drafts SET status='approved', scheduled_publish_at=<date>
      └── [Expects: QStash cron scheduled-publish picks it up hourly]
                └── ❌ scheduled-publish NEVER REGISTERED IN UPSTASH
                    → Draft sits in 'approved' state indefinitely

STATUS: 🔴 SCHEDULED PUBLISH BROKEN — cron not registered
EXTERNAL SYSTEMS: Supabase ✅, QStash (scheduled-publish) ❌
```

---

## FLOW 9: SCHEDULED PUBLISH [BROKEN — CRON NOT REGISTERED]

```
Hourly (intended):
QStash cron → POST /api/jobs/scheduled-publish
      ← ❌ THIS CRON WAS NEVER CREATED IN UPSTASH DASHBOARD
         → Endpoint never receives a trigger
         → All approved+scheduled drafts never auto-publish

EXTERNAL SYSTEMS: QStash ❌ (not registered)
STATUS: 🔴 COMPLETELY INACTIVE
```

---

## FLOW 10: REDIS RATE LIMITING [WORKING]

```
POST /api/crm/[action] (admin CRM operations)
      │
      ├── Check REDIS_URL present ✅
      ├── Redis (ioredis): check rate limit key for this IP/action
      │     └── Key: ratelimit:{ip}:{action}
      │     └── If INCR > limit within window → 429
      │     └── Else → proceed
      └── Continue with Zoho/Supabase operation

EXTERNAL SYSTEMS: Redis (Upstash via REDIS_URL/ioredis) ✅ — configured and used
```

---

## FLOW 11: FOLLOW-UP MESSAGES [GATED — PROVIDER UNKNOWN]

```
lead_hot event occurs
      │
QStash → POST /api/jobs/followup-trigger
      │
      ├── getSystemConfig() → followup_enabled check
      │     └── followup_enabled = true in production
      ├── CSO executive: lib/executives/cso.js
      └── lib/followup/sendFollowupMessage.js
                ├── FOLLOWUP_WEBHOOK_URL check
                │     └── If absent → silent skip
                └── If present → POST to webhook URL
                          └── Provider: UNKNOWN (generic webhook)

STATUS: ⚠️ followup_enabled=true in production, but FOLLOWUP_WEBHOOK_URL not confirmed present
EXTERNAL SYSTEMS: Unknown webhook provider — if URL absent, silent skip
```

---

## EXTERNAL SYSTEM CALL FREQUENCY TABLE

| System | Calls Per... | Volume Type | Evidence |
|--------|-------------|-------------|---------|
| **Supabase** | Every API request (3-10 calls/request) | VERY HIGH | All routes read system_control_config |
| **QStash** | Every lead/contact + cron 5-min intervals | MEDIUM | External delivery logs |
| **Zoho CRM** | Every lead/contact event | LOW-MEDIUM | OAuth + API call per lead |
| **Gemini** | Every pagegen attempt (currently 429) | BLOCKED | Zero successful in May |
| **Telegram** | 5-min cron + daily brief | LOW | Structurally present |
| **Redis** | Every admin CRM action | LOW | ioredis client active |
| **Medium API** | Unknown — no code found reading it | UNKNOWN | Keys present but no usage found |
| **OpenAI** | NEVER (dead code) | ZERO | No imports found |

---

## MEDIUM API — DEAD INTEGRATION FINDING

`MEDIUM_API_TOKEN` and `MEDIUM_AUTHOR_ID` are present in env. However:

**No code in the codebase imports or calls the Medium API.** The tokens were set up for a planned social auto-draft feature but no implementation exists. This is an env var forward-provision with zero code backing it.

**Status: INERT — keys present, no integration code.**

---

## DEPENDENCY CRITICALITY RANKING

| Rank | System | If Down → Platform Impact |
|------|--------|--------------------------|
| 1 | **Supabase** | Total platform halt — nothing works |
| 2 | **QStash** | Lead sync + cron jobs stop, events queue up |
| 3 | **Zoho CRM** | Lead capture still works, CRM sync fails (retries queue) |
| 4 | **Telegram** | CEO has no alerts — operational blind spot |
| 5 | **Gemini** | ALREADY DOWN — content pipeline stalled |
| 6 | **Redis** | Admin CRM rate limiting bypassed (safe fallback) |
| 7 | **Medium API** | Zero impact (no code uses it) |
| 8 | **OpenAI** | Zero impact (dead code) |
