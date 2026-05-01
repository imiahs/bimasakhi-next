# Migration: 038_external_system_governance.sql

| Field | Value |
|---|---|
| **Migration ID** | 038 |
| **Schema ID** | 63 |
| **Date** | 2026-04-18 |
| **Phase** | 21 (External System Governance) |
| **Bible Section** | 39, Rules 20-24 |
| **Status** | EXECUTED |

## Tables Created

### sla_snapshots
Per-vendor SLA monitoring with time-series data.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| service | TEXT | Vendor name (supabase, qstash, etc.) |
| metric | TEXT | What's being measured (health_check, error_rate, etc.) |
| value | NUMERIC | Measured value |
| threshold_warning | NUMERIC | Warning threshold |
| threshold_critical | NUMERIC | Critical threshold |
| status | TEXT | normal/warning/critical |
| sample_size | INTEGER | Number of samples |
| window_minutes | INTEGER | Measurement window (default 5) |
| measured_at | TIMESTAMPTZ | When measured |

### alert_deliveries
Track every alert notification across channels.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| alert_type | TEXT | Rule ID that triggered alert |
| severity | TEXT | P0/P1/P2/P3 |
| message | TEXT | Alert message |
| context | JSONB | Additional data |
| channels_attempted | TEXT[] | Which channels were tried |
| channels_delivered | TEXT[] | Which channels succeeded |
| delivery_status | TEXT | pending/partial/delivered/failed |
| acknowledged | BOOLEAN | Has someone acked this? |
| escalation_level | INTEGER | Current escalation level |
| next_escalation_at | TIMESTAMPTZ | When to escalate next |

### vendor_contracts
Formal vendor configuration and thresholds.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| vendor | TEXT UNIQUE | Vendor name |
| purpose | TEXT | What vendor does |
| criticality | TEXT | critical/important/nice_to_have |
| cb_failure_threshold | INTEGER | Failures before circuit opens |
| cb_reset_timeout_seconds | INTEGER | How long circuit stays open |
| cb_window_minutes | INTEGER | Failure counting window |
| sla_response_warning_ms | INTEGER | Response time warning |
| sla_response_critical_ms | INTEGER | Response time critical |
| retry_max_attempts | INTEGER | Max retry count |
| retry_base_delay_ms | INTEGER | Base delay between retries |
| retry_backoff_multiplier | NUMERIC | Exponential backoff factor |
| circuit_state | TEXT | closed/open/half_open |
| health_status | TEXT | healthy/degraded/down/unknown |

## Seed Data
5 vendor contracts: supabase (critical), vercel (critical), qstash (critical), zoho (important), gemini (important)
