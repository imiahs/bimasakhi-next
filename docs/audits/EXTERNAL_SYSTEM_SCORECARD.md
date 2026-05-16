# EXTERNAL SYSTEM SCORECARD
**Purpose:** Scored matrix for all 10 external systems — reliability, coverage, failure mode, governance  
**Date:** 2026-05-13  
**Scale:** 0–100% per dimension. Evidence-backed scores only.

---

## SCORECARD SUMMARY

| System | Reliability | Coverage | Failure Handling | Observability | Governance | **Overall** |
|--------|------------|----------|-----------------|--------------|------------|------------|
| Supabase | 98 | 100 | 90 | 85 | 90 | **93** ✅ |
| QStash | 95 | 85 | 80 | 75 | 80 | **83** ✅ |
| Zoho CRM | 92 | 90 | 80 | 70 | 80 | **82** ✅ |
| Redis | 85 | 60 | 90 | 40 | 50 | **65** 🟡 |
| Telegram | 70 | 80 | 30 | 20 | 40 | **48** 🟡 |
| Gemini AI | 0 | 70 | 50 | 60 | 20 | **40** 🔴 |
| Medium API | 0 | 0 | 0 | 0 | 0 | **0** ⚫ |
| OpenAI | 0 | 0 | 0 | 0 | 0 | **0** ⚫ |

---

## DIMENSION DEFINITIONS

| Dimension | Meaning |
|-----------|---------|
| **Reliability** | Is the system currently operational and delivering as expected? |
| **Coverage** | What % of the intended integration surface is implemented? |
| **Failure Handling** | Does the code handle failures gracefully with retry/circuit break? |
| **Observability** | Are failures logged and surfaced to operators? |
| **Governance** | Is the system config-controlled, auditable, and managed by runtime governance? |

---

## SUPABASE — SCORE: 93/100 ✅

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Reliability | 98 | Confirmed healthy May 13. All queries returning. SLA < 100ms. |
| Coverage | 100 | Used for EVERY platform operation — auth, config, events, CRM, content, alerts, observability |
| Failure Handling | 90 | SAFE_DEFAULTS on config failure. Some read paths do not have explicit fallback |
| Observability | 85 | vendor_contracts + sla_snapshots track health. vendor-health-check cron active |
| Governance | 90 | system_control_config governs all workers. feature_flags gates all features |

**Gaps:** RLS not used (service role bypasses all). `media_assets` table missing. `worker_health` table empty.

---

## QSTASH — SCORE: 83/100 ✅

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Reliability | 95 | Delivery confirmed May 13. DLQ clean. 130-char token active |
| Coverage | 85 | All major workers use QStash. `scheduled-publish` cron never registered (−15) |
| Failure Handling | 80 | retries:3 on all publishes. DLQ exists. But pagegen returns 200 OK on Gemini failure |
| Observability | 75 | external_delivery_logs tracks deliveries. But silent worker failures (200 OK) not visible at QStash level |
| Governance | 80 | verifySignatureAppRouter on all handlers. Production URL hardcoded correctly |

**Critical Gap:** `scheduled-publish` cron never registered in Upstash — all scheduled publishes never execute.

---

## ZOHO CRM — SCORE: 82/100 ✅

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Reliability | 92 | Production-proven May 13. zoho_id returned. Auto-routing active |
| Coverage | 90 | Full lead + contact sync. CMO executive running. Email sequences enabled |
| Failure Handling | 80 | QStash retries handle transient Zoho failures. Event retry daemon as second safety |
| Observability | 70 | zoho_id stored in leads table (proof of sync). No dedicated Zoho error log |
| Governance | 80 | crm_auto_routing flag gates sync. In-memory token cache is correct pattern |

**Gap:** Admin reads from Supabase, not live Zoho — stale data if leads modified directly in Zoho CRM portal.

---

## REDIS (UPSTASH/ioredis) — SCORE: 65/100 🟡

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Reliability | 85 | REDIS_URL present. ioredis client initialized. Auth middleware mock fallback exists |
| Coverage | 60 | Only used in auth middleware (rate limiting) + CRM API (session check). Rate limiter decoupled from Redis temporarily |
| Failure Handling | 90 | auth.js has explicit mock fallback if Redis init fails — platform never crashes |
| Observability | 40 | Redis errors logged to console but not to observability_logs or system_alerts |
| Governance | 50 | No circuit breaker. No feature flag. No vendor_contracts entry for Redis |

**Note:** Rate limiter (`utils/rateLimiter.js`) is decoupled from Redis — hardcoded to always return success. Redis is structurally connected but functionally bypassed in the main rate limit path.

---

## TELEGRAM — SCORE: 48/100 🟡

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Reliability | 70 | Keys present, correct format. No confirmed live delivery in DB evidence |
| Coverage | 80 | CEO alert channel + morning brief + escalation all implemented |
| Failure Handling | 30 | No retry on failed Telegram calls. No fallback channel if Telegram down |
| Observability | 20 | No DB record of Telegram delivery success/failure. Silent on all failures |
| Governance | 40 | Alert dedup window (60min) is implemented. But no circuit breaker, no health check |

**Critical Gap:** Telegram delivery is fully silent — no retry, no error logging, no fallback. If bot token expires, CEO gets zero alerts with zero platform notification.

---

## GEMINI AI — SCORE: 40/100 🔴

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Reliability | 0 | API quota exhausted. 429 on every call. Zero pages generated in May |
| Coverage | 70 | Implemented for pagegen, bulk gen, AI scorer. OpenAI provider built but never wired |
| Failure Handling | 50 | Returns null gracefully (no crash). But worker returns 200 OK (invisible failure to QStash) |
| Observability | 60 | AI_FAILURE logged to observability_logs. But system_control_config still says ai_enabled=true |
| Governance | 20 | Circuit breaker in vendor_contracts exists but is never READ before API calls. Config lies |

**Critical Gap:** System governance says AI is enabled while API has been dead for ~9 days. No mechanism to detect quota exhaustion and update system config automatically.

---

## MEDIUM API — SCORE: 0/100 ⚫

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Reliability | 0 | No integration code exists |
| Coverage | 0 | Keys present but zero code uses them |
| Failure Handling | 0 | N/A |
| Observability | 0 | N/A |
| Governance | 0 | N/A |

**Classification:** INERT. Env keys are forward-provisioned for a planned social publishing feature that was never built.

---

## OPENAI — SCORE: 0/100 ⚫

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Reliability | 0 | Key absent. Even if present, code is dead |
| Coverage | 0 | `lib/ai/providers/openai.js` built but never imported |
| Failure Handling | 0 | N/A |
| Observability | 0 | N/A |
| Governance | 0 | N/A |

**Classification:** DEAD CODE. The file exists with 5 action types but is never imported anywhere. `OPENAI_API_KEY` env var is not present.

---

## OPERATIONAL RISK MATRIX

| System | Operational Risk | Risk Type | Action Needed |
|--------|-----------------|-----------|---------------|
| Supabase | LOW | Single point of failure (by design) | Monitor SLA |
| QStash | MEDIUM | Scheduled-publish never registered | Register cron NOW |
| Zoho CRM | LOW | Token refresh auto-handles failures | Monitor refresh token expiry |
| Redis | LOW | Rate limiter currently bypassed | Evaluate if needed |
| Telegram | HIGH | Silent failure mode with no fallback | Add delivery confirmation |
| Gemini | CRITICAL | AI pipeline dead for 9+ days | Set ai_enabled=false; upgrade plan |
| Medium | NONE | Inert | Remove keys or build integration |
| OpenAI | NONE | Dead code | Wire as Gemini fallback or delete |

---

## INTEGRATION HEALTH TRAFFIC LIGHT

```
✅ GREEN (Operational + Proven):
   ├── Supabase (all operations healthy)
   ├── QStash (delivery working)
   └── Zoho CRM (sync confirmed May 13)

🟡 YELLOW (Operational but with gaps):
   ├── Redis (connected, rate limiter bypassed)
   └── Telegram (structurally complete, live unconfirmed)

🔴 RED (Failure state):
   └── Gemini AI (quota exhausted, silent failure, 9 days dead)

⚫ INACTIVE (Never built or dead code):
   ├── Medium API (keys present, zero code)
   └── OpenAI (code present, never imported, key absent)
```

---

## PLATFORM COMPLETENESS BY EXTERNAL SYSTEM

| Platform Capability | Dependent Systems | Completeness | State |
|--------------------|------------------|-------------|-------|
| Lead capture + CRM | Supabase + QStash + Zoho | 100% | ✅ WORKING |
| Traffic + serving | Supabase | 100% | ✅ WORKING |
| Alert monitoring | Supabase + Telegram | 85% | 🟡 Telegram unconfirmed |
| Admin operations | Supabase + Redis | 95% | ✅ WORKING |
| Content generation | Supabase + QStash + Gemini | 0% | 🔴 DEAD (Gemini quota) |
| Scheduled publish | Supabase + QStash | 0% | 🔴 DEAD (cron unregistered) |
| Social publishing | Medium API | 0% | ⚫ NEVER BUILT |
| Follow-up messages | FOLLOWUP_WEBHOOK_URL | 0% | ⚫ Provider unknown/unconfirmed |
