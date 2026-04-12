# Schema Source Of Truth

This file defines canonical ownership for core runtime tables after the Day 5 reconciliation pass.

Rule:
- Historical duplicate migrations are not rewritten.
- New schema changes must target the canonical owner listed below or a newer additive migration.
- Do not create the same table in a second migration once a canonical owner exists.

## Canonical Core Owners

| Table | Canonical Migration |
|---|---|
| `leads` | `030_core_operational_schema.sql` + `031_day5_schema_reconciliation.sql` |
| `lead_events` | `030_core_operational_schema.sql` |
| `lead_metadata` | `030_core_operational_schema.sql` |
| `contact_inquiries` | `030_core_operational_schema.sql` |
| `sessions` | `030_core_operational_schema.sql` |
| `event_stream` | `030_core_operational_schema.sql` |
| `api_requests` | `030_core_operational_schema.sql` + `031_day5_schema_reconciliation.sql` |
| `system_runtime_errors` | `030_core_operational_schema.sql` + `031_day5_schema_reconciliation.sql` |
| `failed_leads` | `20260321000000_system_hardening.sql` + `031_day5_schema_reconciliation.sql` |
| `worker_health` | `031_day5_schema_reconciliation.sql` |
| `lead_scores` | `010_phase19_schema.sql` |
| `content_metrics` | `010_phase19_schema.sql` |
| `traffic_sources` | `010_phase19_schema.sql` |
| `page_index` | `016_page_index_schema.sql` |
| `location_content` | `016_page_index_schema.sql` |
| `generation_queue` | `018_generation_queue_schema.sql` |
| `agents` | `025_network_os_schema.sql` |
| `agent_business_metrics` | `025_network_os_schema.sql` |
| `system_control_config` | `029_system_control_engine.sql` |
| `lead_routing_runs` | `030_core_operational_schema.sql` |
| `crm_sync_runs` | `030_core_operational_schema.sql` |
| `message_dispatch_runs` | `030_core_operational_schema.sql` |
| `job_runs` | `030_core_operational_schema.sql` |
| `job_dead_letters` | `030_core_operational_schema.sql` |
| `ai_decision_logs` | `031_day5_schema_reconciliation.sql` |
| `lead_routing_logs` | `031_day5_schema_reconciliation.sql` |
| `communication_templates` | `031_day5_schema_reconciliation.sql` |

## Historical Duplicate Owners

These duplicates still exist in migration history. They are not rewritten because that would risk breaking existing environments. They are considered historical, not canonical.

| Table | Historical Duplicates | Canonical Rule |
|---|---|---|
| `observability_logs` | `029_system_control_engine.sql`, `20260321000000_system_hardening.sql` | Treat `029_system_control_engine.sql` as canonical owner for future changes |
| `search_index_metrics` | `019_reliability_engine_schema.sql`, `021_system_observability_schema.sql` | Treat `021_system_observability_schema.sql` as canonical owner for future changes |
| `seo_growth_recommendations` | `016_page_index_schema.sql`, `022_crawl_budget_schema.sql` | Treat `022_crawl_budget_schema.sql` as canonical owner for future changes |

## Day 5 Coverage Notes

Day 5 is considered complete when:
- Every production-critical runtime table used by lead, contact, telemetry, config, worker, and admin health paths exists in migrations.
- Additive reconciliation covers missing columns relied on by current code.
- Future schema work follows canonical ownership instead of creating more duplicate table definitions.
