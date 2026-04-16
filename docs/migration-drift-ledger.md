# Migration Drift Ledger

> Maintained as part of Phase 4.6 Contract Reconciliation.
> Last updated: 2026-04-16

## Background

Between March 2026 and April 2026, several SQL migrations were executed directly against the live Supabase database (via SQL editor or ad-hoc scripts) without being tracked in the repo's `supabase/migrations/` directory. This created a "drift" where the live `schema_migrations` table contained entries that the repo did not recognize.

Phase 4.6 resolved this by:
1. **TIER A**: Copying the original SQL from root-level project files into `supabase/migrations/`
2. **TIER B**: Creating documentation-only stub files for migrations whose original SQL was lost

## TIER A — Real SQL Recovered

These migrations had their original SQL files at the project root. The exact content was copied into `supabase/migrations/`.

| Migration | Originally Applied | Source File |
|---|---|---|
| `000_observability_tables.sql` | Pre-March 2026 | Root `000_observability_tables.sql` |
| `11_database_safety.sql` | Pre-March 2026 | Root `11_database_safety.sql` |
| `15_admin_audit_logging.sql` | Pre-March 2026 | Root `15_admin_audit_logging.sql` |
| `16_error_monitoring.sql` | Pre-March 2026 | Root `16_error_monitoring.sql` |
| `17_worker_health.sql` | Pre-March 2026 | Root `17_worker_health.sql` |
| `19_system_backups.sql` | Pre-March 2026 | Root `19_system_backups.sql` |
| `20_incident_detection.sql` | Pre-March 2026 | Root `20_incident_detection.sql` |

## TIER B — Documentation-Only (Source SQL Lost)

These migrations were applied to live DB but the original SQL was never preserved in the repo. The migration files in `supabase/migrations/` contain **only comments documenting what was observed in the live DB**. They contain NO executable SQL.

| Migration | Applied On | Nature |
|---|---|---|
| `026_database_safety.sql` | 2026-03-14T19:16:03Z | Renumbered duplicate of `11_database_safety.sql` |
| `027_admin_audit_logging.sql` | 2026-03-14T19:16:03Z | Renumbered duplicate of `15_admin_audit_logging.sql` |
| `028_error_monitoring.sql` | 2026-03-14T19:16:04Z | Renumbered duplicate of `16_error_monitoring.sql` |
| `029_worker_health.sql` | 2026-03-14T19:16:04Z | Renumbered duplicate of `17_worker_health.sql` |
| `030_system_backups.sql` | 2026-03-14T19:16:04Z | Renumbered duplicate of `19_system_backups.sql` |
| `031_incident_detection.sql` | 2026-03-14T19:16:04Z | Renumbered duplicate of `20_incident_detection.sql` |
| `032_performance_indexes.sql` | 2026-03-14T20:47:39Z | Performance indexes (no tables created) |
| `033_ai_growth_engine_schema.sql` | 2026-03-15T05:03:38Z | Created: growth_reports, growth_suggestions, ai_decision_logs, seo_growth_recommendations, automation_rules |
| `034_ai_growth_fix.sql` | 2026-03-15T09:17:45Z | Patch/fix for 033 tables |
| `20260412202841_phase_4_automation.sql` | 2026-04-12T20:40:00Z | Phase 4 intermediate automation run |

## Rules for Future Engineers

1. **NEVER** add executable SQL to TIER B files — they exist only for migration tracking alignment
2. To modify tables created by TIER B migrations, always create a **new** migration file
3. All new migrations MUST be placed in `supabase/migrations/` BEFORE applying to live DB
4. Run `npm run db:check-drift` before every deployment to catch future drift early
