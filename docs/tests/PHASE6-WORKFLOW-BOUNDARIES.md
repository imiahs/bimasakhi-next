# PHASE 6 - WORKFLOW BOUNDARIES DETAILED ANALYSIS

**Date:** May 19, 2026  
**Cycle:** PHASE-6 (BOUNDED OPERATIONAL CONTROL-PLANE FOUNDATION)  
**Purpose:** Detailed analysis of current workflow boundaries, evolution risks, and replay safety

---

## CURRENT WORKFLOW BOUNDARIES

### Workflow 1: Lead Ingestion & Delivery

**INGESTION:**
```
User form submit (website lead capture)
  → POST /api/leads
  → Create lead row in crm_leads table
  → handleEvent('lead_created', { leadId, ... })
  → writeEvent (event_store WAL)
    ├─ Event written BEFORE dispatch (Rule 1)
    ├─ CRITICAL: Hard fail if WAL fails
    └─ Return success only if event stored
  → shouldExecute (policy gate)
    ├─ Check queue_paused
    ├─ Check ai_enabled (if event requires AI)
    └─ Block if policy violated
  → Publish to QStash
    ├─ Target: /api/workers/lead-sync
    ├─ Message ID tracked
    └─ Return messageId + event_store_id
```

**DELIVERY:**
```
QStash triggers: POST /api/workers/lead-sync { leadId }
  → Load lead from crm_leads
  → Update sync_status → 'processing' (atomic transaction)
    ├─ Idempotency check: neq('sync_status', 'completed')
    └─ Prevent duplicate processing
  → Call CMO executive: handleLeadCreated
    ├─ Score lead (CMO logic)
    ├─ Detect hot_lead flag
    └─ Emit lead_hot event (if hot)
  → If lead_hot emitted:
    ├─ handleEvent('lead_hot', { leadId })
    ├─ Dispatch to CSO workflow
    └─ Non-blocking (CMO failure doesn't block Zoho sync)
  → Sync to Zoho:
    ├─ POST /crm/v2.1/Leads/upsert
    ├─ Idempotency: duplicate_check_fields=['Mobile']
    └─ Zoho returns 'duplicate' if retry
  → Update sync_status → 'completed'
  → Transition lead state (state machine)
  → markCompleted(eventStoreId) → event_store ACK
  → Return HTTP 200 (success)
```

**RETRY_ESCALATION:**
```
If lead_sync fails:
  → Exception caught
  → markFailed(eventStoreId, error)
  → Return HTTP 500 (QStash sees failure)
  → QStash retries 3x (exponential backoff)
  → If still failed after 3 attempts:
    ├─ Event marked 'failed' in event_store
    ├─ Dead-letter written to job_dead_letters
    └─ Retry daemon picks up at next 5-min run
  → Retry daemon re-dispatches via QStash
    ├─ event.retry_count increments
    ├─ Stops after max_retries (critical=10, normal=5)
    └─ Marked 'failed' if max retries exceeded
```

**BOUNDARIES:**
- Ingestion boundary: event_store WAL (hard boundary, hard fail)
- Delivery boundary: Worker ACK (explicit markCompleted required)
- Retry boundary: event_store retry_count (monotonic, max-enforced)
- State boundary: sync_status (atomic transaction)
- Authority boundary: CMO single authority (no concurrent scoring)

**CLASSIFICATION: DURABLE**
- WAL protects ingestion (no event lost)
- Worker ACK protects delivery (delivery tracked)
- Retry mechanism (event_store retry_count)
- Zoho idempotency (mobile/email dedup)

---

### Workflow 2: Contact Inquiry Delivery

**INGESTION:**
```
User contact form submit
  → POST /api/contact
  → Create contact_inquiries row
  → handleEvent('contact_created', { contactId })
  → writeEvent (event_store WAL, same as lead)
  → Policy gate: queue_paused check
  → Publish to QStash
    └─ Target: /api/workers/contact-sync
```

**DELIVERY:**
```
QStash triggers: POST /api/workers/contact-sync { contactId }
  → Load contact from contact_inquiries
  → Update sync_status → 'processing' (atomic)
  → Sync to Zoho:
    ├─ POST /crm/v2/Leads (same as lead endpoint)
    └─ No explicit deduplication on contact (relies on mobile/email)
  → POST-EXECUTION consistency check
    ├─ Verify sync_status='completed' after update
    └─ Log if inconsistency detected
  → markCompleted(eventStoreId)
  → Return HTTP 200
```

**DIFFERENCES FROM LEAD WORKFLOW:**
- No CMO executive (no scoring)
- No lead_hot emission (not a hot lead type)
- Direct Zoho sync (no intermediate steps)
- Consistency check explicitly validated

**CLASSIFICATION: DURABLE**
- Same WAL protection as lead
- Same worker ACK requirement
- Same retry escalation
- Same Zoho idempotency

---

### Workflow 3: Page Generation (Pagegen)

**INGESTION:**
```
Bulk planner job OR manual trigger
  → POST /api/admin/bulk-start (admin trigger)
  → Create generation_queue rows (one per page)
  → handleEvent('pagegen_requested', { queueId, pages: [...] })
  → writeEvent (event_store WAL)
  → Policy gate:
    ├─ Check pagegen_enabled flag
    ├─ Check bulk_generation_enabled
    ├─ Check queue_paused
    └─ Block if any violated
  → Publish to QStash
    └─ Target: /api/jobs/pagegen
```

**DELIVERY:**
```
QStash triggers: POST /api/jobs/pagegen { queueId, pages }
  → For each page:
    ├─ Validate page_type and content_level
    ├─ Call generateAiContent (Gemini)
    │  ├─ Primary model: gemini-2.0-flash
    │  ├─ Fallback: gemini-2.5-flash-lite
    │  └─ Returns null on persistent failure
    ├─ If content generated:
    │  ├─ Create/update page_index row
    │  ├─ Set status='published'
    │  └─ Emit pagegen_complete event
    └─ If null (AI failure):
    │  ├─ Skip page (no error)
    │  └─ Log to observability_logs
  → markCompleted(eventStoreId)
```

**RETRY_ESCALATION:**
```
If pagegen fails:
  → Event marked 'failed' in event_store
  → Retry daemon picks up (max 5 retries for normal)
  → On retry:
    ├─ Skip pages already published
    ├─ Retry unpublished pages only
    └─ Increments retry_count
```

**CLASSIFICATION: DURABLE_WITH_SOFT_FAILURE**
- WAL protects ingestion
- Worker ACK protects delivery
- Soft AI failures don't hard-block (graceful skip)
- Retry mechanism works but AI failures are idempotent

---

## WORKFLOW EVOLUTION RISKS

### Risk 1: Cross-Workflow Amplification

**Current risk:**
- lead_created → CMO scores → lead_hot (if hot)
- lead_hot → CSO escalates (future: to agent)
- If lead_hot emission fails silently, CSO doesn't escalate

**Future risk if orchestration expanded:**
- If lead_hot can trigger contact_created
- If contact_created can trigger lead_hot (loop)
- Without explicit idempotency keys, escalation cascade possible

**Mitigation:**
- ✅ Explicit idempotency_keys per workflow step
- ✅ Orchestration-level duplicate detection (not just provider-level)
- ✅ Hard-coded workflow boundaries (no auto-propagation)

---

### Risk 2: Multi-Workflow Authority Leakage

**Current state:**
- Each workflow has single authority (CMO for lead, COO for contact)
- Authority enforced by trigger map (static)

**Future risk if trigger map becomes dynamic:**
- Runtime workflow routing could leak authority
- Multiple authorities could claim same workflow
- Execution order ambiguity

**Mitigation:**
- ✅ Keep trigger map static (deployment-time configuration)
- ✅ Explicit orchestration policy (if routing becomes dynamic)
- ✅ Single authority per event type (no concurrent executors)

---

### Risk 3: Replay Amplification

**Current state:**
- Replay is safe at event level (per-provider idempotency)
- But replay could emit new events (lead_hot)
- If lead_hot emits contact_created, chain reaction

**Future risk:**
- Replay of workflow A emits event for workflow B
- Event B's replay emits event for workflow A (loop)
- Exponential amplification without circuit breaker

**Mitigation:**
- ✅ Explicit replay boundaries per workflow
- ✅ Idempotency keys track replay lineage (correlation_id)
- ✅ Stuck event detection prevents infinite loops

---

## WORKFLOW EXECUTION ISOLATION

### Isolation Boundaries

| Boundary | Current State | Isolation | Risk |
|---|---|---|---|
| Event ingestion | event_store WAL | Hard boundary (blocking) | LOW |
| Event dispatch | QStash message ID | Medium boundary (external) | MEDIUM |
| Worker execution | 10-second timeout | Medium boundary (time-based) | MEDIUM |
| Zoho sync | mobile/email dedupe | Provider boundary (external) | MEDIUM |
| State machine | sync_status column | Soft boundary (transactional) | MEDIUM |
| CMO authority | Single executor | Policy boundary (implicit) | MEDIUM |
| Retry escalation | event_store retry_count | Soft boundary (row-based) | MEDIUM |

### Isolation Validation

**Hard Boundaries (PASS):**
- ✅ Event_store WAL (blocking before dispatch)
- ✅ Policy engine (gates before QStash publish)
- ✅ Worker ACK requirement (explicit markCompleted)

**Soft Boundaries (PARTIAL):**
- ⚠️ Timeout guardrails (10-second worker timeout)
- ⚠️ Observability-only failures (CMO logging non-blocking)
- ⚠️ Retry escalation (event_store retry_count soft boundary)

---

## WORKFLOW DURABILITY MATRIX

| Workflow Aspect | Durability | Risk | Mitigation |
|---|---|---|---|
| Event ingestion | DURABLE (WAL blocking) | LOW | None needed |
| Event dispatch | DURABLE (QStash message ID) | MEDIUM | External queue dependency |
| Worker execution | DURABLE (worker ACK) | MEDIUM | Timeout guardrails active |
| CMO routing | PARTIALLY_DURABLE (non-blocking) | MEDIUM | Observability logging |
| Zoho sync | DURABLE (Zoho idempotency) | MEDIUM | Provider dependency |
| Event retry | DURABLE (event_store state) | MEDIUM | Retry daemon cron dependency |
| Telemetry | PARTIALLY_DURABLE (non-blocking logs) | MEDIUM | Silent observability failure possible |
| State machine | DURABLE (transactional updates) | LOW | None needed |

---

## WORKFLOW REPLAY SAFETY MATRIX

| Workflow Step | Replay Safety | Idempotency | Risk |
|---|---|---|---|
| Event creation | SAFE | Event ID deduplication | LOW |
| Lead creation | SAFE | Zoho mobile/email dedup | LOW |
| Contact creation | SAFE | Zoho mobile/email dedup | LOW |
| CMO scoring | SAFE | Calling code (not durable) | MEDIUM (re-executed on replay) |
| Lead_hot emission | PARTIALLY_SAFE | No dedupe (can emit duplicates) | MEDIUM (CSO could see duplicate escalations) |
| Pagegen execution | SAFE | page_index primary key | LOW (duplicate publishes caught by DB) |
| Event_retry | SAFE | event_store retry_count monotonic | LOW |

**REPLAY_SAFETY_SUMMARY:**
- Single-workflow replay: SAFE (provider-level idempotency)
- Cross-workflow replay: PARTIALLY_SAFE (orchestration-level idempotency missing)
- Amplification replay: UNSAFE (could trigger duplicate events)

---

## WORKFLOW GOVERNANCE AUTHORIZATION

**CURRENT_WORKFLOWS_AUTHORIZATION: SAFE**
- Event ingestion protected by WAL
- Worker execution gated by policy + timeout
- Replay mechanism durable and bounded
- Authority boundaries explicit (trigger map)

**FUTURE_WORKFLOW_EVOLUTION_AUTHORIZATION: DOWNGRADE IF**
- ❌ Cross-workflow orchestration added without idempotency
- ❌ Trigger map becomes dynamic (runtime routing)
- ❌ CMO authority expanded to multiple executors
- ❌ Replay boundaries not preserved per-workflow

**FUTURE_WORKFLOW_TIMELINE:**
1. Current: Static trigger map → static workflows
2. Future: Extensible trigger map + explicit boundaries
3. Future: Dynamic workflow routing (if abstraction layer added)
4. NEVER: Unrestricted orchestration (auto-propagation forbidden)
