# Fix: C26 Delivery Layer

**Date:** 2026-04-27  
**Author:** CTO (Agent)  
**Bible Reference:** Section 39, Section 40, Rule 25  
**Status:** RESOLVED LIVE

## Context

Before C26, the system could prove that a QStash publish returned a message id, but it could not yet prove durable delivery truth from the provider lifecycle itself.

That left a gap between:

1. enqueue accepted
2. provider actually delivered, retried, failed, or cancelled
3. admin/health surfaces showing the same truth

The user directive required closing that exact gap without modifying existing working pipeline logic and without breaking the Rule 16 transactional boundary.

## Root Gap

The missing layer was not publish itself. The missing layer was provider truth after publish.

Specifically, the system lacked:

- a first-class delivery ledger for external dispatches
- provider-state sync after publish
- durable attempt history and retry visibility
- direct linkage from provider message id to `event_store` and `generation_queue`
- an admin surface to query and sync delivery truth
- health metrics driven by delivery truth rather than by optimistic publish assumptions

## Implemented Change Set

### 1. Database truth layer

Added migration:

- `supabase/migrations/20260427090000_c26_external_delivery_truth.sql`

This creates `public.external_delivery_logs` with the fields needed for delivery truth:

- `provider_message_id`
- `status`
- `event_store_id`
- `generation_queue_id`
- `provider_message`
- `latest_event`
- `attempt_history`
- `attempt_count`
- `provider_retry_count`
- `published_at`
- `delivered_at`
- `failed_at`
- `last_sync_at`

### 2. Runtime delivery truth helper

Added the core delivery-truth layer in:

- `lib/queue/deliveryTruth.js`

Key responsibilities:

- `recordExternalDelivery(...)`
  - writes the initial provider message id and linkage immediately after QStash publish
- `syncExternalDelivery(messageId)`
  - reads real QStash message/log state
  - maps provider states into canonical internal statuses
  - persists provider message payload, latest event, attempt history, retries, and terminal timestamps
- `syncPendingExternalDeliveries(...)`
  - polls active or unknown deliveries for reconciliation
- `getDeliveryHealthMetrics(...)`
  - computes `delivery_failures_recent`, `delivery_stuck_count`, `delivery_success_rate`, `delivery_terminal_recent`, and `delivery_delivered_recent`

### 3. Event linkage at publish time

The existing dispatch paths now write delivery truth immediately after publish instead of stopping at QStash acceptance.

Important behavior:

- QStash message id is captured from the provider response
- the delivery ledger keeps direct linkage to both `event_store` and `generation_queue`
- no existing transactional ownership in `event_store` was replaced or bypassed

This preserves Rule 16 ownership boundaries while adding provider-truth observability on top.

### 4. Admin delivery API

Added required admin surface:

- `app/api/admin/delivery-logs/route.js`

Capabilities:

- list delivery rows
- filter by status, event id, queue id, and message id
- sync one message or sync pending deliveries
- return delivery health metrics with the dataset

### 5. Delivery sync route

Added sync endpoint for QStash-driven or scheduled reconciliation:

- `app/api/jobs/delivery-sync/route.js`

This gives the system a dedicated surface to update provider truth outside the original publish response.

### 6. Health integration

Integrated delivery truth into:

- `lib/system/systemHealth.js`

Health now surfaces:

- `delivery_failures_recent`
- `delivery_stuck_count`
- `delivery_success_rate`
- `delivery_terminal_recent`
- `delivery_delivered_recent`

That means admin health warnings now come from the same delivery ledger used by the delivery admin API.

### 7. Live audit harness

Added dedicated proof runner:

- `scripts/audit/audit-c26-delivery-truth.mjs`

The harness performs all required live proofs:

- real delivered path
- real failure path
- retry observability proof
- admin/health metric proof
- post-proof cleanup

For the synthetic failure path, the harness uses a real QStash cancel on the synthetic retrying message after retry evidence is already captured. That produces terminal provider truth without waiting through a long retry backoff window and without changing the production pipeline logic.

## Verification

### Local and rollout validation

- `npm run build` => PASS
- `npm run db:check-drift` => only C26 pending before apply
- `npm run db:migrate` => PASS
- `npm run predeploy:check` => PASS
- `vercel --prod --yes` => PASS

### Authoritative live proof

Passing artifact:

- `scripts/audit/results/2026-04-27T06-47-08-312Z-c26-delivery-truth-proof.json`

What the live artifact proves:

1. real `contact_created` dispatch reached `delivered`
2. real `lead_hot` failure produced provider retry history and durable failure visibility
3. provider cancel transitioned the synthetic failure message to terminal `cancelled` truth
4. `event_store` and `generation_queue` linkage remained intact
5. `/api/admin/delivery-logs` metrics matched `/api/admin/system/health`
6. no silent failure remained hidden behind a publish-only success signal

### Post-proof cleanup verification

After cleanup, live admin truth returned to normal:

- `delivery_failures_recent = 0`
- `delivery_stuck_count = 0`
- `delivery_success_rate = 100`
- `/api/admin/system/health` returned `overall_health = HEALTHY`

## Outcome

C26 is resolved live.

What changed operationally:

1. external dispatches now have a durable provider-truth ledger
2. delivery retries and failures are observable instead of implied
3. admin and health surfaces now report the same delivery truth
4. proof no longer depends on enqueue acceptance alone

This closes the C26 delivery truth gap without changing the core working dispatch pipeline and without violating Rule 16 transactional ownership.

Remaining locked open work is now:

1. C29 - Phase 14 Code Visibility Layer 4
2. C30 - Phase 14 Content Version History