# C25 Direct Supabase REST Proof - 2026-04-26

**Status:** CURRENT TRUTH FOR C25  
**Audit Type:** Live direct REST proof  
**Primary Reference:** `docs/fixes/fix_012_c25_direct_supabase_rest_audit_access.md`  
**Secondary References:** `docs/audits/verified-live-system-audit-2026-04-26.md`, `docs/audits/audit-2026-04-26-cto-live-proof-refresh.md`, `docs/CONTENT_COMMAND_CENTER.md`, `docs/INDEX.md`  
**Execution Window:** 2026-04-26 UTC / IST

## 1. Executive Summary

C25 is now resolved live.

The baseline problem was not that the live Supabase service role credential was invalid. The failure was narrower: the PowerShell audit transport used for direct REST verification returned `401` for the live Supabase REST endpoint from this workstation.

The repair replaced that broken transport in the audit helper with `curl.exe` for direct Supabase `/rest/v1/` probes. After the fix, a dedicated read-only audit script successfully read the critical production tables directly from Supabase REST, outside the app layer, with the local `SUPABASE_SERVICE_ROLE_KEY` and no proxying through application code.

The proof result passed live and recorded successful direct reads for:

- `system_control_config`
- `feature_flags`
- `system_alerts`
- `job_dead_letters`
- `event_store`

All reads were `GET` requests only. No write path was used for the C25 closure proof.

## 2. Evidence Files

- `scripts/audit/results/2026-04-26T10-26-58-972Z-supabase-data-integrity-ps.json`
- `scripts/audit/results/2026-04-26T16-39-49-795Z-supabase-direct-rest-read-ps.json`
- `docs/fixes/fix_012_c25_direct_supabase_rest_audit_access.md`

## 3. Baseline Failure

The baseline audit evidence for the direct REST path showed:

- `db_query_system_control_config` => `401 Unauthorized`
- `insert_test_observability_log` => `401 Unauthorized`

That baseline came from the PowerShell direct REST path and made the direct audit access claim untrustworthy.

Important boundary:

- the baseline did not prove the service role key was invalid
- it proved only that the existing PowerShell transport could not be trusted for direct REST verification in this environment

## 4. Discriminating Checks

To avoid guessing, three live checks were used:

1. Existing Node direct REST tooling already present in the repo was rerun.
   - `node scripts/checkMigrationDrift.js` succeeded live.
   - This proved the same service role key could read Supabase REST outside the app layer.
2. A raw `curl.exe` probe was run from the workstation.
   - Query: `GET /rest/v1/system_control_config?select=singleton_key&limit=1`
   - Result: `status=200`
3. The PowerShell helper was patched and then revalidated.
   - Direct helper read returned `ok: true`, `status: 200`

This isolated the defect to the PowerShell `Invoke-WebRequest` path and justified the transport change without changing the production database or the production app.

## 5. Live Read-Only Proof Table

| Table | Query Mode | Result | Status |
|---|---|---|---|
| `system_control_config` | direct REST `GET` | `200`, sample row returned with `system_mode`, `ai_enabled`, `followup_enabled` | PASS |
| `feature_flags` | direct REST `GET` | `200`, sample rows returned with `key`, `value`, `restricted` | PASS |
| `system_alerts` | direct REST `GET` | `200`, sample rows returned with `alert_type`, `severity`, `resolved` | PASS |
| `job_dead_letters` | direct REST `GET` | `200`, sample rows returned with `job_class`, `failed_at` | PASS |
| `event_store` | direct REST `GET` | `200`, sample rows returned with `event_name`, `status`, `priority` | PASS |
| verdict | read-only external audit | `PASS`, `outside_app_layer: true`, `mode: read_only` | PASS |

## 6. Live Result Summary

The live proof artifact recorded:

- script: `supabase-direct-rest-read-ps`
- result status: `PASS`
- transport: `curl.exe via Invoke-CurlJsonRequest`
- auth mode: `SUPABASE_SERVICE_ROLE_KEY`
- outside app layer: `true`
- mode: `read_only`
- all critical reads passed: `true`

Representative live evidence from the result file:

- `system_control_config` sample => `system_mode: normal`, `ai_enabled: false`, `followup_enabled: true`
- `feature_flags` sample => live flag rows returned directly from REST
- `system_alerts` sample => resolved historical alert rows returned directly from REST
- `job_dead_letters` sample => historical DLQ rows returned directly from REST
- `event_store` sample => recent `lead_created` event rows returned directly from REST

## 7. Verdict

**C25 status:** RESOLVED LIVE

What is now proven:

- audit-grade Supabase reads work directly from the workstation against live production REST
- the proof path bypasses the app layer completely
- the proof path uses the service role key
- the proof path is read-only safe for the closure audit

What remains open:

- C32: control-plane truth is still split across `system_control_config` and `feature_flags`
- Rule 16 proof gaps still exist for publish and bulk transactions

Next locked execution order after C25:

1. C32 - unify control-plane truth
2. Rule 16 transactional proof