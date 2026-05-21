# STATIC AUTHORITY INTEGRATION

Date: 2026-05-21
Status: FIRST STATIC-RUNTIME AUTHORITY INTEGRATION LAYER IMPLEMENTED LOCALLY
Classification: PARTIALLY_INTEGRATED / ROLLBACK_SAFE / NO_RUNTIME_AUTHORITY_WIDENING

## Objective

Implement the first rollback-safe static-runtime authority integration layer capable of aligning explicit static runtime pages, metadata authority, registry visibility, SEO authority, and admin visibility without rewriting runtime architecture, widening runtime authority, or introducing fake CRUD ownership.

## Discovery Result

- Explicit static App Router page files are now inventoried through a tracked manifest embedded in `app/api/admin/seo/route.js`.
- Validation proved exact coverage: `actual=76`, `manifest=76` for non-dynamic `app/**/page.js` routes.
- Discovery scope covered:
  - 18 public static routes
  - 4 agent runtime routes
  - 54 internal admin runtime routes
- Dynamic lanes remain separate and intentionally preserved:
  - `app/[...slug]/page.js`
  - `app/pages/[slug]/page.js`
  - `app/blog/[slug]/page.js`

## Static Authority Classification Model

Every explicit static route now enters the canonical registry with explicit labels drawn from this model:

- `STATIC_RUNTIME`: explicit non-dynamic `app/**/page.js` runtime ownership
- `STATIC_WRAPPED`: route metadata already flows through `getSeoMetadata()`
- `HYBRID_RUNTIME`: explicit route combined with runtime data loading or async server rendering
- `REGISTRY_VISIBLE`: visible through `/api/admin/seo` and `/admin/seo`
- `RUNTIME_ONLY`: runtime-owned but not backed by a dedicated override/editor lane
- `METADATA_OVERRIDE_CAPABLE`: route-level override consumption is live through `route_path`
- `PARTIALLY_OPERATIONAL`: visible and classified, but not fully metadata-normalized
- `HIDDEN_RUNTIME`: internal admin runtime path, not a public SEO ownership surface
- `SEO_AUTHORITATIVE`: runtime metadata is still determined by file route or route-owned metadata function
- `ADMIN_VISIBLE`: visible in canonical admin registry
- `FRAGMENTED`: visible but still separated from helper-wired route-level override authority

No explicit static runtime page remains unclassified in the registry response.

## Surface Group Classifications

| Surface Group | Examples | Authority Labels | Boundary | Durability | Final Authorization |
|---|---|---|---|---|---|
| Helper-wrapped public static routes | `/`, `/why`, `/income`, `/eligibility` | `STATIC_RUNTIME`, `STATIC_WRAPPED`, `REGISTRY_VISIBLE`, `METADATA_OVERRIDE_CAPABLE`, `SEO_AUTHORITATIVE`, `ADMIN_VISIBLE` | `BOUNDED` | `DURABLE` | `INTEGRATED_SAFE` |
| Inline public static routes | `/about`, `/apply`, `/contact`, `/downloads`, `/privacy-policy`, `/terms-conditions`, `/disclaimer`, `/thank-you`, `/bima-sakhi-delhi` | `STATIC_RUNTIME`, `REGISTRY_VISIBLE`, `RUNTIME_ONLY`, `PARTIALLY_OPERATIONAL`, `SEO_AUTHORITATIVE`, `ADMIN_VISIBLE`, `FRAGMENTED` | `PARTIALLY_BOUNDED` | `PARTIALLY_DURABLE` | `PARTIALLY_INTEGRATED` |
| Hybrid public static routes | `/blog`, `/resources`, `/tools`, `/tools/lic-income-calculator`, `/tools/lic-commission-calculator` | `STATIC_RUNTIME`, `HYBRID_RUNTIME`, `REGISTRY_VISIBLE`, `RUNTIME_ONLY`, `PARTIALLY_OPERATIONAL`, `SEO_AUTHORITATIVE`, `ADMIN_VISIBLE`, `FRAGMENTED` | `PARTIALLY_BOUNDED` | `PARTIALLY_DURABLE` | `PARTIALLY_INTEGRATED` |
| Agent static runtime routes | `/agent/business`, `/agent/dashboard`, `/agent/motivation`, `/agent/training` | `STATIC_RUNTIME`, `REGISTRY_VISIBLE`, `RUNTIME_ONLY`, `PARTIALLY_OPERATIONAL`, `SEO_AUTHORITATIVE`, `ADMIN_VISIBLE`, `FRAGMENTED` | `PARTIALLY_BOUNDED` | `PARTIALLY_DURABLE` | `PARTIALLY_INTEGRATED` |
| Hidden admin static runtime routes | `/admin`, `/admin/dashboard`, `/admin/system`, `/admin/seo`, and the rest of `/admin/**` explicit page files | `STATIC_RUNTIME`, `REGISTRY_VISIBLE`, `HIDDEN_RUNTIME`, `ADMIN_VISIBLE`, plus route-local metadata labels | `PARTIALLY_BOUNDED` | `PARTIALLY_DURABLE` | `PARTIALLY_INTEGRATED` |
| Override-only orphan paths | `seo_overrides` rows with no classified live surface | `ADMIN_VISIBLE`, `FRAGMENTED` | `AUTHORITY_FRAGILE` | `REGISTRY_FRAGILE` | `AUTHORITY_FRAGILE` |

## Metadata Authority Validation

### Reconciled and live

- `route_path` is the canonical SEO override key.
- Shared runtime helper `utils/seo.js` now applies title, description, canonical URL, robots, and OG image overrides.
- Explicit dynamic runtime surfaces (`app/[...slug]/page.js`, `app/pages/[slug]/page.js`, `app/blog/[slug]/page.js`) now layer route-level overrides over record-owned metadata.
- Helper-wrapped static pages consume `route_path` overrides live.

### Visible but intentionally read-only

- Inline static metadata routes remain registry-visible but non-editable inside the SEO override flow.
- The registry now makes that limit explicit instead of implying fake metadata ownership.

### Preserved constraints

- Static runtime files remain production-authoritative.
- Registry visibility does not replace file-route authority.
- Admin visibility does not grant CRUD or block-editor ownership for static routes.

## Admin Visibility Reconstruction

Canonical admin visibility now lives in `/api/admin/seo` plus `/admin/seo`.

Registry output now includes for each classified surface:

- route path
- source type and source label
- authority labels
- override state
- boundary classification
- durability classification
- runtime owner file
- visibility scope
- note explaining current ownership boundary

The UI only allows edits where the live runtime actually consumes route-level overrides. Blog and resources index surfaces still link to their dedicated managers. Static read-only routes remain visible without fake edit affordances.

## Runtime Authority Precedence Model

Authority precedence after this sprint is:

1. Explicit runtime rendering authority in `app/**/page.js`
2. Dynamic runtime rendering authority in `app/pages/[slug]/page.js`, `app/blog/[slug]/page.js`, and `app/[...slug]/page.js`
3. Route-owned metadata authority (`export const metadata`, `generateMetadata`, record-owned canonical/robots metadata)
4. `seo_overrides.route_path` only where the owning runtime route actually consumes it
5. Canonical registry visibility in `/api/admin/seo`
6. Admin UI visibility in `/admin/seo`

Lower-authority registry and admin surfaces never override runtime rendering truth.

## Surgical Integration Sequence

### Phase A

- Enumerate explicit static runtime routes into a tracked manifest inside `app/api/admin/seo/route.js`
- Classify every explicit route into static authority groups
- Preserve runtime ownership semantics by reading route files as evidence only

### Phase B

- Expose static runtime surfaces through the canonical registry response
- Attach metadata strategy, authority labels, scope, owner file, boundary, and durability
- Surface helper-wired routes as override-capable and inline routes as read-only
- Expand `page_index` shadow detection to use the full explicit static route inventory

### Phase C

- Validate exact manifest coverage (`76/76`)
- Validate diagnostics cleanliness on touched files
- Validate that untracked resolver and prompt-engine helpers are no longer imported by authority paths
- Validate tracked runtime owner files for active authority surfaces

## Rollback and Continuity Validation

### Tracked active authority surfaces

- `app/page.js`
- `app/[...slug]/page.js`
- `app/pages/[slug]/page.js`
- `app/blog/[slug]/page.js`
- `app/api/admin/seo/route.js`
- `features/admin/seo/SEOContent.jsx`
- `utils/seo.js`

### Untracked but inert leftovers

- `lib/cms/resolveRoute.js`
- `lib/cms/resolveCmsRoute.js`
- `lib/ai/promptEngine.js`

These files remain local-only, but the active authority import graph no longer references them.

### Continuity verdicts

- rollback continuity: preserved
- runtime rendering continuity: preserved
- metadata continuity: improved and explicit
- SEO continuity: improved for helper-wired and dynamic surfaces; explicit read-only limit for inline static routes
- catch-all continuity: preserved
- registry continuity: improved and now exact for explicit static file routes
- local production build validation: passed after integration (`npm run build`)

## Future Editor Readiness

This layer is future-ready for read-only ownership modeling, metadata planning, and later editor preparation because each explicit static route now has a deterministic registry row and runtime owner file.

This sprint does **not** authorize:

- block editing for static file routes
- runtime authority centralization
- drag-drop page editing
- schema migrations
- catch-all redesign
- universal page CRUD

## Final Authorization

- helper-wrapped public static routes: `INTEGRATED_SAFE`
- inline public static routes: `PARTIALLY_INTEGRATED`
- hybrid public static routes: `PARTIALLY_INTEGRATED`
- agent static runtime routes: `PARTIALLY_INTEGRATED`
- hidden admin static runtime routes: `PARTIALLY_INTEGRATED`
- override-only orphan registry paths: `AUTHORITY_FRAGILE`
