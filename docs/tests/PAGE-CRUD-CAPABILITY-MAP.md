# Page CRUD Capability Map

## Legend

- `WORKS` = implemented and connected to the intended lane
- `PARTIAL` = implemented but limited, fragmented, or inconsistent
- `FRAGILE` = works only with deploy blockers, hidden dependencies, or inconsistent runtime activation
- `HIDDEN` = capability exists but is not surfaced as an operator-owned page authority tool
- `NONE` = no discovered capability in that lane
- `ORPHANED` = code exists but is not part of the live authority path

Deploy-safety row values use:

- `SAFE` = tracked and suitable for normal deployment review
- `MIXED` = tracked but currently modified or coupled to mixed surfaces
- `BLOCKED` = clean deploy is blocked by untracked or missing dependencies

## Primary Capability Matrix

| Capability | Static file routes | SEO-wrapped statics | Homepage DB | Custom pages | Draft -> page_index | Catch-all runtime | Blog | Resources | Hidden / registry infra |
|---|---|---|---|---|---|---|---|---|---|
| Runtime reachability | `WORKS` | `WORKS` | `WORKS` | `WORKS` | `WORKS` after publish | `WORKS` | `WORKS` | `WORKS` | `HIDDEN` |
| Admin reachability | `NONE` | `PARTIAL` | `NONE` | `WORKS` | `WORKS` | `PARTIAL` | `WORKS` | `WORKS` | `HIDDEN` |
| Metadata editing | `NONE` | `PARTIAL` | `NONE` | `WORKS` | `WORKS` | `PARTIAL` | `WORKS` | `WORKS` | `HIDDEN` |
| SEO override continuity | `NONE` | `PARTIAL` | `NONE` | `PARTIAL` | `PARTIAL` | `PARTIAL` | `PARTIAL` | `PARTIAL` | `HIDDEN` |
| Slug / path management | `NONE` | `NONE` | `NONE` | `WORKS` | `WORKS` | `FRAGILE` | `WORKS` | `NONE` | `HIDDEN` |
| Publish / unpublish | `NONE` | `NONE` | `NONE` | `WORKS` | `WORKS` | `NONE` | `WORKS` | `WORKS` | `HIDDEN` |
| Draft / review workflow | `NONE` | `NONE` | `NONE` | `PARTIAL` | `WORKS` | `NONE` | `PARTIAL` | `PARTIAL` | `HIDDEN` |
| Versioning / snapshots | `NONE` | `NONE` | `NONE` | `WORKS` | `WORKS` | `NONE` | `NONE` | `NONE` | `HIDDEN` |
| AI optimize / generate | `NONE` | `PARTIAL` | `NONE` | `WORKS` | `PARTIAL` | `NONE` | `FRAGILE` | `NONE` | `HIDDEN` |
| Route registration / discovery | `NONE` | `NONE` | `NONE` | `PARTIAL` | `PARTIAL` | `FRAGILE` | `NONE` | `NONE` | `HIDDEN` |
| Structured content / blocks | `NONE` | `NONE` | `WORKS` | `WORKS` | `PARTIAL` | `PARTIAL` | `NONE` | `NONE` | `HIDDEN` |
| Persistence / rollback | `WORKS` via git | `WORKS` via git + DB fallback | `WORKS` | `WORKS` | `WORKS` | `PARTIAL` | `PARTIAL` | `WORKS` | `PARTIAL` |
| Deploy safety | `SAFE` | `SAFE` | `SAFE` | `MIXED` | `MIXED` | `BLOCKED` | `BLOCKED` | `SAFE` | `MIXED` |

## Capability Conclusions

1. The page/content CRUD foundation is real. It already exists across multiple lanes.
2. The missing piece is unified visibility and authority classification, not basic persistence.
3. Static runtime pages are the largest admin blind spot.
4. `custom_pages` and `content_drafts -> page_index` are separate operational systems and must be treated that way during recovery.
5. The catch-all runtime and blog AI surfaces are the two most obvious runtime-fragile areas because they depend on untracked files.

## Visibility Gap Map

| Missing from unified admin authority | Current runtime truth | Why it is missing | Existing recoverable anchor |
|---|---|---|---|
| Static file routes under `app/*` | Live runtime pages with inline metadata | No page manifest feeds `/admin/pages` or `/admin/ccc`; `/admin/seo` only seeds five default routes | Static manifest plus current route files |
| Helper-wrapped static routes | Live runtime pages using `utils/seo.js` | Runtime helper reads `seo_overrides.page_path` while admin and DB use `route_path` | Existing `seo_overrides` UI and helper pattern |
| Homepage DB surface | Live homepage reads `homepage_sections` | No active admin route writes `homepage_sections`; hidden editor writes config instead | `homepage_sections` table and hidden editor patterns |
| Generated page reachability | Catch-all serves `page_index` directly | No admin surface reports whether current runtime resolution actually succeeds | `page_index`, SEO index pages, resolver intent |
| Redirect and prompt-template registry data | API exists at `/api/admin/cms/structure` | No discovered operator page for `page_index_structure` or redirects | Existing CMS structure API |

## Surface-To-Editor Routing

| Runtime surface | Current admin entry | Current public entry | Recovery-safe conclusion |
|---|---|---|---|
| Static file routes | None | explicit `app/*` routes | Add registry visibility only; do not invent a new editor first |
| Homepage sections | None | `/` via `homepage_sections` | Surface as a distinct source type; do not route through the page builder |
| Custom block pages | `/admin/pages` | `/pages/[slug]` | Preserve editor and expose richer registry context |
| Generated drafts | `/admin/ccc/drafts` | published into root catch-all | Preserve draft workflow and add registry parity |
| Blog posts | `/admin/blog` | `/blog/[slug]` | Preserve CRUD; isolate AI fragility |
| Resources | `/admin/resources` | `/resources` | Preserve standalone lane and add registry visibility |

## Recovery-Safe Test Claims

- `custom_pages` CRUD, block persistence, and page versioning already exist.
- `content_drafts` review, scheduling, publish, archive, and version history already exist.
- `seo_overrides` admin writes already exist.
- AI block generation and SEO analyze already exist.
- Static runtime pages remain mostly outside admin authority.
- Resolver and prompt-engine deploy blockers are the main reasons a unified authority surface is not currently deploy-safe.

## Bottom Line

The current platform does not need a fresh page editor to regain control. It needs a read-only registry layer that exposes which existing authority lane already owns each surface.