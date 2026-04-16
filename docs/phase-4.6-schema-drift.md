# Phase 4.6 Schema Drift Ledger

This file records the schema divergence discovered before the Phase 4.6 baseline reconciliation migration.

## Repo-only migrations at audit time

- `20260414_safe_schema_alignment.sql`
- `20260414000000_safe_schema_alignment.sql`

## Live-only migrations at audit time

- `026_database_safety.sql`
- `027_admin_audit_logging.sql`
- `028_error_monitoring.sql`
- `029_worker_health.sql`
- `030_system_backups.sql`
- `031_incident_detection.sql`
- `032_performance_indexes.sql`
- `033_ai_growth_engine_schema.sql`
- `034_ai_growth_fix.sql`
- `20260412202841_phase_4_automation.sql`

## Phase 4.6 policy

- Do not replay or recreate unknown historical migrations.
- Use `20260416000000_phase_4_6_contract_reconciliation.sql` as the forward-only baseline repair.
- Run `npm run db:check-drift` before production deploys.
