# RC-1C: Scheduled-Publish Cron — Activation Verification

| Field | Value |
|---|---|
| Phase | RC-1C |
| Date | 2026-05-14 |
| Objective | Verify and (if needed) register scheduled-publish cron in Upstash QStash |
| Outcome | **IDEMPOTENT — cron already registered since C24 (2026-04-26)** |
| Scope Constraint | No schema changes, no code changes, no migrations |

---

## Executive Finding

> **The RC-1A forensic audit contained a false finding.** The audit document `QSTASH_OPERATIONAL_AUDIT.md`, `EXTERNAL_SYSTEM_FORENSICS.md`, `RC-1B-BEFORE-RUNTIME-SNAPSHOT.md`, and `RC-1C` planning all asserted that `scheduled-publish` was "NEVER REGISTERED in Upstash." This was incorrect.
>
> **The cron was registered during C24 system recovery on 2026-04-26** via `scripts/setup_qstash_crons.mjs`. Schedule ID `scd_7J8DtLe6UoKNbB8gTnag7GrQ89m1` has been active and executing hourly since that date.

---

## Before State (Captured 2026-05-14 by rc1c_register_scheduled_publish.mjs)

### QStash Schedules (6 active)

| Schedule ID | Cron | URL |
|---|---|---|
| `scd_7J8DtLe6UoKNbB8gTnag7GrQ89m1` | `0 * * * *` | `https://bimasakhi.com/api/jobs/scheduled-publish` |
| `scd_7eLCdvVEp1o7rWvdfRCb729r17xu` | `*/30 * * * *` | `https://bimasakhi.com/api/jobs/reconciliation` |
| `scd_7oSGND79QuX6QhcdsPqZDD2Tk3WP` | `0 2 * * *` | `https://bimasakhi.com/api/jobs/morning-brief` |
| `scd_5Nf3aEoA776GrqKp1nubmAh1BTSU` | `*/5 * * * *` | `https://bimasakhi.com/api/jobs/event-retry` |
| `scd_5kgABtJUWVnB5mHoCscVCYuooGpB` | `*/5 * * * *` | `https://bimasakhi.com/api/jobs/alert-scan` |
| `scd_6JLsqxLgc5n49AW58rfZPicmAZiw` | `*/5 * * * *` | `https://bimasakhi.com/api/jobs/vendor-health-check` |

**Matches exactly the 6 schedules registered during C24 recovery (2026-04-26).** Schedule IDs are identical to those listed in `docs/audits/audit-2026-04-26-c24-system-health-live-proof.md`.

---

## Route Classification (Confirmed)

| Component | Status |
|---|---|
| `app/api/jobs/scheduled-publish/route.js` | ✅ EXISTS |
| Deployed at P1 (commit `794013e`) | ✅ DEPLOYED |
| Registered in Upstash QStash | ✅ REGISTERED (`scd_7J8DtLe6UoKNbB8gTnag7GrQ89m1`) |
| Auth: `verifySignatureAppRouter` | ✅ PROTECTED |
| `rule16_publish_draft` RPC in DB | ✅ PRESENT (migration `20260426030500_c33_page_index_truth_fix.sql`) |
| Idempotency key: `scheduled:${id}:${scheduled_at}` | ✅ PRESENT |
| `ai_enabled` dependency | ✅ NONE — independent of AI gates |

---

## Action Taken

**None.** The cron was already registered. `scripts/rc1c_register_scheduled_publish.mjs` detected the existing schedule and exited idempotently (exit code 0).

---

## False Finding — Root Cause

The RC-1A forensic audit (`QSTASH_OPERATIONAL_AUDIT.md`) stated:

> "One cron (`/api/jobs/scheduled-publish`) is coded but NEVER REGISTERED in Upstash — it has never executed."

This was incorrect. The C24 audit (`audit-2026-04-26-c24-system-health-live-proof.md`) explicitly records the registration:

> "`scheduled-publish` => `scd_7J8DtLe6UoKNbB8gTnag7GrQ89m1`"

The RC-1A audit appears to have reviewed static code only (no `CRON_DEFINITIONS` reference in `systemHealth.js`) without cross-checking the live Upstash state or the C24 audit document. The conclusion was drawn from the absence of a health-check definition, not from the actual Upstash schedule list.

**Affected documents with false finding:**
- `docs/audits/QSTASH_OPERATIONAL_AUDIT.md` — states "NEVER REGISTERED"
- `docs/audits/EXTERNAL_SYSTEM_FORENSICS.md` — FINDING-EXT-002
- `docs/audits/EXTERNAL_SYSTEM_SCORECARD.md` — "scheduled-publish cron never registered (−15)"
- `docs/audits/RC-1B-BEFORE-RUNTIME-SNAPSHOT.md` — "Shadow only — never registered"
- `docs/audits/RUNTIME_DEPENDENCY_GRAPH.md` — "❌ NEVER REGISTERED IN UPSTASH"
- `docs/CONTENT_COMMAND_CENTER.md` — P0 gap reference
- `docs/fixes/RC-1B-MINIMAL_GOVERNANCE_ALIGNMENT.md` — scope table
- `docs/audits/RC-1B-AFTER-RUNTIME-SNAPSHOT.md` — open issue reference

---

## Pipeline Operational Status

The scheduled-publish pipeline is **operationally complete**:

1. **QStash cron** fires every hour at :00 UTC (`0 * * * *`)
2. **Route** receives QStash-signed POST, verifies signature via `verifySignatureAppRouter`
3. **Route** queries `content_drafts WHERE scheduled_publish_at <= NOW AND status IN ('draft', 'review') LIMIT 20`
4. **Route** calls `rule16_publish_draft` RPC per draft with idempotency key
5. **RPC** atomically: creates/updates `page_index`, upserts `location_content`, transitions `content_drafts.status → published`
6. **Route** returns `{published: N, errors: M}`

Current status: **EXECUTING** (hourly). Since there are no content drafts with `status IN ('draft','review')` and `scheduled_publish_at` set, each tick returns `{published: 0, errors: 0}` — correct behavior.

---

## Rollback (Not Needed)

If removal is ever required:
```bash
curl -X DELETE https://qstash.upstash.io/v2/schedules/scd_7J8DtLe6UoKNbB8gTnag7GrQ89m1 \
  -H "Authorization: Bearer $QSTASH_TOKEN"
```

---

## After State

Unchanged — 6 schedules, all matching C24 baseline. No mutations performed.

| Metric | Value |
|---|---|
| QStash schedules | 6 |
| scheduled-publish schedule ID | `scd_7J8DtLe6UoKNbB8gTnag7GrQ89m1` |
| Cron expression | `0 * * * *` (UTC) |
| Retries | 3 |
| First registered | 2026-04-26 (C24 recovery) |
| Continuously active since | 2026-04-26 |
| RC-1C action taken | None (idempotent) |
