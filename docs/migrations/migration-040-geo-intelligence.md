# Migration: 040_geo_intelligence.sql
> **Date:** April 18, 2026
> **ID:** 65 in schema_migrations
> **Phase:** 5 — Geo Intelligence
> **Bible Section:** 13

---

## Changes Applied

### 1. New Table: `pincode_areas`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | gen_random_uuid() |
| pincode_id | UUID (FK → pincodes) | ON DELETE CASCADE |
| area_name | TEXT | NOT NULL |
| slug | TEXT | NOT NULL |
| delivery_office | TEXT | |
| area_type | TEXT | DEFAULT 'residential' |
| active | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

- UNIQUE constraint: (pincode_id, slug)
- Index: idx_pincode_areas_pincode

### 2. ALTER TABLE cities
- `locality_count` INTEGER DEFAULT 0
- `page_count` INTEGER DEFAULT 0
- `coverage_pct` DECIMAL(5,2) DEFAULT 0.00

### 3. ALTER TABLE localities
- `has_page` BOOLEAN DEFAULT false
- `page_slug` TEXT
- `pincode_count` INTEGER DEFAULT 0

### 4. Data Seeded
- 5 city populations (Census 2011)
- 105 localities: Delhi (30), Mumbai (25), Bangalore (20), Kolkata (15), Chennai (15)
- City coverage calculations auto-computed

## Verification
- All schema changes verified via information_schema queries
- 105 localities confirmed in DB
- City populations confirmed non-zero
- Coverage percentages computed correctly
