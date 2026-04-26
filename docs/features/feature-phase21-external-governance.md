# Feature: Phase 21 — External System Governance

| Field | Value |
|---|---|
| **Phase** | 21 |
| **Bible Section** | 39 |
| **Bible Rules** | 20-24 |
| **Priority** | A (MANDATORY) |
| **Status** | ✅ COMPLETE |
| **Commit** | e1ccc19 |
| **Date** | 2026-04-18 |

## What Was Built

### 1. Vendor Resilience Layer (`lib/vendorResilience.js`)
- Per-vendor circuit breaker with configurable failure thresholds
- Exponential backoff retry with jitter
- Request timeout enforcement
- SLA snapshot recording on every call
- Config loaded from `vendor_contracts` table (falls back to defaults)
- Functions: `withVendorResilience()`, `isVendorCircuitOpen()`, `recordVendorSuccess/Failure()`, `getAllVendorStates()`, `getSlaSummary()`

### 2. SLA Monitoring (`sla_snapshots` table + health check cron)
- Periodic health checks via `/api/jobs/vendor-health-check`
- Tracks: Supabase latency, DLQ depth, error rate (5-min window)
- Warning/critical thresholds per metric
- Vendor contract health status updates

### 3. Alert Delivery Tracking (`alert_deliveries` table)
- Every alert notification persisted with channels attempted/delivered
- Delivery status: pending → partial → delivered → failed
- Severity mapping: critical→P0, high→P1, medium→P2, info→P3
- Escalation scheduling: P0=5min, P1=15min

### 4. DLQ Consumer (`/api/admin/dlq`)
- View all dead letter entries with pagination
- Reprocess: creates new job_run from dead letter payload
- Discard: removes entry with audit log

### 5. Vendor Health Dashboard (`/admin/system/health`)
- Overall system health banner (mode, circuits, DLQ, alerts)
- Per-vendor cards: health status, circuit state, retry config, SLA thresholds
- SLA summary table (last hour aggregation)
- Auto-refresh every 30 seconds

### 6. DLQ Management UI (`/admin/system/dlq`)
- Dead letter list with reprocess/discard buttons
- Payload inspection via expandable details
- Real-time count badge

## Vendor Contracts Seeded

| Vendor | Criticality | CB Threshold | SLA Warning | SLA Critical | Retries |
|---|---|---|---|---|---|
| Supabase | Critical | 5 fails / 2min | 100ms | 500ms | 2x |
| Vercel | Critical | 5 fails / 2min | 500ms | 2000ms | 2x |
| QStash | Critical | 5 fails / 2min | 5000ms | 30000ms | 3x |
| Zoho | Important | 5 fails / 5min | 2000ms | 5000ms | 3x |
| Gemini | Important | 3 fails / 5min | 10000ms | 30000ms | 2x |

## What Already Existed (Not Modified)
- `lib/system/circuitBreaker.js` — Tool-level circuit breaker (generic)
- `lib/system/systemModes.js` — normal/degraded/emergency modes
- `lib/monitoring/alertSystem.js` — Alert rules + notification (enhanced with delivery tracking)
- `lib/monitoring/runbooks.js` — Auto-remediation playbooks
- `lib/system/backpressure.js` — Green/yellow/red pressure levels
