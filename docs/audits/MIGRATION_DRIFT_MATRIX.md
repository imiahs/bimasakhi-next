# MIGRATION DRIFT MATRIX
**Purpose:** Complete mapping between local migration files, git commit state, and production DB schema  
**Date:** 2026-05-13  
**Method:** supabase/migrations/ file inventory + schema_migrations table cross-reference + git status  
**Rule:** Evidence only.

---

## DRIFT SUMMARY

> **84 total migrations. All 84 applied to production DB. 5 of these 84 were never committed to git (orphaned). The DB is AHEAD of the git repository. Zero unapplied migrations exist (no migration exists in git that hasn't been run). The risk is asymmetric: applying orphaned migrations again is impossible (schema_migrations prevents it), but future developers cloning the repo will have schema gaps unless these 5 are committed.**

---

## DRIFT CATEGORIES

| Category | Count | DB State | Git State | Risk |
|----------|-------|----------|-----------|------|
| **Applied + Committed** | 79 | ✅ Applied | ✅ Committed | Safe |
| **Applied + NOT Committed (Orphaned)** | **5** | ✅ Applied | ❌ Missing from git | Repo gap |
| **Committed + NOT Applied** | 0 | N/A | N/A | N/A |
| **Missing (no migration for feature)** | 1 | ❌ Schema gap | ❌ No migration | HIGH RISK |

---

## THE 5 ORPHANED MIGRATIONS

Applied to production DB but NEVER committed to git. These files exist in `supabase/migrations/` locally but are `??` (untracked) in `git status`.

### Orphan 1: `20260504123000_queue_running_steady_state.sql`
- **Phase:** P1 (queue steady state)
- **Applied to DB:** ✅ YES — confirmed by schema check
- **Git status:** `??` (untracked)
- **Content summary:**
  - Sets `queue_paused DEFAULT FALSE` on `system_control_config`
  - Updates the existing config row to ensure `queue_paused = false`
  - Ensures queue is in running state after P0.x work
- **Dependencies:** Requires `system_control_config` table (exists from earlier migrations)
- **Safe to commit:** ✅ YES — `schema_migrations` will prevent re-run
- **Code that requires it:** `lib/queue/queueRunner.js`, `app/api/admin/config/route.js`

---

### Orphan 2: `20260504150000_p0_4_content_inventory_completion.sql`
- **Phase:** P0.4 (content inventory schema completion)
- **Applied to DB:** ✅ YES
- **Git status:** `??` (untracked)
- **Content summary:**
  - Adds `updated_at`, `published_at`, `archived_at` columns to `blog_posts`
  - Adds `updated_at`, `published_at`, `archived_at` columns to `resources`
  - Adds CHECK constraint on `status` column for both tables: `('draft', 'published', 'archived')`
  - Creates triggers for `updated_at` auto-update
- **Dependencies:** Requires `blog_posts` and `resources` tables
- **Safe to commit:** ✅ YES
- **Code that requires it:** Admin blog/resources API routes; `features/admin/content/ContentInventoryContent.jsx`

---

### Orphan 3: `20260505090000_shos_operator_control.sql`
- **Phase:** P1 SHOS (operator control)
- **Applied to DB:** ✅ YES — confirmed by `system_control_actions` table existence + 5 live rows
- **Git status:** `??` (untracked)
- **Content summary:**
  - Creates `system_control_actions` table with columns: `id`, `action_type`, `action_payload`, `actor`, `result`, `created_at`
  - Adds `operator_status` column to `job_dead_letters`
  - Adds `operator_status`, `operator_note` columns to `generation_queue`
  - Creates indexes on `system_control_actions.action_type`, `system_control_actions.created_at`
- **Dependencies:** Requires `job_dead_letters` (known as `job_dead_letters` in schema), `generation_queue`
- **Safe to commit:** ✅ YES
- **Code that requires it:** `lib/system/shos.js`, `app/api/admin/system/shos/route.js`

---

### Orphan 4: `20260507010000_p2_2_cms_data_structure.sql`
- **Phase:** P2.2 (CMS data structure)
- **Applied to DB:** ✅ YES
- **Git status:** `??` (untracked)
- **Content summary:**
  - Adds `source_type`, `source_metadata`, `display_fields` JSON columns to `custom_pages`
  - Adds `template_id`, `template_version`, `prompt_config` columns to `content_drafts`
  - Adds `last_generated_at`, `generation_status` columns to `page_index`
  - Adds `category_ids`, `topic_ids`, `internal_link_ids` array columns to `blog_posts`
  - Creates `content_topics` table: `id`, `slug`, `name`, `description`, `created_at`
  - Creates `content_categories` table: `id`, `slug`, `name`, `description`, `parent_id`, `created_at`
  - Creates `internal_links` table: `id`, `from_path`, `to_path`, `anchor_text`, `is_active`, `created_at`
  - Creates `redirects` table: `id`, `from_path`, `to_path`, `redirect_type`, `is_active`, `created_at`
- **Dependencies:** Requires `custom_pages`, `content_drafts`, `page_index`, `blog_posts`
- **Safe to commit:** ✅ YES
- **Code that requires it:** `lib/cms/resolveCmsRoute.js`, `app/api/admin/cms/structure/route.js`, `features/admin/content/ContentInventoryContent.jsx`

---

### Orphan 5: `20260507020000_p2_4_ai_prompt_engine.sql`
- **Phase:** P2.4 (AI prompt engine)
- **Applied to DB:** ✅ YES
- **Git status:** `??` (untracked)
- **Content summary:**
  - Adds `prompt_template_id`, `prompt_override`, `prompt_variables` JSON columns to `content_drafts`
  - Adds `prompt_template_id`, `ai_metadata` JSON column to `blog_posts`
  - Adds `prompt_template_id`, `default_variables` JSON to `bulk_generation_jobs`
  - Creates `prompt_templates` table: `id`, `name`, `slug`, `template_body`, `variables`, `version`, `is_active`, `created_at`, `updated_at`
  - Seeds default template: `default-page-generation` with standard variables
- **Dependencies:** Requires `content_drafts`, `blog_posts`, `bulk_generation_jobs`
- **Safe to commit:** ✅ YES
- **Code that requires it:** `lib/ai/promptEngine.js` (fetchTemplate queries `prompt_templates`)

---

## FULL MIGRATION REGISTRY (Summary View)

### Migrations 001–079 (Committed + Applied = 79 files)

All verified applied to DB. These represent:
- 001: Initial schema (leads, pages)
- 002–010: Core infrastructure tables
- 011–020: Queue system, job tracking
- 021–030: Admin system, auth, sessions
- 031–040: Content pipeline, page_index
- 041–050: CRM, lead tracking, Zoho sync
- 051–060: Blog, resources, public content
- 061–070: Feature flags, system config
- 071–079: Navigation, observability, event store, DLQ

*Note: Exact migration names available in `supabase/migrations/` directory. Not enumerated here — see `git log --diff-filter=A -- supabase/migrations/` for complete list.*

---

## SCHEMA GAPS (Tables referenced in code but missing from all migrations)

### Gap 1: `media_assets` table

| Aspect | Status |
|--------|--------|
| Table exists in DB | ❌ NOT FOUND |
| Migration to create it | ❌ NONE EXISTS |
| Code referencing it | `app/api/admin/media/route.js`, `app/api/admin/media/upload/route.js` |
| Phase originally designed | P3 (planned future) |
| Current runtime state | All media API calls → runtime error |
| Risk | HIGH — UI deployed, table missing, silent failure |
| Action needed | Write `media_assets` migration and apply |

**This is the only ACTIVE schema gap.** All other table references have been verified to have migrations.

---

## GHOST REFERENCES (Code references non-existent columns/tables — false positives)

These are references that appear broken in code search but are actually fine. Documented here to prevent false future alarms.

| Ghost Reference | In Code | Reality |
|----------------|---------|---------|
| `delivery_truth` table | Referenced in DLQ audit scripts | `delivery_truth` is a MODULE (`lib/queue/deliveryTruth.js`), not a DB table |
| `dlq_items` table | Referenced in old audit docs | Real table name is `job_dead_letters` (not `dlq_items`) |
| `operator_status` on `job_dead_letters` | Appeared to be missing | Added by Orphan 3 migration — EXISTS in live DB |
| `system_control_actions` | Referenced in SHOS but not in all migrations | Added by Orphan 3 — EXISTS in live DB |
| `prompt_templates` | Referenced in P2 code | Added by Orphan 5 — EXISTS in live DB |

---

## MIGRATION HYGIENE ISSUES

### Issue 1: 5 Orphaned Migrations

**Problem:** Migrations were applied to the production DB directly without first committing them to git. This breaks the fundamental git-source-of-truth principle.  
**Risk when resolved:** Zero — `schema_migrations` table prevents re-application. Safe to commit anytime.  
**Risk if left unresolved:** New developer clones the repo, runs `supabase db push`, schema is wrong because 5 migrations are missing. Production code expecting these columns will fail locally.

### Issue 2: Migration for `media_assets` Never Written

**Problem:** The media system was implemented (routes deployed) before its schema migration was written.  
**Risk:** HIGH — production routes fail at runtime for every media request.  
**Action:** Write migration 085 or similar: `CREATE TABLE media_assets (...)`.

### Issue 3: No Single Source of Migration Truth

**Problem:** Migrations can be applied to DB without being in git (as evidenced by all 5 orphans). There is no CI gate preventing this.  
**Risk:** Medium — will happen again without a guard.  
**Action:** Add a pre-deploy check that git repo migration count matches `schema_migrations` count.

---

## MIGRATION DRIFT MATRIX (Compact)

| Migration | Committed | Applied | Notes |
|-----------|-----------|---------|-------|
| 001–079 (all) | ✅ YES | ✅ YES | Clean |
| `20260504123000_queue_running_steady_state` | ❌ NO | ✅ YES | ORPHAN |
| `20260504150000_p0_4_content_inventory_completion` | ❌ NO | ✅ YES | ORPHAN |
| `20260505090000_shos_operator_control` | ❌ NO | ✅ YES | ORPHAN |
| `20260507010000_p2_2_cms_data_structure` | ❌ NO | ✅ YES | ORPHAN |
| `20260507020000_p2_4_ai_prompt_engine` | ❌ NO | ✅ YES | ORPHAN |
| `media_assets migration` (unwritten) | ❌ DOES NOT EXIST | ❌ NOT APPLIED | SCHEMA GAP |

---

## REMEDIATION ORDER

| # | Action | Safe? | Impact |
|---|--------|-------|--------|
| 1 | Commit all 5 orphaned migration files to git | ✅ YES — DB already has them | Closes repo-DB gap |
| 2 | Write `media_assets` migration | ✅ YES — no risk | Fixes broken media system |
| 3 | Apply `media_assets` migration to production DB | ✅ YES | Enables media upload |
| 4 | Add CI check: `schema_migrations count = supabase/migrations/ count` | ✅ YES | Prevents future drift |

---

## CONCLUSION

The migration system is fundamentally sound. 84 migrations applied, 0 failed, 0 unapplied. The 5 orphans represent work that was done correctly in terms of DB modification but incorrectly in terms of git tracking. Committing them is risk-free. The single genuine gap is the missing `media_assets` migration — the only feature deployed without its required schema.
