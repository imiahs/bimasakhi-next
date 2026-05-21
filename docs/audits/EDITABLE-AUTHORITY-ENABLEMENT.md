# EDITABLE AUTHORITY ENABLEMENT

Date: 2026-05-21
Status: FIRST BOUNDED EDITABLE-AUTHORITY LAYER IMPLEMENTED LOCALLY
Classification: ENABLED / ROLLBACK_SAFE / NO_RUNTIME_AUTHORITY_WIDENING

## Objective

Implement the first rollback-safe bounded editable-authority layer capable of aligning editable visibility, metadata authority, SEO authority, registry continuity, and runtime-compatible ownership without widening runtime authority, replacing explicit file-route ownership, or pretending that every runtime surface is fully editable.

## Implemented Surface

- `app/api/admin/seo/route.js` now derives deterministic editability from the already-classified registry surface instead of inventing a new editor topology.
- `features/admin/seo/SEOContent.jsx` now renders the canonical editable-authority registry, supports `?path=<route>` deep links, and only shows action links for existing bounded editor lanes.
- `features/admin/pages/PagesContent.jsx` now supports `?edit=<id>` deep-link opening for metadata edits and exposes `canonical_url` plus `robots_setting` in the existing page metadata modal.
- `features/admin/blog/BlogContent.jsx` now supports `?edit=<id>` deep-link opening and exposes `canonical_url` plus `robots_setting` in the existing blog editor form.
- Existing APIs for custom pages and blog posts were reused as-is; this sprint did not require schema changes or a new editor backend.

## Editability Classification Model

The canonical registry now emits these editability classifications per surface:

- `EDITABILITY_SAFE`: the runtime-live surface already has a bounded metadata/content editor lane and remains aligned with runtime ownership.
- `PARTIALLY_EDITABLE`: the surface has one or more bounded edit lanes, but ownership is still split across helpers, drafts, or route-level SEO overrides.
- `READ_ONLY_BY_DESIGN`: the surface is visible in the registry but intentionally has no bounded edit lane.
- `EDITABILITY_FRAGILE`: the surface is visible but depends on orphaned override state or already-fragile authority boundaries.

The registry now also emits lane-specific booleans and durability fields:

- `supports_metadata_edit`
- `supports_content_edit`
- `supports_seo_edit`
- `editability_durability`
- `layout_protected`
- `editable_authority_labels`

`layout_protected` is always `true` in this layer. The sprint authorizes metadata, content, and SEO lane visibility only. It does not authorize visual layout editing or source-file editing from the admin.

## Deterministic Editor Targets

The layer only emits links to pre-existing bounded editors:

| Surface Type | Metadata Lane | Content Lane | SEO Lane | Final Rule |
|---|---|---|---|---|
| `custom_page` | `/admin/pages?edit=<id>` | `/admin/pages/<id>` | `/admin/seo?path=<route>` when override-wired | `EDITABILITY_SAFE` when runtime-live and not shadowed; otherwise `PARTIALLY_EDITABLE` |
| `blog_post` | `/admin/blog?edit=<id>` | `/admin/blog?edit=<id>` | `/admin/seo?path=<route>` when override-wired | `EDITABILITY_SAFE` when runtime-live; otherwise `PARTIALLY_EDITABLE` |
| `page_index` with linked draft | `/admin/ccc/drafts/<id>` | `/admin/ccc/drafts/<id>` | `/admin/seo?path=<route>` when override-wired | `PARTIALLY_EDITABLE` unless already authority-fragile |
| `content_draft` | `/admin/ccc/drafts/<id>` | `/admin/ccc/drafts/<id>` | none | always `PARTIALLY_EDITABLE` |
| Helper-wrapped or hybrid runtime surfaces | none | none | `/admin/seo?path=<route>` when runtime helper consumes `route_path` override | `PARTIALLY_EDITABLE` |
| Inline static or hidden runtime surfaces without live edit lanes | none | none | only when runtime override consumption already exists | usually `READ_ONLY_BY_DESIGN` |
| Override-only orphan paths | none | none | none | always `EDITABILITY_FRAGILE` |

No new registry row emits a link to a new or synthetic editor. All links terminate at already-existing bounded admin surfaces.

## Authority Labels And Ownership Evidence

The registry now composes editability labels on top of the prior runtime and static authority model:

- `REGISTRY_VISIBLE`
- `RUNTIME_AUTHORITATIVE` when the runtime surface actually owns rendering
- `STATIC_RUNTIME` or `HYBRID_RUNTIME` when inherited from the runtime classifier
- `PARTIALLY_OPERATIONAL` when inherited from fragmented helper-backed runtime ownership
- `HELPER_FRAGMENTED` when the prior authority model already marked the surface as fragmented
- `METADATA_EDITABLE` only when a bounded metadata lane exists
- `CONTENT_EDITABLE` only when a bounded content lane exists
- `SEO_EDITABLE` only when the route already consumes `seo_overrides.route_path`
- `READ_ONLY_BY_DESIGN` only when no bounded edit lane exists
- `LAYOUT_PROTECTED` always

This means editable visibility remains downstream of runtime truth. The registry describes existing authority. It does not create new runtime authority.

## Runtime Vs Editable Authority Precedence

Authority precedence after this sprint is:

1. Runtime rendering ownership in explicit route files and the existing dynamic runtime renderers
2. Record-owned metadata and content authority in `custom_pages`, `blog_posts`, `page_index`, and `content_drafts`
3. Helper-wired route-level SEO override consumption through `seo_overrides.route_path`
4. Canonical editable-authority classification in `/api/admin/seo`
5. Admin visibility and deep-link affordances in `/admin/seo`

Important preserved boundary:

- editable visibility does not equal runtime ownership
- metadata editability does not equal layout editability
- registry continuity does not replace route authority
- source-file routes remain production-authoritative

## Rollback-Safe Ownership Evidence

- Static-authority baseline checkpoint remains preserved as `288cf959aafebc99b154d637ca2d7806082cde03`.
- The editable-authority layer reuses tracked authority surfaces instead of introducing a new runtime resolver.
- The sprint does not widen `/admin/pages` into a universal editor for static file routes.
- The sprint does not change `app/[...slug]/page.js`, `app/pages/[slug]/page.js`, `app/blog/[slug]/page.js`, or any static route owner file.
- The sprint keeps runtime layout ownership in code while exposing bounded metadata/content/SEO lanes only where ownership already existed.

## Remaining Fragmentation And Fragility

- Inline static runtime routes remain registry-visible but largely read-only by design.
- Override-only orphan `seo_overrides` rows remain `EDITABILITY_FRAGILE` because no runtime-authoritative surface was classified for them.
- Helper-backed static and hybrid surfaces can still be only partially editable because SEO override consumption does not imply content ownership.
- The resources lane was not widened in this phase beyond existing registry visibility.
- Local untracked helper artifacts remain outside the active editable-authority slice and were not promoted into authority.

## Surgical Sequence Implemented

### Phase A

- Extend the canonical registry response with editability booleans, editor targets, labels, and durability.
- Preserve prior authority classification and layer editability on top of it.

### Phase B

- Surface those bounded lanes in `/admin/seo` through summary cards, filters, deep links, and route action links.
- Add canonical/robots controls to existing custom-page and blog metadata editors.

### Phase C

- Validate touched files with diagnostics.
- Validate a full local production build after a clean `.next` rebuild.
- Preserve the static-authority checkpoint separately from current working changes.

## Final Authorization

- live custom pages: `EDITABILITY_SAFE`
- live blog posts: `EDITABILITY_SAFE`
- linked draft and page-index surfaces: `PARTIALLY_EDITABLE`
- helper-wired SEO-only surfaces: `PARTIALLY_EDITABLE`
- inline static and hidden runtime surfaces without bounded lanes: `READ_ONLY_BY_DESIGN`
- orphan override-only registry rows: `EDITABILITY_FRAGILE`

This sprint authorizes deterministic bounded editability only. It does not authorize runtime-authority centralization, static file CRUD, drag-drop builders, source editing from admin, or layout mutation through the registry.