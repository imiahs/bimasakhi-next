# Audit: SHOS Reconciliation

Date: 2026-05-20
Mode: Post-stabilization observability reconciliation
Runtime mutation: none
Authority widening: none
Rollback continuity: preserved

## Final Classification

- state_reconciliation: `OBSERVABILITY_DRIFT_PRESENT`
- reconciliation_boundary: `PARTIALLY_BOUNDED`
- degraded_state_authority: `PARTIALLY_STALE` and `OPERATOR_FRAGILE`
- operator_trust: `PARTIALLY_TRUSTED`
- observability_continuity: `PARTIALLY_DURABLE`

## Evidence Base

1. Live and local runtime evidence recorded in `docs/audits/audit-2026-05-20-shos-live-local-problem-audit.md`
2. Local runtime audit artifact `scripts/audit/results/2026-05-20T16-03-14-555Z-shos-local-runtime.json`
3. Current SHOS snapshot assembly in `lib/system/shos.js`
4. Current system health aggregation in `lib/system/systemHealth.js`
5. Current health and SHOS routes in `app/api/admin/system/health/route.js` and `app/api/admin/system/shos/route.js`

## Step 1 - SHOS State Reconciliation

Observed live runtime truth:

- `/api/admin/system/shos` and `/api/admin/system/health` both reported `overall_health=DEGRADED`
- live health reported `unacknowledged_escalations` and `historical_dead_letters:2`
- live SHOS top-level lists reported `alerts.count=0`, `errors.count=0`, `dlq.count=0`, `queue_failures.count=0`, `delivery_failures.count=0`
- live consistency reported `matches_health_dlq_total=false`
- local SHOS API remained healthy while the broader local operator-page audit path aborted on cold start

### Authoritative Reconciliation Rules

1. `health.overall_health` is the authoritative summary verdict for whether unresolved system residue exists; it is not, by itself, a complete operator action inventory.
2. `health.alerts.unacknowledged_escalations` is the authoritative escalation registry surface.
3. SHOS top-level operator lists (`dlq`, `queue_failures`, `delivery_failures`, `alerts`, `errors`, `event_failures`) are authoritative only for active, operator-actionable items that remain inside those lists' filters.
4. Historical residue must remain audit-visible, but historical residue is not the same thing as active operator backlog.
5. Empty operator lists must never be interpreted as `HEALTHY` unless the summary state and escalation registry are also clear.
6. Historical telemetry may remain forensic-authoritative without remaining escalation-authoritative.

### Mismatch Origin Classification

| Candidate origin | Determination | Basis |
|---|---|---|
| stale escalation persistence | CONFIRMED | Live health still carries two unacknowledged P0 escalations created on 2026-05-05. |
| historical dead-letter retention | CONFIRMED | Live health warning is explicitly `historical_dead_letters:2`. |
| delayed reconciliation timing | NOT SUPPORTED AS PRIMARY CAUSE | The residue is multi-day, not a short-lived convergence window. |
| stale cache propagation | NOT SUPPORTED | Both routes are `force-dynamic`; current evidence does not point to cache as the governing failure mode. |
| partial observability aggregation | CONFIRMED | `getSystemHealthSnapshot()` reads escalation and dead-letter summary state, while SHOS operator lists are separately assembled from active/actionable overview queries. |
| asymmetric state cleanup | CONFIRMED | Escalation truth is sourced from `alert_deliveries`, while top-level alert visibility is driven by unresolved `system_alerts` plus mapped delivery rows; those surfaces can diverge without losing forensic history. |

### Reconciliation Drift Risks

- stale escalation recursion: present, because old unacknowledged escalation residue still drives live degraded interpretation
- stale degraded-state propagation: present, because summary health can remain degraded after active operator lists appear clear
- dead-letter visibility divergence: present, because live payload already reports `matches_health_dlq_total=false`
- replay visibility ambiguity: bounded, because historical telemetry remains preserved even when operator surfaces are incomplete
- operator recovery ambiguity: present, because the degrader is not fully visible on the operator-facing recovery lists

### Step 1 Verdict

`OBSERVABILITY_DRIFT_PRESENT`

The current live state is not fully reconciled. The summary verdict is carrying truthful residue, but the operator-facing recovery surfaces are not exhaustive enough to explain the live degraded state without additional interpretation.

## Step 1.25 - Observability Authority Model

| Authority class | Canonical meaning | Current authoritative surface |
|---|---|---|
| historical authority | Preserved forensic residue, even after the active incident window ends | `event_store`, delivery ledgers, observability logs, historical dead-letter warnings, legacy control history |
| live operational authority | Active system conditions requiring operator action now | SHOS active lists and counters for pending/failed actionable rows |
| escalation authority | Unacknowledged P0/P1 escalation records that still require explicit operator acknowledgement or reclassification | `health.alerts.unacknowledged_escalations` |
| dead-letter authority | Split authority: active pending backlog vs historical residue | active backlog through SHOS `dlq`; historical residue through health warnings and DLQ totals |
| operator-visible authority | What an operator can safely act on from the control surface without reconstructing hidden context | SHOS top-level lists plus clearly typed summary state |

Current problem: live SHOS does not yet expose escalation authority as a first-class operator-visible surface, so operator-visible authority is weaker than health authority.

## Step 1.75 - Reconciliation Boundary Model

| Boundary requirement | Result | Basis |
|---|---|---|
| rollback-safe visibility | PRESERVED | No runtime mutation or authority widening is required to observe or document the mismatch. |
| replay-safe visibility | PRESERVED | Historical telemetry remains recorded and auditable. |
| escalation-safe visibility | PARTIAL | Escalations are visible in health but not fully surfaced in the operator recovery lists. |
| operator-authoritative visibility | PARTIAL | Operator can see degraded state, but not all degraders are represented as actionable top-level rows. |

Boundary classification: `PARTIALLY_BOUNDED`

The boundary remains rollback-safe and audit-safe, but not yet fully operator-authoritative.

## Step 2 - Degraded-State Authority Validation

### Failure-Type Separation

| Failure class | Current determination |
|---|---|
| live failures | SHOS routes and auth path are working; no current queue, delivery, alert, error, or active DLQ backlog was proven on the operator-facing lists in the latest live audit |
| historical failures | 2 historical dead letters and 2 stale unacknowledged P0 escalations remain preserved |
| acknowledged failures | Not proven in the current evidence set |
| unresolved failures | The two escalation rows remain unresolved in the escalation registry |
| visibility-only failures | health/operator mismatch, missing escalation surface, and local cold-start abort |

### Degraded-State Interpretation

The current live `DEGRADED` classification is partially authoritative and partially stale:

- authoritative because unresolved escalation residue is real and still present in the live health payload
- partially stale because the currently visible operator recovery lists do not show an active backlog that explains the full degraded state
- operator-fragile because an operator can see `DEGRADED` while seeing empty top-level recovery lists

No evidence in this cycle supports treating stale historical residue as fully active escalation authority. The current live summary therefore remains conservative, but not fully reconciled.

## Step 3 - Operator Truth Alignment

| Surface comparison | Result |
|---|---|
| SHOS summary vs health summary | aligned on `DEGRADED` |
| health summary vs escalation visibility | aligned inside health only |
| health summary vs top-level alerts/errors/dlq | not aligned |
| active recovery lists vs operator recovery expectation | not aligned |
| historical residue vs operator-visible context | not aligned |

### Operator-Truth Risk Check

- false degraded interpretation: possible, because historical residue can continue to dominate the summary state
- hidden degraded interpretation: present, because escalation authority is not surfaced as a first-class top-level operator list
- rollback ambiguity: not currently supported by evidence; rollback continuity remains preserved
- stale escalation illusion: present
- false recovery confidence: present, because empty lists can be misread as no remaining operator work

## Step 3.25 - Operator Trust Model

| Trust domain | Result |
|---|---|
| escalation trust | partial |
| recovery trust | partial |
| dead-letter trust | partial |
| replay trust | preserved |
| rollback trust | preserved |

Trust classification: `PARTIALLY_TRUSTED`

The operator can trust that the system is not fully clear, but cannot yet trust the top-level SHOS lists to explain all live degraded-state causes by themselves.

## Step 4 - Local SHOS Performance Validation

Observed local runtime truth:

- unauthenticated and authenticated SHOS API checks passed locally
- local SHOS burst reads passed `8/8`
- local SHOS reported `overall_health=HEALTHY`
- the local audit turned `PARTIAL` only after the operator-page read path hit a cold-start timeout window
- `/admin/ccc` cold-start compile reached about `48.6s`
- `/admin/system` compiled in about `5.1s`

### Local Origin Assessment

| Candidate origin | Determination | Basis |
|---|---|---|
| admin bundle size | CONFIRMED CONTRIBUTOR | `/admin/ccc` resolves to a large client-side inventory surface that drives four content domains from one page. |
| CCC import topology | CONFIRMED CONTRIBUTOR | `app/admin/ccc/page.js` is a thin wrapper over `ContentInventoryContent.jsx`, which carries broad client-side search, filters, CRUD, and modal logic. |
| Next.js dev compile behavior | CONFIRMED CONTRIBUTOR | API checks passed while page-route cold starts were slow, which is consistent with dev-route compilation rather than SHOS runtime instability. |
| Windows filesystem latency | PROBABLE CONTRIBUTOR | The environment is Windows and the observed slowness is concentrated in cold-start page compilation. |
| excessive admin runtime coupling | LIMITED EVIDENCE | The issue is page-entry compilation, not the SHOS API path itself. |
| non-runtime dev overhead | CONFIRMED CONTRIBUTOR | The audit failed on local page rendering windows rather than on SHOS API truth. |

Local conclusion: this is a development ergonomics issue, not production observability authority. It must not influence live escalation authority or live degraded-state interpretation.

## Step 5 - Observability Hardening Validation

The first rollback-safe authoritative SHOS reconciliation layer is now defined as follows:

1. **Summary authority layer**: `health.overall_health` remains the high-level verdict.
2. **Escalation authority layer**: `unacknowledged_escalations` is the escalation registry and must remain separately visible from generic alert lists.
3. **Active operator authority layer**: SHOS top-level lists represent only active, actionable rows.
4. **Historical/forensic authority layer**: historical dead letters, event-store residue, observability logs, and legacy control provenance remain preserved without being silently discarded.
5. **Rollback authority layer**: deployment and rollback continuity stay outside degraded-state interpretation and remain bounded.

### Hardening Result

| Requirement | Result |
|---|---|
| rollback continuity | preserved |
| telemetry continuity | preserved |
| escalation truthfulness | partial |
| operator trust | partial |
| deterministic observability interpretation | not yet complete |

No surface in the current live state should be treated as ambiguity-free authority unless it is interpreted through the split above.

## Step 5.5 - Observability Continuity Model

| Continuity class | Result |
|---|---|
| rollback continuity | preserved |
| deployment continuity | preserved |
| replay continuity | preserved |
| escalation continuity | partial |

Continuity classification: `PARTIALLY_DURABLE`

## Step 6 - Final Authorization

| SHOS surface | Final authorization | Reason |
|---|---|---|
| `health.overall_health` | `PARTIALLY_AUTHORITATIVE` | Truthful summary verdict, but currently mixes active and residual authority without full operator-visible separation |
| `health.alerts.unacknowledged_escalations` | `PARTIALLY_AUTHORITATIVE` | Real escalation registry, but currently not typed strongly enough as active-vs-historical residue |
| `health.failures.dlq_depth_total` and historical dead-letter warnings | `PARTIALLY_AUTHORITATIVE` | Forensic truth is preserved, but active operator meaning is not fully separated |
| SHOS top-level operator lists (`alerts`, `errors`, `dlq`, `queue_failures`, `delivery_failures`, `event_failures`) | `REQUIRES_RECONCILIATION` | Useful for active backlog, but not exhaustive enough to explain the current degraded verdict |
| SHOS `consistency` section | `PARTIALLY_AUTHORITATIVE` | Correctly exposes live drift, but only covers part of the reconciliation problem |
| event-store and delivery telemetry truth surfaces | `AUTHORITATIVE` | Historical and replay-safe truth remains preserved |
| rollback continuity surfaces | `AUTHORITATIVE` | Rollback-safe operational continuity remains intact and bounded |
| local operator-page audit path | `OBSERVABILITY_FRAGILE` | Cold-start dev compilation can abort the audit without indicating live runtime failure |

## Final Verdict

The current SHOS live state is operational, observable, and rollback-safe, but not yet fully reconciled. The first authoritative reconciliation layer is now defined at the documentation and authority-model level:

- summary truth remains visible
- forensic truth remains preserved
- rollback truth remains preserved
- active operator truth remains bounded
- observability drift is explicitly classified instead of being normalized away

The correct current SHOS classification is therefore:

- `OBSERVABILITY_DRIFT_PRESENT`
- `PARTIALLY_BOUNDED`
- `PARTIALLY_TRUSTED`
- `PARTIALLY_DURABLE`

No code, DB state, or runtime control was changed in this cycle.