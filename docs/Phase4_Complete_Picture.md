# 🏗️ PHASE 4 — COMPLETE PICTURE
## Bima Sakhi Central Agent OS — Full Implementation Blueprint

> **Ye document padhne ke baad tumhe kisi se bhi poochne ki zarurat nahi padegi.**
> Har cheez — architecture, AI agents, admin panel, APIs, database, files — sab kuch yahan hai.

---

# 📋 TABLE OF CONTENTS

1. [System Overview — Kya Banana Hai](#1-system-overview)
2. [Architecture — Kaise Kaam Karega](#2-architecture)
3. [AI Agent Strategy — Kaun Sa AI, Kahan, Kyun](#3-ai-agent-strategy)
4. [Free vs Paid AI APIs — Paisa Bachao Plan](#4-free-vs-paid-ai-apis)
5. [Executive Agents — 7 Digital Executives](#5-executive-agents)
6. [Admin Panel — Complete Control System](#6-admin-panel)
7. [Database Schema — Kya Store Hoga](#7-database-schema)
8. [File Structure — Code Kahan Likhna Hai](#8-file-structure)
9. [Event System — Trigger Flow](#9-event-system)
10. [Tool Library — AI Kya Kya Karega](#10-tool-library)
11. [Automation Workflows — Bina Code Ke Kaam](#11-automation-workflows)
12. [Phase-wise Execution Plan — Kab Kya Banana Hai](#12-execution-plan)
13. [Cost Analysis — Kitna Kharcha](#13-cost-analysis)
14. [Admin Panel — Screen by Screen Control](#14-admin-screens)
15. [Final Checklist](#15-final-checklist)

---

# 1. SYSTEM OVERVIEW

## Kya Banana Hai?

Bima Sakhi ko ek **Digital Corporation** banana hai. Jaise ek real company mein CEO, CMO, CTO, CFO hote hain — waise hi humara software mein **7 Digital Executives** honge:

```
┌─────────────────────────────────────────────────────┐
│                    ADMIN (YOU)                       │
│              Admin Panel → Full Control              │
├─────────────────────────────────────────────────────┤
│                    CEO (Router)                      │
│          Routes events → correct executive           │
├──────┬──────┬──────┬──────┬──────┬──────┬───────────┤
│ CMO  │ CSO  │ COO  │ CTO  │ CFO  │ CHRO │           │
│ Mktg │ Sale │ Ops  │ Tech │ Fin  │ HR   │           │
├──────┴──────┴──────┴──────┴──────┴──────┴───────────┤
│              TOOL LAYER (AI + APIs)                  │
├─────────────────────────────────────────────────────┤
│              WORKER LAYER (Queue)                    │
├─────────────────────────────────────────────────────┤
│              DATABASE (Supabase)                     │
└─────────────────────────────────────────────────────┘
```

## Core Principle

```
❗ System = Deterministic Machine (80% Rules)
❗ AI = Assistant Only (20% Content/Analysis)
❗ Admin = Full Override Power
❗ No Event Without Mapping
❗ No Execution Without Tool
```

---

# 2. ARCHITECTURE

## The Execution Pipeline (NEVER CHANGES)

```
Event → Trigger → Executive → Decision → Tool → Worker → DB
```

### Step-by-step Flow:

```
1. EVENT happens (user clicks, lead comes, payment done, cron fires)
     ↓
2. TRIGGER MAP checks event type and routes to correct Executive
     ↓
3. EXECUTIVE (CMO/CSO/CTO etc.) receives the event
     ↓
4. DECISION ENGINE (IF/ELSE rules, NO AI) decides what to do
     ↓
5. TOOL executes the action (AI content, CRM call, WhatsApp, Email)
     ↓
6. WORKER processes async job via QStash queue
     ↓
7. DATABASE stores final result (Supabase)
```

### When Does CEO Come In?

```
IF event type is KNOWN   → Bypass CEO, directly go to Executive
IF event type is UNKNOWN → CEO's static routing table → maps to Executive
IF event FAILS           → Exception Handler → Retry or Escalate
```

---

# 3. AI AGENT STRATEGY

## Smart AI Architecture — Multi-Provider Gateway

Hum **ek hi codebase** se multiple AI providers use karenge. Koi ek band ho jaye toh doosra le le.

### The Provider Priority Chain:

```
Request comes → 
  1. TRY Gemini (FREE)
  2. IF rate-limited → TRY Groq (FREE)  
  3. IF rate-limited → TRY OpenRouter Free (FREE)
  4. IF all free fail → TRY Gemini Paid
  5. IF emergency → OpenAI GPT-4o-mini (PAID, cheapest)
  6. IF all fail → Return template/fallback (NO AI)
```

### Which AI For What Task?

| Task | Best Provider | Cost | Why |
|------|--------------|------|-----|
| SEO Blog Writing | Gemini 2.5 Flash | 🟢 FREE | Best free tier, 1M context window |
| Lead Scoring | Groq (Llama 3.3) | 🟢 FREE | Ultra-fast response |
| Content Translation | Gemini Flash | 🟢 FREE | Hindi/English both great |
| Chatbot/Conversation | Groq (Mistral) | 🟢 FREE | Real-time speed |
| Email Drafting | OpenRouter Free | 🟢 FREE | Multiple model rotation |
| WhatsApp Message | Template + Gemini | 🟢 FREE | Simple text generation |
| Complex Analysis | OpenAI GPT-4o-mini | 🔴 PAID ($0.15/1M) | When quality critical |
| Image Generation | Cloudflare Workers AI | 🟢 FREE | FLUX model free tier |
| PDF Parsing | Google Doc AI | 🟡 FREE TIER | 1000 pages/month free |
| Voice (Future) | Google Cloud TTS | 🟡 FREE TIER | 4M chars/month free |
| Resume Screening | Gemini Flash | 🟢 FREE | Good at structured extraction |

---

# 4. FREE vs PAID AI APIs

## MASTER API TABLE — Paisa Bachao Plan

### 🟢 FREE TIER APIs (Yeh Sab Use Karo)

| API | Free Limit | Use Case | Setup |
|-----|-----------|----------|-------|
| **Google Gemini AI Studio** | Unlimited (rate-limited: ~15 RPM) | Content, SEO, Analysis, Translation | `GEMINI_API_KEY` → ai.google.dev |
| **Groq Cloud** | Unlimited (rate-limited: ~30 RPM) | Fast responses, Chat, Scoring | `GROQ_API_KEY` → console.groq.com |
| **OpenRouter** | 25+ free models, ~200 req/day | Fallback, Model rotation | `OPENROUTER_API_KEY` → openrouter.ai |
| **Hugging Face** | Free inference API | Classification, Sentiment | `HF_API_KEY` → huggingface.co |
| **Cloudflare Workers AI** | 10,000 neurons/day | Image Gen (FLUX), Embeddings | Cloudflare dashboard |
| **Upstash QStash** | 500 msgs/day free | Job queue, Async workers | Already integrated ✅ |
| **Supabase** | 500MB DB, 2GB storage | Database, Auth, Storage | Already integrated ✅ |
| **Vercel** | 100GB bandwidth/mo | Hosting, Edge Functions | Already integrated ✅ |

### 🟡 FREE TIER WITH LIMITS (Jarurat Padne Par)

| API | Free Limit | Use Case | Monthly Cost After |
|-----|-----------|----------|-------------------|
| **Google Cloud TTS** | 4M chars/month | Voice messages | $4/1M chars |
| **Amazon Polly** | 5M chars/month (12mo) | Volume TTS | $4/1M chars |
| **Google Doc AI** | 1000 pages/month | PDF/Document parsing | $1.50/1000 pages |
| **Resend Email** | 100 emails/day | Email automation | $20/mo for 50K |
| **WhatsApp Business API** | First 1000 conv/mo free | WhatsApp messaging | ~₹0.50/conversation |

### 🔴 PAID (Minimum Use Karo)

| API | Cost | When To Use |
|-----|------|-------------|
| **OpenAI GPT-4o-mini** | $0.15/1M input tokens | Only when free models fail quality check |
| **Claude Sonnet** | $3/1M input tokens | Complex reasoning (rare) |
| **Twilio** | Per message | If WhatsApp Business API hits limit |

### 💡 Pro Strategy: OpenRouter as Universal Gateway

```javascript
// One API, all models — change just one line to switch providers
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}` },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',  // ← Change this to switch
    // model: 'meta-llama/llama-3.3-70b', // FREE option
    // model: 'mistralai/mistral-large',   // Another option
    messages: [{ role: 'user', content: prompt }]
  })
});
```

---

# 5. EXECUTIVE AGENTS — 7 Digital Executives

## How Each One Works In Code

### 5.0 CEO — The Router (100% Rules, 0% AI)

```
ROLE: Route unclear events to correct executive
AI: ❌ NEVER
INPUT: Unknown/ambiguous events
OUTPUT: Routed to correct executive

ADMIN CONTROLS:
  - Routing rules table (editable from admin panel)
  - Fallback mapping
  - Exception handling rules
  - Override routing manually
```

**Admin Panel Section:** `CEO → Routing Rules`
- View all routing rules
- Add/Edit/Delete rules
- Set priority order
- Emergency override button

---

### 5.1 CMO — Marketing OS (80% AI, 20% Human)

```
ROLE: Lead generation, SEO content, campaigns
AI: ✅ Content generation, SEO analysis, lead scoring
INPUT: Leads, keywords, campaign data
OUTPUT: Blog posts, WhatsApp campaigns, scored leads

TEAMS:
  1. Content Team     → Blog, SEO, Landing pages
  2. Lead Gen Team    → Lead scoring, qualification
  3. Campaign Team    → WhatsApp, Email, SMS campaigns
  4. Analytics Team   → Marketing metrics, ROI tracking
```

**AI Tools Used:**
| Tool | AI Provider | Admin Control |
|------|------------|---------------|
| `write_seo_blog` | Gemini Flash | ON/OFF from panel, edit prompts |
| `score_lead` | Groq Llama | ON/OFF, adjust scoring weights |
| `send_whatsapp_campaign` | Template-based | ON/OFF, edit templates |
| `generate_social_post` | Gemini Flash | ON/OFF, approve before post |
| `analyze_seo_page` | Gemini Flash | ON/OFF, view reports |

**Admin Panel Section:** `CMO → Marketing Control`
- Content Calendar → Schedule/approve/reject posts
- Lead Scoring Rules → Adjust weights
- Campaign Manager → Create/pause/stop campaigns
- SEO Dashboard → View scores, suggestions
- Template Editor → Edit WhatsApp/Email templates

---

### 5.2 COO — Operations OS (80% System, 20% Human)

```
ROLE: Service delivery, workflow execution, customer ops
AI: ✅ Only for document parsing, summarization
INPUT: Workflows, service requests, operations data
OUTPUT: Executed workflows, delivery status

TEAMS:
  1. Service Delivery   → Policy delivery, claim support
  2. Workflow Engine     → Process automation
  3. Customer Ops       → Queries, support tickets
  4. Quality Team       → Service quality tracking
```

**AI Tools Used:**
| Tool | AI Provider | Admin Control |
|------|------------|---------------|
| `parse_policy_pdf` | Google Doc AI | ON/OFF |
| `calculate_premium` | Rule Engine (NO AI) | Edit calculator rules |
| `calculate_maturity` | Rule Engine (NO AI) | Edit formulas |
| `auto_reply_query` | Gemini Flash | ON/OFF, edit templates |

**Admin Panel Section:** `COO → Operations Control`
- Workflow Manager → View/edit workflows
- Service Tracker → Track delivery status
- Calculator Config → Edit premium/maturity formulas
- Query Manager → Auto-reply rules
- SLA Dashboard → Service level tracking

---

### 5.3 CTO — Tech OS (90% System, 10% Human)

```
ROLE: System health, monitoring, infrastructure
AI: ✅ Only for log analysis, anomaly detection
INPUT: System data, logs, errors
OUTPUT: Health status, alerts, fixes

TEAMS:
  1. System Architecture  → System design
  2. Backend & API        → APIs, integrations
  3. Frontend & UX        → UI/UX
  4. DevOps & Infra       → Deployment, monitoring
  5. Data & Analytics     → Data pipelines
  6. QA & Security        → Testing, security
  7. AI & Automation      → AI integration, prompt engineering
```

**AI Tools Used:**
| Tool | AI Provider | Admin Control |
|------|------------|---------------|
| `analyze_error_logs` | Gemini Flash | ON/OFF |
| `detect_anomaly` | Groq Llama | ON/OFF, set thresholds |
| `generate_report` | Gemini Flash | ON/OFF |

**Admin Panel Section:** `CTO → System Control`
- System Health Dashboard → Real-time status
- Error Monitor → View/resolve errors
- API Status → All integrations health
- Queue Monitor → Worker queue status
- AI Provider Status → Which AI is active/down
- Config Manager → system_control_config toggles

---

### 5.4 CSO — Sales OS (60% System, 40% Human)

```
ROLE: Lead conversion, closing, retention
AI: ✅ Lead scoring, objection scripts, forecasting
INPUT: Qualified leads, sales data
OUTPUT: Closed deals, revenue

TEAMS:
  1. Inbound Sales      → Lead qualification, telecalling
  2. Outbound Sales     → Cold outreach, prospecting
  3. Field Sales        → Direct meetings, closing
  4. Closing Team       → High-value deal closing
  5. Sales Enablement   → Training, materials
  6. Customer Success   → Retention, upsell
  7. Channel Partners   → Partner management
  8. Sales Analytics    → Forecasting, performance
```

**AI Tools Used:**
| Tool | AI Provider | Admin Control |
|------|------------|---------------|
| `score_lead_intent` | Groq Llama | ON/OFF, scoring rules |
| `generate_call_script` | Gemini Flash | ON/OFF, edit scripts |
| `predict_conversion` | Gemini Flash | ON/OFF |
| `draft_follow_up` | Gemini Flash | ON/OFF, templates |
| `detect_churn_risk` | Groq Llama | ON/OFF, thresholds |

**Admin Panel Section:** `CSO → Sales Control`
- Lead Pipeline → Full visual pipeline view
- Assignment Rules → Auto/manual lead assignment
- Script Manager → Edit call/chat scripts
- Follow-up Rules → Automated sequence editor
- Revenue Dashboard → Real-time revenue tracking
- Target Manager → Set/track team targets
- Churn Alert Settings → Risk thresholds

---

### 5.5 CFO — Finance OS (90% System, 10% Human)

```
ROLE: Payments, commission, cost control
AI: ✅ Only for financial analysis, forecasting
INPUT: Transactions, financial data
OUTPUT: Reports, compliance, payroll

TEAMS:
  1. Accounting         → Books, ledger
  2. FP&A               → Planning, forecasting
  3. Taxation           → GST, income tax
  4. Treasury           → Cash flow
  5. Audit              → Internal audit
  6. Financial Reports  → MIS, P&L
  7. Investor Relations → Funding, valuation
  8. Finance Ops        → Payroll, billing
```

**AI Tools Used:**
| Tool | AI Provider | Admin Control |
|------|------------|---------------|
| `calculate_commission` | Rule Engine (NO AI) | Edit commission rules |
| `forecast_revenue` | Gemini Flash | ON/OFF |
| `detect_anomaly_expense` | Groq Llama | ON/OFF, thresholds |
| `generate_financial_report` | Gemini Flash | ON/OFF |

**Admin Panel Section:** `CFO → Finance Control`
- Commission Calculator → Edit commission slabs
- Revenue Dashboard → Real-time revenue
- Expense Tracker → Cost monitoring
- Payroll Manager → Salary processing
- Tax Dashboard → GST/IT filing status
- Budget Manager → Set/track budgets
- Invoice Generator → Auto-generate invoices

---

### 5.6 CHRO — HR OS (70% System, 30% Human)

```
ROLE: Recruitment, training, performance management
AI: ✅ Resume screening, training content, engagement
INPUT: Candidates, employees, performance data
OUTPUT: Hired, trained, retained workforce

TEAMS:
  1. Recruitment        → Hiring pipeline
  2. Onboarding         → New employee setup
  3. Training & Dev     → LMS, skill assessment
  4. Performance Mgmt   → KPIs, appraisals
  5. Employee Engage    → Culture, events
  6. Payroll & Comp     → Salary, incentives
  7. HR Operations      → Attendance, leave
  8. HR Analytics       → Attrition, workforce planning
```

**AI Tools Used:**
| Tool | AI Provider | Admin Control |
|------|------------|---------------|
| `screen_resume` | Gemini Flash | ON/OFF, criteria |
| `generate_training_module` | Gemini Flash | ON/OFF |
| `assess_skill` | Rule Engine + AI | ON/OFF, question bank |
| `predict_attrition` | Groq Llama | ON/OFF |
| `draft_communication` | Gemini Flash | ON/OFF, templates |

**Admin Panel Section:** `CHRO → HR Control`
- Hiring Pipeline → Visual recruitment tracker
- Candidate Manager → Review/approve/reject
- Training Dashboard → Course management
- Performance Board → KPI tracking
- Attendance System → Leave/attendance logs
- Incentive Rules → Edit incentive formulas
- Team Directory → Employee management

---

# 6. ADMIN PANEL — Complete Control System

## The Master Control Principle

> **RULE: Admin se sab kuch control hoga. Code likhne ki zarurat nahi padegi.**

### 6.1 Admin Panel Architecture

```
/admin/
  ├── dashboard/          → Overview of everything
  ├── ceo/                → Routing rules, escalation
  │   ├── routing/        → Event → Executive mapping
  │   ├── exceptions/     → Failed events
  │   └── overrides/      → Manual routing
  ├── cmo/                → Marketing control
  │   ├── content/        → Blog/SEO management
  │   ├── campaigns/      → Campaign builder
  │   ├── leads/          → Lead scoring config
  │   ├── templates/      → WhatsApp/Email templates
  │   └── analytics/      → Marketing metrics
  ├── cso/                → Sales control
  │   ├── pipeline/       → Lead pipeline
  │   ├── assignments/    → Lead assignment rules
  │   ├── scripts/        → Call/chat scripts
  │   ├── follow-ups/     → Automation sequences
  │   ├── targets/        → Revenue targets
  │   └── analytics/      → Sales metrics
  ├── coo/                → Operations control
  │   ├── workflows/      → Workflow editor
  │   ├── services/       → Service tracker
  │   ├── calculators/    → Premium/maturity config
  │   └── queries/        → Support queries
  ├── cto/                → System control
  │   ├── health/         → System status
  │   ├── errors/         → Error monitor
  │   ├── apis/           → Integration status
  │   ├── queue/          → Worker queue
  │   ├── ai-providers/   → AI provider management
  │   └── config/         → System config toggles
  ├── cfo/                → Finance control
  │   ├── commission/     → Commission calculator
  │   ├── revenue/        → Revenue dashboard
  │   ├── expenses/       → Cost monitoring
  │   ├── payroll/        → Salary management
  │   ├── tax/            → Tax filing
  │   └── invoices/       → Invoice management
  ├── chro/               → HR control
  │   ├── hiring/         → Recruitment pipeline
  │   ├── training/       → LMS management
  │   ├── performance/    → KPI dashboard
  │   ├── attendance/     → Leave/attendance
  │   └── incentives/     → Incentive rules
  └── settings/
      ├── ai-config/      → AI provider keys, models, prompts
      ├── rules-engine/   → All business rules
      ├── notifications/  → Alert settings
      ├── users/          → User management
      └── backup/         → Data backup
```

### 6.2 What Admin Can Control WITHOUT Code

| Control | How | Where in Panel |
|---------|-----|---------------|
| Turn AI ON/OFF | Toggle switch | Settings → AI Config |
| Change AI model | Dropdown select | Settings → AI Config |
| Edit AI prompts | Text editor | Settings → AI Config → Prompts |
| Add routing rules | Form | CEO → Routing |
| Override any action | Button | Any section → Override |
| Pause queue | Toggle | CTO → Queue |
| Edit email templates | Rich text editor | CMO → Templates |
| Edit WhatsApp templates | Template builder | CMO → Templates |
| Set lead scoring weights | Sliders | CMO → Lead Scoring |
| Create campaigns | Step wizard | CMO → Campaigns |
| Change commission slabs | Table editor | CFO → Commission |
| Set targets | Number inputs | CSO → Targets |
| Manage users | CRUD interface | Settings → Users |
| View all logs | Log viewer | CTO → Logs |
| Set alert thresholds | Number inputs | Settings → Notifications |
| Manage workflows | Visual builder | COO → Workflows |
| Edit calculator formulas | Form | COO → Calculators |
| Download reports | PDF export | Any Analytics section |
| Emergency system pause | Big Red Button | Dashboard → Emergency |

### 6.3 The system_control_config Table (Already Exists!)

Current config in database:

```sql
-- Already exists in system_control_config table
ai_enabled          BOOLEAN   -- Toggle AI globally
queue_paused        BOOLEAN   -- Pause all async jobs
batch_size          INTEGER   -- Worker batch size
crm_auto_routing    BOOLEAN   -- Auto-route to CRM
followup_enabled    BOOLEAN   -- Enable follow-up sequences
```

**New fields needed for Phase 4:**

```sql
-- Phase 4 additions to system_control_config
ai_primary_provider     TEXT      DEFAULT 'gemini'
ai_fallback_provider    TEXT      DEFAULT 'groq'
ai_emergency_provider   TEXT      DEFAULT 'openai'
cmo_enabled             BOOLEAN   DEFAULT true
cso_enabled             BOOLEAN   DEFAULT true
coo_enabled             BOOLEAN   DEFAULT true
cfo_enabled             BOOLEAN   DEFAULT true
chro_enabled            BOOLEAN   DEFAULT true
content_auto_publish    BOOLEAN   DEFAULT false
lead_auto_assign        BOOLEAN   DEFAULT true
whatsapp_enabled        BOOLEAN   DEFAULT false
email_enabled           BOOLEAN   DEFAULT false
voice_enabled           BOOLEAN   DEFAULT false
maintenance_mode        BOOLEAN   DEFAULT false
```

---

# 7. DATABASE SCHEMA — New Tables Needed

## Existing Tables (Already Built)

```
✅ leads                    → Lead data
✅ lead_events              → Lead lifecycle events
✅ lead_metadata            → Lead extra data
✅ contact_inquiries        → Contact form submissions
✅ sessions                 → User sessions
✅ event_stream             → Telemetry events
✅ system_control_config    → System toggles
✅ job_runs                 → Async job tracking
✅ job_dead_letters         → Failed jobs
✅ failed_leads             → Failed lead submissions
✅ observability_logs       → System logs
✅ agents                   → Field agents
✅ agent_business_metrics   → Agent performance
✅ ai_decision_logs         → AI decision audit trail
✅ communication_templates  → Message templates
```

## New Tables for Phase 4

### 7.1 Executive Event Routing

```sql
CREATE TABLE executive_routing_rules (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type    TEXT NOT NULL,
  executive     TEXT NOT NULL,  -- 'cmo', 'cso', 'coo', 'cto', 'cfo', 'chro'
  priority      INTEGER DEFAULT 100,
  conditions    JSONB DEFAULT '{}',  -- Extra conditions
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Example data:
-- ('lead_created', 'cmo', 100, '{}', true)
-- ('lead_hot', 'cso', 100, '{}', true)
-- ('payment_received', 'cfo', 100, '{}', true)
-- ('agent_joined', 'chro', 100, '{}', true)
-- ('system_error', 'cto', 100, '{}', true)
```

### 7.2 AI Provider Registry

```sql
CREATE TABLE ai_providers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,  -- 'gemini', 'groq', 'openrouter', 'openai'
  display_name  TEXT NOT NULL,
  api_base_url  TEXT NOT NULL,
  model_name    TEXT NOT NULL,
  is_free       BOOLEAN DEFAULT true,
  is_active     BOOLEAN DEFAULT true,
  priority      INTEGER DEFAULT 100,   -- Lower = higher priority
  rate_limit    INTEGER DEFAULT 15,    -- RPM
  cost_per_1m   DECIMAL(10,4) DEFAULT 0,
  last_health   TEXT DEFAULT 'unknown',
  last_checked  TIMESTAMPTZ,
  config        JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Seed data:
-- ('gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com/', 'gemini-2.5-flash', true, true, 10, 15, 0)
-- ('groq', 'Groq Cloud', 'https://api.groq.com/openai/', 'llama-3.3-70b-versatile', true, true, 20, 30, 0)
-- ('openrouter', 'OpenRouter', 'https://openrouter.ai/api/', 'openrouter/free', true, true, 30, 20, 0)
-- ('openai', 'OpenAI', 'https://api.openai.com/', 'gpt-4o-mini', false, true, 100, 60, 0.15)
```

### 7.3 AI Prompt Templates (Admin-editable)

```sql
CREATE TABLE ai_prompt_templates (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_name     TEXT NOT NULL,  -- 'write_seo_blog', 'score_lead', etc.
  executive     TEXT NOT NULL,  -- 'cmo', 'cso', etc.
  system_prompt TEXT NOT NULL,
  user_prompt   TEXT NOT NULL,  -- Template with {{variables}}
  provider      TEXT DEFAULT 'gemini',
  is_active     BOOLEAN DEFAULT true,
  version       INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

### 7.4 Campaigns

```sql
CREATE TABLE campaigns (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL,  -- 'whatsapp', 'email', 'sms'
  status        TEXT DEFAULT 'draft',  -- 'draft', 'scheduled', 'running', 'paused', 'completed'
  template_id   UUID REFERENCES communication_templates(id),
  audience      JSONB DEFAULT '{}',  -- Filter criteria
  schedule      TIMESTAMPTZ,
  stats         JSONB DEFAULT '{"sent":0,"delivered":0,"read":0,"failed":0}',
  created_by    TEXT DEFAULT 'admin',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

### 7.5 Workflows (COO Automation)

```sql
CREATE TABLE workflows (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  executive     TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  steps         JSONB NOT NULL,  -- Array of workflow steps
  is_active     BOOLEAN DEFAULT true,
  run_count     INTEGER DEFAULT 0,
  last_run      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Example steps JSON:
-- [
--   {"order": 1, "action": "check_lead_score", "params": {"min_score": 70}},
--   {"order": 2, "action": "assign_to_agent", "params": {"type": "round_robin"}},
--   {"order": 3, "action": "send_whatsapp", "params": {"template": "welcome_lead"}}
-- ]
```

### 7.6 Commission Rules (CFO)

```sql
CREATE TABLE commission_rules (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_type     TEXT NOT NULL,  -- 'lic_jeevan', 'lic_term', etc.
  agent_level   TEXT NOT NULL,  -- 'do', 'agent', 'senior_agent'
  year          INTEGER NOT NULL,  -- Commission year (1, 2, 3...)
  rate_percent  DECIMAL(5,2) NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### 7.7 HR/Recruitment (CHRO)

```sql
CREATE TABLE candidates (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  status        TEXT DEFAULT 'new',  -- 'new', 'screening', 'interview', 'offered', 'hired', 'rejected'
  position      TEXT,
  resume_url    TEXT,
  ai_score      DECIMAL(5,2),
  notes         JSONB DEFAULT '[]',
  source        TEXT,
  assigned_to   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

### 7.8 Executive Action Logs

```sql
CREATE TABLE executive_action_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  executive     TEXT NOT NULL,
  action        TEXT NOT NULL,
  event_type    TEXT,
  input_data    JSONB DEFAULT '{}',
  output_data   JSONB DEFAULT '{}',
  tool_used     TEXT,
  ai_provider   TEXT,
  ai_tokens     INTEGER DEFAULT 0,
  ai_cost       DECIMAL(10,6) DEFAULT 0,
  status        TEXT DEFAULT 'success',
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

# 8. FILE STRUCTURE — Code Kahan Likhna Hai

## New Files to Create

```
f:/bimasakhi-next/
├── lib/
│   ├── ai/
│   │   ├── index.js                     ← exists ✅
│   │   ├── generateContent.js           ← exists ✅ (Gemini)
│   │   ├── providers/
│   │   │   ├── local.js                 ← exists ✅
│   │   │   ├── openai.js               ← exists ✅
│   │   │   ├── gemini.js               ← NEW (dedicated Gemini provider)
│   │   │   ├── groq.js                 ← NEW (Groq provider)
│   │   │   └── openrouter.js           ← NEW (OpenRouter gateway)
│   │   ├── gateway.js                   ← NEW (Multi-provider gateway with fallback)
│   │   ├── promptManager.js             ← NEW (Load prompts from DB)
│   │   └── costTracker.js               ← NEW (Track AI spending)
│   │
│   ├── executives/
│   │   ├── index.js                     ← NEW (Executive registry)
│   │   ├── ceo.js                       ← NEW (Router + Exception handler)
│   │   ├── cmo.js                       ← NEW (Marketing executive)
│   │   ├── cso.js                       ← NEW (Sales executive)
│   │   ├── coo.js                       ← NEW (Operations executive)
│   │   ├── cto.js                       ← NEW (Tech executive - monitoring)
│   │   ├── cfo.js                       ← NEW (Finance executive)
│   │   └── chro.js                      ← NEW (HR executive)
│   │
│   ├── tools/
│   │   ├── index.js                     ← NEW (Tool registry)
│   │   ├── marketing/
│   │   │   ├── writeSEOBlog.js          ← NEW
│   │   │   ├── scoreLead.js             ← exists (lib/ai/leadScorer.js)
│   │   │   ├── generateSocialPost.js    ← NEW
│   │   │   └── analyzeSEOPage.js        ← NEW
│   │   ├── sales/
│   │   │   ├── scoreLeadIntent.js       ← NEW
│   │   │   ├── generateCallScript.js    ← NEW
│   │   │   ├── draftFollowUp.js         ← NEW
│   │   │   └── detectChurnRisk.js       ← NEW
│   │   ├── operations/
│   │   │   ├── calculatePremium.js      ← NEW (Rule engine, NO AI)
│   │   │   ├── calculateMaturity.js     ← NEW (Rule engine, NO AI)
│   │   │   ├── parsePolicyPDF.js        ← NEW
│   │   │   └── autoReplyQuery.js        ← NEW
│   │   ├── finance/
│   │   │   ├── calculateCommission.js   ← NEW (Rule engine)
│   │   │   ├── forecastRevenue.js       ← NEW
│   │   │   └── generateReport.js        ← NEW
│   │   ├── hr/
│   │   │   ├── screenResume.js          ← NEW
│   │   │   ├── generateTraining.js      ← NEW
│   │   │   └── predictAttrition.js      ← NEW
│   │   └── common/
│   │       ├── sendWhatsApp.js          ← NEW
│   │       ├── sendEmail.js             ← NEW
│   │       ├── scheduleMeeting.js       ← NEW
│   │       └── translateText.js         ← NEW
│   │
│   ├── events/
│   │   ├── eventBus.js                  ← NEW (Central event handler)
│   │   ├── triggerMap.js                ← NEW (Event → Executive mapping)
│   │   └── eventTypes.js               ← NEW (All event type constants)
│   │
│   ├── rules/
│   │   ├── ruleEngine.js               ← NEW (IF/ELSE decision engine)
│   │   └── ruleLoader.js               ← NEW (Load rules from DB)
│   │
│   ├── queue/
│   │   ├── publisher.js                 ← exists ✅
│   │   ├── qstash.js                    ← exists ✅
│   │   └── jobRouter.js                ← NEW (Route jobs to correct worker)
│   │
│   └── state/
│       ├── leadState.js                 ← NEW (Lead state machine)
│       ├── agentState.js                ← NEW (Agent state machine)
│       └── systemState.js              ← NEW (System health state)
│
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── executives/
│   │   │   │   ├── route.js             ← NEW (CRUD for executive config)
│   │   │   │   └── [exec]/route.js      ← NEW (Per-executive control)
│   │   │   ├── ai-providers/
│   │   │   │   ├── route.js             ← NEW (Manage AI providers)
│   │   │   │   └── test/route.js        ← NEW (Test AI provider health)
│   │   │   ├── prompts/
│   │   │   │   └── route.js             ← NEW (CRUD for AI prompts)
│   │   │   ├── routing-rules/
│   │   │   │   └── route.js             ← NEW (CRUD for routing rules)
│   │   │   ├── campaigns/
│   │   │   │   └── route.js             ← NEW (Campaign management)
│   │   │   ├── workflows/
│   │   │   │   └── route.js             ← NEW (Workflow management)
│   │   │   ├── commission/
│   │   │   │   └── route.js             ← NEW (Commission rules)
│   │   │   ├── candidates/
│   │   │   │   └── route.js             ← NEW (HR candidate management)
│   │   │   └── ai-costs/
│   │   │       └── route.js             ← NEW (AI spending dashboard)
│   │   ├── events/
│   │   │   └── route.js                 ← exists ✅ (enhance with trigger)
│   │   └── workers/
│   │       ├── lead-sync/               ← exists ✅
│   │       ├── contact-sync/            ← exists ✅
│   │       ├── executive/
│   │       │   └── route.js             ← NEW (Executive worker dispatcher)
│   │       └── campaign/
│   │           └── route.js             ← NEW (Campaign execution worker)
│   │
│   └── admin/
│       ├── page.js                      ← exists ✅ (main dashboard)
│       ├── ceo/
│       │   ├── page.js                  ← NEW (CEO routing dashboard)
│       │   ├── routing/page.js          ← NEW (Routing rules CRUD)
│       │   └── exceptions/page.js       ← NEW (Failed events)
│       ├── cmo/
│       │   ├── page.js                  ← NEW (CMO dashboard)
│       │   ├── content/page.js          ← NEW (Content management)
│       │   ├── campaigns/page.js        ← NEW (Campaign builder)
│       │   ├── leads/page.js            ← exists ✅ (enhance)
│       │   └── templates/page.js        ← NEW (Template editor)
│       ├── cso/
│       │   ├── page.js                  ← NEW (CSO dashboard)
│       │   ├── pipeline/page.js         ← NEW (Lead pipeline)
│       │   ├── assignments/page.js      ← NEW (Assignment rules)
│       │   ├── scripts/page.js          ← NEW (Script manager)
│       │   └── follow-ups/page.js       ← NEW (Automation sequences)
│       ├── coo/
│       │   ├── page.js                  ← NEW (COO dashboard)
│       │   ├── workflows/page.js        ← NEW (Workflow editor)
│       │   ├── calculators/page.js      ← NEW (Premium calculator config)
│       │   └── queries/page.js          ← NEW (Support queries)
│       ├── cto/
│       │   ├── page.js                  ← NEW (CTO dashboard)
│       │   ├── health/page.js           ← exists ✅ (enhance)
│       │   ├── ai-providers/page.js     ← NEW (AI provider manager)
│       │   └── queue/page.js            ← NEW (Queue monitor)
│       ├── cfo/
│       │   ├── page.js                  ← NEW (CFO dashboard)
│       │   ├── commission/page.js       ← NEW (Commission rules)
│       │   ├── revenue/page.js          ← NEW (Revenue tracker)
│       │   └── payroll/page.js          ← NEW (Payroll)
│       └── chro/
│           ├── page.js                  ← NEW (CHRO dashboard)
│           ├── hiring/page.js           ← NEW (Recruitment pipeline)
│           ├── training/page.js         ← NEW (Training manager)
│           └── performance/page.js      ← NEW (KPI tracker)
```

---

# 9. EVENT SYSTEM — Trigger Flow

## Event Types (Complete List)

```javascript
// lib/events/eventTypes.js
export const EVENT_TYPES = {
  // CMO Events (Marketing)
  LEAD_CREATED:         'lead_created',
  LEAD_SCORED:          'lead_scored',
  CONTENT_GENERATED:    'content_generated',
  CAMPAIGN_STARTED:     'campaign_started',
  CAMPAIGN_COMPLETED:   'campaign_completed',
  SEO_AUDIT_DONE:       'seo_audit_done',

  // CSO Events (Sales)
  LEAD_QUALIFIED:       'lead_qualified',
  LEAD_HOT:             'lead_hot',
  LEAD_ASSIGNED:        'lead_assigned',
  MEETING_SCHEDULED:    'meeting_scheduled',
  DEAL_CLOSED:          'deal_closed',
  DEAL_LOST:            'deal_lost',
  FOLLOW_UP_DUE:        'follow_up_due',
  CHURN_RISK:           'churn_risk',

  // COO Events (Operations)
  POLICY_CREATED:       'policy_created',
  SERVICE_REQUEST:      'service_request',
  QUERY_RECEIVED:       'query_received',
  WORKFLOW_TRIGGERED:   'workflow_triggered',

  // CTO Events (Tech)
  SYSTEM_ERROR:         'system_error',
  API_FAILURE:          'api_failure',
  QUEUE_OVERLOAD:       'queue_overload',
  AI_FAILURE:           'ai_failure',
  DEPLOYMENT_DONE:      'deployment_done',

  // CFO Events (Finance)
  PAYMENT_RECEIVED:     'payment_received',
  PAYMENT_FAILED:       'payment_failed',
  COMMISSION_DUE:       'commission_due',
  INVOICE_GENERATED:    'invoice_generated',
  BUDGET_EXCEEDED:      'budget_exceeded',

  // CHRO Events (HR)
  AGENT_JOINED:         'agent_joined',
  AGENT_LEFT:           'agent_left',
  EXAM_PASSED:          'exam_passed',
  EXAM_FAILED:          'exam_failed',
  TRAINING_COMPLETED:   'training_completed',
  PERFORMANCE_LOW:      'performance_low',
};
```

## Trigger Map (Event → Executive)

```javascript
// lib/events/triggerMap.js
export const TRIGGER_MAP = {
  // Direct mappings — NO CEO needed
  'lead_created':       'cmo',
  'lead_scored':        'cmo',
  'content_generated':  'cmo',
  'campaign_started':   'cmo',
  'lead_qualified':     'cso',
  'lead_hot':           'cso',
  'deal_closed':        'cso',
  'follow_up_due':      'cso',
  'churn_risk':         'cso',
  'policy_created':     'coo',
  'service_request':    'coo',
  'query_received':     'coo',
  'system_error':       'cto',
  'api_failure':        'cto',
  'ai_failure':         'cto',
  'payment_received':   'cfo',
  'payment_failed':     'cfo',
  'commission_due':     'cfo',
  'agent_joined':       'chro',
  'exam_failed':        'chro',
  'performance_low':    'chro',
};
```

## Event Bus Flow

```javascript
// lib/events/eventBus.js (simplified view)
export async function handleEvent(eventType, payload) {
  // 1. Log the event
  await logEvent(eventType, payload);
  
  // 2. Find the executive
  let executive = TRIGGER_MAP[eventType];
  
  // 3. If no direct mapping, ask CEO router
  if (!executive) {
    executive = await ceoRouter(eventType, payload);
  }
  
  // 4. Check if executive is enabled (admin can disable)
  const config = await getSystemConfig();
  if (!config[`${executive}_enabled`]) {
    return logSkipped(eventType, executive, 'disabled_by_admin');
  }
  
  // 5. Dispatch to executive
  await dispatchToExecutive(executive, eventType, payload);
}
```

---

# 10. TOOL LIBRARY — Complete Tool Contracts

## Each Tool MUST Have:

```
1. Input Schema    → What goes in (validated)
2. Output Schema   → What comes out (fixed shape)
3. AI Provider     → Which AI to use (or NONE)
4. Timeout         → Max execution time
5. Retry Logic     → How many retries
6. Error Handling  → What to do on failure
7. Admin Control   → Can be toggled ON/OFF from panel
```

## Example Tool Contract:

```javascript
// lib/tools/marketing/writeSEOBlog.js
export const writeSEOBlog = {
  name: 'write_seo_blog',
  executive: 'cmo',
  description: 'Generate SEO-optimized blog post',
  
  // Input validation
  inputSchema: {
    keyword: { type: 'string', required: true },
    tone: { type: 'string', default: 'professional' },
    wordCount: { type: 'number', default: 1500 },
    language: { type: 'string', default: 'hindi-english-mix' },
  },
  
  // AI config
  ai: {
    provider: 'gemini',       // Primary
    fallback: 'openrouter',   // Fallback
    promptTemplate: 'seo_blog_writer_v1',  // From DB
  },
  
  // Execution constraints
  timeout: 30000,       // 30 seconds
  retries: 2,
  
  // Output shape
  outputSchema: {
    title: 'string',
    content: 'string',
    metaDescription: 'string',
    keywords: 'string[]',
    wordCount: 'number',
  },
  
  // Admin toggles (read from system_control_config)
  requiresConfig: ['ai_enabled', 'cmo_enabled'],
  
  // Execute function
  async execute(input) {
    // 1. Validate input
    // 2. Load prompt template from DB
    // 3. Call AI gateway (auto fallback)
    // 4. Parse and validate output
    // 5. Log execution + cost
    // 6. Return structured output
  }
};
```

---

# 11. AUTOMATION WORKFLOWS — Bina Code Ke Kaam

## How Workflows Work (Admin Panel Se Create)

Admin panel mein ek Visual Workflow Builder hoga. Drag-and-drop se workflow banao:

### Example Workflow: "New Lead Auto Processing"

```
TRIGGER: lead_created
  ↓
STEP 1: Score Lead (AI: Groq)
  ↓
IF score > 70:
  STEP 2A: Assign to Sales Agent (Round Robin)
  STEP 3A: Send WhatsApp Welcome (Template)
  STEP 4A: Schedule Follow-up (3 days)
ELSE:
  STEP 2B: Add to Nurture Campaign
  STEP 3B: Send Email Drip (5-email sequence)
```

### Example Workflow: "Agent Exam Failed"

```
TRIGGER: exam_failed
  ↓
STEP 1: Get revision materials (DB query)
STEP 2: Generate personalized study plan (AI: Gemini)
STEP 3: Send WhatsApp with materials
STEP 4: Schedule mock test (7 days later)
STEP 5: Set reminder notification (admin)
```

### Example Workflow: "Payment Received"

```
TRIGGER: payment_received
  ↓
STEP 1: Record transaction (DB)
STEP 2: Calculate commission (Rule Engine)
STEP 3: Update agent dashboard
STEP 4: Generate invoice (auto)
STEP 5: Send receipt (WhatsApp)
STEP 6: Update revenue dashboard
```

### Workflow Steps Available (Admin Can Combine These):

```
TRIGGERS:
  - Event based (lead_created, payment_done, etc.)
  - Time based (every day at 9am, every Monday)
  - Manual (admin clicks button)
  - Condition based (when lead score > X)

ACTIONS:
  - AI Generate Content (specify provider, prompt)
  - Send WhatsApp (template, custom)
  - Send Email (template, custom)
  - Update Database (any table, any field)
  - Assign to Agent (round-robin, manual, rule-based)
  - Calculate (commission, premium, maturity)
  - Create Task (for agents)
  - Set Reminder (time-based)
  - HTTP Request (call external API)
  - Wait (delay for X hours/days)

CONDITIONS:
  - IF/ELSE on any data field
  - Score thresholds
  - Time windows
  - Agent availability
```

---

# 12. EXECUTION PLAN — Kab Kya Banana Hai

## Phase 4.1 — Foundation (Week 1-2)

```
[ ] AI Gateway — Multi-provider system with fallback
    - lib/ai/gateway.js
    - lib/ai/providers/groq.js  
    - lib/ai/providers/openrouter.js
    - lib/ai/costTracker.js

[ ] Event System — Core event bus
    - lib/events/eventBus.js
    - lib/events/triggerMap.js
    - lib/events/eventTypes.js

[ ] Executive Framework — Base executive class
    - lib/executives/index.js
    - lib/executives/ceo.js (router)

[ ] Database Migrations
    - executive_routing_rules
    - ai_providers
    - ai_prompt_templates
    - executive_action_logs

[ ] Admin: AI Provider Manager
    - app/admin/cto/ai-providers/page.js
    - app/api/admin/ai-providers/route.js
```

## Phase 4.2 — CMO + CSO (Week 3-4)

```
[ ] CMO Executive
    - lib/executives/cmo.js
    - lib/tools/marketing/writeSEOBlog.js
    - lib/tools/marketing/generateSocialPost.js
    - lib/tools/marketing/analyzeSEOPage.js

[ ] CSO Executive  
    - lib/executives/cso.js
    - lib/tools/sales/scoreLeadIntent.js
    - lib/tools/sales/generateCallScript.js
    - lib/tools/sales/draftFollowUp.js

[ ] Admin: CMO Dashboard
    - app/admin/cmo/page.js
    - app/admin/cmo/content/page.js
    - app/admin/cmo/templates/page.js
    - app/admin/cmo/campaigns/page.js

[ ] Admin: CSO Dashboard
    - app/admin/cso/page.js
    - app/admin/cso/pipeline/page.js
    - app/admin/cso/scripts/page.js

[ ] Database: campaigns table
[ ] Database: Seed prompt templates
```

## Phase 4.3 — COO + CTO (Week 5-6)

```
[ ] COO Executive
    - lib/executives/coo.js
    - lib/tools/operations/calculatePremium.js
    - lib/tools/operations/calculateMaturity.js
    - lib/tools/operations/autoReplyQuery.js

[ ] CTO Executive (Enhanced monitoring)
    - lib/executives/cto.js
    - Enhanced error monitoring
    - AI provider health checks

[ ] Admin: COO Dashboard
    - app/admin/coo/page.js
    - app/admin/coo/calculators/page.js
    - app/admin/coo/workflows/page.js

[ ] Admin: CTO Dashboard (Enhanced)
    - app/admin/cto/page.js (enhanced)
    - app/admin/cto/ai-providers/page.js

[ ] Database: workflows table
```

## Phase 4.4 — CFO + CHRO (Week 7-8)

```
[ ] CFO Executive
    - lib/executives/cfo.js
    - lib/tools/finance/calculateCommission.js
    - lib/tools/finance/forecastRevenue.js

[ ] CHRO Executive
    - lib/executives/chro.js
    - lib/tools/hr/screenResume.js
    - lib/tools/hr/generateTraining.js

[ ] Admin: CFO Dashboard
    - app/admin/cfo/page.js
    - app/admin/cfo/commission/page.js
    - app/admin/cfo/revenue/page.js

[ ] Admin: CHRO Dashboard
    - app/admin/chro/page.js
    - app/admin/chro/hiring/page.js
    - app/admin/chro/training/page.js

[ ] Database: commission_rules, candidates tables
```

## Phase 4.5 — Workflow Engine + Polish (Week 9-10)

```
[ ] Visual Workflow Builder (admin panel)
[ ] Workflow Execution Engine
[ ] Campaign Builder (admin panel)
[ ] Campaign Execution Worker
[ ] Communication tools (WhatsApp, Email)
[ ] Template Editor (rich text)
[ ] CEO Dashboard (routing + exceptions)
[ ] Full system test
```

## Phase 4.6 — Voice + Advanced (Future)

```
[ ] Voice Interface (Google Cloud TTS/STT)
[ ] Advanced Analytics Dashboard
[ ] Mobile App Integration
[ ] Partner Portal
```

---

# 13. COST ANALYSIS — Monthly Kharcha

## Scenario: 1000 leads/month, 50 blog posts/month

### FREE Resources

| Resource | What | Monthly Cost |
|----------|------|-------------|
| Gemini AI Studio | 1000+ AI calls | ₹0 |
| Groq Cloud | 500+ fast AI calls | ₹0 |
| OpenRouter (free models) | 200+ fallback calls | ₹0 |
| Supabase (free tier) | Database + Auth | ₹0 |
| Vercel (hobby) | Hosting + SSR | ₹0 |
| Upstash QStash (free) | 500 queue msgs/day | ₹0 |
| Cloudflare Workers AI | Image gen | ₹0 |
| **TOTAL FREE** | | **₹0** |

### Potential Paid Resources (Only If Needed)

| Resource | When Needed | Monthly Cost |
|----------|------------|-------------|
| Vercel Pro | > 100GB bandwidth | ₹1,600/mo |
| Supabase Pro | > 500MB DB | ₹2,000/mo |
| OpenAI GPT-4o-mini | Quality-critical tasks | ~₹500/mo |
| Resend (email) | > 100 emails/day | ₹1,600/mo |
| WhatsApp API | > 1000 conversations | ~₹500/mo |
| **TOTAL PAID** | | **₹6,200/mo MAX** |

### Smart Strategy

```
Phase 1-3: 100% FREE tier → ₹0/month
Phase 4-5: Selective paid → ₹2,000-3,000/month
Scale: Full paid → ₹6,000-10,000/month
```

---

# 14. ADMIN SCREENS — Screen by Screen Control

## 14.1 Main Dashboard (`/admin`)

```
┌─────────────────────────────────────────────────┐
│ 🏢 BIMA SAKHI AGENT OS — COMMAND CENTER        │
├─────────────────────────────────────────────────┤
│                                                 │
│  📊 SYSTEM STATUS: 🟢 HEALTHY                  │
│  🤖 AI STATUS: 🟢 Gemini Active                │
│  📨 Queue: 12 pending, 0 failed                │
│                                                 │
│  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │ CMO    │  │ CSO    │  │ COO    │            │
│  │ Active │  │ Active │  │ Active │            │
│  │ 45 led │  │ ₹2.5L  │  │ 12 wf  │            │
│  └────────┘  └────────┘  └────────┘            │
│                                                 │
│  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │ CTO    │  │ CFO    │  │ CHRO   │            │
│  │ Active │  │ Active │  │ Active │            │
│  │ 0 err  │  │ ₹5L    │  │ 3 hire │            │
│  └────────┘  └────────┘  └────────┘            │
│                                                 │
│  [🔴 EMERGENCY STOP]  [⚙️ SETTINGS]            │
│                                                 │
│  📈 Today: 15 leads | 3 conversions | ₹45,000  │
│  📊 AI Calls: 89 | Cost: ₹0 (Free tier)       │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 14.2 AI Provider Manager (`/admin/cto/ai-providers`)

```
┌─────────────────────────────────────────────────┐
│ 🤖 AI PROVIDER MANAGER                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  Provider    │ Status │ Priority │ RPM  │ Cost  │
│  ─────────── │ ────── │ ──────── │ ──── │ ───── │
│  Gemini      │ 🟢 UP  │ 1 [▲▼]  │ 15   │ FREE  │
│  Groq        │ 🟢 UP  │ 2 [▲▼]  │ 30   │ FREE  │
│  OpenRouter  │ 🟡 SLOW│ 3 [▲▼]  │ 20   │ FREE  │
│  OpenAI      │ 🟢 UP  │ 4 [▲▼]  │ 60   │ $0.15 │
│                                                 │
│  [➕ Add Provider]  [🔄 Test All]  [📊 Usage]  │
│                                                 │
│  📊 Today's Usage:                              │
│  Gemini: 67 calls | Groq: 22 calls | Cost: ₹0  │
│                                                 │
│  ⚙️ AI Settings:                                │
│  [🔘] AI Globally: ON                           │
│  [🔘] Auto-fallback: ON                         │
│  [🔘] Cost Alert at: ₹500/day                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 14.3 Template Editor (`/admin/cmo/templates`)

```
┌─────────────────────────────────────────────────┐
│ 📝 MESSAGE TEMPLATE EDITOR                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  Type: [WhatsApp ▼] [Email ▼] [SMS ▼]           │
│                                                 │
│  Template: "welcome_lead"                       │
│  ┌─────────────────────────────────────────┐    │
│  │ 🙏 Namaste {{name}} ji!                 │    │
│  │                                         │    │
│  │ Bima Sakhi mein aapka swagat hai.       │    │
│  │ Aapki {{product}} ke liye hamari team   │    │
│  │ jald hi aapse contact karegi.           │    │
│  │                                         │    │
│  │ 📞 Humara number: {{support_phone}}     │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Variables: {{name}}, {{product}},              │
│            {{support_phone}}, {{agent_name}}     │
│                                                 │
│  [💾 Save] [👁️ Preview] [🤖 AI Generate]       │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 14.4 Campaign Builder (`/admin/cmo/campaigns`)

```
┌─────────────────────────────────────────────────┐
│ 📢 CAMPAIGN BUILDER                             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Step 1: Choose Channel                         │
│  [📱 WhatsApp] [📧 Email] [💬 SMS]              │
│                                                 │
│  Step 2: Select Audience                        │
│  Lead Status: [🔘 New] [🔘 Qualified] [🔘 All] │
│  Region: [🔘 Delhi] [🔘 Mumbai] [🔘 All]       │
│  Score > [70____]                               │
│  Audience Size: 234 people                      │
│                                                 │
│  Step 3: Choose Template                        │
│  [welcome_lead ▼]  [👁️ Preview]                 │
│                                                 │
│  Step 4: Schedule                               │
│  [📅 Now] [📅 Schedule: 15 Apr 2026 9:00 AM]    │
│                                                 │
│  [🚀 Launch Campaign]                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 14.5 Routing Rules (`/admin/ceo/routing`)

```
┌─────────────────────────────────────────────────┐
│ 🗺️ EVENT ROUTING RULES (CEO)                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  Event Type      │ Executive │ Priority │ Active│
│  ──────────────  │ ───────── │ ──────── │ ──────│
│  lead_created    │ CMO       │ 100      │ ✅    │
│  lead_hot        │ CSO       │ 100      │ ✅    │
│  payment_done    │ CFO       │ 100      │ ✅    │
│  system_error    │ CTO       │ 100      │ ✅    │
│  agent_joined    │ CHRO      │ 100      │ ✅    │
│  [custom_event]  │ [select▼] │ [__]     │ [🔘]  │
│                                                 │
│  [➕ Add Rule] [📥 Import] [📤 Export]           │
│                                                 │
│  🔄 Exception Queue: 0 unrouted events          │
│  🔒 Fallback: CEO → manual routing              │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 14.6 Prompt Editor (`/admin/settings/ai-config`)

```
┌─────────────────────────────────────────────────┐
│ 🧠 AI PROMPT EDITOR                             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Tool: [write_seo_blog ▼]                       │
│  Executive: CMO                                 │
│  Provider: Gemini                               │
│                                                 │
│  System Prompt:                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ You are an expert SEO content writer    │    │
│  │ for Indian insurance industry. Write    │    │
│  │ in Hinglish (Hindi-English mix)...      │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  User Prompt Template:                          │
│  ┌─────────────────────────────────────────┐    │
│  │ Write a {{wordCount}} word blog about   │    │
│  │ {{keyword}} for LIC agents. Include...  │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  [💾 Save] [🧪 Test] [📋 Version History]       │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

# 15. FINAL CHECKLIST

## Pre-Flight Check (Before Starting Phase 4)

```
✅ Phase 1-3 stable and working
✅ Supabase database running
✅ Vercel deployment working
✅ Admin panel authentication working
✅ QStash queue system working
✅ Gemini AI API key configured
✅ Basic admin dashboard exists
```

## API Keys Needed

```
MUST HAVE (FREE):
  ✅ GEMINI_API_KEY        → Already have
  ⬜ GROQ_API_KEY          → Get from console.groq.com (FREE)
  ⬜ OPENROUTER_API_KEY    → Get from openrouter.ai (FREE)

NICE TO HAVE (FREE TIER):
  ⬜ CLOUDFLARE_AI_TOKEN   → For image generation
  ⬜ HF_API_TOKEN          → For classification

NEEDED LATER (PAID):
  ✅ OPENAI_API_KEY        → Already have (use sparingly)
  ⬜ WHATSAPP_ACCESS_TOKEN → WhatsApp Business API
  ⬜ RESEND_API_KEY        → Email sending
```

## Technology Stack (Final)

```
Frontend:  Next.js 15 + React 19 + Tailwind CSS
Backend:   Next.js API Routes (Serverless)
Database:  Supabase (PostgreSQL)
Queue:     Upstash QStash
AI Layer:  Gemini → Groq → OpenRouter → OpenAI (fallback chain)
Hosting:   Vercel
Analytics: Vercel Analytics
Auth:      Custom JWT (bcryptjs + jose)
Charts:    Recharts
```

---

# 🔥 FINAL LAW

```
❗ "Admin Panel se EVERYTHING control hoga"
❗ "AI sirf assistant hai, decision maker nahi"
❗ "Free tier se shuru karo, paid ki zarurat nahi"
❗ "Har event ka mapping hoga, koi orphan event nahi"
❗ "Har tool ka contract hoga, koi loose execution nahi"
❗ "Jab project complete hoga, code likhne ki zarurat nahi padegi"
```

---

# 💣 FINAL LINE

> **"Ye software nahi hai… ye ek chalti hui digital company hai"** 🚀
>
> Admin Panel = Your Office
> Executives = Your Team
> AI = Your Assistant
> Rules = Your Policy Manual
> Database = Your Filing Cabinet
> Queue = Your Task Manager

---

*Document Created: April 12, 2026*
*For: Bima Sakhi Phase 4 — Central Agent OS*
*Status: Complete Blueprint — Ready for Execution*
