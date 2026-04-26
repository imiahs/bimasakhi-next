# Fix: C25 Direct Supabase REST Audit Access

**Date:** 2026-04-26  
**Author:** CTO (Agent)  
**Bible Reference:** Section 39, Section 40, Rule 25  
**Status:** RESOLVED LIVE

## Context

The April 26 live audit proved that the direct audit-grade Supabase REST path was not trustworthy from the local external audit layer. The PowerShell audit result showed `401 Unauthorized` when reading production Supabase REST directly with the masked local service role credential, which meant the audit system could not independently verify database truth outside the app layer.

For C25 to close, the system needed a direct, service-role-based, read-only proof path that bypassed the app entirely and could read critical tables safely from the workstation.

## Root Cause

The credential itself was not the real failure.

Grounded proof established three things:

1. the same `SUPABASE_SERVICE_ROLE_KEY` worked in external Node-based direct REST tooling already present in the repo
2. the same key worked from `curl.exe` against the live Supabase REST endpoint and returned `200`
3. the failing surface was the PowerShell `Invoke-WebRequest` path used by the direct audit helper, which returned false `401` results in this environment for the same live request

That means C25 was a tooling transport defect in the PowerShell audit path, not a broken production credential and not an app-layer permissions problem.

## Change Set

The C25 fix repaired the external audit transport and added a safe proof script:

1. Updated `scripts/audit/_AuditUtils.ps1`.
   - Added `Invoke-CurlJsonRequest`.
   - Direct Supabase REST probes now route through `curl.exe` instead of `Invoke-WebRequest`.
   - `Invoke-JsonRequest` automatically uses the curl path for Supabase `/rest/v1/` requests when an `apikey` header is present.
2. Added `scripts/audit/audit-supabase-direct-rest-read.ps1`.
   - Uses service-role direct REST access outside the app layer.
   - Runs read-only `GET` queries only.
   - Produces a JSON audit result proving safe access to critical tables.

No production app deploy was required for C25 because the defect and the repair are in the local audit transport, while the validation target is the live production Supabase REST endpoint.

## Verification

- Baseline failure proof:
  - `scripts/audit/results/2026-04-26T10-26-58-972Z-supabase-data-integrity-ps.json`
  - `db_query_system_control_config` => `401 Unauthorized`
  - `insert_test_observability_log` => `401 Unauthorized`
- Discriminating live checks:
  - existing Node direct REST tooling in `scripts/checkMigrationDrift.js` succeeded against live Supabase REST
  - `curl.exe` against `https://litucwmzwhpqfgyahpcl.supabase.co/rest/v1/system_control_config?...` returned `status=200`
  - patched PowerShell helper validation returned `ok: true`, `status: 200` for the same live direct REST read
- Live read-only proof:
  - `scripts/audit/results/2026-04-26T16-39-49-795Z-supabase-direct-rest-read-ps.json`
  - `status: PASS`
  - service-role direct REST reads returned `200` for:
    - `system_control_config`
    - `feature_flags`
    - `system_alerts`
    - `job_dead_letters`
    - `event_store`
  - `read_only_verdict` => `PASS`
  - transport recorded as `curl.exe via Invoke-CurlJsonRequest`
  - mode recorded as `read_only`
  - outside-app-layer recorded as `true`

## Outcome

The direct audit trust gap is closed.

What changed in runtime truth:

1. the workstation can now read live Supabase REST directly with the service role key, outside the app layer
2. the proof path is read-only safe and targets the critical tables that matter for operational truth
3. the prior `401` condition is no longer the limiting factor for audit-grade database verification

## Result

**C25 status:** RESOLVED LIVE

Truth boundary after this fix:

- this closes the direct REST audit access gap only
- C32 remains open because control truth is still split between `system_control_config` and `feature_flags`
- Rule 16 transaction proof gaps still remain separate work

## Cross-References

- Related audit: `docs/audits/audit-2026-04-26-c25-direct-supabase-rest-proof.md`
- Related audit: `docs/audits/verified-live-system-audit-2026-04-26.md`
- Related audit: `docs/audits/audit-2026-04-26-cto-live-proof-refresh.md`