# CTO Master Plan

## 0. Execution Status

### Phase 1 completion state

| Day | Scope | Status | Evidence |
|---|---|---|---|
| 1 | Contact flow contract | COMPLETE | [`app/contact/ContactContent.jsx`](/f:/bimasakhi-next/app/contact/ContactContent.jsx), [`pages/api/crm/[action].js`](/f:/bimasakhi-next/pages/api/crm/[action].js) |
| 2 | Analytics initialization | COMPLETE | [`services/analytics.js`](/f:/bimasakhi-next/services/analytics.js), [`app/api/config/route.js`](/f:/bimasakhi-next/app/api/config/route.js), [`components/core/AnalyticsTracker.jsx`](/f:/bimasakhi-next/components/core/AnalyticsTracker.jsx) |
| 3 | Remove fabricated admin outputs | COMPLETE | [`app/api/admin/analytics/dashboard/route.js`](/f:/bimasakhi-next/app/api/admin/analytics/dashboard/route.js), [`app/api/admin/ai/landing/route.js`](/f:/bimasakhi-next/app/api/admin/ai/landing/route.js), [`app/api/admin/seo/analyze/route.js`](/f:/bimasakhi-next/app/api/admin/seo/analyze/route.js), [`components/admin/CommandPalette.jsx`](/f:/bimasakhi-next/components/admin/CommandPalette.jsx) |
| 4 | Conversion truth | COMPLETE | [`app/api/admin/metrics/route.js`](/f:/bimasakhi-next/app/api/admin/metrics/route.js), [`app/api/admin/dashboard/route.js`](/f:/bimasakhi-next/app/api/admin/dashboard/route.js), [`app/api/admin/leads/convert/route.js`](/f:/bimasakhi-next/app/api/admin/leads/convert/route.js) |
| 5 | Schema reconciliation | COMPLETE | [`supabase/migrations/031_day5_schema_reconciliation.sql`](/f:/bimasakhi-next/supabase/migrations/031_day5_schema_reconciliation.sql), [`docs/SCHEMA_SOURCE_OF_TRUTH.md`](/f:/bimasakhi-next/docs/SCHEMA_SOURCE_OF_TRUTH.md) |
| 6 | Queue and worker contract | COMPLETE | [`pages/api/crm/[action].js`](/f:/bimasakhi-next/pages/api/crm/[action].js), [`app/api/jobs/pagegen/route.js`](/f:/bimasakhi-next/app/api/jobs/pagegen/route.js), [`app/api/jobs/ai-scorer/route.js`](/f:/bimasakhi-next/app/api/jobs/ai-scorer/route.js), [`supabase/migrations/032_day6_queue_contract.sql`](/f:/bimasakhi-next/supabase/migrations/032_day6_queue_contract.sql) |
| 7 | Runtime posture lock | COMPLETE | [`lib/systemConfig.js`](/f:/bimasakhi-next/lib/systemConfig.js), [`app/api/admin/config/route.js`](/f:/bimasakhi-next/app/api/admin/config/route.js), [`docs/CTO_MASTER_PLAN.md`](/f:/bimasakhi-next/docs/CTO_MASTER_PLAN.md) |

### Phase 1 residual blockers
- Migrations `031_day5_schema_reconciliation.sql` and `032_day6_queue_contract.sql` must be applied to the real database before runtime behavior can rely on them.
- Queue and AI systems remain governed by runtime flags and provider readiness. Code completion does not imply activation.
- Email and follow-up remain blocked by missing provider prerequisites.

## 0.1 Runtime Posture

### Control states

- `ACTIVE`: enabled in config and prerequisites are present.
- `PAUSED`: intentionally held off by config.
- `DISABLED`: not available by design or safe defaults.
- `BROKEN`: intended capability but blocked by missing provider/schema/runtime dependency.

### Last verified operating posture

This posture reflects the current intended operating model for the system:

| Capability | Effective State | Reason |
|---|---|---|
| Public lead capture | ACTIVE | Core path is intended to stay live |
| Public contact flow | ACTIVE | Contract repaired in Phase 1 |
| CRM auto routing | ACTIVE | Controlled by `crm_auto_routing` when credentials are present |
| First-party telemetry | ACTIVE | Initialization contract repaired in Phase 1 |
| Admin fake AI outputs | DISABLED | Removed from production paths |
| AI scoring worker | PAUSED | Requires `ai_enabled = true` and trusted data |
| AI routing worker | PAUSED | Requires `ai_enabled = true` plus real agent pool and trustworthy metrics |
| SEO queue processing | PAUSED | Requires `queue_paused = false` and applied queue/schema migrations |
| Follow-up worker | PAUSED | Requires `followup_enabled = true` and provider prerequisites |
| Email auto-responder | BROKEN | Provider readiness is still a dependency outside this code pass |

### Activation rules

- Do not set `ai_enabled=true` until:
  - Day 5 and Day 6 migrations are applied
  - telemetry is producing trustworthy data
  - worker tables are present
  - agent/routing prerequisites are real
- Do not set `queue_paused=false` until:
  - `generation_queue` schema and indexes are applied
  - worker routes are deployed
  - queue rows are validated against the new payload contract
- Do not set `followup_enabled=true` until:
  - worker schema is applied
  - message provider prerequisites are present
  - result persistence is verified
- Do not treat `crm_auto_routing=true` as “full automation active”.
  - It only means CRM handoff is allowed.

## 1. System Reality Summary

### Current state
- The system is a partially working lead capture platform with a real website, real Supabase connectivity, some real CRM connectivity, and incomplete automation.
- The system is not yet a real growth engine, not a trustworthy admin intelligence platform, and not a reliable SEO automation engine.
- The codebase is split across App Router and Pages Router, which creates duplicated patterns, inconsistent contracts, and unclear ownership.

### Non-negotiable truths
- The contact flow is broken at the frontend/backend contract level.
- The analytics layer does not initialize correctly on the public site.
- Admin analytics contains synthetic or fallback-derived outputs.
- "AI" scoring and routing are mostly heuristics, not model-driven intelligence.
- Queue infrastructure exists, but execution reliability and job accounting are weak.
- Repo schema is not a complete source of truth for runtime behavior.

### What the system actually is
- Public site
- Apply lead form
- Contact/callback form
- CMS/blog and generated-content shell
- Admin operations shell
- Partial Zoho integration
- Partial queue and worker endpoints

### What the system is not yet
- Real AI growth engine
- Trustworthy telemetry system
- Reliable automation platform
- Consistent single-architecture backend
- Production-grade operational control plane

## 2. Root Failure Model

### Why the system failed
The system failed because it was built in the wrong order.

The build order was:
1. Add surfaces
2. Add admin screens
3. Add automation hooks
4. Add AI labels
5. Patch failures with fallbacks

The correct build order should have been:
1. Define contracts
2. Define schema
3. Make flows complete
4. Make telemetry real
5. Add async automation
6. Add AI only where inputs and outputs are measurable

### Three core system failures

#### 1. Broken contract ownership
- Frontend payloads and backend validation do not have a single contract source.
- Public flows can appear complete in UI while failing at API level.
- The contact/callback path is the confirmed example.

#### 2. Broken data plane
- Telemetry is not consistently initialized.
- Metrics are mixed between real writes, derived counters, and synthetic fallback logic.
- Admin reporting is not trustworthy enough to operate growth decisions.

#### 3. Broken execution model
- Request handlers perform too many side effects directly.
- Queueing, routing, follow-up, CRM sync, and analytics are coupled instead of isolated.
- Worker execution exists but is not durable enough to be treated as an operational system.

### One thing to fix first
The first thing to fix is the data plane.

Reason:
- Without a real data plane, the system cannot prove user flow completion, cannot trust metrics, cannot validate automation, and cannot support real AI activation.
- The first concrete work item inside that is to fix the public contract failures and telemetry initialization together, because they create the core truth layer.

## 3. Target Architecture

### Design principles
- One contract per flow
- One source of truth per metric
- One queue per job class
- One routing model for APIs
- No fake AI in production paths
- No dashboard value without traceable persisted data

### 3.1 Frontend Flow Architecture

#### Public flows
- Landing/content flow
  - visit
  - CTA interaction
  - route progression
- Apply flow
  - step validation
  - submit attempt
  - lead create success/failure
  - thank-you transition
- Contact/callback flow
  - explicit form fields
  - submit attempt
  - inquiry success/failure
- Post-submit flow
  - thank-you state
  - optional WhatsApp continuation
  - status messaging

#### Frontend rules
- One global shell in `app/layout.js`
- No duplicate navbar/footer/floating action rendering inside CMS pages
- Each public form owns a typed payload contract
- Each flow emits explicit telemetry events
- UI success states must be backed by API success, not optimistic assumptions

### 3.2 API Layer Structure

#### Target routing model
- `app/api/public/*`
  - public config
  - lead submission
  - contact submission
  - event ingestion
  - utility endpoints
- `app/api/admin/*`
  - admin reads
  - admin mutations
  - config control
  - reporting
- `app/api/jobs/*`
  - internal job execution only
- `app/api/webhooks/*`
  - third-party inbound callbacks

#### API rules
- Request handlers validate, authorize, and dispatch
- Business logic moves into domain services
- Integrations move into provider clients
- No public route should perform more than one primary write synchronously beyond its own domain object and audit event

### 3.3 Data Layer

#### Core operational tables
- `leads`
  - canonical lead record
- `lead_events`
  - lead lifecycle audit
- `lead_attribution`
  - traffic and campaign attribution
- `contact_inquiries`
  - separate from `leads`
- `sessions`
  - session header record
- `session_events`
  - page views, CTA clicks, form actions, conversions
- `agents`
  - active routing actors
- `lead_routing_runs`
  - routing decisions and outcomes
- `crm_sync_runs`
  - Zoho sync attempts and results
- `message_dispatch_runs`
  - email/WhatsApp dispatch attempts and results
- `generation_queue`
  - SEO generation intents
- `job_runs`
  - queue execution ledger
- `job_dead_letters`
  - failed jobs that require operator action
- `page_index`
  - published/generated page registry
- `location_content`
  - generated page content payload
- `system_control_config`
  - runtime flags only

#### Data rules
- Every table used by code must exist in migrations
- Every migration must match runtime assumptions
- Conversion must be explicit:
  - `is_converted`
  - `converted_at`
  - `conversion_value`
  - `conversion_source`
- `zoho_lead_id` is sync metadata, not conversion truth
- No analytics metric may be derived from random or fallback values

### 3.4 Analytics System

#### Event model
- `session_started`
- `page_view`
- `cta_clicked`
- `form_step_completed`
- `form_submit_attempted`
- `form_submit_succeeded`
- `form_submit_failed`
- `lead_created`
- `contact_created`
- `lead_converted`

#### Telemetry architecture
- Client creates or resumes stable `session_id`
- Server ingests all telemetry through one event API
- Server writes authoritative timestamps
- Reporting tables are derived from event-backed data only
- Dashboards read from either:
  - raw event queries for low volume, or
  - materialized summary tables for high volume

#### Telemetry rules
- No hard dependency on a missing config flag that disables all analytics silently
- No synthetic funnel shaping
- No fake scroll-depth estimates
- No mixed reporting where one panel uses real DB counts and another uses fabricated computed values

### 3.5 Queue and Worker System

#### Execution model
- Public requests enqueue work
- Workers execute one job class each
- Every job write is durable and resumable

#### Job classes
- lead enrichment
- lead scoring
- lead routing
- follow-up dispatch
- SEO page generation
- indexing/status propagation

#### Worker requirements
- idempotency key
- retry count
- failure reason
- started/finished timestamps
- worker identity
- dead-letter path

### 3.6 AI System

#### Real AI
- content generation
- content summarization
- structured analysis where the input dataset is real and persisted

#### Not AI
- heuristic lead scoring
- heuristic routing
- static CTA selection
- random analytics decoration

#### AI rules
- No simulated provider in any production path
- Every AI output must persist:
  - provider
  - model
  - prompt version
  - input reference
  - output state
  - failure state

### 3.7 Integration Layer

#### Zoho
- dedicated client
- refresh-token handling
- request/response normalization
- sync attempt persistence

#### Email
- dedicated provider client
- persisted delivery attempts
- no fire-and-forget for critical flows

#### WhatsApp
- split modes clearly:
  - click-to-chat public link
  - provider-based outbound follow-up
- do not label click-to-chat as automation

## 4. Phase Plan

### Phase 1: Critical Fixes

#### What to build or fix
- Repair broken frontend/backend contracts
- Fix analytics initialization contract
- Remove fake analytics and fake AI outputs from admin paths
- Stop duplicate frontend shell rendering
- Fix conversion semantics in admin reporting

#### Why it matters
- This phase restores flow correctness and stops the system from lying

#### Output after completion
- Public contact flow works
- Public apply flow remains intact and observable
- Admin metrics stop showing fabricated intelligence
- Core reporting labels match actual business meaning

### Phase 2: Data Trust

#### What to build or fix
- Define final schema for leads, sessions, events, routing, jobs, CRM sync, and messaging
- Add missing migrations
- Remove or replace schema drift points
- Rebuild event ingestion and event-derived reporting

#### Why it matters
- This phase creates operational truth

#### Output after completion
- Dashboard numbers map to stored rows
- Sessions, page views, submissions, and conversions become measurable
- Schema becomes the actual source of truth

### Phase 3: Flow Completion

#### What to build or fix
- Complete apply flow contract
- Complete contact flow contract
- Complete thank-you state and downstream event sequence
- Standardize error and duplicate handling across public flows

#### Why it matters
- Growth depends on complete flows, not individual endpoints

#### Output after completion
- User journeys are deterministic
- Public flows have observable success/failure paths
- Business operations can trust submit outcomes

### Phase 4: Automation

#### What to build or fix
- Introduce durable `job_runs`
- Split side effects out of request handlers
- Harden QStash worker execution
- Implement dead-letter and retry visibility
- Enable follow-up only after provider confirmation and result persistence

#### Why it matters
- Automation only counts when it is reliable and auditable

#### Output after completion
- Async jobs become measurable and recoverable
- Follow-up and SEO workflows become operational systems, not code paths

### Phase 5: AI Activation

#### What to build or fix
- Keep real AI only where the dataset is real and the output is persisted
- Remove placeholder or demo AI surfaces
- Add model metadata, prompt versioning, and output audits

#### Why it matters
- AI without data truth and execution discipline will recreate the same system failure

#### Output after completion
- Real content generation
- Real AI-assisted admin analysis
- No fake AI behavior in production

## 5. Step-by-Step Roadmap

| Step | Task | File/Module | Action | Outcome | Priority |
|---|---|---|---|---|---|
| 1 | Fix contact flow contract | [`app/contact/ContactContent.jsx`](/f:/bimasakhi-next/app/contact/ContactContent.jsx), [`pages/api/crm/[action].js`](/f:/bimasakhi-next/pages/api/crm/[action].js) | Make frontend and backend use the same required payload | Public callback flow works end-to-end | P0 |
| 2 | Fix analytics init contract | [`services/analytics.js`](/f:/bimasakhi-next/services/analytics.js), [`app/api/config/route.js`](/f:/bimasakhi-next/app/api/config/route.js), [`components/core/AnalyticsTracker.jsx`](/f:/bimasakhi-next/components/core/AnalyticsTracker.jsx) | Either return explicit analytics config or remove the blocking gate | Public telemetry starts recording | P0 |
| 3 | Remove fabricated reporting logic | [`app/api/admin/analytics/dashboard/route.js`](/f:/bimasakhi-next/app/api/admin/analytics/dashboard/route.js), [`app/api/admin/ai/landing/route.js`](/f:/bimasakhi-next/app/api/admin/ai/landing/route.js), [`app/api/admin/seo/analyze/route.js`](/f:/bimasakhi-next/app/api/admin/seo/analyze/route.js), [`components/admin/CommandPalette.jsx`](/f:/bimasakhi-next/components/admin/CommandPalette.jsx) | Delete `Math.random()` and placeholder AI behavior from production paths | Admin stops presenting fake intelligence | P0 |
| 4 | Correct conversion semantics | [`app/api/admin/metrics/route.js`](/f:/bimasakhi-next/app/api/admin/metrics/route.js), [`app/api/admin/dashboard/route.js`](/f:/bimasakhi-next/app/api/admin/dashboard/route.js), [`app/api/admin/leads/convert/route.js`](/f:/bimasakhi-next/app/api/admin/leads/convert/route.js) | Use explicit conversion fields instead of `zoho_lead_id` | Conversion reporting becomes real | P0 |
| 5 | Reconcile queue schema | [`supabase/migrations/018_generation_queue_schema.sql`](/f:/bimasakhi-next/supabase/migrations/018_generation_queue_schema.sql), [`pages/api/crm/[action].js`](/f:/bimasakhi-next/pages/api/crm/[action].js), [`app/api/jobs/pagegen/route.js`](/f:/bimasakhi-next/app/api/jobs/pagegen/route.js) | Align insert payloads, required columns, and consumer expectations | Queue becomes valid and stable | P0 |
| 6 | Define source-of-truth schema set | [`supabase/migrations`](/f:/bimasakhi-next/supabase/migrations) | Add missing tables and remove duplicated schema ownership | Repo schema matches runtime usage | P0 |
| 7 | Introduce event and session model | new telemetry migrations/services, [`app/api/events/route.js`](/f:/bimasakhi-next/app/api/events/route.js) | Replace ad hoc telemetry with stable session + event ingestion | Trustworthy behavioral data | P0 |
| 8 | Remove duplicate shell rendering | [`app/layout.js`](/f:/bimasakhi-next/app/layout.js), [`app/pages/[slug]/page.js`](/f:/bimasakhi-next/app/pages/[slug]/page.js) | Keep one shell owner only | Consistent frontend behavior | P1 |
| 9 | Extract lead domain service | new `lib/domain/leads/*`, migrate logic out of [`pages/api/crm/[action].js`](/f:/bimasakhi-next/pages/api/crm/[action].js) | Separate validation, persistence, and async dispatch | Simpler and testable lead flow | P1 |
| 10 | Extract contact domain service | new `lib/domain/contacts/*`, migrate logic out of [`pages/api/crm/[action].js`](/f:/bimasakhi-next/pages/api/crm/[action].js) | Separate inquiry persistence and downstream sync | Testable contact flow | P1 |
| 11 | Extract Zoho client | new `lib/integrations/zoho/*` | Centralize auth, requests, retries, and result mapping | CRM sync becomes observable and reusable | P1 |
| 12 | Extract email client | new `lib/integrations/email/*` | Persist send attempts and results | Email becomes operationally visible | P1 |
| 13 | Build `job_runs` and dead-letter flow | new migrations and services, `app/api/jobs/*` | Record job lifecycle, retries, failures, and worker metadata | Reliable automation base | P1 |
| 14 | Rebuild follow-up dispatch | [`app/api/jobs/followup-trigger/route.js`](/f:/bimasakhi-next/app/api/jobs/followup-trigger/route.js), [`lib/followup/sendFollowupMessage.js`](/f:/bimasakhi-next/lib/followup/sendFollowupMessage.js) | Use provider abstraction with persisted results and proper gating | Real follow-up automation | P1 |
| 15 | Migrate critical Pages APIs to App Router | [`pages/api/crm/[action].js`](/f:/bimasakhi-next/pages/api/crm/[action].js), [`pages/api/lookup/[action].js`](/f:/bimasakhi-next/pages/api/lookup/[action].js) | Move business-critical endpoints to one routing model | Cleaner backend ownership | P1 |
| 16 | Rebuild admin reporting from event-backed data | `app/api/admin/*`, telemetry summary services | Replace mixed counters with consistent reporting model | Trustworthy admin intelligence | P2 |
| 17 | Re-enable SEO generation under job discipline | [`app/api/jobs/pagegen/route.js`](/f:/bimasakhi-next/app/api/jobs/pagegen/route.js), [`app/api/jobs/index/route.js`](/f:/bimasakhi-next/app/api/jobs/index/route.js) | Make generation and indexing auditable, resumable, and measurable | Real SEO automation path | P2 |
| 18 | Activate real AI only where inputs are real | [`lib/ai/generateContent.js`](/f:/bimasakhi-next/lib/ai/generateContent.js), AI admin routes | Persist AI execution metadata and remove simulated fallbacks from prod | AI becomes accountable | P2 |

## 6. Definition of Done

### System done
- Every public flow completes with matching frontend/backend contracts
- Every production metric maps to persisted source rows
- No admin panel uses random, synthetic, or demo-derived values
- Every table referenced in code exists in migrations
- Queue jobs are resumable, traceable, and dead-letterable
- Integrations record both attempts and outcomes
- Critical APIs are no longer split across architectural styles

### Flow done
- Apply flow
  - submit succeeds
  - lead row created
  - attribution saved
  - success event recorded
- Contact flow
  - public UI submits valid payload
  - inquiry row created
  - CRM sync attempt recorded
  - email attempt recorded
- Telemetry
  - page views
  - CTA clicks
  - form submits
  - conversions
  - all recorded against session and time
- Automation
  - queued jobs execute
  - retries are tracked
  - permanent failures surface in dead-letter queue
- AI
  - every production AI result has provider/model/prompt metadata

## 7. What Not to Build

### Stop building now
- New admin intelligence panels
- New AI recommendation surfaces
- New dynamic homepage experiments
- New automation rules before worker reliability exists
- New SEO page types before the current queue model is stable

### Ignore for now
- Cosmetic admin upgrades
- Additional CMS editing capabilities
- More command-palette features
- More dashboards using the current metric model

### Prioritize now
- Contract repair
- Telemetry truth
- Schema reconciliation
- Worker execution discipline
- Integration observability

## 8. Decision Framework

### Build first if all are true
- Fixes a broken public flow
- Increases data trust
- Removes synthetic behavior
- Reduces architectural duplication
- Makes async work observable

### Delay if any are true
- Adds UI surface without strengthening the underlying flow
- Introduces AI where inputs are not trustworthy
- Adds dashboard metrics without persisted provenance
- Adds automation without retries, logging, and failure handling

### Reject if any are true
- Fake or simulated production behavior
- Metric computed from unrelated fields
- New Pages Router business logic
- New feature that depends on current broken telemetry

## 9. Success Metrics

### When the system becomes real
- Lead submissions from the public apply flow reconcile with `leads` rows
- Contact submissions from the public contact flow reconcile with `contact_inquiries` rows
- Session and event telemetry is present for public traffic
- Dashboard metrics reconcile with stored records
- Queue jobs expose success, retry, and failure rates
- CRM, email, and follow-up attempts are visible per record

### Required proof metrics
- Public lead form success rate >= 98%
- Public contact form success rate >= 98%
- Event ingestion success rate >= 99%
- Queue job success rate >= 95%
- Dead-letter rate visible and bounded
- 100% of dashboard metrics traceable to source rows
- 0 production metrics sourced from `Math.random()` or placeholder logic
- 100% of production AI outputs tagged with execution metadata

## 10. Operating Sequence

1. Repair contracts
2. Repair telemetry
3. Repair schema ownership
4. Repair reporting semantics
5. Repair worker execution
6. Repair integrations
7. Activate AI where the system can measure it

## 11. Phase 1 Done Definition

Phase 1 is complete when all are true:
- public contact flow is contract-correct
- first-party telemetry initializes on normal pages
- admin scoped outputs no longer fabricate intelligence
- conversion reporting is separated from CRM sync metadata
- repo schema covers critical runtime tables and columns
- queue producer and workers share one documented contract
- runtime posture is documented in code and docs

Phase 1 completion does not mean:
- AI should be enabled
- queue should be unpaused
- follow-up should be activated
- email provider is production-ready
