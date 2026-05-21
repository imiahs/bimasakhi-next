# PHASE-7: Workflow Governance Foundation Analysis

**Date:** May 20, 2026  
**Scope:** Detailed workflow governance topology mapping and authority classification  
**Authority:** PHASE-7 Step 2 verification

---

## 1. WORKFLOW TOPOLOGY VERIFICATION

### 1.1 Core Workflow Lanes

**Lane 1: Event Ingestion → Dispatch → Execution**
- **Ingestion:** `POST /api/events` with WAL block
- **Dispatch:** QStash publish with message ID tracking
- **Execution:** External provider receives dispatch
- **Evidence:** `lib/events/eventStore.js`, `lib/queue/publisher.js`, `app/api/events/route.js`
- **Authority:** WAL-protected write-ahead log
- **Durability:** DURABLE (write-ahead log preserved)

**Lane 2: Lead Creation → Sync → Delivery**
- **Ingestion:** `POST /api/crm/create-lead`
- **Processing:** Lead deduplication + attribute enrichment
- **Dispatch:** `POST /crm/sync` to Zoho
- **Retry:** Failed leads queued in `failed_leads` table
- **Evidence:** `pages/api/crm/[action].js`, `lib/ai/leadRouter.js`
- **Authority:** Worker ACK required
- **Durability:** PARTIALLY_DURABLE (explicit retry queue)

**Lane 3: Page Generation → Publication**
- **Ingestion:** Bulk UI or auto-trigger queues task
- **Dispatch:** Job worker receives generation task
- **Execution:** Pagegen worker processes
- **Completion:** Queue row marked complete
- **Evidence:** `app/api/jobs/pagegen/route.js`, `lib/generation/index.js`
- **Authority:** Queue row state machine
- **Durability:** DURABLE (queue row state preserved)

**Lane 4: CMO Routing (Observability-Only)**
- **Trigger:** `lead_hot` event from scoring
- **Processing:** CMO scoring computation (non-blocking)
- **Output:** Observability log entry only
- **Evidence:** `lib/scoring/cmoRouter.js`
- **Authority:** Observability-only (no mutations)
- **Durability:** PARTIALLY_DURABLE (non-blocking writes can fail)

**Lane 5: Retry & Escalation (Daemon)**
- **Trigger:** Cron job every 5 minutes
- **Processing:** Event_store retry counter check
- **Decision:** Escalate to DLQ if max_retries exceeded
- **Evidence:** `app/api/jobs/event-retry/route.js`
- **Authority:** Retry daemon cron
- **Durability:** BOUNDED (per-event retry counter)

---

## 2. WORKFLOW REGISTRY AUTHORITY VALIDATION

### 2.1 Authority Layers

| Authority Layer | Current Implementation | Scope | Boundaries | Validation |
|---|---|---|---|---|
| **Registration** | `workflow_config` table (admin CRUD) | Workflow definitions | Super-admin gated | VALIDATED_BOUNDED |
| **Activation** | Feature flags + policy engine | Gate enforcement | Runtime checks | PARTIALLY_VALIDATED |
| **Retry Policy** | event_store retry_count + event-retry cron | Per-event retry | Configurable limit | VALIDATED_DURABLE |
| **Delivery** | QStash publish + external_delivery_logs | Async dispatch | Message ID tracking | PARTIALLY_VALIDATED |
| **Rollback** | Deployment revert + event_store survival | Workflow state | Durable tables | VALIDATED_DURABLE |
| **Observability** | event logs + health metrics | Best-effort visibility | Non-blocking writes | PARTIALLY_VALIDATED |

### 2.2 Workflow Authority Validation Matrix

| Authority Lane | Current Implementation | Boundaries | Risk | Validation Outcome |
|---|---|---|---|---|
| Registration authority | workflow_config CRUD (super_admin bounded) | Strong | Low | VALIDATED_BOUNDED |
| Activation authority | policyEngine plus runtime control flags | Partial | Medium | PARTIALLY_VALIDATED |
| Retry authority | event_store retry_count/max_retries and event retry flow | Strong | Low | VALIDATED_DURABLE |
| Delivery authority | qstash dispatch plus delivery sync surfaces | Partial | Medium | PARTIALLY_VALIDATED |
| Rollback authority | durable workflow state plus deployment rollback | Strong | Low | VALIDATED_DURABLE |
| Observability authority | best-effort logs and health aggregates | Partial | Medium-High | PARTIALLY_VALIDATED |

---

## 3. WORKFLOW DURABILITY VERIFICATION

### 3.1 Replay Survivability

**Scenario: Event Replay from Event Store**

| Step | Current Survivability | Verification |
|---|---|---|
| 1. Event row exists in event_store | ✅ SURVIVES | WAL-protected, rollback-survivable |
| 2. Event state is readable | ✅ SURVIVES | Event_store query returns full state |
| 3. Event retry counter is retrievable | ✅ SURVIVES | retry_count column persisted |
| 4. Event can be re-dispatched | ✅ SURVIVES | QStash publish is idempotent |
| 5. Provider processes duplicate message | ⚠️ PARTIAL | Depends on provider idempotency |
| 6. Event completion is recorded | ✅ SURVIVES | Updated event_store row |

**VALIDATION OUTCOME:** REPLAY_PARTIALLY_SURVIVABLE

### 3.2 Rollback Survivability

**Scenario: Deployment Revert**

- ✅ Event_store table survives revert (data-plane independent)
- ✅ Workflow_config table survives revert (data-plane independent)
- ✅ Feature flags survive revert (system_control_config preserved)
- ✅ Retry state survives revert (in-progress retries independent)
- ✅ Deployment rollback is 1-click in Vercel

**VALIDATION OUTCOME:** ROLLBACK_SURVIVABLE

### 3.3 Telemetry Continuity

**Observability Failure Scenarios:**

| Failure | Impact | Survivability |
|---|---|---|
| observability_logs write fails | Lost visibility only | SURVIVES (non-blocking) |
| event_store query times out | Retry daemon halts | PARTIAL (timeout-dependent) |
| health metrics unavailable | Dashboard blank | SURVIVES (non-critical) |
| CMO routing log missing | Observability gap | SURVIVES (read-only path) |

**VALIDATION OUTCOME:** TELEMETRY_PARTIALLY_DURABLE

---

## 4. WORKFLOW EXTENSIBILITY BOUNDARIES

### 4.1 Safe To Design (Planning Mode Only)

**Allowed Planning Scope:**
- ✅ Workflow registry enhancement (add fields, versioning)
- ✅ Workflow activation policy framework
- ✅ Retry policy per-workflow configuration
- ✅ Cross-workflow dependency documentation
- ✅ Observability enhancement (durable telemetry)

**NOT ALLOWED IN PHASE-7:**
- ❌ Workflow orchestration activation
- ❌ Automatic workflow routing
- ❌ Cross-workflow trigger chains
- ❌ Dynamic workflow composition

---

## 5. WORKFLOW GOVERNANCE FRAGILITY ZONES

### Zone 1: Cross-Workflow Amplification Not Bounded

**Current State:**
- lead_hot → CMO routing (observability-only, not bounded)
- lead_hot → CSO follow-up trigger (implicit routing)
- No explicit amplification limit

**Fragility Risk:**
- Under high load, workflow cascade can cause exponential events
- No automatic backpressure mechanism
- Replay amplification unbounded

**Future Remediation Required:**
- Explicit workflow chain depth limit
- Per-workflow rate limiting
- Observability for cascade detection

### Zone 2: Observability Authority Fragmented

**Current State:**
- CMO routing: non-blocking observability writes
- Event logs: best-effort updates
- Health metrics: non-blocking aggregation
- Retry visibility: durable (event_store)

**Fragility Risk:**
- Observability loss doesn't block runtime but prevents visibility
- Silent failures possible in non-blocking paths
- Auditing inconsistent across workflow lanes

**Future Remediation Required:**
- Durable telemetry for critical workflow events
- Explicit observability failure handling
- Cross-lane audit trail consistency

### Zone 3: Workflow Activation Authority Fragmented

**Current State:**
- Workflows activated via feature flags (ai_enabled, pagegen_enabled)
- Policy engine checks scattered across routes
- No centralized activation gate

**Fragility Risk:**
- Asymmetric activation checking (some routes missing)
- Silent disabling possible if feature flag corrupted
- No audit trail for activation changes

**Future Remediation Required:**
- Centralized workflow activation registry
- Explicit gate enforcement (no scattered checks)
- Activation change audit trail

---

## 6. WORKFLOW SURVIVABILITY MATRIX

| Scenario | Current Survivability | Durability | Recovery |
|---|---|---|---|
| **Provider timeout during dispatch** | Event escalates to DLQ | DURABLE | Retry daemon handles |
| **QStash publish failure** | Event queued locally | DURABLE | Sync on recovery |
| **Workflow config corruption** | Routes error out | PARTIAL | Manual config restore |
| **Retry daemon outage (30min)** | Events stuck in event_store | DURABLE | Daemon restart processes them |
| **Observability failure (24h)** | Silent loss, runtime continues | SURVIVES | Audit trail lost only |
| **Cross-workflow cascade** | Exponential event growth | UNBOUNDED | Manual intervention needed |

---

## 7. WORKFLOW BOUNDARY VALIDATION

### 7.1 Activation Boundary

**Current Implementation:**
- `ai_enabled` flag gates AI routes
- `pagegen_enabled` flag gates pagegen worker
- Policy engine enforces feature flags at route level

**Validation:**
- ✅ Boundary is enforced at route entry
- ✅ Boundary survives across deployments
- ⚠️ Not enforced at all workflow activation points
- ⚠️ No centralized activation registry

### 7.2 Retry Boundary

**Current Implementation:**
- Per-event retry counter in event_store
- Configurable max_retries per workflow
- DLQ escalation when max_retries exceeded

**Validation:**
- ✅ Retry boundary is durable
- ✅ Escalation is explicit and visible
- ✅ Boundary survives deployment revert
- ⚠️ Cross-workflow retry amplification not bounded

### 7.3 Delivery Boundary

**Current Implementation:**
- QStash message ID tracking
- external_delivery_logs table
- Sync mechanism for delivery state reconciliation

**Validation:**
- ✅ Delivery boundary is preserved
- ✅ Message ID tracking is durable
- ✅ Sync mechanism independent of workflow state
- ⚠️ Multi-delivery workflows not yet tested

---

## 8. CLASSIFICATION OUTCOME

**WORKFLOW GOVERNANCE CLASSIFICATION: DURABLE_WITH_GOVERNANCE_BOUNDARIES**

**Workflow governance is safe to extend with explicit registration and activation boundaries in planning mode** because:
- ✅ Core durability (event_store WAL) is proven
- ✅ Retry authority is bounded and durable
- ✅ Rollback continuity is independent of workflow state
- ✅ Observability-only paths don't block runtime

**NOT AUTHORIZED IN THIS PHASE:**
- ❌ Workflow orchestration activation
- ❌ Automatic workflow routing
- ❌ Cross-workflow dependency injection
- ❌ Dynamic workflow chain generation

**Three Fragility Zones Identified:**
- ⚠️ Cross-workflow amplification not bounded
- ⚠️ Observability authority fragmented
- ⚠️ Workflow activation authority fragmented

---

**End of PHASE-7 Workflow Governance Analysis**

## Workflow Evolution Risk Checks

| Risk Surface | Present | Severity | Note |
|---|---|---|---|
| Workflow recursion risk | Partial | Medium | Event chains can fan out if future activation widens without policy hardening |
| Retry amplification risk | Partial | Medium | Retry state is durable, but telemetry detail is partial |
| Replay amplification risk | Partial | Medium | Replay durability exists at state level, less at fine-grain trace level |
| Cross-workflow authority leakage | Partial | Medium | Shared control plane surfaces require stronger partitioning for future expansion |
| Rollback ambiguity | Low | Low | Durable ledger and deterministic rollback remain intact |

---

## Workflow Durability Model

| Durability Dimension | Status | Survivability |
|---|---|---|
| Replay survivability | PARTIAL | Core durable, telemetry detail partial |
| Rollback survivability | DURABLE | Independently survivable |
| Delivery continuity | PARTIAL | Bounded, provider/network dependent |
| Telemetry continuity | PARTIAL | Best-effort and non-blocking |

Durability classification: PARTIALLY_DURABLE

---

## Validation Decision

Workflow governance is implementation-foundation ready only in bounded mode.

Final classification:
- Workflow foundation: PARTIALLY_SAFE
- Workflow authority model: PARTIALLY_SAFE
- Workflow durability model: PARTIALLY_DURABLE

Operational rule preserved:
Workflow registration is not workflow orchestration.
