# PAGE AUTHORITY UNIFICATION

Date: 2026-05-21
Status: FIRST CANONICAL UNIFICATION LAYER IMPLEMENTED LOCALLY
Classification: PARTIALLY_UNIFIED / ROLLBACK_SAFE / NO_RUNTIME_AUTHORITY_WIDENING

## Purpose

Implement the first rollback-safe canonical page-authority unification layer that aligns runtime rendering, CRUD authority, metadata authority, indexing authority, SEO authority, and admin visibility without introducing a new editor architecture, new universal CRUD authority, or uncontrolled runtime widening.

## Scope Implemented

1. Metadata authority normalization
   - `utils/seo.js` now reads `seo_overrides.route_path` instead of the non-authoritative `page_path` lookup.
   - Runtime metadata now consumes canonical URL and robots overrides in addition to title, description, and OG image overrides.
   - Missing overrides now use `maybeSingle()` instead of treating the non-existence of an override row as an exception path.

2. Runtime metadata alignment
   - `app/[...slug]/page.js` now applies shared SEO override resolution on top of generated-page and custom-page metadata.
   - `app/pages/[slug]/page.js` now applies shared SEO override resolution on top of canonical custom-page metadata.
   - `app/blog/[slug]/page.js` now applies shared SEO override resolution on top of canonical blog metadata.
   - Canonical URL and robots metadata from `custom_pages`, `page_index`, and `blog_posts` are now reflected in runtime metadata before `seo_overrides` are layered on top.

3. Catch-all runtime authority hardening
   - `app/[...slug]/page.js` no longer imports untracked `lib/cms/resolveRoute.js`.
   - The catch-all now uses a bounded in-file resolver that preserves the current runtime contract only for `page_index` and `custom_pages`.
   - Explicit App Router routes still win over catch-all resolution.
   - The `cms_unified_resolver_enabled` flag remains the gate for shadow resolution behavior.

4. Prompt-authority hardening
   - Tracked authority surfaces no longer import untracked `lib/ai/promptEngine.js`.
   - Minimal tracked prompt-normalization and prompt-template resolution helpers were inlined into:
     - `app/api/jobs/pagegen/route.js`
     - `app/api/admin/blog/route.js`
     - `app/api/admin/ccc/generate-single/route.js`
     - `app/api/admin/ccc/bulk/route.js`
     - `app/api/admin/ccc/bulk/[id]/route.js`
   - Template-enabled behavior remains preserved through tracked `featureFlags` and `promptTemplates` dependencies.

5. Canonical admin visibility layer
   - `app/api/admin/seo/route.js` now returns a canonical read-only page-authority registry in addition to SEO overrides.
   - `features/admin/seo/SEOContent.jsx` now renders that registry and exposes classification data across:
     - static file routes
     - helper-wrapped static routes
     - custom pages
     - generated `page_index` pages
     - generated drafts
     - blog posts
     - override-only orphan surfaces
   - The UI only permits SEO editing where the current runtime actually consumes route-level overrides.
   - Routes whose metadata remains inline/static are visible but explicitly read-only, preventing false CRUD or false SEO authority claims.

## Authority Model After This Change

### Runtime-authoritative and SEO-authoritative

- Helper-wrapped static routes already using the shared SEO helper (`/`, `/why`, `/income`, `/eligibility`)
- Custom pages at canonical `/pages/[slug]`
- Published `page_index` pages resolved by the catch-all when they are not shadowed by explicit routes
- Published blog posts at `/blog/[slug]`

### CRUD-authoritative and admin-visible only

- Unpublished or non-runtime `content_drafts`
- Non-published custom pages
- Non-published blog posts

### Admin-visible but read-only classified

- Static inline-metadata routes such as `/about`, `/contact`, `/apply`, `/downloads`, `/privacy-policy`, `/terms-conditions`, `/disclaimer`, `/thank-you`, `/tools`, `/resources`, and `/blog`

### Explicitly fragile or fragmented

- Stored override rows with no currently classified runtime surface
- Generated `page_index` routes whose path collides with an explicit App Router route
- Custom pages carrying a feature-flagged shadow root path distinct from the stable `/pages/[slug]` path

## Boundaries Preserved

- No new CMS topology was introduced.
- No new page registry became runtime-authoritative.
- `/admin/pages` remains a `custom_pages` CRUD/editor surface only.
- Generated pages remain catch-all runtime surfaces backed by `page_index` and `location_content`.
- Draft publish authority remains `content_drafts -> rule16_publish_draft -> page_index/location_content`.
- Custom pages remain canonically runtime-safe at `/pages/[slug]`; feature-flagged root-path shadow behavior is visible but not promoted to canonical authority.
- Explicit file routes still outrank the catch-all route.

## Validated Outcomes

- Touched files are diagnostics-clean under `get_errors`.
- Tracked runtime and prompt-authority surfaces no longer import untracked `resolveRoute.js` or `promptEngine.js`.
- A later local production build completed successfully during static authority integration validation, confirming the active page-authority slice also survives full build.

## Remaining Fragility Zones

1. Static inline metadata routes are now classified and admin-visible, but they are still not runtime-wired to consume `seo_overrides`.
2. Local untracked files `lib/ai/promptEngine.js`, `lib/cms/resolveRoute.js`, and `lib/cms/resolveCmsRoute.js` still exist in the worktree as inert local artifacts; they no longer participate in tracked authority paths.
3. This layer is local until committed; rollback visibility at git history level still depends on the user’s normal commit flow.

## Final Classification

- Runtime authority: PARTIALLY_UNIFIED
- CRUD authority: EXPLICITLY_BOUNDED
- Metadata authority: RECONCILED_FOR_DYNAMIC_SURFACES
- SEO override authority: RECONCILED_FOR_WIRED_RUNTIME_SURFACES
- Admin visibility: CANONICAL_READ_ONLY_REGISTRY_ESTABLISHED
- Runtime widening: NOT AUTHORIZED
- Editor rebuild: NOT AUTHORIZED
