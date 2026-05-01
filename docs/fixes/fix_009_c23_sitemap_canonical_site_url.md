# Fix: C23 Sitemap Canonical Site URL

**Date:** 2026-04-26  
**Author:** CTO (Agent)  
**Bible Reference:** Section 8, Section 40, Rule 25  
**Status:** RESOLVED LIVE

## Context

The April 26 verified live audit proved that production `/sitemap.xml` returned `200` but still emitted `http://localhost:3000` URLs inside live XML output. That meant sitemap generation was relying on route-level localhost fallbacks instead of a single canonical site URL source.

## Root Cause

The sitemap routes were each resolving their own site URL with the pattern:

- `process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'`

In production, that fallback was unsafe and allowed live sitemap XML to leak localhost URLs whenever the expected environment variable was absent or inconsistent.

## Deployed Change Set

The canonical URL logic is now centralized and deployed:

1. Added `lib/siteUrl.js`.
   - Introduces a shared `getSiteUrl()` helper.
   - Locks production output to `https://bimasakhi.com`.
   - Preserves preview and local fallback behavior outside production.
2. Updated `app/sitemap.xml/route.js`.
   - Replaced the inline localhost fallback with the shared canonical helper.
3. Updated `app/sitemap-index.xml/route.js`.
   - Replaced the inline localhost fallback with the shared canonical helper.
4. Updated `app/sitemaps/[type]/route.js`.
   - Replaced the inline localhost fallback with the shared canonical helper for shard XML.
5. Updated `lib/queue/qstash.js`.
   - Reused the same shared site URL helper so callback URL resolution stays aligned with sitemap/canonical domain behavior.

## Verification

- Local helper verification:
  - production-mode `getSiteUrl()` returned `https://bimasakhi.com`
- Local build verification:
  - `npm run build` passed after the sitemap changes
- Deployment proof:
  - commit `16bb781` was pushed to `main`
  - `/api/status` reported `version: 16bb781` before post-deploy sitemap checks ran
- Live sitemap proof:
  - `scripts/audit/results/2026-04-26T12-53-24-129Z-c23-sitemap-live-proof.json`
  - `/sitemap.xml` returned canonical `https://bimasakhi.com` shard URLs
  - `/sitemap-index.xml` returned canonical `https://bimasakhi.com` shard URLs
  - representative shard routes returned canonical `https://bimasakhi.com` page URLs only

## Outcome

The production sitemap localhost leakage is closed.

What changed in runtime truth:

1. sitemap indexes now emit canonical production URLs only
2. dynamic sitemap shards now emit canonical production URLs only
3. Phase 6 no longer carries the open "sitemap base URL fix" blocker from C23

## Result

**C23 status:** RESOLVED LIVE

Remaining stabilization order after C23:

- C21 navigation deploy parity and `/api/navigation` recovery
- C24 degraded operational health
- Rule 16 transaction/rollback proof gaps

## Cross-References

- Related audit: `docs/audits/audit-2026-04-26-c23-sitemap-live-proof.md`
- Related audit: `docs/audits/verified-live-system-audit-2026-04-26.md`
- Related audit: `docs/audits/audit-2026-04-26-cto-live-proof-refresh.md`