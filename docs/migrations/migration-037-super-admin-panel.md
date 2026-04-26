# Migration: 037_super_admin_panel.sql

> **Date:** 2026-04-18  
> **Migration ID:** 62  
> **File:** `supabase/migrations/037_super_admin_panel.sql`  
> **Runner:** `scripts/migrate_037_super_admin_panel.mjs`  
> **Status:** ✅ EXECUTED  

---

## Tables Created

### feature_flags
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | gen_random_uuid() |
| key | TEXT UNIQUE | Flag identifier |
| label | TEXT | Display name |
| description | TEXT | What the flag controls |
| category | TEXT | generation/publishing/leads/automation/system |
| value | BOOLEAN | ON/OFF (default false) |
| restricted | BOOLEAN | If true, super_admin only |
| last_changed_by | TEXT | Email of last modifier |
| last_changed_at | TIMESTAMPTZ | When last changed |
| created_at | TIMESTAMPTZ | Row creation |

**Indexes:** `idx_feature_flags_key` (key), `idx_feature_flags_category` (category)  
**Seeded:** 15 flags

### workflow_config
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | gen_random_uuid() |
| key | TEXT UNIQUE | Config identifier |
| label | TEXT | Display name |
| description | TEXT | What this config controls |
| category | TEXT | quality/publishing/generation/leads/ai/cost |
| value_type | TEXT | 'number' or 'text' |
| value_number | NUMERIC | For numeric values |
| value_text | TEXT | For text values |
| min_value | NUMERIC | Floor validation |
| max_value | NUMERIC | Ceiling validation |
| last_changed_by | TEXT | Email of last modifier |
| last_changed_at | TIMESTAMPTZ | When last changed |
| created_at | TIMESTAMPTZ | Row creation |

**Indexes:** `idx_workflow_config_key` (key), `idx_workflow_config_category` (category)  
**Seeded:** 19 config values

## Drift Check

```
Repo migrations: 62
Live schema_migrations: 62
No migration drift detected.
```

---

*Migration protocol: Rule 12 (reversible) + Rule 16 (zero partial writes)*
