# Rule 16 Revalidation + Truth Sync Audit - 2026-04-27

**Status:** HISTORICAL BASELINE BEFORE APRIL 27 REPAIR  
**Audit Type:** Fresh Rule 16 rerun + documentation reconciliation  
**Primary References:** `docs/fixes/fix_014_rule16_transactional_integrity.md`, `docs/fixes/fix_015_c33_page_index_truth_fix.md`, `docs/CONTENT_COMMAND_CENTER.md`, `docs/INDEX.md`  
**Secondary References:** `docs/audits/audit-2026-04-26-rule16-transactional-integrity-live-proof.md`, `docs/audits/audit-2026-04-26-c33-page-index-truth-fix-live-proof.md`  
**Superseded By:** `docs/audits/audit-2026-04-27-rule16-repair-revalidation-pass.md`  
**Execution Window:** 2026-04-27 UTC / IST

## 1. Executive Summary

This audit was the correct same-day baseline before the later April 27 runtime repair landed.

At this point in time, the April 26 passing Rule 16 artifact was no longer the controlling current-truth record.

The fresh April 27 rerun failed two required Rule 16 checks:

- `publish_force_db_error_then_retry`
- `bulk_network_drop_then_retry_daemon_recovery`

That means Rule 16 must be reopened as **PARTIAL**.

C33 did not fail in this rerun. The April 26 C33 proof still stands, but only for the `page_index` truth contradiction. It must not be used as evidence that the broader publish pipeline or Rule 16 is fully closed.

This audit existed to make the documentation layer match the failing live evidence before any further closure claim.

## 2. Evidence Files

- `scripts/audit/results/2026-04-27T02-21-11-828Z-rule16-transactional-integrity.json`
- `scripts/audit/results/2026-04-27T02-45-20-483Z-rule16-revalidation-observability.json`
- `docs/audits/audit-2026-04-26-rule16-transactional-integrity-live-proof.md`
- `docs/audits/audit-2026-04-26-c33-page-index-truth-fix-live-proof.md`
- `docs/fixes/fix_014_rule16_transactional_integrity.md`
- `docs/fixes/fix_015_c33_page_index_truth_fix.md`

## 3. What Changed Since April 26

| Surface | April 26 documented claim | April 27 revalidation | Current truth |
|---|---|---|---|
| Rule 16 overall status | Closed live in requested scope | Two required checks failed | **PARTIAL AFTER REVALIDATION** |
| Phase 4 bulk outbox recovery | Proven live end to end | Retry daemon dispatch observed, but downstream completion was not proven | **PARTIAL** |
| Phase 6 publish retry visibility | Proven live after retry | Retry committed DB state, but the live page returned `404` and the sitemap omitted the slug | **PARTIAL** |
| C33 status | Resolved live | No contradictory April 27 evidence found | **CURRENT TRUTH FOR C33 ONLY** |
| CCC / INDEX closure summary | Rule 16 and C33 both closed together | Overstated scope after fresh rerun | **Corrected in this truth sync** |

## 4. April 27 Revalidation Results

| Check | Result | Status |
|---|---|---|
| `publish_force_db_error_then_retry` | rollback still occurred, retry committed `page_index.status='published'`, but `live_page_status=404` and `sitemap_contains_slug=false` | FAIL |
| `bulk_force_db_error_then_retry` | rollback still occurred, retry created one pending queue row and one pending outbox row | PASS |
| `bulk_kill_process_mid_execution` | job rolled back to `planned` with no queue/event residue | PASS |
| `bulk_idempotent_replay_same_key` | second call reused committed queue/event state only once | PASS |
| `bulk_network_drop_then_retry_daemon_recovery` | `after_retry` remained null in the main artifact | FAIL |
| `bulk_network_drop_then_retry_daemon_recovery` supporting observability | retry daemon logged `RETRY_DISPATCHED`, but no downstream worker log was captured in the same window | PARTIAL |
| pagegen persistence rollback group | forced DB error rollback still passed | PASS |
| admin multi-table rollback group | custom page, blog, SEO, tool config, and draft status rollback checks still passed | PASS |
| `rule16_transactional_integrity_verdict` | failed checks: `publish_force_db_error_then_retry`, `bulk_network_drop_then_retry_daemon_recovery` | FAIL |

## 5. TODO Reconciliation

| TODO | Current status | Evidence |
|---|---|---|
| bulk transactional outbox | PARTIAL | durable write and same-key replay passed, but end-to-end retry recovery failed in the April 27 rerun |
| atomic admin save RPCs | COMPLETE IN AUDITED SCOPE | admin custom page/blog/SEO/tool-config/draft transition rollback checks still pass in the April 27 artifact |
| ack pagegen event flow | PARTIAL | retry dispatch was observed, but downstream worker completion was not proven in the failed bulk recovery window |
| live failure proofs | PARTIAL | most rollback and idempotency probes still pass, but publish retry visibility and bulk retry completion failed |
| C33 page-index truth fix | COMPLETE IN C33 SCOPE ONLY | the April 26 C33 audit remains valid and no April 27 evidence contradicted it |
| docs sync with proof | COMPLETE | this audit, the updated fix records, CCC, and INDEX now replace the stale closure claim |

## 6. Final Verdict

**Rule 16 status:** PARTIAL AFTER APRIL 27 REVALIDATION

What is still proven:

- DB-owned transactional primitives remain deployed for publish, bulk, pagegen persistence, and admin multi-table writes
- same-key idempotent replay still works for bulk start
- admin rollback probes still pass in the audited scope

What is no longer proven closed:

- publish retry visibility after forced DB failure
- bulk retry-daemon recovery through to completed queue/job state

**C33 status:** CURRENT TRUTH FOR C33 ONLY

What remains true for C33:

- `page_index` still uses canonical publication `status` plus `indexing_status`
- legacy status vocabulary remains blocked at the DB layer
- C33 closes the `page_index` truth contradiction only

What this audit requires next:

1. Repair and rerun `publish_force_db_error_then_retry` until the public route and sitemap match the committed retry state.
2. Repair and rerun `bulk_network_drop_then_retry_daemon_recovery` until queue, job, and outbox completion are proven end to end.
3. Do not claim Rule 16 closed again until both failed checks pass in a fresh live artifact.
