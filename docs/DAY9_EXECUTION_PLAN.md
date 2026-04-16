# DAY 9 EXECUTION PLAN: Phase 3 (Flow Completion & System Decoupling)

---

## 1. Objective

Shatter the monolithic lead generation architecture.
In Phase 2, we established **Data Trust** (telemetry & data truth). Phase 3 utilizes that foundation to permanently decouple public API routes from fragile, synchronous external dependencies (Zoho CRM, Email).

**Goals for Phase 3:**
1. Separate Domain Logic (`Leads` vs `Contacts`).
2. Make external operations (like CRM syncing) **100% Asynchronous**.
3. Guarantee sub-200ms API response times.
4. Introduce a Queue-driven worker system with Retry capabilities.

---

## 2. Core Philosophy (Non-Negotiable)

- ❌ No direct CRM/Email calls from frontend-facing API routes.
- ❌ No lost leads due to external provider timeouts.
- ❌ No mixing `Leads` (growth intent) with `Contacts` (support/inquiry intent).
- ✅ Frontend receives a lightning-fast response (<200ms).
- ✅ External sync happens via durable background job (QStash).
- ✅ Every job failure is tracked and automatically retried.

---

## 3. Architecture Transition

### Before (Fragile & Blocking)
`Frontend Form Submit` ➔ `Next.js API` ➔ `Zoho CRM Call (Waits 2-5 Seconds)` ➔ `Return Success/Fail to User`
*(If Zoho is down, the user sees an error and the lead is completely lost).*

### After (Resilient & Event-Driven)
`Frontend Form Submit` ➔ `Next.js API (Validates & Quick DB Save)` ➔ `Publish Job to QStash` ➔ `Return Success to User (<200ms)`
*(Async Worker silently picks up the QStash job behind the scenes, executes Zoho CRM sync, and handles retries if Zoho is down).*

---

## 4. Phase 3 Components to Build

### 4.1 Domain Layer Split
We must strictly separate ownership into isolated domain libraries.
- `lib/domain/leads/*`: Creation, Schema Validation, Processing.
- `lib/domain/contacts/*`: Simple Inquiries, Support processing.

### 4.2 Queue System Integration (QStash)
- `lib/queue/publisher.js`: Generic QStash publish utility.
- Route jobs based on domain context.

### 4.3 Async Worker Endpoints
Workers are internal APIs invoked exclusively by QStash.
- **Worker Security (CRITICAL):** All endpoints MUST implement QStash signature verification. Reject any payloads lacking a valid QStash signature.
- **Idempotency (CRITICAL):** Workers must NEVER process duplicate jobs. Before interacting with Zoho, the worker must check if `sync_status === 'completed'`. If yes, immediately skip execution.
- `app/api/workers/lead-sync/route.js`: Handles Zoho push.
- `app/api/workers/contact-sync/route.js`: Handles Email/System notifications.

### 4.4 Refactoring Existing API Routes (The Breakup)
Modify `app/api/public/lead/route.js` and `app/api/public/contact/route.js`.
- **Step 1:** Strip out all CRM API/Email logic.
- **Step 2:** **DB FIRST RULE:** Persist raw data securely into Supabase (`leads` or `contact_inquiries` tables) recording a status of `pending`.
- **Step 3:** Push the internal Supabase row ID into QStash. This MUST happen sequentially only after the DB insert succeeds.
- **Step 4:** Immediately respond 200 OK.

### 4.5 Observability & Retries (Resilience)
- Configure QStash with an exponential backoff policy (e.g., immediate, 30s, 2m, 5m).
- **No full DLQ.** We track abandoned jobs completely via the database: Update `sync_status = failed` and log the failure explicitly into `observability_logs`.
- Status lifecycle is strictly enforced: `pending` → `processing` → `completed` (or `failed`).

---

## 5. Execution Strategy

We will build Phase 3 incrementally across carefully isolated PR-like steps:

1. **Domain Extraction:** Create folder structures and extract validation logic for Leads & Contacts.
2. **Database Status Verification:** Ensure the `leads` table correctly tracks `sync_status` (pending, processing, completed, failed).
3. **Queue Publishers:** Create the Upstash/QStash payload logic.
4. **Worker Endpoints:** Build the endpoints that QStash will hit.
5. **The Switch (API Refactor):** Wire the frontend APIs to the DB and QStash publisher instead of the CRM directly.
6. **Live Execution & QA:** Perform full live tests simulating CRM downtime to test resilience.

---

## 6. Definition of Done & Live QA Plan

Phase 3 is complete only when our live checklist passes:

- [ ] **Performance:** API submission routes reliably resolve in **< 200ms**.
- [ ] **Decoupling:** `POST /api/...` natively writes only to database and QStash. No blocking fetch calls to Zoho.
- [ ] **Workers Alive:** `QStash` actively invokes our internal worker routes seamlessly.
- [ ] **Failure Handling Tested:** A simulated Zoho CRM crash successfully triggers a queued retry without dropping the lead.
- [ ] **Data Separation:** Leads and Contacts travel entirely separate backend pathways.
