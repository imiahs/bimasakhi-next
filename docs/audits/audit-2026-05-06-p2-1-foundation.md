# P2.1 Foundation Layer - Current Behavior Lock

Date: 2026-05-06

## Scope

Phase 2.1 is foundation-only. It does not change DB schema, public routing, publish behavior, sitemap behavior, or AI generation behavior.

## Current Routing Behavior

- `custom_pages` render through `/pages/[slug]`.
- `page_index` generated pages render through the existing root catch-all only when current flat `page_slug` rows are published and resolvable.
- `blog_posts` render through `/blog/[slug]`.
- Existing explicit App Router pages keep priority over catch-all routing.

## Current Slug Behavior

- The active CMS system is flat.
- `custom_pages.slug` is a single slug value and is currently exposed under `/pages/{slug}`.
- `page_index.page_slug` is a flat generated slug in current generation paths.
- `blog_posts.slug` is a single slug value exposed under `/blog/{slug}`.
- Nested authoring is not enabled in Phase 2.1.

## Hierarchy Status

- `parent_id`, `full_slug`, and `page_type` are display-only compatibility fields in Phase 2.1.
- These values are derived in admin API responses from existing fields.
- No hierarchy is persisted in this phase.
- No resolver is connected to public routing in this phase.

## Feature Flags Added

All default to `false`:

- `cms_unified_resolver_enabled`
- `cms_nested_urls_enabled`
- `ai_prompt_templates_enabled`

## Read-Only Foundation Added

- A CMS resolver helper exists for audits and later wiring.
- The helper reads `custom_pages`, `page_index`, and `blog_posts`.
- It is not imported by any public route.

## Validation Requirements

- Build must pass.
- Existing public URL behavior must remain unchanged.
- Admin content surfaces must still load.
- P2.1 audit scripts must be read-only.

