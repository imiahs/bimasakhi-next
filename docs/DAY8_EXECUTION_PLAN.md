# DAY 8 EXECUTION PLAN: Phase 2 (Data Trust) Finalization

---

## 1. Objective

Complete Phase 2 (Data Trust) by deploying a **production-grade Telemetry Event Ingestion Pipeline**.

In Phase 1, database schemas (including `sessions` and `event_stream`) were defined. Now, we activate the **data plane** by routing all frontend behavioral data into a **server-authoritative ingestion system**.

---

## 2. Core Philosophy (Non-Negotiable)

- ❌ No client-side truth
- ❌ No synthetic / random data
- ❌ No silent invisible failures

- ✅ Server is the source of truth
- ✅ Every event is auditable
- ✅ Every metric maps to stored rows

---

## 3. What We Are Building

### 3.1 Telemetry Ingestion API

A fault-tolerant ingestion endpoint: `app/api/events/route.js`

Responsible for:
- Receiving telemetry payloads
- Validating event contracts
- Managing session identity
- Persisting events into Supabase

### 3.2 Stable Session Identity System

- Generate `session_id` on client (UUID)
- Persist in `localStorage` as: `bimasakhi_session_id`
- Server validates and upserts session

👉 **Rule:**
> Client proposes identity, server confirms identity

### 3.3 Refactored Analytics Service

Update: `services/analytics.js`

- Send telemetry to GTM (if exists) AND ingestion API (mandatory)

### 3.4 Analytics Tracker Initialization

Update: `components/core/AnalyticsTracker.jsx`

On mount:
- Initialize session
- Emit `session_started` and `page_view`
- Ensure it runs once only with no duplicate firing

---

## 4. Event Contract (STRICT)

All events MUST follow:

```ts
type TelemetryEvent = {
  session_id: string
  event_type: string
  event_name: string
  payload?: object
}
```

### Allowed Event Types (Explicit List)

- `session_started`
- `page_view`
- `cta_clicked`
- `form_submit_attempted`
- `form_submit_succeeded`
- `form_submit_failed`

---

## 5. Backend Design

The backend ingestion contract handles dual-writes safely:
- **Session Upsert:** Validates if the `session_id` exists. If not, it explicitly inserts a new `sessions` ledger record utilizing the extracted `user_agent` and HTTP request details.
- **Event Append:** Appends immutable, time-stamped records to the `event_stream` table.

---

## 6. Failure Handling (MANDATORY)

- **202 Accepted Behavior:** The endpoint must wrap all Supabase interactions in a `try/catch` block. If the database goes offline or fails, the endpoint will silently catch the error and still return a `202 Accepted` status to prevent catastrophic frontend client cascading failures.
- **Logging Requirement:** All swallowed database drops MUST be logged to standard output (or `observability_logs`) so failure observability remains high.
- **NO silent invisible failures:** The frontend is protected, but the backend must visibly log the incident.

---

## 7. Telemetry Dispatch Strategy

The analytics service will implement the following network strategy to guarantee delivery:
- **Primary:** `navigator.sendBeacon()` ensures telemetry dispatched right before page unloads survives tab closures.
- **Fallback:** `fetch(url, { keepalive: true })` used if beacon is unavailable or payload size requires standard fetch.

---

## 8. Data Validation

- **`sessions` table check:** Supabase must record the `session_id`, `user_agent`, `ip_address`, and `created_at`.
- **`event_stream` table check:** Supabase must record the `session_id`, `event_type`, `event_name`, strict `payload` JSON construct, `ip_address`, `user_agent`, and a server-stamped `created_at`.

---

## 9. QA Validation

Step-by-step test cases to verify post-deployment:
1. **Session start:** Clear `localStorage`. Open site. Verify `bimasakhi_session_id` is created and `session_started` appears in the Supabase DB.
2. **Page view:** Navigate to a new route. Verify `page_view` event appears in the DB with the updated `route_path`.
3. **CTA click:** Click "Apply Now". Verify `cta_clicked` event lands in the DB.
4. **Form submission:** Submit a contact or lead form. Verify `form_submit_attempted` and `form_submit_succeeded` sequentially land in the DB. Ensure `session_id` ties them all together.

---

## 10. Definition of Done

Phase 2 is considered formally complete when:
- [x] `app/api/events/route.js` is live and returns `202 Accepted`.
- [x] `services/analytics.js` utilizes beacon/keepalive fetch (with `text/plain` blob for beacon reliability).
- [x] Live traffic populates `sessions` and `event_stream` tables in Supabase completely accurately.
- [x] NO duplicate `session_started` triggers fire consecutively on a single hard reload (checked at db level).
- [ ] Event ingestion success rate ≥ 99%

---

## 11. Strict Boundaries

**DO NOT TOUCH the following domains during this phase:**
- CRM
- AI
- Queue
- Admin
- SEO

---

## 12. Outcome

By completing Day 8, **Phase 2 is fully closed**. 
The repository will be uniquely primed to enter **Phase 3 (Flow Completion)** — allowing us to shatter the monolithic CRM handler logic into beautifully decoupled, reliable `domain` services (Leads vs Contacts) and `Queue Workers`. Because our telemetry trust layer will be firmly in place, any modifications in Phase 3 and 4 will be 100% auditable and measurable.
