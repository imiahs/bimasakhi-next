# Page Authority Recovery

## Scope

This artifact is a discovery and recovery-planning audit for page/content authority only.

It does not authorize:

- a new editor rebuild
- runtime authority widening
- mass migrations
- visual builder replacement
- deployment topology redesign
- unrestricted AI generation

It does authorize:

- capability discovery
- authority classification
- visibility-gap diagnosis
- rollback-safe recovery planning
- registry reconstruction planning based on existing code and tables

## Executive Verdict

**TRUE CURRENT PAGE AUTHORITY IS FRAGMENTED, NOT MISSING.**

The existing foundation already contains multiple operational lanes:

1. Static file routes under `app/*`
2. Helper-wrapped static routes using `utils/seo.js`
3. Custom block pages backed by `custom_pages + page_blocks + page_versions`
4. Draft/publish pipeline backed by `content_drafts -> page_index -> location_content`
5. Standalone blog/resources content lanes backed by `blog_posts` and `resources`
6. Hidden or orphaned registry/homepage/editor infrastructure that is present but not unified into authority

The current problem is not missing architecture. The current problem is **split authority, incomplete visibility, and mixed deploy state**.

## Evidence Base

This audit is grounded in code, schema, and git-state reads from the current workspace, especially:

- `app/[...slug]/page.js`
- `app/pages/[slug]/page.js`
- `app/admin/pages/page.js`
- `features/admin/pages/PagesContent.jsx`
- `features/admin/pages/PageEditorContent.jsx`
- `app/api/admin/pages/route.js`
- `app/api/admin/pages/[id]/route.js`
- `app/admin/ccc/page.js`
- `features/admin/content/ContentInventoryContent.jsx`
- `app/api/admin/ccc/drafts/route.js`
- `app/api/admin/ccc/drafts/[id]/route.js`
- `app/api/jobs/scheduled-publish/route.js`
- `app/admin/seo/page.js`
- `features/admin/seo/SEOContent.jsx`
- `app/api/admin/seo/route.js`
- `app/api/admin/seo/analyze/route.js`
- `utils/seo.js`
- `lib/cms/resolveRoute.js`
- `lib/cms/resolveCmsRoute.js`
- `app/api/admin/cms/structure/route.js`
- `features/dynamic-home/HomePage.jsx`
- `features/dynamic-home/services/homepageService.js`
- `features/admin/AdminShell.jsx`
- `features/admin/tabs/HomeEditorTab.jsx`
- `app/api/admin/config/route.js`
- `app/admin/routeRegistry.js`

Schema and migration checks confirmed:

- `seo_overrides` is keyed by `route_path`, not `page_path`
- `page_versions` exists for custom pages
- `content_version_history` exists for drafts
- `rule16_publish_draft`, `rule16_update_custom_page`, `rule16_update_content_draft`, and `rule16_upsert_seo_override` all exist in migrations

Targeted git-state checks confirmed:

- `lib/cms/resolveRoute.js` and `lib/cms/resolveCmsRoute.js` are **untracked**
- `lib/ai/promptEngine.js` is **untracked**
- several page/draft runtime and admin files are tracked but currently modified

## Surface Inventory And Classification

Static core file-route lane covers the current inline-metadata routes such as `about`, `contact`, `apply`, `downloads`, `privacy-policy`, `terms-conditions`, `disclaimer`, `thank-you`, `tools`, and `bima-sakhi-delhi`.

| Surface | Key files / tables | Runtime | Admin | Discovery classification | Operational trust | Deploy safety | Final classification |
|---|---|---|---|---|---|---|---|
| Static core file-route lane | `app/about/page.js` and peer inline-metadata routes | Yes | No unified surface | `STATIC_RUNTIME`, `RUNTIME_ONLY` | Trusted runtime file-route authority | Safe | `DEPLOYMENT_SAFE` |
| SEO-wrapped static lane | `app/page.js`, `app/why/page.js`, `app/income/page.js`, `app/eligibility/page.js`, `utils/seo.js`, `seo_overrides` | Yes | Partial via `/admin/seo` | `STATIC_WRAPPED`, `RUNTIME_ONLY`, `PARTIALLY_OPERATIONAL` | Partial: helper reads `seo_overrides.page_path` while the table and admin API use `route_path` | Safe code, partial behavior | `PARTIALLY_RECOVERABLE` |
| Homepage DB lane | `features/dynamic-home/HomePage.jsx`, `features/dynamic-home/services/homepageService.js`, `homepage_sections` | Yes | No discovered authoritative editor | `DYNAMIC_DB`, `RUNTIME_ONLY`, `HIDDEN` | Runtime operational, admin-hidden | Safe | `HIDDEN_BUT_OPERATIONAL` |
| Orphaned homepage editor lane | `features/admin/AdminShell.jsx`, `features/admin/tabs/HomeEditorTab.jsx`, `app/api/admin/config/route.js` | No | No current route owner | `ORPHANED`, `HIDDEN` | Non-authoritative: edits config-form state, not `homepage_sections` | N/A | `ORPHANED` |
| Custom page lane | `app/admin/pages/*`, `features/admin/pages/*`, `app/api/admin/pages/*`, `app/pages/[slug]/page.js`, `custom_pages`, `page_blocks`, `page_versions` | Yes, via `/pages/[slug]` | Yes | `DYNAMIC_DB`, `ADMIN_VISIBLE`, `PARTIALLY_OPERATIONAL` | Strong CRUD and block persistence; richer fields exist in API than in the main UI workflow | Mixed | `PARTIALLY_RECOVERABLE` |
| Draft publish lane | `app/api/admin/ccc/drafts/*`, `app/api/jobs/scheduled-publish/route.js`, `content_drafts`, `page_index`, `location_content`, `content_version_history` | Yes, after publish | Yes | `DYNAMIC_DB`, `ADMIN_VISIBLE`, `PARTIALLY_OPERATIONAL` | Strong review/publish/schedule/version workflow | Mixed | `RECOVERABLE_SAFE` |
| Catch-all generated/hybrid lane | `app/[...slug]/page.js`, `page_index`, `location_content`, `page_blocks` | Yes | Indirect only | `HYBRID`, `DYNAMIC_DB`, `RUNTIME_ONLY`, `PARTIALLY_OPERATIONAL` | Direct `page_index` resolution works; unified shadow resolution depends on a feature flag plus untracked resolver files | Blocked for clean deploy | `RUNTIME_FRAGILE` |
| Unified content inventory lane | `app/admin/ccc/page.js`, `features/admin/content/ContentInventoryContent.jsx` | No | Yes | `ADMIN_VISIBLE`, `PARTIALLY_OPERATIONAL` | Strong inventory shell for drafts/pages/blog/resources, but no static-route or runtime-reachability authority | UI safe, underlying sources mixed | `ADMIN_FRAGMENTED` |
| Blog lane | `app/blog/*`, `app/admin/blog/page.js`, `app/api/admin/blog/route.js`, `blog_posts` | Yes | Yes | `DYNAMIC_DB`, `ADMIN_VISIBLE`, `PARTIALLY_OPERATIONAL` | CRUD and publish flow exist, but AI generation path imports untracked `lib/ai/promptEngine.js` | Fragile for clean deploy | `RUNTIME_FRAGILE` |
| Resources lane | `app/resources/page.js`, `app/admin/resources/page.js`, `app/api/admin/resources/route.js`, `resources` | Yes | Yes | `DYNAMIC_DB`, `ADMIN_VISIBLE` | Stable standalone content lane; registry integration is missing, not CRUD | Safe | `RECOVERABLE_SAFE` |
| SEO manager lane | `app/admin/seo/page.js`, `features/admin/seo/SEOContent.jsx`, `app/api/admin/seo/route.js`, `app/api/admin/seo/analyze/route.js` | Indirect | Yes | `ADMIN_VISIBLE`, `PARTIALLY_OPERATIONAL` | DB writes and AI analyze work; route seed is hardcoded to five defaults plus DB rows | Safe | `ADMIN_FRAGMENTED` |
| SEO index lane | `app/admin/seo/index/page.js`, `app/admin/seo/index-health/page.js`, `page_index` | No | Yes | `ADMIN_VISIBLE`, `PARTIALLY_OPERATIONAL` | Useful generated-page visibility only; excludes static routes, custom pages, blog, and resources | Safe | `ADMIN_FRAGMENTED` |
| CMS structure lane | `app/api/admin/cms/structure/route.js`, `content_topics`, `content_categories`, `internal_links`, `redirects`, `prompt_templates`, `page_index` | Indirect | Hidden API only | `HIDDEN`, `ADMIN_VISIBLE`, `PARTIALLY_OPERATIONAL` | Operational API, but discovered UI use is mostly limited to prompt templates for AI lanes | Safe | `HIDDEN_BUT_OPERATIONAL` |
| Admin route registry lane | `app/admin/routeRegistry.js` | No | Yes | `ADMIN_VISIBLE` | Hardcoded admin navigation only; it is not a page registry and does not discover runtime pages | Safe | `ADMIN_FRAGMENTED` |
| CMS resolver lane | `lib/cms/resolveRoute.js`, `lib/cms/resolveCmsRoute.js` | Intended yes | Hidden | `LOCAL_ONLY`, `HIDDEN` | Correct multi-source resolution intent exists, but current files are untracked and not deploy-safe | Blocked | `RUNTIME_FRAGILE` |

## Existing CRUD Recovery Analysis

| Capability | Confirmed working now | Partial / disconnected truth | Recovery note |
|---|---|---|---|
| Metadata editing | `custom_pages`, `content_drafts`, `blog_posts`, and `resources` all expose editable title/meta fields; generated pages read metadata from `location_content` | Static file routes still hold metadata in code; helper-wrapped statics are partially broken by the `route_path` vs `page_path` mismatch | Preserve lane-specific metadata editors, then unify visibility before changing runtime ownership |
| SEO editing | `/admin/seo` GET/PUT works against `seo_overrides`; `/api/admin/seo/analyze` exists and is AI-gated | UI seed is only five hardcoded default routes plus override rows; generated/blog/resources/static inline routes do not share one runtime override model | Recover continuity, do not replace the tooling |
| Slug management | Custom pages, drafts, and blog posts all enforce slug normalization / uniqueness | `full_slug` and `page_type` exist in APIs but are not first-class in the main page UI; runtime still splits between `/pages/[slug]`, root catch-all, and static file routes | Lift path awareness into a registry layer before changing editors |
| Publish / unpublish | Drafts publish through `rule16_publish_draft`; custom pages/blog/resources publish via status; scheduled publish cron exists | Static file routes are code-only and sit outside admin publish authority; catch-all reachability is partly dependent on the resolver lane | Preserve current publish mechanics by lane |
| Draft / review workflow | `content_drafts` supports draft/review/approve/reject/publish/archive with `content_version_history` | Custom pages have `page_versions` but not a comparable review lane; blog/resources are mostly status-only drafts | Treat "workflow" as lane-specific, not absent |
| AI optimization / generation | SEO analyze exists; custom page block generation exists at `/api/admin/ai/pages` | Blog AI generation depends on untracked `lib/ai/promptEngine.js`; no live AI surface governs static file routes or homepage sections | Preserve working AI lanes and quarantine fragile ones |
| Route registration / discovery | `page_index` fields, SEO index pages, CMS structure API, redirects table, and resolver logic already exist | No unified runtime registry exists; static file routes are not registered; admin route registry is hardcoded navigation only | Reconstruct a read-only registry first |
| Block rendering / structured content | `page_blocks.block_data` powers custom pages; `homepage_sections.props` powers the home page; `location_content` powers generated templates | These structures live in different tables and editors and are not one block system | Source-type classification should precede any future editor work |
| Persistence / rollback | Rule 16 RPCs exist; custom pages use `page_versions`; drafts use `content_version_history`; static file routes remain code-based and rollback-safe through git | No cross-surface identity model ties static, custom, generated, blog, and resource lanes together | Use existing RPC and version tables as the future foundation |

## Static Page Visibility Analysis

Static runtime pages are missing from admin authority surfaces for concrete structural reasons:

1. `/admin/pages` and the pages tab in `ContentInventoryContent` query only `custom_pages`; they do not index explicit file routes under `app/*`.
2. `/admin/seo` seeds visibility from five hardcoded `defaultRoutes` plus whatever already exists in `seo_overrides`; most static routes never enter that list.
3. `utils/seo.js` queries `seo_overrides.page_path`, while the table, RPC, audits, and admin API all use `route_path`. Helper-routed static pages therefore have partial runtime SEO continuity even when admin writes succeed.
4. `app/admin/routeRegistry.js` is a hardcoded admin navigation tree, not a runtime page registry.
5. `/admin/seo/index` and `/admin/seo/index-health` only report on `page_index`; they do not cover static file routes, `custom_pages`, `blog_posts`, or `resources`.
6. The live homepage reads `homepage_sections` directly, while the only discovered home editor is an unused `AdminShell` tab that writes operational config, not homepage section records.
7. Runtime authority is split across explicit file routes, legacy `/pages/[slug]`, and `app/[...slug]/page.js`, so admin visibility and public reachability diverge by design.

## Unified Page Registry Reconstruction Feasibility

| Need | Existing foundation | Verdict |
|---|---|---|
| Unified page indexing | `page_index`, `custom_pages`, `blog_posts`, `resources`, explicit `app/*` routes, and resolver candidate logic already exist | `PARTIAL_READY` |
| Source-type classification | `page_type`, `content_type`, `is_campaign_page`, route families, `page_index_structure`, and draft metadata fields exist | `PARTIAL_READY` |
| CRUD continuity | Existing admin APIs already cover custom pages, drafts, blog, and resources | `PARTIAL_READY` |
| Metadata continuity | Meta fields already exist across the major tables and static helper lanes | `PARTIAL_READY` |
| SEO continuity | `seo_overrides`, `/admin/seo`, and helper-based metadata loading exist | `PARTIAL_READY`, but helper continuity is broken and coverage is incomplete |
| AI continuity | SEO analyze, custom page block generation, prompt-template API, and bulk planner prompt-template consumption exist | `PARTIAL_READY`, but blog AI is fragile and static lanes have no AI ownership |
| Route continuity | Legacy `/pages/[slug]`, root catch-all, static file routes, blog routes, resources route, and redirects table all exist | `PARTIAL_READY` |
| Rollback-safe visibility | `page_versions`, `content_version_history`, Rule 16 RPCs, and code-backed static routes already provide rollback primitives | `PARTIAL_READY` |

**Conclusion:** a unified **read-only** page registry can be reconstructed now from existing systems without widening runtime authority. The registry should aggregate existing sources first, not replace them.

## Supabase Governance Readiness

| Target state | Readiness | Evidence | Blocking gap |
|---|---|---|---|
| Supabase-backed page authority | `PARTIAL_READY` | `custom_pages`, `page_index`, `content_drafts`, `blog_posts`, `resources`, Rule 16 RPCs | Static file routes and `homepage_sections` are not represented in one authority ledger |
| Centralized page registry | `PARTIAL_READY` | `page_index_structure`, resolver logic, existing inventory APIs | No unified operator surface; resolver files are untracked |
| Structured JSON blocks | `READY` | `page_blocks.block_data`, `homepage_sections.props` | Multiple schemas and editors, not one normalized block contract |
| Snapshot versioning | `PARTIAL_READY` | `page_versions`, `content_version_history` | Versioning is lane-specific, not cross-surface |
| Workflow states | `READY` | `content_drafts.status`, `custom_pages.status`, `blog_posts.status`, `resources.status` | Semantics differ by lane |
| Multi-site ownership | `NOT_READY` | No discovered page-surface ownership fields for site or tenant partitioning | Would require new authority design |
| AI-assisted editing | `PARTIAL_READY` | `/api/admin/seo/analyze`, `/api/admin/ai/pages`, prompt-template API | Blog AI depends on untracked `promptEngine`; no unified AI governance across all content lanes |

**Governance call:** Supabase is already good enough for recovery-safe registry reconstruction if the first move is **visibility unification**, not runtime cutover.

## Surgical Recovery Sequence

### Phase A - Capability Recovery

- Freeze the current runtime authority lanes as discovered here.
- Record one source-of-truth owner per lane: static code, homepage DB, custom pages, drafts/page_index, blog, resources, SEO overrides, hidden registry APIs.
- Verify the deploy state of resolver and prompt-engine dependencies before any runtime-facing changes.
- Exit when every surface is tagged, owned, and tied to a known runtime/admin path.

### Phase B - Unified Page Registry

- Build a read-only registry from existing sources: static route manifest, `homepage_sections`, `custom_pages`, `page_index`, `blog_posts`, `resources`, and `redirects`.
- Reuse current source-type fields instead of creating new authority tables first.
- Do not change routing, publishing, or runtime lookup order in this phase.
- Exit when one admin-visible list can explain every runtime route family.

### Phase C - Static-Page Admin Visibility

- Add static file routes and helper-wrapped routes to the registry and SEO inventory.
- Surface the live metadata source per route: inline code, `utils/seo.js`, `location_content`, `custom_pages`, `blog_posts`, or `resources`.
- Make homepage section authority visible as a distinct source type instead of pretending it is a page-builder surface.
- Exit when runtime-only static pages are no longer invisible to operators.

### Phase D - Unified CRUD Continuity

- Keep the existing editors and APIs by lane.
- Route registry rows to the right existing editor: custom pages -> `/admin/pages`, drafts -> `/admin/ccc/drafts`, blog -> `/admin/blog`, resources -> `/admin/resources`, static routes -> metadata-only visibility.
- Expose hidden fields already supported by APIs (`full_slug`, `page_type`, `parent_id`) only after the registry explains them.
- Exit when operators can move from one registry row to the correct existing edit surface without guessing.

### Phase E - Supabase Authority Integration

- Commit or replace the untracked resolver/prompt dependencies before any deploy-facing authority work.
- Move to a Supabase-backed central registry only as a read-only overlay first.
- Preserve Rule 16 RPCs, existing status models, and version tables.
- Exit when registry visibility is deploy-safe without changing public routing authority.

### Phase F - Future Block / Editor Foundation

- Only after phases A-E are stable.
- Reuse `page_blocks`, `page_versions`, `content_version_history`, prompt templates, and the registry source-type model as the design input.
- Do not start from a rebuild assumption; start from recovered lanes and proven gaps.
- Exit with an editor-architecture brief, not an uncontrolled rewrite.

## Final Surface Classifications

No discovered surface remains unclassified.

| Surface | Final classification | Why |
|---|---|---|
| Static core file-route lane | `DEPLOYMENT_SAFE` | Runtime authority is explicit, tracked, and stable; the gap is admin visibility, not runtime failure |
| SEO-wrapped static lane | `PARTIALLY_RECOVERABLE` | Existing SEO override plumbing is recoverable, but helper runtime continuity is currently partial |
| Homepage DB lane | `HIDDEN_BUT_OPERATIONAL` | Runtime reads `homepage_sections` successfully, but no active authoritative admin surface owns it |
| Orphaned homepage editor lane | `ORPHANED` | Present in code, not routed, and not writing to the live homepage authority table |
| Custom page lane | `PARTIALLY_RECOVERABLE` | CRUD, blocks, and versioning exist; visibility and path authority remain fragmented |
| Draft publish lane | `RECOVERABLE_SAFE` | Workflow, scheduling, publish RPCs, and versioning exist without requiring a redesign |
| Catch-all generated/hybrid lane | `RUNTIME_FRAGILE` | Core runtime works, but unified resolution depends on untracked resolver code |
| Unified content inventory lane | `ADMIN_FRAGMENTED` | Strong shell, incomplete authority coverage |
| Blog lane | `RUNTIME_FRAGILE` | Standard CRUD exists, but the tracked admin route imports an untracked prompt engine |
| Resources lane | `RECOVERABLE_SAFE` | Stable content lane with clear CRUD and runtime rendering, but still siloed from unified registry truth |
| SEO manager lane | `ADMIN_FRAGMENTED` | UI and DB writes exist, but coverage and runtime continuity are incomplete |
| SEO index lane | `ADMIN_FRAGMENTED` | Useful for `page_index`, not for unified page authority |
| CMS structure lane | `HIDDEN_BUT_OPERATIONAL` | Registry plumbing exists in API form, but most of it is not surfaced for operators |
| Admin route registry lane | `ADMIN_FRAGMENTED` | Navigation authority exists, page authority does not |
| CMS resolver lane | `RUNTIME_FRAGILE` | Correct recovery direction exists in code, but current deploy state is blocked |

## Recovery Call

Recover and unify the **existing** page/content capability surface before introducing any new registry, Supabase authority cutover, block architecture rewrite, or AI-assisted editor architecture.