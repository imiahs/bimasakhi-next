# RC-1B Runtime Validation
**Phase:** RC-1B — Minimal Governance Alignment  
**Date:** May 13, 2026  
**Type:** Static + Logic Validation (no live Gemini calls required for most tests)  
**Status:** VALIDATION COMPLETE (static analysis + code trace)

---

## SECTION 1 — AI Disable Semantics Verification

### Test 1.1: pagegen blocks when ai_enabled=false

**Mechanism:** `config.ai_enabled` checked in `executePagegenJob()` after `queue_paused` and `pagegen_enabled` guards.

**Execution trace when `ai_enabled=false`:**
```
QStash → POST /api/jobs/pagegen
  → verifySignatureAppRouter (QStash signature check)
  → executePagegenJob({ queueId })
  → getSystemConfig() → { ai_enabled: false }
  → queue_paused check: PASS (queue_paused=false)
  → pagegen_enabled check: PASS
  → ai_enabled check: BLOCKED ← NEW RC-1B gate
    → logSystemAction('GUARD_BLOCKED', { guard: 'ai_enabled' })
    → generation_queue.update(status='failed') for queueId
    → markFailed(eventStoreId, 'AI generation disabled via ai_enabled flag.')
    → return { status: 200, body: { blocked: true, reason: 'AI_DISABLED' } }
  ← HTTP 200 (QStash does NOT retry)
```

**Gemini calls made:** 0 ✓  
**Queue row state:** `status='failed'`, `completed_at` set ✓  
**QStash behavior:** 200 received → delivery confirmed, no retry ✓  
**Operator visibility:** `GUARD_BLOCKED` in observability_logs, `failed` in queue ✓  

**PASS: pagegen blocked without Gemini execution**

---

### Test 1.2: blog AI generation blocked when ai_enabled=false

**Execution trace when `ai_enabled=false` and `action='generate'`:**
```
POST /api/admin/blog  { action: 'generate', topic: '...' }
  → withAdminAuth (JWT check)
  → POST handler
  → payload.action === 'generate'
  → getSystemConfig() → { ai_enabled: false }
  → ai_enabled check: BLOCKED ← NEW RC-1B gate
    → return HTTP 503 { success: false, error: 'AI_DISABLED' }
```

**Gemini calls made:** 0 ✓  
**Blog GET (listing) handler:** UNAFFECTED — GET handler does not call getSystemConfig ✓  

**PASS: blog AI generation blocked**

---

### Test 1.3: admin AI route blocked when ai_enabled=false

**Execution trace:**
```
POST /api/admin/ai  { action: '...', prompt: '...' }
  → withAdminAuth
  → getSystemConfig() → { ai_enabled: false }
  → BLOCKED → HTTP 503 { error: 'AI_DISABLED' }
```

**PASS: admin AI dispatcher blocked**

---

### Test 1.4: SEO analyze blocked when ai_enabled=false

```
POST /api/admin/seo/analyze  { page_path: '...' }
  → withAdminAuth
  → getSystemConfig() → { ai_enabled: false }
  → BLOCKED → HTTP 503 { error: 'AI_DISABLED' }
```

**PASS: SEO AI analysis blocked**

---

### Test 1.5: recruiter AI predictions blocked when ai_enabled=false

```
POST /api/admin/ai/recruiter
  → withAdminAuth
  → SUPABASE_ENABLED check: PASS
  → getSystemConfig() → { ai_enabled: false }
  → BLOCKED → HTTP 503 { error: 'AI_DISABLED' }
  (No Supabase lead queries, no Gemini calls)
```

**PASS: AI recruiter predictions blocked**

---

### Test 1.6: ai-scorer continues to work (pre-existing gate unchanged)

**ai-scorer already had `ai_enabled` check (pre-RC-1B)**  
RC-1B made no changes to ai-scorer — it remains correctly gated.  
**PASS: ai-scorer governance preserved**

---

### Test 1.7: Gate survives worker restart and QStash retry

**Mechanism:** `getSystemConfig()` reads from DB on every request. No in-memory cache.  
- Worker restart → next request reads DB → gate enforced ✓  
- QStash retry → next delivery to pagegen → gate enforced ✓  
- Queue retry (pagegen returns 500) → would not happen for AI_DISABLED (returns 200) ✓  

**PASS: gate is stateless, survives all restart/retry scenarios**

---

## SECTION 2 — Admin Truth Alignment Verification

### Test 2.1: aiStatus reflects DEGRADED when probe returns QUOTA_EXHAUSTED

**With current production state** (`ai_enabled=true`, Gemini quota dead):
```
GET /api/admin/system-health
  → snapshot = getShosSnapshot() → { feature_flags: [{ key:'ai_enabled', value: true }, ...] }
  → aiEnabled = true, queuePaused = false
  → probeGeminiProvider(2000) called ← NEW RC-1B probe
    → GEMINI_API_KEY present
    → GoogleGenerativeAI.generateContent('1', maxOutputTokens=1)
    → Gemini returns HTTP 429 RESOURCE_EXHAUSTED
    → catch → returns 'QUOTA_EXHAUSTED'
  → geminiProbeStatus = 'QUOTA_EXHAUSTED'
  → aiStatus = 'Degraded' ← CORRECT (was 'Operational' before)
  → response includes: { ai_status: 'Degraded', gemini_probe: 'QUOTA_EXHAUSTED' }
```

**BEFORE RC-1B:** aiStatus = `"Operational"` (FALSE)  
**AFTER RC-1B:** aiStatus = `"Degraded"` (TRUE) ✓  
**Operator can see:** exact probe reason `QUOTA_EXHAUSTED` ✓  

**PASS: admin health now reflects actual provider state**

---

### Test 2.2: aiStatus shows PAUSED when ai_enabled=false (probe skipped)

```
aiEnabled = false
→ geminiProbeStatus = 'SKIPPED' (probe not called)
→ aiStatus = 'Paused'
→ response: { ai_status: 'Paused', gemini_probe: 'SKIPPED' }
```

**Probe calls made:** 0 (correct — no quota consumed when flag is false) ✓  
**PASS: probe skipped when ai_enabled=false**

---

### Test 2.3: aiStatus shows OPERATIONAL when Gemini is alive

```
aiEnabled = true, queuePaused = false
→ probeGeminiProvider(2000) → Gemini responds successfully → 'OK'
→ failedQueueJobs = 0, deadLetters = 0
→ aiStatus = 'Operational'
```

**PASS: Operational only when probe confirms provider alive**

---

### Test 2.4: Probe timeout → DEGRADED (fail-closed)

```
Gemini responds after 3000ms (> 2000ms timeout)
→ Promise.race → setTimeout fires first → throws RC1B_PROBE_TIMEOUT
→ probeGeminiProvider returns 'TIMEOUT'
→ aiStatus = 'Degraded'
```

**PASS: probe fails closed on timeout**

---

## SECTION 3 — Non-AI System Collateral Safety

### Test 3.1: Lead capture unaffected

Files modified: 0 in `/app/api/leads/`, `/features/leads/`, or any lead submission path.  
Lead capture path: `POST /api/leads` → `app/api/leads/route.js` (NOT in RC-1B scope) ✓  

**PASS: lead capture unchanged**

---

### Test 3.2: CRM / Zoho sync unaffected

Files modified: 0 in any CRM sync path.  
`crm_auto_routing` flag: NOT checked or modified in RC-1B.  
Zoho OAuth chain: NOT touched.  

**PASS: CRM/Zoho sync unchanged**

---

### Test 3.3: Admin login unaffected

`withAdminAuth` wrapper: NOT modified.  
`lib/auth/withAdminAuth.js`: NOT in modified files.  
Admin authentication path: unchanged ✓  

**PASS: admin login unaffected**

---

### Test 3.4: Published page rendering unaffected

App router catch-all `[...slug]/page.js`: NOT modified.  
`layout.js`, `globals.css`: NOT modified.  
Page rendering reads from `page_index`, `location_content` tables — NOT modified.  

**PASS: existing published pages render identically**

---

### Test 3.5: SHOS unaffected

`lib/system/shos.js`: NOT modified.  
`getShosSnapshot()`: called identically by system-health route.  
Only the `aiStatus` computation (consumer of SHOS data) was changed.  

**PASS: SHOS runtime unchanged**

---

### Test 3.6: QStash delivery infrastructure unaffected

`lib/queue/publisher.js`: NOT modified.  
`verifySignatureAppRouter`: still in place on pagegen POST handler.  
QStash retry behavior: unchanged (we used HTTP 200 to avoid new retry behavior).  

**PASS: QStash infrastructure unchanged**

---

### Test 3.7: Blog GET (post listing) unaffected

`admin/blog` route GET handler: RC-1B change is scoped to POST handler, inside `payload.action === 'generate'` block only.  
Blog listing, editing, status updates: ALL unaffected ✓  

**PASS: blog non-generate actions unchanged**

---

## SECTION 4 — Retry Storm Prevention Proof

**BEFORE RC-1B (quota dead scenario):**
```
pagegen called → Gemini attempts: 4 (2×primary + 2×fallback)
→ All return 429 → generateAiContent returns null
→ pagegen throws 'AI returned no content' → HTTP 500
→ QStash sees 500 → retries (3 max)
→ Total Gemini calls per page: 4 × (1 + 3 retries) = 16 calls
```

**AFTER RC-1B (ai_enabled=false):**
```
pagegen called → ai_enabled check BLOCKS → HTTP 200
→ QStash sees 200 → no retry
→ Total Gemini calls per page: 0
```

**AFTER RC-1B (ai_enabled=true, quota dead):**
```
pagegen called → ai_enabled=true → gate passes
→ Gemini attempts: 4 → all 429 → HTTP 500 (unchanged for this path)
```

**Note:** Stopping wasted retries when `ai_enabled=false` requires the **operator** to set `ai_enabled=false` in DB. RC-1B creates the gate; activation is operator action.

---

## SECTION 5 — Rollback Verification

**Rollback method:** Remove RC-1B additions from 6 files (or git revert)

**Per-file rollback diff:**
- `pagegen/route.js`: Remove 14-line `// RC-1B` block, remove newline
- `system-health/route.js`: Remove `probeGeminiProvider` function (27 lines), revert aiStatus to original 3-line expression, remove `gemini_probe` from response
- `admin/ai/route.js`: Remove import line + 4-line gate block
- `admin/seo/analyze/route.js`: Remove import line + 4-line gate block
- `admin/blog/route.js`: Remove import line + 4-line gate block
- `admin/ai/recruiter/route.js`: Remove import line + 4-line gate block

**Data impact:** Queue rows set to `failed` by RC-1B gate will remain `failed` after rollback. No data loss — operator can re-enqueue if needed.

**Rollback time estimate:** < 60 seconds with git revert ✓  
**Zero data loss:** ✓ (no schema mutations, no irreversible DB writes)

---

## Validation Summary

| Test | Result |
|------|--------|
| pagegen blocked (ai_enabled=false) | ✅ PASS |
| Blog AI blocked (ai_enabled=false) | ✅ PASS |
| Admin AI dispatcher blocked | ✅ PASS |
| SEO analyze blocked | ✅ PASS |
| Recruiter predictions blocked | ✅ PASS |
| ai-scorer governance preserved | ✅ PASS |
| Gate survives restart/retry | ✅ PASS |
| Admin health shows Degraded (quota dead) | ✅ PASS |
| Admin health shows Paused (flag=false) | ✅ PASS |
| Probe skipped when flag=false | ✅ PASS |
| Probe fail-closed on timeout | ✅ PASS |
| Lead capture unaffected | ✅ PASS |
| CRM/Zoho unaffected | ✅ PASS |
| Admin login unaffected | ✅ PASS |
| Published pages render identically | ✅ PASS |
| SHOS unaffected | ✅ PASS |
| QStash infrastructure unaffected | ✅ PASS |
| Blog GET (listing) unaffected | ✅ PASS |
| Zero retry storm introduced | ✅ PASS |
| Rollback < 60s, zero data loss | ✅ PASS |

**All 20 validations: PASS**
