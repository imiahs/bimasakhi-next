# PHASE-7: Provider Registry Foundation Analysis

**Date:** May 20, 2026  
**Scope:** Detailed provider registry topology mapping and authority classification  
**Authority:** PHASE-7 Step 1 verification

---

## 1. PROVIDER INVENTORY VERIFICATION

### 1.1 Active Providers at Runtime

**Gemini AI (PRIMARY)**
- **Evidence:** `lib/ai/generateContent.js` lines 45-120 (primary model instantiation)
- **Authority:** Hardcoded execution path for all pagegen and admin AI routes
- **Fallback:** Gemini 2.5-flash-lite (same-vendor fallback in generateContent wrapper)
- **Credential:** `GOOGLE_GENAI_API_KEY` from ENV
- **Health Probe:** `lib/system/healthcheck.js` checks quota via cost guard
- **Risk:** PROVIDER_COUPLED — no alternative provider in active generation path

**QStash Queue (PRIMARY)**
- **Evidence:** `lib/queue/publisher.js` lines 1-50 (singleton QSTASH_TOKEN)
- **Authority:** Only queue option for async dispatch
- **Fallback:** None (no alternative queue configured)
- **Credential:** `QSTASH_TOKEN` from ENV
- **Health Probe:** Implicit via publish success/failure
- **Risk:** SINGLE_QUEUE_ONLY — no backup queue

**Zoho CRM (PRIMARY)**
- **Evidence:** `pages/api/crm/[action].js` POST handler (hardcoded Zoho calls)
- **Authority:** Only CRM destination for lead sync
- **Fallback:** None (no multi-CRM support)
- **Credential:** `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET` from ENV
- **Health Probe:** `lib/monitoring/vendorHealth.js` tracks sync failures
- **Risk:** SINGLE_DESTINATION — no alternative CRM

**Supabase PostgreSQL (PRIMARY)**
- **Evidence:** `lib/supabase.js` (singleton client)
- **Authority:** All persistent state storage
- **Fallback:** None (no read replicas or failover)
- **Credential:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY` from ENV
- **Health Probe:** Connection timeouts implicit
- **Risk:** SINGLE_POINT_OF_FAILURE — no database redundancy

**Telegram (SECONDARY)**
- **Evidence:** `lib/messaging/telegram.js` (structurally complete)
- **Authority:** Alert delivery to Telegram channels
- **Fallback:** Email (configured but not activated)
- **Credential:** `TELEGRAM_BOT_TOKEN` from ENV
- **Health Probe:** Delivery attempt tracking only
- **Risk:** SECONDARY_UNCONFIRMED — live testing not completed

**OpenAI (ABANDONED)**
- **Evidence:** `lib/ai/providers/openai.js` (physically present but unused)
- **Authority:** Non-authoritative; Gemini is exclusive runtime choice
- **Credential:** `OPENAI_API_KEY` from ENV (present but unused)
- **Risk:** ABANDONED_PHYSICALLY_PRESENT — code debt

---

## 2. PROVIDER REGISTRY AUTHORITY MODEL

### 2.1 Authority Layering

| Layer | Implementation | Risk Level | Validation |
|---|---|---|---|
| **Registration** | `vendor_contracts` table + admin config | SAFE | VALIDATED_BOUNDED |
| **Activation** | Feature flags + route-level checks | MEDIUM | PARTIALLY_FRAGMENTED |
| **Execution** | Hardcoded provider calls | MEDIUM-HIGH | PROVIDER_COUPLED |
| **Fallback** | Provider-local implicit logic | HIGH | AUTHORITY_FRAGILE |
| **Rollback** | Deployment revert (Vercel) | LOW | VALIDATED_DURABLE |
| **Visibility** | SLA snapshots + observability logs | MEDIUM | PARTIALLY_VALIDATED |

### 2.2 Provider Authority Validation Matrix

| Authority Lane | Current Implementation | Boundaries | Risk | Validation Outcome |
|---|---|---|---|---|
| Registration authority | vendor_contracts table and admin-managed config | Bounded to config surfaces | Low | VALIDATED_BOUNDED |
| Activation authority | mixed runtime toggles and route-level controls | Fragmented | Medium | PARTIALLY_VALIDATED |
| Execution authority | provider calls in route/service logic | Not centrally abstracted | Medium-High | PARTIALLY_VALIDATED |
| Fallback authority | provider-local fallback logic in execution paths | Weak central governance | High | AUTHORITY_FRAGILE |
| Rollback authority | deployment rollback + durable DB state | Strong | Low | VALIDATED_DURABLE |
| Visibility authority | observability and SLA snapshots | Best-effort telemetry | Medium | PARTIALLY_VALIDATED |

---

## 3. PROVIDER BOUNDARY VALIDATION

### 3.1 Rollback Isolation

**Deployment Revert (Vercel 1-click)**
- ✅ Provider credential ENV vars unchanged (Vercel secrets preserved)
- ✅ Provider registration logic unchanged (hardcoded routes revert)
- ✅ Fallback policy unchanged (same-vendor implicit preserved)
- ✅ Feature flags unchanged (system_control_config table survives)

**VALIDATION OUTCOME:** ROLLBACK_SURVIVABLE

### 3.2 Replay Isolation

**Event Replay (Retry Daemon)**
- ✅ QStash message IDs tracked in external_delivery_logs
- ✅ Event retry state tracked in event_store with retry_count
- ✅ Provider execution is deterministic (same provider for same event)
- ⚠️ Provider unavailability can cause replay failure (no automatic fallback)
- ⚠️ Provider model changes between replays could cause divergence

**VALIDATION OUTCOME:** REPLAY_PARTIALLY_SURVIVABLE

### 3.3 Deployment Continuity

**Atomic Deployment Sequence**
- ✅ Provider registration changes don't affect execution routing (static until feature gate change)
- ✅ Provider credential updates don't break existing routes (ENV-based, no in-code change)
- ✅ Provider health updates don't block deployment (observability-only)

**VALIDATION OUTCOME:** DEPLOYMENT_CONTINUITY_PRESERVED

---

## 4. PROVIDER EXTENSIBILITY BOUNDARIES

### 4.1 Safe To Design (Planning Mode Only)

**Allowed Planning Scope:**
- ✅ Create provider registry data model (table schema design)
- ✅ Document provider capability constraints
- ✅ Define provider fallback policy structure
- ✅ Map provider-to-task relationships
- ✅ Design provider health probe scheduling

**NOT ALLOWED IN PHASE-7:**
- ❌ Runtime provider switching logic
- ❌ Automatic fallback activation
- ❌ Multi-provider orchestration layer

---

## 5. AUTHORITY FRAGILITY ZONES

### Zone 1: Fallback Policy Authority Implicit

**Current State:** Fallback logic hardcoded (gemini-2.0-flash → gemini-2.5-flash-lite)

**Future Remediation Required:** Explicit fallback policy registry

### Zone 2: Provider Model Selection Non-Authoritative

**Current State:** Model names hardcoded as strings

**Future Remediation Required:** Model registry with capability constraints

### Zone 3: Multi-Provider Fallback Undefined

**Current State:** Only same-vendor fallback (Gemini only)

**Future Remediation Required:** Cross-vendor fallback policy (if authorized in future phase)

---

## 6. CLASSIFICATION OUTCOME

**PROVIDER REGISTRY CLASSIFICATION: FOUNDATION_SAFE_FOR_PLANNING**

| Boundary Requirement | Status | Evidence |
|---|---|---|
| Rollback isolation | Preserved | Durable config + deployment rollback continuity |
| Bounded execution authority | Partial | Execution still partly provider-local |
| Replay isolation | Partial | Durable core state, partial telemetry detail |
| Deployment continuity | Preserved | Canonical site lock and bounded dispatch path |

Boundary classification: PARTIALLY_BOUNDED

---

## Fragility Checks

| Fragility Type | Present | Severity | Note |
|---|---|---|---|
| Provider-local orchestration risk | Yes | Medium | Fallback logic still embedded in provider-adjacent code |
| Hidden provider recursion risk | Partial | Medium | Retry/fallback layering can compound without central guardrail |
| Activation ambiguity | Yes | Medium | Activation lane not fully centralized |
| Rollback ambiguity | No | Low | Rollback lane remains deterministic |
| Capability-authority escalation risk | Yes | Medium | Registry visibility can be misread as execution authority |

---

## Validation Decision

Provider registry governance is implementation-foundation ready only in bounded mode.

Final classification:
- Provider registry foundation: PARTIALLY_SAFE
- Provider authority model: PARTIALLY_SAFE with AUTHORITY_FRAGILE fallback lane
- Boundary state: PARTIALLY_BOUNDED

Operational rule preserved:
Registry visibility is not execution authority.
