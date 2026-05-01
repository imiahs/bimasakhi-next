# Decision: Phase 8 - Multi-Intent Lead Funnels Final Implementation Plan

**Date:** 2026-04-21  
**Proposed by:** CTO  
**Approved by:** CEO - pending  
**Bible Reference:** Phase 8, Section 19, Section 30, Rule 2, Rule 5, Rule 7, Rule 8, Rule 17, Rule 19, Rule 25  
**Status:** PROPOSED - Final plan prepared. Execution remains gated by Phase 23 readiness, operational health, and CEO approval.

## Executive Gate

This document is the final implementation plan for Phase 8. It is not approval to build.

Phase 8 execution begins only when all three conditions are true:
1. Phase 23 communication baseline is live enough to alert on new lead activity.
2. Production health is back to green with no dead critical cron chain.
3. CEO explicitly approves this plan.

---

## Q1: Why NOW? (not later)

Phase 8 is the next Priority B business phase in the CCC once the dependency gate opens. The current system captures leads, but it does not reliably distinguish what the user actually wants.

Today, the system collapses different intents into generic buckets:
- career interest goes through the detailed apply flow
- contact page sends everything to one callback/contact flow
- generated pages use one generic CTA
- thank-you experience is generic
- Zoho receives flat lead context

Without Phase 8:
- the CRM cannot cleanly separate recruit leads from policy leads, IC-38 help, or form-help traffic
- the contact page remains a generic inbox instead of a qualification router
- Phase 7, Phase 9, Phase 15, Phase 18, and Phase 19 stay logically weak even if they are later built

Phase 8 is therefore the first business-routing layer, not a cosmetic form upgrade.

---

## Q2: What is the IMPACT on system?

Phase 8 will change the system in six concrete ways:

1. Website visitors will enter intent-specific funnel paths instead of one generic lead path.
2. Leads table records will store funnel and intent metadata for reporting, routing, and future automation.
3. Generated pages will stop sending every visitor to the same CTA target.
4. Contact page will become a lead qualification router instead of a generic callback form.
5. Thank-you experience will become funnel-specific, improving post-conversion continuity.
6. Admin CRM view will show funnel and intent so the CEO can see what type of lead came in.

This is the minimum viable routing layer needed before deeper lead scoring and agent pipeline logic.

---

## Q3: What are the DEPENDENCIES?

### Hard Dependencies

1. Phase 23 communication baseline must be live enough for lead alerts.
2. Existing lead sync pipeline must remain healthy:
   - `pages/api/crm/[action].js`
   - `app/api/workers/lead-sync/route.js`
   - `app/api/workers/contact-sync/route.js`
3. Operational health must not be degraded at phase start.
4. CEO must approve this plan before any code is written.

### Existing System Dependencies Already Present

1. `leads` table exists and is already the core lead pipeline.
2. `contact_inquiries` exists for generic contact submissions.
3. Generated page rendering exists in `components/layout/GeneratedPageTemplate.jsx`.
4. Career apply flow exists in `features/leads/ApplyForm.jsx`.
5. Admin CRM surface exists in `app/admin/crm/page.js` and `app/api/admin/leads/route.js`.

### Explicit Non-Dependencies

These are not required to start Phase 8 MVP:
1. Phase 7 resource manager
2. Phase 9 lead scoring changes
3. Zoho custom field creation
4. New `/api/leads` route family

---

## Q4: What is the ROLLBACK plan?

### Code Rollback

1. Revert the Phase 8 commits with `git revert`.
2. Keep legacy `app/thank-you/page.js` path intact throughout rollout.
3. Keep legacy `create-contact` behavior intact for generic inquiries.

### DB Rollback

Migration is additive only. Rollback is safe:

```sql
ALTER TABLE public.leads DROP COLUMN IF EXISTS funnel;
ALTER TABLE public.leads DROP COLUMN IF EXISTS intent_type;
ALTER TABLE public.leads DROP COLUMN IF EXISTS lead_source_page;
ALTER TABLE public.leads DROP COLUMN IF EXISTS lead_source_type;
ALTER TABLE public.leads DROP COLUMN IF EXISTS policy_interest;
ALTER TABLE public.leads DROP COLUMN IF EXISTS preferred_callback_window;
ALTER TABLE public.leads DROP COLUMN IF EXISTS resource_slug;

ALTER TABLE public.contact_inquiries DROP COLUMN IF EXISTS funnel;
ALTER TABLE public.contact_inquiries DROP COLUMN IF EXISTS intent_type;
ALTER TABLE public.contact_inquiries DROP COLUMN IF EXISTS lead_source_page;
ALTER TABLE public.contact_inquiries DROP COLUMN IF EXISTS lead_source_type;
```

### Runtime Rollback

If we choose to wrap the new behavior in `multi_intent_funnels_enabled`, switch it off and fall back to:
1. legacy `/apply`
2. legacy `/contact`
3. legacy `/thank-you`

---

## Q5: What is the COST (time + money)?

### Engineering Cost

Focused scope only:
1. 1 additive SQL migration
2. about 10 existing files modified
3. about 6 to 8 new files created
4. 1 local validation cycle
5. 1 live validation cycle

### Vendor Cost

Negligible.

Phase 8 reuses existing:
1. Supabase
2. QStash
3. Zoho sync
4. Current admin API surface

No new paid vendor is required for the MVP.

---

## Deep Thinking Analysis

### Current Code Reality

| Area | Current File(s) | Reality | Gap |
|---|---|---|---|
| Recruitment apply flow | `features/leads/ApplyForm.jsx`, `features/leads/ApplyFormValidation.js`, `app/apply/ApplyContent.jsx` | Detailed 4-step form already exists | Works only as one career-style path |
| Contact page | `app/contact/ContactContent.jsx` | Generic callback form posts to `create-contact` | No intent routing |
| Generated page CTA | `components/layout/GeneratedPageTemplate.jsx` | Static CTA to `/apply` | No intent awareness |
| Thank-you page | `app/thank-you/page.js`, `app/thank-you/ThankYouContent.jsx` | One generic thank-you route | No funnel-specific follow-through |
| Lead ingestion | `pages/api/crm/[action].js` | `create-lead` + `create-contact` already exist | No funnel contract |
| Lead sync | `app/api/workers/lead-sync/route.js` | Existing Zoho sync pipeline | No funnel context in sync payload |
| Contact sync | `app/api/workers/contact-sync/route.js` | Existing contact inquiry sync pipeline | No intent metadata |
| Admin CRM visibility | `app/api/admin/leads/route.js`, `app/admin/crm/page.js` | Existing list and filters | No funnel or intent visibility |

### Root Problem

The system captures leads, but it does not preserve the user's reason for converting in a structured, queryable, or operationally useful way.

### Simplicity Decisions

To avoid over-engineering, this plan adopts these hard design rules:

1. Reuse `pages/api/crm/[action].js`. Do not introduce a new `/api/leads` route family.
2. Reuse `leads` as the main table for intent-driven lead funnels.
3. Keep `contact_inquiries` for true general inquiries only.
4. Keep the detailed `/apply` flow as the canonical long-form recruit flow. Do not duplicate it inside multiple pages.
5. Add one shared funnel configuration map. Do not scatter funnel strings across components.
6. Keep legacy `/thank-you` working for backward compatibility while introducing `/thank-you/[funnel]`.
7. Use Zoho `Lead_Source` bifurcation plus structured Description before introducing custom Zoho schema work.

### MVP Scope for Phase 8

Phase 8 MVP includes:
1. Funnel taxonomy and DB contract
2. Intent-aware forms for compact lead capture
3. Funnel-specific thank-you pages
4. CRM bifurcation via stored funnel metadata and Zoho mapping
5. Generated page CTA/form routing
6. Contact page redesign into intent router
7. Minimal admin CRM visibility for funnel + intent

### Out of Scope

The following are explicitly not Phase 8 MVP:
1. WhatsApp automation sequences after submit
2. Download resource engine and gated downloads manager
3. Lead score algorithm changes
4. Agent assignment logic changes
5. Dead code resurrection for `features/agent/apply/ApplyContent.jsx` without a real routed page

---

## Funnel Taxonomy

### Canonical Funnel Slugs

| Funnel | Primary Use | Submit Path | Thank-You Path |
|---|---|---|---|
| `sakhi-recruit` | Bima Sakhi career interest | `/api/crm/create-lead` | `/thank-you/sakhi-recruit` |
| `agent-recruit` | General LIC agent registration | `/api/crm/create-lead` | `/thank-you/agent-recruit` |
| `policy-consult` | Policy buying / consultation | `/api/crm/create-lead` | `/thank-you/policy-consult` |
| `form-help` | Form assistance / help needed | `/api/crm/create-lead` | `/thank-you/form-help` |
| `ic38-guide` | IC-38 exam guidance | `/api/crm/create-lead` | `/thank-you/ic38-guide` |
| `general-contact` | Generic query not fit for lead funnel | `/api/crm/create-contact` | `/thank-you/general-contact` |
| `resource-download` | Reserved for Phase 7 compatibility | `/api/crm/create-lead` | `/thank-you/resource-download` |

### Mapping from Existing Content Intent Types

We will not change the existing `content_drafts.intent_type` enum in Phase 8. We will map existing values into funnel behavior.

| Existing Page Intent | Funnel Behavior |
|---|---|
| `career` | `sakhi-recruit` |
| `local_service` | `sakhi-recruit` fallback |
| `policy_info` | `policy-consult` |
| `comparison` | `policy-consult` |
| `form_help` | `form-help` |
| `educational` | `ic38-guide` |
| `download` | `resource-download` |
| `transactional` | `general-contact` |
| `null` or missing | `sakhi-recruit` fallback |

This preserves current behavior while enabling future content to become more intentional.

---

## Exact Files to Create and Modify

### New Files

| File | Purpose |
|---|---|
| `supabase/migrations/20260421_phase8_multi_intent_lead_funnels.sql` | Additive schema for leads/contact funnel metadata |
| `features/leads/funnels/funnelConfig.js` | Single source of truth for funnel labels, redirects, and mappings |
| `features/leads/funnels/SmartLeadForm.jsx` | Shared dispatcher for compact intent forms |
| `features/leads/funnels/PolicyConsultForm.jsx` | Compact lead form for policy consultations |
| `features/leads/funnels/FormHelpForm.jsx` | Compact lead form for form-help pages |
| `features/leads/funnels/IC38GuideForm.jsx` | Compact lead form for IC-38 guidance |
| `app/thank-you/[funnel]/page.js` | Dynamic funnel thank-you route |
| `app/thank-you/FunnelThankYouContent.jsx` | Shared funnel-aware thank-you renderer |

### Existing Files to Modify

| File | Change |
|---|---|
| `features/leads/ApplyForm.jsx` | Attach `funnel`, `intent_type`, and redirect to funnel thank-you path |
| `features/leads/ApplyFormValidation.js` | Preserve recruit validation contract; no regression |
| `app/contact/ContactContent.jsx` | Replace generic callback-only form with intent router + conditional submit behavior |
| `components/layout/GeneratedPageTemplate.jsx` | Replace static CTA with funnel-aware CTA or compact form |
| `pages/api/crm/[action].js` | Update `create-lead` and `create-contact` contracts for funnel metadata |
| `app/api/workers/lead-sync/route.js` | Include funnel metadata in Zoho sync payload/description |
| `app/api/workers/contact-sync/route.js` | Include general-contact intent metadata for traceability |
| `app/api/admin/leads/route.js` | Return funnel and intent fields to admin CRM |
| `app/admin/crm/page.js` | Add funnel/intent filter and table visibility |
| `app/thank-you/page.js` | Keep backward-compatible generic thank-you fallback |
| `app/thank-you/ThankYouContent.jsx` | Either trim to legacy mode or reuse shared funnel renderer |

### Explicitly Not Modified in MVP

| File | Reason |
|---|---|
| `features/agent/apply/ApplyContent.jsx` | Not routed in current app structure; avoid dead-code expansion |
| `app/resources/*` download gate flows | Reserved for Phase 7 |

---

## Database Schema Change

### Migration File

`supabase/migrations/20260421_phase8_multi_intent_lead_funnels.sql`

### SQL

```sql
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS funnel TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS intent_type TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_source_page TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_source_type TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS policy_interest TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_callback_window TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS resource_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_funnel ON public.leads(funnel);
CREATE INDEX IF NOT EXISTS idx_leads_intent_type ON public.leads(intent_type);
CREATE INDEX IF NOT EXISTS idx_leads_source_page ON public.leads(lead_source_page);

ALTER TABLE public.contact_inquiries ADD COLUMN IF NOT EXISTS funnel TEXT;
ALTER TABLE public.contact_inquiries ADD COLUMN IF NOT EXISTS intent_type TEXT;
ALTER TABLE public.contact_inquiries ADD COLUMN IF NOT EXISTS lead_source_page TEXT;
ALTER TABLE public.contact_inquiries ADD COLUMN IF NOT EXISTS lead_source_type TEXT;

CREATE INDEX IF NOT EXISTS idx_contact_inquiries_funnel ON public.contact_inquiries(funnel);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_intent_type ON public.contact_inquiries(intent_type);
```

### Why This Schema Is Minimal

1. Additive only
2. No destructive rename
3. No new table
4. No custom enum migration in Phase 8
5. Reuses existing lead/contact tables already wired into admin and workers

---

## API Contract

### MODULE: `/api/crm/create-lead` (UPDATED)

**Method:** `POST`  
**Auth:** public  
**Rate Limit:** 10/hour/IP  

### Input - Common Fields

```json
{
  "name": "string",
  "mobile": "10-digit Indian mobile",
  "email": "string | optional by funnel",
  "city": "string | optional by funnel",
  "state": "string | optional",
  "pincode": "string | optional by funnel",
  "locality": "string | optional",
  "education": "string | optional",
  "occupation": "string | optional",
  "reason": "string | optional",
  "source": "string",
  "medium": "string | optional",
  "campaign": "string | optional",
  "funnel": "string",
  "intent_type": "string",
  "lead_source_page": "string | optional",
  "lead_source_type": "string | optional",
  "policy_interest": "string | optional",
  "preferred_callback_window": "string | optional",
  "resource_slug": "string | optional"
}
```

### Validation Rules by Funnel

| Funnel | Required |
|---|---|
| `sakhi-recruit` | `name`, `mobile`, `email`, `city`, `pincode`, `education`, `occupation` |
| `agent-recruit` | `name`, `mobile`, `city` |
| `policy-consult` | `name`, `mobile`, `city` |
| `form-help` | `name`, `mobile` |
| `ic38-guide` | `name`, `mobile`, `city` |
| `resource-download` | `name`, `mobile` |

### Success Output

```json
{
  "success": true,
  "lead_id": "uuid",
  "ref_id": "LEAD-...",
  "funnel": "policy-consult",
  "redirect_to": "/thank-you/policy-consult?ref=..."
}
```

### Duplicate Output

```json
{
  "success": true,
  "duplicate": true,
  "lead_id": "uuid",
  "ref_id": "LEAD-...",
  "funnel": "policy-consult",
  "redirect_to": "/thank-you/policy-consult?ref=..."
}
```

### Duplicate Handling Rule

For duplicate mobile submissions:
1. keep idempotency protection
2. update the existing lead row with latest `funnel`, `intent_type`, `lead_source_page`, and `lead_source_type`
3. insert `lead_events.event_type = 'funnel_reengaged'`
4. return success with duplicate flag instead of throwing away new intent context

### Error Output

```json
{ "error": "reason" }
```

Status codes:
1. `400` invalid payload
2. `429` rate limit
3. `500` server or queue failure

---

### MODULE: `/api/crm/create-contact` (UPDATED)

**Method:** `POST`  
**Auth:** public  
**Rate Limit:** 10/hour/IP  

### Usage Rule

This route becomes Phase 8's generic inquiry fallback only. It is not the primary path for qualified lead funnels.

### Input

```json
{
  "name": "string",
  "mobile": "10-digit Indian mobile",
  "email": "string",
  "reason": "string",
  "message": "string",
  "source": "string",
  "pipeline": "General",
  "tag": "General Contact",
  "funnel": "general-contact",
  "intent_type": "general_inquiry",
  "lead_source_page": "/contact",
  "lead_source_type": "direct"
}
```

### Success Output

```json
{
  "success": true,
  "contact_id": "CNT-...",
  "queue_status": "pending",
  "redirect_to": "/thank-you/general-contact"
}
```

---

## CRM Bifurcation Strategy

To keep implementation simple and maintainable, Zoho bifurcation will use existing fields first.

### Immediate Phase 8 Zoho Mapping

| Local Field | Zoho Mapping |
|---|---|
| `funnel=sakhi-recruit` | `Lead_Source = Website - Sakhi Recruit` |
| `funnel=agent-recruit` | `Lead_Source = Website - Agent Recruit` |
| `funnel=policy-consult` | `Lead_Source = Website - Policy Consult` |
| `funnel=form-help` | `Lead_Source = Website - Form Help` |
| `funnel=ic38-guide` | `Lead_Source = Website - IC38 Guide` |
| `funnel=general-contact` | `Lead_Source = Website - General Contact` |

### Description Block

Lead and contact sync workers append a structured block to Description:

```text
Funnel: policy-consult
Intent: policy_buyer
Source Page: /contact
Source Type: direct
Policy Interest: Jeevan Shanti
```

This delivers immediate CRM bifurcation without blocking Phase 8 on Zoho custom schema work.

---

## Data Flow

### Flow A - Generated Page to Lead Funnel

```text
GeneratedPageTemplate
  -> funnelConfig maps page intent to funnel
  -> SmartLeadForm or CTA target selected
  -> /api/crm/create-lead
  -> leads + lead_metadata + lead_events
  -> event bus
  -> lead-sync worker
  -> Zoho Lead_Source + Description updated
  -> /thank-you/[funnel]
  -> /admin/crm shows funnel and intent
```

### Flow B - Contact Page Router

```text
/contact
  -> user selects intent
  -> if qualified lead intent: create-lead
  -> if generic inquiry: create-contact
  -> redirect to /thank-you/[funnel]
```

### Flow C - Existing Apply Flow

```text
/apply
  -> existing detailed ApplyForm remains canonical recruit flow
  -> add funnel metadata
  -> create-lead
  -> /thank-you/sakhi-recruit
```

---

## Exact UX Plan

### 1. `/apply`

Keep the existing detailed recruit journey. Do not replace it with a short generic form.

Changes:
1. attach hidden `funnel='sakhi-recruit'`
2. attach hidden `intent_type='bima_sakhi_recruit'`
3. redirect to `/thank-you/sakhi-recruit`

### 2. `/contact`

Redesign into an intent router.

Intent options:
1. Bima Sakhi recruit
2. LIC agent registration
3. Policy consultation
4. Form help
5. IC-38 guidance
6. Something else

Behavior:
1. `sakhi-recruit` can route users to the existing detailed `/apply` flow instead of duplicating the full 4-step form.
2. `agent-recruit`, `policy-consult`, `form-help`, and `ic38-guide` use compact Phase 8 forms.
3. `something else` uses `create-contact` and remains a generic inquiry.

### 3. Generated Pages

Generated pages stop using one static CTA for every intent.

Rules:
1. career-like pages: CTA to `/apply`
2. policy pages: compact policy consult form or `/contact?intent=policy-consult`
3. form-help pages: compact form-help form
4. educational IC-38 pages: compact IC-38 form
5. missing intent: fallback to current recruit CTA

### 4. Thank-You Pages

`/thank-you/[funnel]` will have funnel-specific copy.

Each thank-you page includes:
1. confirmation block
2. what happens next block
3. next-best-action block
4. trust block

Legacy `/thank-you` remains for compatibility and fallback.

---

## Admin Visibility Requirement

Phase 8 will add minimum CEO visibility to CRM.

### Admin API

`app/api/admin/leads/route.js` returns:
1. `funnel`
2. `intent_type`
3. `lead_source_page`

### Admin UI

`app/admin/crm/page.js` adds:
1. funnel filter
2. funnel column
3. intent display in lead row details or tooltip

This is the minimum visibility needed so lead routing is not hidden in raw DB only.

---

## Testing Plan (Rule 8)

### Happy Flow Tests

1. `/apply` submit creates lead with `funnel='sakhi-recruit'` and redirects to `/thank-you/sakhi-recruit`
2. `/contact` with `policy-consult` creates lead and redirects to `/thank-you/policy-consult`
3. `/contact` with `general-contact` creates `contact_inquiries` row and redirects to `/thank-you/general-contact`
4. generated `policy_info` page shows correct CTA/form behavior
5. admin CRM list shows funnel and intent for new lead

### Edge Case Tests

1. unknown funnel slug on thank-you falls back to generic content
2. generated page with missing intent falls back to recruit CTA
3. duplicate mobile submission updates funnel metadata and returns duplicate success
4. missing optional policy fields does not crash policy funnel
5. legacy `/thank-you?ref=...` still works

### Failure Case Tests

1. Zoho sync failure leaves local lead saved with funnel metadata intact
2. contact sync failure leaves local contact inquiry saved with funnel metadata intact
3. invalid funnel payload returns `400`
4. rate limit still returns `429`

### Load Tests

1. 10 rapid identical mobile submissions create one lead and 9 duplicates
2. 5 mixed-funnel submissions across different mobiles all persist correct funnel values

---

## Live Verification Plan

After deployment, these production proofs are mandatory:

1. submit one recruit lead from `/apply`
2. submit one policy consult lead from `/contact`
3. submit one general contact inquiry from `/contact`
4. verify all three rows in DB with funnel metadata
5. verify Zoho lead/source description carries funnel context
6. verify `/thank-you/[funnel]` renders correctly
7. verify admin CRM shows funnel for those records

Phase 8 cannot be marked complete without these live proofs.

---

## Execution Order

```text
8a  Migration + funnel config
8b  Backend contract update (`create-lead`, `create-contact`)
8c  Lead/contact sync payload update
8d  Thank-you route and shared renderer
8e  Compact funnel forms + generated page mapping
8f  Contact page router redesign
8g  Admin CRM visibility
8h  Local validation
8i  Production validation
```

---

## CEO Approval Checkpoints

Before implementation starts, CEO should explicitly approve these decisions:

1. Contact page acts as router, not generic callback inbox.
2. Existing `/apply` remains the canonical long-form recruit flow.
3. Zoho bifurcation uses `Lead_Source` plus Description first, not custom schema first.
4. Phase 8 implementation remains blocked until Phase 23 and operational readiness gate are green.

---

## Decision

PROPOSED.

The final implementation plan is now complete and aligned with the CCC. It is intentionally simple, uses the real current codebase, and avoids unnecessary new infrastructure.

Recommended next state:
1. keep Phase 8 in `NOT STARTED` until the dependency gate is cleared
2. once the gate is green, execute this plan exactly in the sequence above

## Cross-References

- Related phase: Phase 8
- Related sections: Section 19, Section 30
- Related draft: `docs/decisions/phase8-multi-intent-lead-funnels-plan-DRAFT.md`
- Related fix: `docs/fixes/fix_007_stabilization.md`
- Authority: `docs/CONTENT_COMMAND_CENTER.md`