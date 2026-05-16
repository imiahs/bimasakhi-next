# RC-2C Observability Safety Analysis

Date: 2026-05-14
Scope: Determine whether SHOS observability surfaces are deploy-safe without runtime mutation authority
Method: Route/path analysis + read-only baseline probe

## Observability Surface Classification

| Surface | Classification | Why |
|---|---|---|
| /api/admin/system/shos GET | OBSERVATION_WITH_HIDDEN_CONTROL | getShosSnapshot executes processDueFeatureFlagReverts before building snapshot |
| /api/admin/system GET | MUTATION_CAPABLE_OBSERVATION | Calls getShosSnapshot, inherits hidden write path |
| /api/admin/system/health GET | MUTATION_CAPABLE_OBSERVATION | Calls getShosSnapshot, inherits hidden write path |
| /api/admin/system-health GET | MUTATION_CAPABLE_OBSERVATION | Calls getShosSnapshot, inherits hidden write path |
| /api/admin/observability GET | MUTATION_CAPABLE_OBSERVATION | Calls getShosSnapshot in response aggregation |

## Hidden Write Side Effect

Code path:

GET -> getShosSnapshot -> processDueFeatureFlagReverts

When pending due feature-flag auto-revert rows exist:

- update system_control_config
- insert/update system_control_actions

Therefore, observation is not strictly read-only under all states.

## Deploy-safe Observability Feasibility

### Can observability-only first deploy be considered safe without suppression?

Conditional at best, not intrinsically safe.

- If pending auto-reverts = 0, hidden writes are inert at that moment.
- But mutation authority remains armed, and GET safety depends on runtime data state.
- Operator expectations can be violated because a read action may mutate state later.

Conclusion: pure observability safety is not guaranteed by current design alone.

## Production Observability Freeze Validation (Step X)

Observation timestamp window:

- observed_at: 2026-05-14T10:05:07.393Z
- last hour window: 09:05:07Z to 10:05:07Z
- previous hour comparison: 08:05:07Z to 09:05:07Z

Evidence source:

- Read-only public endpoint checks
- Read-only Supabase counts from generation_queue, job_dead_letters, external_delivery_logs, system_control_actions, system_control_config, observability_logs

Observed unchanged indicators:

- HTTP checks: home 200, blog 200, favicon 200, admin 307, admin queue 401
- queue pending/processing: 0
- queue failed active: 0
- DLQ pending: 0
- delivery failed active: 0
- pending feature-flag auto-reverts: 0
- singleton_count: 1
- cron error signals: 0 in last hour, 0 in previous hour
- auth error signals: 0 in last hour, 0 in previous hour
- not-found signals: 0 in last hour, 0 in previous hour
- health signal logs: 12 in last hour, 12 in previous hour

Step X conclusion:

PRODUCTION_RUNTIME_UNCHANGED = VERIFIED

(within observed two-hour comparison window and indicators queried)

## Operator Trust Signal

Current SHOS design can mislead operators if they assume all GET surfaces are read-only.
Observation and control are partially coupled by hidden auto-revert execution behavior.
