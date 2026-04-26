# Phase 8: Multi-Intent Lead Funnels — Implementation Plan (DRAFT)

> SUPERSEDED on 2026-04-21 by `docs/decisions/phase8-multi-intent-lead-funnels-plan-final.md`

> **Status:** ❌ NOT APPROVED — Saved for CEO deep analysis  
> **Created:** April 19, 2026  
> **Author:** CTO Agent  
> **CEO Decision:** Pending — CEO will review and decide what to do with Phase 8  
> **Bible Section:** Section 19 (Multi-Intent Lead Funnel Architecture)

---

## CEO Notes

> "Not approved the plan. Mai isko baad mein deep analysis kar batauga aage kya karna hai Phase 8 ko."

**CEO has flagged serious concerns before any Phase 8 work begins:**
1. Priority ordering of completed phases is questionable
2. Multiple existing phases have gaps that need fixing first
3. Admin panel pages have significant functionality gaps
4. Communication tools (WhatsApp, Telegram) not addressed
5. Media management completely missing
6. Navigation/menu management not CEO-controllable
7. Content discovery (where do pages show up?) unclear

---

## Deep Thinking Analysis

### Current State (What Exists)

| Component | State | Problem |
|-----------|-------|---------|
| `ApplyForm.jsx` | Single 4-step form | Only captures Bima Sakhi (female recruitment) leads |
| `ContactContent.jsx` | Generic callback form | No intent awareness — all contacts treated equal |
| `GeneratedPageTemplate.jsx` | Generic CTA → `/apply` | Every AI page shows same CTA regardless of content topic |
| `leads` table | No `funnel`, `intent_type`, `source_page_slug` columns | Cannot distinguish lead source/intent |
| Thank-you page | Single generic `/thank-you` | Same experience for recruit vs policy buyer vs IC-38 seeker |
| Zoho CRM sync | Flat payload — no funnel tags | Cannot bifurcate CRM pipelines by intent |

### Edge Cases Identified

1. What if `content_drafts.intent_type` is NULL or missing? → Default to `bima_sakhi_recruit` (current behavior preserved)
2. What if a page has intent `policy_buyer` but no policy-specific form component yet? → Fallback to generic CTA with correct intent tag
3. What if the same mobile number submits from two different funnels? → Existing dedup by mobile still works; update funnel/intent fields on the existing lead
4. What if form is submitted without JavaScript (edge case)? → Server-side validation still catches all required fields

### Failure Modes

1. DB migration fails → No impact on live system (ADD COLUMN IF NOT EXISTS)
2. Form POST with new fields fails → Old `/api/crm/create-lead` still accepts minimal fields; new fields are optional
3. Zoho CRM rejects new fields → Graceful degradation; lead saved in DB, Zoho gets what it can handle
4. Thank-you route `[funnel]` gets invalid funnel → Fallback to generic thank-you content

### Dependencies

- Phase 2 ✅ (content_drafts table with `intent_type` column exists)
- `leads` table exists ✅
- Lead sync pipeline (QStash → Zoho) exists ✅
- GeneratedPageTemplate exists ✅

---

## Sub-module Breakdown

| Sub-module | What | Files |
|-----------|------|-------|
| **8a** | DB migration — add intent columns to `leads` table | 1 migration SQL file |
| **8b** | Intent-aware lead form components | 4 new form components + 1 shared wrapper |
| **8c** | Intent-specific thank-you pages | 1 dynamic route `app/thank-you/[funnel]/page.js` |
| **8d** | GeneratedPageTemplate — intent-aware CTA | Modify 1 existing component |
| **8e** | API route updates — accept & store funnel/intent | Modify 2 existing API routes |
| **8f** | Contact page intent-router | Modify 1 existing component |

---

## DB Migration (Sub-module 8a)

```sql
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS funnel TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS intent_type TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source_page_slug TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS download_resource TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_priority TEXT 
    CHECK (lead_priority IN ('high','medium','low')) DEFAULT 'medium';

CREATE INDEX IF NOT EXISTS idx_leads_funnel ON public.leads(funnel);
CREATE INDEX IF NOT EXISTS idx_leads_intent ON public.leads(intent_type);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(lead_priority);
```

---

## API Contract

```
MODULE: /api/crm/create-lead (UPDATED)

INPUT:
  Method: POST
  Auth: public (rate-limited 10/hr per IP)
  Body: {
    full_name: string (required),
    mobile: string (required, 10-digit Indian),
    email: string (optional),
    city: string (optional),
    pincode: string (optional),
    education: string (optional),
    occupation: string (optional),
    funnel: string (optional),
    intent_type: string (optional),
    source_page_slug: string (optional),
    download_resource: string (optional)
  }

OUTPUT (success): { success: true, leadId: UUID, ref_id: string }
OUTPUT (errors): 400/429/500
```

---

## Execution Order

```
8a (DB migration) → 8e (API updates) → 8b (form components) → 8d (template update) → 8c (thank-you pages) → 8f (contact page)
```

---

## Rollback Plan

| Layer | Method |
|-------|--------|
| Code | `git revert` per sub-module commit |
| DB | DROP COLUMN IF EXISTS (additive columns) |
| Feature Flag | `multi_intent_funnels_enabled` in system_control_config |
| Content | intent_type defaults to null → existing behavior preserved |

---

*This plan is saved for CEO review. No implementation begins until explicit approval.*
