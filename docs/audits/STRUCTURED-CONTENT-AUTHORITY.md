# STRUCTURED CONTENT AUTHORITY

Date: 2026-05-22
Status: FIRST DETERMINISTIC STRUCTURED-CONTENT AUTHORITY LAYER IMPLEMENTED LOCALLY
Classification: ENABLED / ROLLBACK_SAFE / RUNTIME_AUTHORITY_PRESERVED

## Objective

Implement the first rollback-safe deterministic structured-content authority layer capable of aligning structured ownership, metadata authority, SEO authority, registry continuity, and runtime-compatible content authority without widening runtime authority, rewriting App Router precedence, or turning protected layout/runtime surfaces into admin-owned editors.

## Step 1 — Structured Content Surface Reconstruction

The canonical registry in `app/api/admin/seo/route.js` now classifies runtime-compatible structured surfaces on top of the previously recovered runtime and editable authority layers.

Discovered runtime-compatible structured surfaces:

- custom page block surfaces backed by `custom_pages`, `page_blocks`, and `page_versions`
- published generated surfaces backed by `page_index` plus `location_content`
- generated draft surfaces backed by `content_drafts` plus `content_version_history`
- blog post record surfaces backed by `blog_posts`
- helper-wired static metadata/SEO surfaces backed by explicit App Router files plus `utils/seo.js`
- hybrid runtime-content surfaces where explicit route files remain authoritative but metadata or related managers remain structured
- inline static and hidden runtime surfaces that remain file-owned and read-only by design
- orphaned override-only registry rows with no classified runtime owner

## Step 1.25 — Structured Authority Classification Model

Every structured-content surface is now explicitly classifiable through these authority labels:

- `RUNTIME_AUTHORITATIVE`
- `STRUCTURED_CONTENT`
- `METADATA_STRUCTURED`
- `SEO_STRUCTURED`
- `REGISTRY_VISIBLE`
- `LAYOUT_PROTECTED`
- `PARTIALLY_OPERATIONAL`
- `HELPER_FRAGMENTED`
- `STATIC_RUNTIME`
- `HYBRID_RUNTIME`
- `READ_ONLY_BY_DESIGN`

No structured surface remains semantically implicit. Runtime rendering ownership still comes from route files and runtime renderers. The registry now describes structured ownership without inheriting runtime authority.

## Structured Surface Matrix

| Surface Group | Runtime Owner | Structured Owner Model | Structured Labels | Final Classification | Structured Durability |
|---|---|---|---|---|---|
| Live custom block pages | `app/pages/[slug]/page.js` | `BLOCK_COLLECTION` | `RUNTIME_AUTHORITATIVE`, `STRUCTURED_CONTENT`, `METADATA_STRUCTURED`, `SEO_STRUCTURED`, `REGISTRY_VISIBLE`, `LAYOUT_PROTECTED` | `STRUCTURED_SAFE` when runtime-live and unshadowed; otherwise `PARTIALLY_STRUCTURED` | `DURABLE` when unshadowed |
| Published generated pages with linked draft | `app/[...slug]/page.js` | `PUBLISHED_FIELD_SET` | `RUNTIME_AUTHORITATIVE`, `STRUCTURED_CONTENT`, `METADATA_STRUCTURED`, `SEO_STRUCTURED`, `REGISTRY_VISIBLE`, `LAYOUT_PROTECTED`, `PARTIALLY_OPERATIONAL` | `PARTIALLY_STRUCTURED` | `PARTIALLY_DURABLE` |
| Published generated pages without linked draft or path shadowed by explicit route | `app/[...slug]/page.js` or explicit route collision | `PUBLISHED_FIELD_SET` | `STRUCTURED_CONTENT`, `METADATA_STRUCTURED`, `REGISTRY_VISIBLE`, `LAYOUT_PROTECTED`, `PARTIALLY_OPERATIONAL` | `OWNERSHIP_FRAGILE` | `OWNERSHIP_FRAGILE` |
| Draft-only generated surfaces | admin-only draft lane | `DRAFT_FIELD_SET` | `STRUCTURED_CONTENT`, `METADATA_STRUCTURED`, `REGISTRY_VISIBLE`, `LAYOUT_PROTECTED`, `PARTIALLY_OPERATIONAL` | `PARTIALLY_STRUCTURED` | `PARTIALLY_DURABLE` |
| Blog post surfaces | `app/blog/[slug]/page.js` | `RICH_TEXT_RECORD` | `RUNTIME_AUTHORITATIVE`, `STRUCTURED_CONTENT`, `METADATA_STRUCTURED`, `SEO_STRUCTURED`, `REGISTRY_VISIBLE`, `LAYOUT_PROTECTED` | `PARTIALLY_STRUCTURED` | `DURABLE` |
| Helper-wired static metadata routes | explicit static App Router files using `getSeoMetadata()` | `FILE_ROUTE_RUNTIME` | `RUNTIME_AUTHORITATIVE`, `METADATA_STRUCTURED`, `SEO_STRUCTURED`, `REGISTRY_VISIBLE`, `LAYOUT_PROTECTED`, `STATIC_RUNTIME` | `PARTIALLY_STRUCTURED` | `DURABLE` |
| Hybrid public static routes with related manager but no per-route structured editor | explicit static App Router files | `HYBRID_ROUTE_RUNTIME` | `RUNTIME_AUTHORITATIVE`, `METADATA_STRUCTURED`, `REGISTRY_VISIBLE`, `LAYOUT_PROTECTED`, `STATIC_RUNTIME`, `HYBRID_RUNTIME` | `PARTIALLY_STRUCTURED` | `PARTIALLY_DURABLE` |
| Inline static or hidden runtime surfaces without bounded structured lane | explicit App Router files | `FILE_ROUTE_RUNTIME` | `RUNTIME_AUTHORITATIVE`, `METADATA_STRUCTURED`, `REGISTRY_VISIBLE`, `LAYOUT_PROTECTED`, `STATIC_RUNTIME`, `READ_ONLY_BY_DESIGN` | `READ_ONLY_BY_DESIGN` | `PARTIALLY_DURABLE` |
| Override-only orphan registry paths | none | `OVERRIDE_ONLY` | `REGISTRY_VISIBLE`, `LAYOUT_PROTECTED` | `OWNERSHIP_FRAGILE` | `OWNERSHIP_FRAGILE` |

## Step 1.75 — Structured Ownership Durability Model

Structured durability is now expressed independently from editability:

- `DURABLE`: the structured lane is backed by tracked runtime or tracked structured-storage ownership with deterministic rollback visibility
- `PARTIALLY_DURABLE`: the structured lane exists, but helper alignment, draft linkage, or route/file isolation still splits ownership
- `OWNERSHIP_FRAGILE`: the registry can see the surface, but deterministic structured ownership is missing or shadowed

Current durable zones:

- live custom block pages
- live blog posts
- helper-wired static metadata routes

Current partially durable zones:

- draft-linked generated pages
- admin-visible drafts
- hybrid static routes with related managers
- file-owned static runtime surfaces that remain intentionally read-only

Current fragile zones:

- published generated pages without linked draft ownership
- shadowed generated paths
- override-only orphan rows

## Step 2 — Structured Ownership Reconstruction

The new layer reuses existing infrastructure instead of inventing a new CMS topology:

- `custom_pages` + `page_blocks` + `page_versions` already provide deterministic block-structured ownership
- `content_drafts` + `content_version_history` already provide deterministic draft field ownership
- `page_index` + `location_content` already provide deterministic runtime field structure for catch-all generated pages
- `blog_posts` already provide deterministic record-backed content plus metadata ownership
- `utils/seo.js` already provides helper-wired route-path SEO override continuity
- `/api/admin/seo` already provides canonical registry continuity

Reconstructed risks that remain explicit:

- schema-shadow ambiguity when `page_index` paths are shadowed by explicit App Router routes
- helper-shadow ambiguity when helper-wired metadata exists without a bounded structured content lane
- metadata inheritance ambiguity on file-owned static routes that inherit or inline metadata but remain read-only
- route-authority ambiguity if registry visibility were mistaken for runtime ownership
- rollback ambiguity for orphaned override-only rows or published generated paths with no linked draft owner

The implemented layer prevents:

- fake structured ownership on file-owned static routes
- silent structured promotion of runtime layout authority
- silent metadata divergence beyond route-owned or record-owned authority
- registry/admin mismatch where no deterministic owner exists

## Step 2.25 — Structured Metadata & Content Validation

Runtime-compatible structured authority is now reconciled as follows:

- runtime authority remains highest in explicit route files and the catch-all renderer
- structured content authority exists only where a deterministic structured storage lane already exists
- metadata authority remains record-owned or route-owned depending on surface type
- SEO authority remains helper-wired through `route_path` only where runtime consumes it
- registry authority remains descriptive, not execution-authoritative
- generated authority remains lower than runtime authority and only becomes runtime-relevant through the draft/publish pipeline

No structured surface now needs to silently bypass runtime truth in order to become registry-visible.

## Step 2.75 — Field Authority Precedence Model

Field precedence after this sprint is:

1. Runtime rendering authority in explicit App Router files and runtime renderers
2. Runtime data contract authority in `custom_pages`, `page_blocks`, `page_index`, `location_content`, `content_drafts`, and `blog_posts`
3. Structured field ownership classification in `/api/admin/seo`
4. Metadata authority (`meta_title`, `meta_description`, `canonical_url`, `robots_setting`) in record-owned or route-owned lanes
5. SEO authority through helper-wired `seo_overrides.route_path` consumption
6. Registry authority in `/admin/seo`
7. Generated authority only through draft/publish workflows

Lower-authority registry or generated lanes never outrank runtime rendering.

## Step 3 — Structured Admin Visibility Reconstruction

`/admin/seo` now exposes deterministic structured visibility through:

- structured classification filters
- structured summary counts
- structured authority badges
- structured owner model and storage lane details
- structured durability, registry durability, and version-readiness fields
- bounded structured editor links where an existing tracked surface already owns them

Admin visibility remains bounded:

- no new layout editor
- no new visual builder
- no source-file editor
- no universal static-route CRUD

## Step 3.5 — Structured Block Readiness Validation

Future structured-block infrastructure is already survivable for the `custom_pages` lane because:

- runtime rendering remains in `app/pages/[slug]/page.js`
- blocks remain stored in `page_blocks`
- rollback snapshots remain stored in `page_versions`
- layout authority remains protected

Future structured-block infrastructure is only partially ready for catch-all generated pages because those pages still render through fixed runtime templates backed by structured fields, not reusable block contracts.

## Step 3.75 — Structured Visibility Durability Model

Structured visibility currently preserves:

- rollback continuity: `DURABLE`
- runtime rendering continuity: `DURABLE`
- metadata continuity: `DURABLE` where record-owned or helper-wired, `PARTIALLY_DURABLE` overall
- SEO continuity: `DURABLE` where `route_path` is consumed, `PARTIALLY_DURABLE` overall
- registry continuity: `DURABLE`
- deterministic ownership continuity: `PARTIALLY_DURABLE` overall because helper fragmentation and orphaned generated paths remain

## Step 4 — Structured Content Authority Plan

### Phase A

- classify structured surfaces in the canonical registry
- align helper-wired metadata/SEO surfaces with explicit structured ownership labels
- normalize read-only-by-design static surfaces so they stop implying fake structured ownership

### Phase B

- expose structured SEO authority and bounded structured content authority in `/admin/seo`
- emit deterministic structured owner models and storage lanes
- reuse existing draft/page/blog editors as registry-backed field owners

### Phase C

- validate rollback continuity
- validate runtime continuity
- validate deterministic ownership continuity
- validate structured registry durability and version readiness

This sequence preserves App Router precedence, catch-all precedence, and existing runtime rendering contracts.

## Step 4.5 — Snapshot & Version Readiness Validation

Snapshot/version readiness classes now map as follows:

- `SURVIVABLE`: custom pages, content drafts, linked-draft generated pages, tracked file-owned runtime surfaces
- `PARTIALLY_SURVIVABLE`: blog posts and hybrid/read-only runtime surfaces without dedicated structured snapshot lanes
- `VERSIONING_FRAGILE`: orphaned override-only paths and structured surfaces with missing deterministic owner linkage

## Step 5 — Rollback & Structured Ownership Validation

The active structured-authority slice remains rollback-safe because the owning surfaces are tracked and deployment-visible:

- `app/api/admin/seo/route.js`
- `features/admin/seo/SEOContent.jsx`
- `utils/seo.js`
- `components/layout/GeneratedPageTemplate.jsx`
- `features/admin/pages/PageEditorContent.jsx`
- `app/api/admin/pages/[id]/route.js`
- `app/api/admin/ccc/drafts/[id]/route.js`

Active helper/runtime evidence:

- `GeneratedPageTemplate.jsx` renders structured catch-all fields from `location_content`
- `PageEditorContent.jsx` edits block-structured custom pages and uses `page_versions`
- `app/api/admin/ccc/drafts/[id]/route.js` uses `content_version_history`
- `utils/seo.js` remains the tracked SEO helper authority path

Inactive local-only helper evidence:

- `lib/cms/resolveRoute.js` is untracked and not imported by active structured-authority paths
- `lib/cms/resolveCmsRoute.js` is untracked and not imported by active structured-authority paths
- `lib/ai/promptEngine.js` is untracked and not imported by active structured-authority paths

These files remain outside the active structured-authority import graph and therefore do not currently define deployment-visible structured ownership.

## Step 5.5 — Structured Registry Durability Validation

Registry continuity classifications now resolve as:

- `DURABLE`: tracked surfaces with deterministic runtime owner or deterministic structured editor path
- `PARTIALLY_DURABLE`: tracked surfaces whose ownership is still split across helper/file/draft boundaries
- `REGISTRY_FRAGILE`: orphaned override-only rows or structured surfaces with no deterministic owner

## Remaining Fragmentation Risks

- generated pages without linked draft ownership remain the clearest structured ownership gap
- helper-wired static metadata lanes remain metadata/SEO structured without becoming content-structured
- hybrid public static routes still depend on related managers rather than per-route structured ownership
- read-only file-owned routes remain intentionally bounded and must not be mistaken for admin-owned structured content

## Final Authorization

- live custom block pages: `STRUCTURED_SAFE`
- live generated pages with linked draft: `PARTIALLY_STRUCTURED`
- draft-only generated surfaces: `PARTIALLY_STRUCTURED`
- live blog posts: `PARTIALLY_STRUCTURED`
- helper-wired static metadata/SEO routes: `PARTIALLY_STRUCTURED`
- file-owned static or hidden runtime surfaces without bounded structured lane: `READ_ONLY_BY_DESIGN`
- generated paths without linked owner or override-only orphan rows: `OWNERSHIP_FRAGILE`

This sprint reconstructs deterministic structured ownership only. It does not authorize a visual CMS, runtime-renderer rewrite, App Router precedence change, catch-all redesign, unrestricted AI generation, or layout-authority widening.