# PHASE 6 - PROVIDER GOVERNANCE DETAILED ANALYSIS

**Date:** May 19, 2026  
**Cycle:** PHASE-6 (BOUNDED OPERATIONAL CONTROL-PLANE FOUNDATION)  
**Purpose:** Detailed analysis of current provider governance, future risks, and rollback-safe expansion boundaries

---

## PROVIDER GOVERNANCE CURRENT STATE

### Gemini AI Provider

**Architecture:**
```
lib/ai/generateContent.js
├── PRIMARY_MODEL: gemini-2.0-flash
├── FALLBACK_MODEL: gemini-2.5-flash-lite
├── Both from same vendor (Google)
├── MAX_RETRIES: 2
└── RETRY_DELAY_MS: 1500
```

**Execution Paths:**
- `/api/admin/ai` (admin AI route) - gated by `ai_enabled`
- `/api/admin/ai/recruiter` - gated by `ai_enabled`
- `/api/admin/seo/analyze` - gated by `ai_enabled`
- `/api/jobs/pagegen` (page generation worker) - gated by `pagegen_enabled`

**Failure Handling:**
- Returns `null` on persistent failure (graceful skip)
- Quota exhaustion: `429` error → exponential backoff → eventual return `null`
- Model not found: `404` error → skip to fallback model
- Rate limit: `429` error → wait and retry

**Governance:**
- `ai_enabled` flag (system_control_config) gates all AI execution
- Circuit breaker: Per-vendor in vendor_contracts table
- SLA tracking: sla_snapshots table
- Health check: Timeout-bounded live probe in /api/admin/system-health (2000ms max)

**Rollback Safety:**
- If `ai_enabled` reset on rollback, AI stays paused (safe)
- Quota state is provider-side (not tracked in app)
- Failed content generation is idempotent (Gemini can retry same prompt)

**CLASSIFICATION: FOUNDATION_SAFE**
- Static models (no runtime switching)
- Graceful fallback to same vendor (acceptable for current state)
- Quota-aware gating prevents runaway cost
- Timeout-bounded health checks prevent hanging

---

### Zoho CRM Provider

**Architecture:**
```
pages/api/_middleware/zoho.js
├── OAuth2 token refresh mechanism
├── API Domain: accounts.zoho.in (India datacenter)
├── Lead endpoint: /crm/v2.1/Leads/upsert
└── Contact endpoint: /crm/v2/Leads
```

**Execution Paths:**
- `/api/workers/lead-sync` (QStash worker) - lead upsert
- `/api/workers/contact-sync` (QStash worker) - contact upsert
- Lead retry daemon (if lead sync fails)

**Failure Handling:**
- Lead/contact sync: 10-second timeout
- Zoho API errors: QStash retries 3x (exponential backoff)
- Failed syncs queued in event_store for retry daemon
- Transient failures: Worker retries via QStash
- Terminal failures: Event marked 'failed', picked up by retry daemon

**Idempotency:**
- Lead deduplication by mobile/email (Zoho built-in)
- Zoho returns 'duplicate' status on retry
- idempotency via mobile/email prevents data duplication

**Governance:**
- No fallback CRM (single destination)
- No provider abstraction layer (Zoho-only)
- Circuit breaker: vendor_contracts.circuit_state
- Health check: Implicit via lead sync success/failure

**Rollback Safety:**
- Lead/contact sync state persisted in sync_status column
- If sync_status reset on rollback, lead will re-sync (idempotent via Zoho)
- Orphaned syncs possible if worker crashes mid-sync (consistency check mitigates)

**CLASSIFICATION: FOUNDATION_SAFE**
- Single authority (no multi-CRM logic needed)
- Idempotency via provider (Zoho duplicate detection)
- Timeout guardrails prevent hanging
- Retry mechanism survives transient failures

---

### QStash Queue Provider

**Architecture:**
```
lib/queue/publisher.js & lib/queue/qstash.js
├── Token: process.env.QSTASH_TOKEN
├── Client: @upstash/qstash
├── Callback URL: https://bimasakhi.com (production locked)
└── Message ID tracked in external_delivery_logs
```

**Execution Paths:**
- All async work: /api/workers/*, /api/jobs/*
- Led by event bus (handleEvent → QStash publish)
- Delivery state persisted in external_delivery_logs

**Failure Handling:**
- QStash down: event_store queues durably, retry daemon re-dispatches
- Delivery failure: QStash retries 3x, then dead-letter
- Message ID tracks delivery state (syncPendingExternalDeliveries)

**Idempotency:**
- QStash message ID prevents duplicate dispatch
- Event_store retry_count tracks attempts
- external_delivery_logs tracks all delivery attempts

**Governance:**
- No queue backup (QStash is only option)
- No multi-queue coordination (single instance)
- Circuit breaker: vendor_contracts.circuit_state
- SLA tracking: sla_snapshots

**Rollback Safety:**
- Event state machine survives QStash restart
- Delivery logs persist on rollback
- Retry daemon resumes from event_store state

**CLASSIFICATION: FOUNDATION_SAFE**
- Durable event store survives queue down
- Idempotency via message ID prevents replay loops
- Retry mechanism self-healing
- No automatic cutover (manual operator action needed)

---

### Supabase Data Store

**Architecture:**
```
PostgreSQL + RLS (Row Level Security)
├── All application data persisted
├── Event_store (write-ahead log)
├── Tables: leads, contacts, event_store, external_delivery_logs, etc.
└── Service role key for backend access
```

**Failure Handling:**
- Database down: All operations fail immediately (hard stop)
- Connection pool exhaustion: Requests queue or timeout
- Query failures: Non-blocking retry with max attempts

**Data Safety:**
- RLS enforces role-based access (no client-side data leaks)
- Transactions ensure consistency (e.g., event_store + lead_sync)
- Backups: Vercel-managed (not app-level)

**Governance:**
- No data backup redundancy at app level
- No read replicas or failover (single primary)
- Single point of failure for all application data

**Rollback Safety:**
- Event_store state survives rollback (immutable append log)
- Rollback to previous code version can leave orphaned data
- Data consistency check required post-rollback

**CLASSIFICATION: FOUNDATION_SAFE (CURRENT) with MEDIUM RISK**
- Single point of failure is acceptable for current single-domain
- Backup strategy required for future expansion
- RLS prevents unauthorized access
- Event store provides recovery audit trail

---

## PROVIDER GOVERNANCE FUTURE RISKS

### Risk 1: Multi-Provider Orchestration

**If attempted without abstraction layer:**
- ❌ Provider selection logic not centralized
- ❌ Provider fallback would require coordination
- ❌ Provider-local error semantics would diverge
- ❌ Orchestration authority would widen

**Mitigation for future:**
- ✅ Create provider registry (mapping provider → config)
- ✅ Create provider adapter contracts (normalized responses)
- ✅ Create provider router (policy engine decides provider)
- ✅ Bound orchestration to specific workflows (no auto-routing)

---

### Risk 2: Provider-Local Error Handling

**Current fragility:**
- Gemini: Quota returns `429` (handled)
- Zoho: 429 rate limit returns error (handled)
- QStash: 5xx returns error (handled)
- But: Telegram provider unconfirmed (silent failure)

**If multi-provider added:**
- ❌ Each provider returns different error semantics
- ❌ Orchestration would need provider-specific error mapping
- ❌ Silent failures would cascade across providers

**Mitigation for future:**
- ✅ Normalize error responses (provider adapter layer)
- ✅ Explicit failure modes per provider (circuit breaker aware)
- ✅ Observability integration mandatory for all providers

---

### Risk 3: Deployment Authority Ambiguity

**Current state:**
- Provider config is environment-variable-based
- No deployment-time provider validation
- No runtime provider health check before use

**If multi-provider added:**
- ❌ Deployment would have multiple provider options
- ❌ Runtime provider selection would require policy logic
- ❌ Provider switching would require complex coordination

**Mitigation for future:**
- ✅ Provider config validation at deployment time
- ✅ Explicit provider health gate before orchestration activation
- ✅ Bounded provider switching (only within defined set)

---

## PROVIDER ROLLBACK SAFETY MATRIX

| Provider | Rollback Boundary | Rollback Risk | Mitigation |
|---|---|---|---|
| Gemini | ai_enabled flag | If flag not reset, AI stays paused | Verify flag reset in post-rollback checklist |
| Zoho | sync_status column | If status not reset, leads replay | Verify sync_status reset or manual sync |
| QStash | event_store state | Event_store survives (safe) | None needed (event state is durable) |
| Supabase | event_store (append-only) | No rollback risk (immutable log) | None needed (data append-only) |

---

## PROVIDER REPLAY SAFETY MATRIX

| Provider | Replay Boundary | Idempotency | Replay Risk |
|---|---|---|---|
| Gemini | Per-prompt | Calling code (not provider) | Replay generates different content (acceptable for SEO) |
| Zoho | Per-lead/contact | mobile/email duplicate detection | Replay safe (Zoho deduplicates) |
| QStash | Message ID | QStash native | Replay safe (message ID prevents redelivery) |
| Supabase | Row primary key | Database constraint | Replay safe (constraint prevents duplicate rows) |

---

## PROVIDER GOVERNANCE AUTHORIZATION

**CURRENT_PROVIDERS_AUTHORIZATION: SAFE**
- Static provider selection (no runtime switching)
- Defined fallback behavior (same-vendor fallback for Gemini)
- Explicit circuit breakers per provider
- Durable state persists across failures

**FUTURE_MULTI_PROVIDER_AUTHORIZATION: DOWNGRADE IF**
- ❌ Provider abstraction layer not implemented
- ❌ Provider orchestration logic not bounded
- ❌ Provider-local error semantics not normalized
- ❌ Runtime provider switching enabled without hard gates

**FUTURE_PROVIDER_GOVERNANCE_TIMELINE:**
1. Current: Single provider per workflow (static)
2. Future: Provider registry + adapter layer (abstraction)
3. Future: Provider router with policy gates (bounded orchestration)
4. NEVER: Unrestricted provider switching (authority widen forbidden)
