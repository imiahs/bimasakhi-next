# RC-1A — BASELINE RUNTIME SNAPSHOT
**Phase:** P2-RC Release Convergence + Runtime Governance  
**Date:** 2026-05-13  
**Method:** Cross-reference of all existing forensic documents (GEMINI_DEPENDENCY_ANALYSIS.md, QSTASH_OPERATIONAL_AUDIT.md, SUPABASE_RUNTIME_TRUTH.md, EXTERNAL_SYSTEM_FORENSICS.md, PRODUCTION_REALITY.md, system_control_config backup). No live DB queries executed for this snapshot — values sourced from forensic audit chain completed 2026-05-13.  
**Rules Applied:** INSPECT ONLY. Values sourced from evidence, not assumed.

---

## SNAPSHOT PURPOSE

This document captures the authoritative BEFORE state for all AI-relevant runtime metrics as of 2026-05-13. Any future recovery action should be measured against this baseline.

---

## SYSTEM CONFIGURATION STATE

| Config Key | Value | Source | Date Confirmed |
|-----------|-------|--------|---------------|
| `ai_enabled` | `true` | Backup: `backups/2026-05-04T06-15-09-082Z/system_control_config.json` line 5 | 2026-05-04 |
| `queue_paused` | `false` | PRODUCTION_REALITY.md (production state) | 2026-05-13 |
| `pagegen_enabled` | `true` (inferred) | PRODUCTION_REALITY.md — pagegen runs and receives QStash deliveries | 2026-05-13 |
| `bulk_generation_enabled` | `false` | CONFIRMED — audit-2026-05-04-p0-4-module2 blocked at 403 due to this flag | 2026-05-04 |
| `safe_mode` | `false` | PRODUCTION_REALITY.md | 2026-05-13 |
| `crm_auto_routing` | `false` | Backup + PRODUCTION_REALITY.md | 2026-05-04 |
| `followup_enabled` | `false` | Backup + PRODUCTION_REALITY.md | 2026-05-04 |
| `batch_size` | `5` | Backup | 2026-05-04 |

> **Note:** `ai_enabled=true` is CONFIRMED misleading. Gemini quota exhausted since ~May 4. The DB value has not been updated to reflect the real state.

---

## GENERATION PIPELINE COUNTS

| Table | Metric | Count | Source | Date |
|-------|--------|-------|--------|------|
| `generation_queue` | Total rows | 49 | GEMINI_DEPENDENCY_ANALYSIS.md | 2026-05-13 |
| `generation_queue` | Status: `completed` | 32 | GEMINI_DEPENDENCY_ANALYSIS.md | 2026-05-13 |
| `generation_queue` | Status: `cancelled` | 17 | GEMINI_DEPENDENCY_ANALYSIS.md | 2026-05-13 |
| `generation_queue` | Status: `pending` | 0 | Inferred (no active dispatch) | 2026-05-13 |
| `generation_queue` | Status: `processing` | 0 | Inferred (no active job) | 2026-05-13 |
| `generation_queue` | Status: `failed` | 0 (all from April, completed) | GEMINI_DEPENDENCY_ANALYSIS.md | 2026-05-13 |
| `generation_queue` | Last active batch | East Delhi-Bima Sakhi Hyper-Local Sweep | GEMINI_DEPENDENCY_ANALYSIS.md | 2026-05-03 |
| `bulk_generation_jobs` | Last run | East Delhi-Bima Sakhi Hyper-Local Sweep | GEMINI_DEPENDENCY_ANALYSIS.md | Completed 2026-05-03 |

---

## CONTENT DRAFT COUNTS

| Table | Metric | Count | Source | Date |
|-------|--------|-------|--------|------|
| `content_drafts` | Total rows | 26 | GEMINI_DEPENDENCY_ANALYSIS.md | 2026-05-13 |
| `content_drafts` | Status: `archived` | 25 | GEMINI_DEPENDENCY_ANALYSIS.md | 2026-05-13 |
| `content_drafts` | Status: `published` | 1 | GEMINI_DEPENDENCY_ANALYSIS.md | 2026-05-13 |
| `content_drafts` | Created after May 4 | 0 | GEMINI_DEPENDENCY_ANALYSIS.md | 2026-05-13 |
| `page_index` | Status: `published` | INCONCLUSIVE | Not confirmed in current forensics | — |
| `location_content` | Active rows | INCONCLUSIVE | Not confirmed in current forensics | — |

---

## JOB EXECUTION COUNTS

| Table | Metric | Count | Source | Date |
|-------|--------|-------|--------|------|
| `job_runs` | Total in May 2026 | 0 | GEMINI_DEPENDENCY_ANALYSIS.md | 2026-05-13 |
| `job_runs` | Total in April 2026 | 45 (completed) | GEMINI_DEPENDENCY_ANALYSIS.md | 2026-05-13 |
| `job_dead_letters` | Total rows | 2 | QSTASH_OPERATIONAL_AUDIT.md | 2026-05-13 |
| `job_dead_letters` | State | Both cleared by SHOS (May 5) | QSTASH_OPERATIONAL_AUDIT.md | 2026-05-05 |
| `job_dead_letters` | New rows after May 5 | INCONCLUSIVE | Not confirmed | — |

---

## EVENT STORE COUNTS

| Table | Metric | Count | Source | Date |
|-------|--------|-------|--------|------|
| `event_store` | `lead_created` events in May | Exists (leads received) | GEMINI_DEPENDENCY_ANALYSIS.md | 2026-05-13 |
| `event_store` | `page_generated` events in May | 0 | GEMINI_DEPENDENCY_ANALYSIS.md | 2026-05-13 |
| `event_store` | Stuck events | 0 | QSTASH_OPERATIONAL_AUDIT.md | 2026-05-13 |

---

## EXTERNAL DELIVERY COUNTS

| Table | Metric | Count | Source | Date |
|-------|--------|-------|--------|------|
| `external_delivery_logs` | Latest entry | 2026-05-13 03:31 UTC | QSTASH_OPERATIONAL_AUDIT.md | 2026-05-13 |
| `external_delivery_logs` | Prior entries | 2026-05-11, 2026-05-12 | QSTASH_OPERATIONAL_AUDIT.md | 2026-05-13 |
| `external_delivery_logs` | Delivery failures | 0 recent | QSTASH_OPERATIONAL_AUDIT.md | 2026-05-13 |

---

## WORKER HEALTH ROWS

| Table | Metric | Value | Source | Date |
|-------|--------|-------|--------|------|
| `worker_health` | Total rows | 0 (empty) | SUPABASE_RUNTIME_TRUTH.md | 2026-05-13 |

> Worker heartbeat system is non-functional. No workers are writing heartbeat rows. This has been known since audit 2026-05-04 (heartbeat broken).

---

## SYSTEM ALERTS

| Table | Metric | Value | Source | Date |
|-------|--------|-------|--------|------|
| `system_alerts` | Unresolved critical alerts | 0 (implied by HEALTHY status) | systemHealth.js computation | 2026-05-13 |
| `system_alerts` | Stale open alerts | INCONCLUSIVE | Not explicitly confirmed | — |

---

## SYSTEM CONTROL ACTIONS

| Table | Metric | Value | Source | Date |
|-------|--------|-------|--------|------|
| `observability_logs` | Latest `AI_FAILURE` entries | INCONCLUSIVE | Not queried directly | — |
| `observability_logs` | `QSTASH_DELIVERY` entries | Present (delivery confirmed) | QSTASH_OPERATIONAL_AUDIT.md | 2026-05-13 |

---

## DEPLOYMENT STATE

| Metric | Value | Source |
|--------|-------|--------|
| Production commit | `794013e` (2026-05-04) | git log + FORENSIC_DEPLOYMENT_RECONCILIATION.md |
| Local commit | Same — `794013e` | PRODUCTION_REALITY.md |
| Uncommitted local changes | 54 modified + 11 new files | FORENSIC_DEPLOYMENT_RECONCILIATION.md |
| Last DB migration applied | 2026-05-07 (P2 migrations, uncommitted) | INDEX.md + MIGRATION_DRIFT_MATRIX.md |
| P2 code deployed | NO — local only | PRODUCTION_REALITY.md |
| P2 DB migrations applied | YES — direct Supabase apply | PRODUCTION_REALITY.md |

---

## GEMINI API STATE

| Metric | Value | Evidence |
|--------|-------|---------|
| `GEMINI_API_KEY` | Present (length=39) | GEMINI_DEPENDENCY_ANALYSIS.md |
| Key format | Valid Google API key (`AIza...`) | GEMINI_DEPENDENCY_ANALYSIS.md |
| API response | HTTP 429 RESOURCE_EXHAUSTED | GEMINI_DEPENDENCY_ANALYSIS.md |
| Quota type | Daily quota (free tier) | GEMINI_DEPENDENCY_ANALYSIS.md |
| Last successful generation | ~2026-05-04 | `job_runs` last April row |
| Days quota exhausted | ~9 days (as of 2026-05-13) | GEMINI_DEPENDENCY_ANALYSIS.md |
| Primary model quota | Exhausted | gemini-2.0-flash free tier |
| Fallback model quota | Exhausted | gemini-2.5-flash-lite free tier (same key) |

---

## BASELINE CLASSIFICATION SUMMARY

| Subsystem | Baseline State |
|-----------|---------------|
| Content generation | DEAD — 0 pages since May 4 |
| Queue dispatch | IDLE — no pending items |
| QStash delivery | OPERATIONAL — confirmed active |
| Gemini API | QUOTA EXHAUSTED |
| OpenAI API | ABSENT (key not present, code never imported) |
| Admin panel AI status | MISLEADING — shows Operational |
| `ai_enabled` DB flag | STALE — true, should be false |
| Lead capture / CRM sync | OPERATIONAL — confirmed May 13 |
| Worker heartbeat | DEAD — worker_health table empty |
| Circuit breakers | DECORATIVE — not wired to AI paths |
| Cost guard | DISCONNECTED — not called from AI |

---

## BASELINE QUERIES FOR FUTURE COMPARISON

The following Supabase queries would provide a refreshed live snapshot (for operators to run):

```sql
-- 1. generation_queue counts by status
SELECT status, COUNT(*) as count FROM generation_queue GROUP BY status;

-- 2. bulk_generation_jobs recent
SELECT id, name, status, total_pages, completed_at FROM bulk_generation_jobs ORDER BY created_at DESC LIMIT 10;

-- 3. content_drafts by status
SELECT status, COUNT(*) as count FROM content_drafts GROUP BY status;

-- 4. job_dead_letters latest
SELECT id, job_class, failure_reason, failed_at FROM job_dead_letters ORDER BY failed_at DESC LIMIT 20;

-- 5. worker_health rows
SELECT * FROM worker_health ORDER BY last_heartbeat DESC;

-- 6. job_runs recent activity
SELECT status, COUNT(*) as count, MAX(started_at) as last_run FROM job_runs 
WHERE started_at >= NOW() - INTERVAL '7 days' GROUP BY status;

-- 7. system_control_config current state
SELECT ai_enabled, queue_paused, pagegen_enabled, bulk_generation_enabled, 
       safe_mode, crm_auto_routing, followup_enabled, batch_size, updated_at 
FROM system_control_config WHERE singleton_key = true;

-- 8. observability_logs AI_FAILURE entries
SELECT level, message, metadata, created_at FROM observability_logs 
WHERE level = 'AI_FAILURE' ORDER BY created_at DESC LIMIT 20;
```

> **RC-1A RULE:** These queries are provided for operator use. No live query has been executed during this RC-1A phase. All values above are sourced from existing forensic audit evidence.
