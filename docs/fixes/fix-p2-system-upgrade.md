# P2 System Upgrade Fix Record

Date: 2026-05-07

## Changed

- Added server-side prompt engine: `lib/ai/promptEngine.js`.
- Seeded default DB prompt template from the legacy page-generation prompt.
- Added nullable prompt metadata storage to drafts, blog posts, and bulk jobs.
- Updated pagegen worker to resolve prompts through the DB-backed system when enabled.
- Updated single page generation and bulk planner payloads to include prompt inputs.
- Added minimal admin controls for template, role, tone, keywords, location, and intent.
- Added blog generation support through `/api/admin/blog` with prompt metadata persistence.
- Removed excessive unified resolver console logs from the catch-all route.

## Safety

- Existing hardcoded prompt remains the fallback.
- Template mode is controlled by `ai_prompt_templates_enabled`.
- Worker prompt-input persistence is best-effort and does not fail page generation if metadata persistence fails.
- No destructive migration, no NOT NULL constraints, no unique constraints.

## Rollback

Disable template mode:

```bash
node scripts/audit/toggle-p2-4-ai-prompt-templates.mjs false
```

The code will return to legacy prompt behavior while retaining additive data columns.
