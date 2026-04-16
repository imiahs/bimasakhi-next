# DAY 10 EXECUTION PLAN: Phase 4 (Bima Sakhi Central Agent OS)

---

## 1. Objective: The "Complete OS" Vision

Phase 4 moves Bima Sakhi from a monolithic backend to a **Hierarchical, Event-Driven Agent OS**. It solves every operational requirement of an LIC Development Officer (DO) through strict routing, delegated execution, and robust isolation.

**CRITICAL CONSTRAINT: 80% Rule Engine / 20% AI.**
True operational systems do not rely on probabilistic LLM responses to make critical database or workflow decisions. AI is strictly reserved for *content generation, phrasing, and summarization*. Routing and architectural execution logic are 100% deterministic rules.

---

## 2. The Final Architecture Flow

The system executes on a fixed, uncrackable, and non-negotiable pipeline metric:
**Event → Trigger → Executive → Decision → Tool → Worker → DB**

### 2.1 The Event & Trigger Layer
When an event happens inside the digital ecosystem, it immediately hits the Trigger Map.
- Example: `exam_failed` event natively strikes the HR Trigger logic.
- Triggers route directly to the specific **Executive Agent** managing that domain.
- **The CEO Router Fallback:** The CEO is NOT centrally queried for everything. The CEO does NO decision making and uses NO AI. It is purely a static routing table for entirely ambiguous, unstructured requests that Triggers cannot automatically parse.

### 2.2 System State Layer
Every execution relies on a globally synchronized State machine:
- `lead_state`: Tracks atomic pipeline movements (e.g. `pending`, `processing`, `contacted`).
- `agent_state`: Tracks the internal health and queue bottlenecks of a specific operating Executive Agent.
- `system_state`: Global telemetry regarding infrastructure up-time.

---

## 3. Executive Agents Definition

Agents are not open-ended "Large Language Models." They are strongly-typed, logic-gated digital employees. Every Agent config strictly defines:

### 3.1 Chief Marketing Officer (CMO Agent)
- **Goals:** Acquire and warm leads; generate indexable SEO content.
- **Rules (Decision Logic):** `IF lead_state = 'pending' AND intent = 'high' -> Dispatch Immediate WhatsApp Protocol.`
- **Allowed Tools:** `write_seo_copy`, `send_whatsapp_campaign`.

### 3.2 Finance & Compliance Executive
- **Goals:** Parse LIC policies, calculate DO commissions, enforce IRDAI regulations.
- **Rules (Decision Logic):** `IF event = 'policy_upload' -> Parse Data -> Calculate Hierarchical Commission Cut.`
- **Allowed Tools:** `calculate_commission`, `parse_policy_pdf`.

### 3.3 HR & Recruitment Executive
- **Goals:** Onboard new junior LIC agents, manage IC38 exam schedules.
- **Rules (Decision Logic):** `IF agent_state = 'exam_failed' -> Queue Revision Materials.`
- **Allowed Tools:** `schedule_exam`, `dispatch_test_portal`.

---

## 4. The Capability Library (Tool Contract)

Every external API call or operational action inside Bima Sakhi is a fixed Tool. To prevent execution drift and hallucinations, every Tool natively implements a strict contract:
1. **Input Schema:** (Zod) rigidly enforces required variables.
2. **Output Schema:** (Zod) forces the API map back into a deterministic JSON shape.
3. **Timeout Rule:** Hard-capped execution limits terminating zombie processes.
4. **Retry Logic:** Programmatic queue backoff behavior defined upstream.

---

## 5. Execution Summary
When a system action occurs:
1. The **Event** is caught natively.
2. The **Trigger** instantly pushes the payload to the respective Executive avoiding the CEO entirely.
3. The Executive evaluates its deterministic **Decision** Rules.
4. The Executive configures a validated **Tool** matching the execution scope.
5. A **Worker** receives the QStash queue payload and executes the job.
6. The final output forces an update immediately down to the **DB** (Job Memory).
