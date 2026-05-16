# RC-1B BEFORE Runtime Snapshot
**Captured:** May 13, 2026 — RC-1B Governance Alignment (Pre-Mutation)  
**Authority:** Forensic baseline established from RC-1A + live state at session start  
**Purpose:** Authoritative BEFORE state for all RC-1B mutations

---

## Control Plane Flags (system_control_config)

| Flag | Value | Truth Status |
|------|-------|-------------|
| `ai_enabled` | `true` | **MISLEADING** — Gemini quota exhausted since ~May 4, 2026 |
| `queue_paused` | `false` | ACCURATE — queue consumers are running |
| `batch_size` | `5` | N/A |
| `crm_auto_routing` | `true` | ACCURATE — Zoho sync proven operational |
| `followup_enabled` | unknown | N/A for RC-1B scope |

**Verification SQL:**
```sql
SELECT ai_enabled, queue_paused, batch_size, crm_auto_routing, followup_enabled, updated_at
FROM system_control_config
WHERE singleton_key = true;
```

---

## Generation Queue State

| Metric | Value | Source |
|--------|-------|--------|
| Total rows | ~49 | RC-1A forensics |
| Completed | ~32 | RC-1A forensics |
| Cancelled | ~17 | RC-1A forensics |
| Pending | 0 | RC-1A forensics |
| Processing | 0 | RC-1A forensics |
| Latest row date | April 2026 | RC-1A forensics |

**Verification SQL:**
```sql
SELECT status, COUNT(*) as count FROM generation_queue GROUP BY status ORDER BY count DESC;
SELECT MAX(created_at) as last_queued FROM generation_queue;
```

---

## AI Execution State

| Metric | Value |
|--------|-------|
| Pages generated in May 2026 | 0 |
| job_runs in May 2026 | 0 |
| Last successful AI generation | ~April 2026 |
| Gemini quota status | EXHAUSTED (~May 4, 2026) |
| AI_FAILURE logs in DB | 0 (safeLog not wired to DB — RC-1A finding) |

**Verification SQL:**
```sql
SELECT COUNT(*) FROM job_runs WHERE started_at >= '2026-05-01';
SELECT COUNT(*) FROM content_drafts WHERE created_at >= '2026-05-01';
```

---

## Dead Letter Queue

| Metric | Value |
|--------|-------|
| job_dead_letters | 0 (CLEAN) |
| generation_queue failed rows | 0 (all failed rows were from April) |

**Verification SQL:**
```sql
SELECT COUNT(*) FROM job_dead_letters;
SELECT COUNT(*) FROM generation_queue WHERE status = 'failed';
```

---

## Admin AI Health Display (BEFORE RC-1B)

| Field | Display Value | Truth |
|-------|--------------|-------|
| `ai_status` | `"Operational"` | **FALSE** |
| `queue_paused` | `false` | Accurate |
| `dead_letters` | `0` | Accurate |
| `queue_failed` | `0` | Accurate |
| `gemini_probe` | NOT PRESENT | N/A (pre-RC-1B) |

**Root cause of false Operational:** aiStatus derived solely from `ai_enabled=true` + clean DLQ. No live Gemini probe exists pre-RC-1B.

---

## SHOS Health

| Component | Status |
|-----------|--------|
| SHOS snapshot | Functional |
| worker_health | EMPTY (no worker heartbeats) |
| overall_health | Dependent on SHOS query |

**Verification:**
```sql
SELECT * FROM worker_health ORDER BY updated_at DESC LIMIT 5;
```

---

## Governance Coverage (BEFORE RC-1B)

| AI Entry Point | ai_enabled Check | Notes |
|----------------|-----------------|-------|
| `pagegen` worker | ❌ NOT CHECKED | Calls Gemini regardless |
| `admin/ai` route | ❌ NOT CHECKED | Calls Gemini regardless |
| `admin/seo/analyze` route | ❌ NOT CHECKED | Calls Gemini regardless |
| `admin/blog` (generate) | ❌ NOT CHECKED | Calls Gemini regardless |
| `admin/ai/recruiter` | ❌ NOT CHECKED | Calls Gemini regardless |
| `jobs/ai-scorer` | ✅ CHECKED | Only path with correct gate |

**Governance coverage: 1 of 6 direct AI execution paths (17%)**

---

## Active Cron Registrations (Upstash Dashboard)

| Cron | Registered | Status |
|------|-----------|--------|
| pagegen dispatch | YES | Active |
| scheduler | YES | Active |
| scheduled-publish | **NO** | Shadow only — never registered |
| ai-scorer | YES (or on-demand) | Active |

---

## Files Governing AI Runtime (BEFORE RC-1B)

| File | Role | ai_enabled Gate Present |
|------|------|------------------------|
| `lib/ai/generateContent.js` | Core Gemini executor | ❌ |
| `lib/systemConfig.js` | Flag reader | N/A (provides flags) |
| `app/api/jobs/pagegen/route.js` | Content gen worker | ❌ |
| `app/api/admin/system-health/route.js` | Health display | ❌ (uses flag-only logic) |
| `app/api/admin/blog/route.js` | Blog AI generation | ❌ |
| `app/api/admin/ai/route.js` | Admin AI dispatcher | ❌ |
| `app/api/admin/seo/analyze/route.js` | SEO AI analysis | ❌ |
| `app/api/admin/ai/recruiter/route.js` | Lead AI predictions | ❌ |
| `app/api/jobs/ai-scorer/route.js` | Lead scoring | ✅ |

---

## Retry Behavior (BEFORE RC-1B)

| Scenario | What happens |
|----------|-------------|
| pagegen called, AI quota dead | 4 Gemini attempts (2×primary + 2×fallback), all 429, returns null |
| pagegen null result | throws Error → HTTP 500 → QStash retries |
| QStash retries | 3 retries × 4 Gemini calls = **12 Gemini API calls wasted per page request** |
| After 3 QStash retries | QStash DLQ |

---

*This document is the authoritative BEFORE state for RC-1B mutation audit. See RC-1B-AFTER-RUNTIME-SNAPSHOT.md for post-mutation state.*
