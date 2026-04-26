# Migration: 20260426030000_rule16_publish_pipeline_atomicity.sql
> **Date:** April 26, 2026
> **ID:** 73 in schema_migrations
> **Priority:** Runtime Truth Stabilization
> **Bible Sections:** Rule 16, Section 10-12, Section 40

---

## Changes Applied

### 1. Added Rule 16 failure-injection helper

Created `rule16_trace_and_maybe_fail`.

Purpose:

- emit trace points for auditable execution steps
- optionally `pg_sleep(...)` after a named step
- optionally raise `rule16_forced_failure:<step>` after a named step

### 2. Added Rule 16 idempotency claim helper

Created `rule16_claim_idempotency_key`.

Purpose:

- reserve a write key in `idempotency_keys`
- let the transactional function distinguish first execution from replay safely

### 3. Added publish transaction function

Created `rule16_publish_draft`.

This function owns the multi-table publish write for:

- `page_index`
- `location_content`
- `content_drafts`

The function exposes failure-injection parameters so publish rollback can be proven against live production Postgres.

### 4. Added publish page-type inference helper

Created `rule16_infer_page_type` to keep publish page creation deterministic inside the DB transaction boundary.

## Live Execution Record

Recorded in `schema_migrations`:

| Field | Value |
|---|---|
| `id` | `73` |
| `migration_name` | `20260426030000_rule16_publish_pipeline_atomicity.sql` |
| `executed_at` | `2026-04-26T17:52:02.098Z` |

## Verification

- publish rollback on forced DB error => PASS
- publish rollback on process kill mid-execution => PASS
- publish rollback on socket drop mid-execution => PASS
- publish idempotent replay on same key => PASS

Primary proof artifact:

- `scripts/audit/results/2026-04-26T18-13-17-570Z-rule16-transactional-integrity.json`