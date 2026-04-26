# Migration: 039_bulk_job_planner.sql

> **Date:** April 18, 2026  
> **schema_migrations ID:** 64  
> **Status:** EXECUTED  
> **Bible Reference:** Section 10-12

---

## Changes

### New Table: bulk_generation_jobs
- 28 columns: id (UUID PK), name, description, intent_type, scope, city_ids (UUID[]), locality_ids (UUID[]), pincode_list (TEXT[]), base_keyword, keyword_variations (TEXT[]), content_type, auto_approve_threshold, require_review_below, daily_publish_limit, generation_per_hour_cap, total_pages, generated_count, approved_count, published_count, failed_count, rejected_count, status (CHECK: planned/running/paused/completed/failed/cancelled), started_at, paused_at, completed_at, created_by, created_at, updated_at
- Indexes: idx_bulk_jobs_status, idx_bulk_jobs_created

### Altered Table: content_drafts
- Added: bulk_job_id UUID REFERENCES bulk_generation_jobs(id)
- Index: idx_content_drafts_bulk_job

## Verification
- Direct pg query confirmed 28 columns with correct types
- FK constraint active on content_drafts.bulk_job_id
