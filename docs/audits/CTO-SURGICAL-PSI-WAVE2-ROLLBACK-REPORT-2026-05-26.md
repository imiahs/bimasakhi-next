# CTO Surgical PSI Wave-2 Rollback Report (2026-05-26)

## Objective
Execute a controlled Wave-2 homepage optimization trial, validate live impact across device profiles, and preserve production safety using immediate rollback when regression is detected.

## Scope and Blast Radius
- Target file changed in Wave-2 experiment: `features/dynamic-home/HomePage.jsx`
- No schema or API contract changes.
- No changes to routing structure.
- Rollback method: git revert (non-destructive, traceable)

## Execution Timeline
1. Wave-2 experiment commit deployed:
- Commit: `ae802b3`
- Intent: defer non-critical homepage sections after idle

2. Live validation after deployment:
- Route health checks returned HTTP 200 for key routes.
- Lighthouse artifacts captured for mobile, desktop, and tablet-like profiles.

3. Regression detected:
- Mobile and desktop performance regressed materially.
- Tablet-like profile showed severe Total Blocking Time spike.

4. Controlled rollback executed:
- Revert commit: `560a253`
- Action: reverted `ae802b3` and pushed to `main`
- Route health checks post-rollback remained HTTP 200.
- Build verification passed (`next build`).

## Evidence: Wave-2 Regression
### Before vs After (Wave-2)
| Profile | Score Before | Score After | Delta | FCP Before | FCP After | LCP Before | LCP After | TBT Before | TBT After | CLS Before | CLS After | SI Before | SI After |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Mobile | 43 | 30 | -13 | 3.0s | 4.9s | 6.1s | 6.6s | 1830ms | 1680ms | 0.006 | 0.116 | 4.5s | 7.4s |
| Desktop | 91 | 63 | -28 | 0.9s | 1.1s | 1.2s | 1.6s | 120ms | 550ms | 0.067 | 0.002 | 1.8s | 2.6s |
| Tablet-like | n/a | 25 | n/a | n/a | 3.2s | n/a | 6.0s | n/a | 8950ms | n/a | 0.085 | n/a | 7.8s |

Interpretation:
- The defer-after-idle strategy in this architecture introduced slower render path and/or main-thread contention in lab conditions.
- Regression magnitude exceeded safe tolerance, so rollback was mandatory.

## Evidence: Post-Rollback Validation
### Rollback Sample Results
| Profile | Wave-2 Before | Wave-2 After | Rollback Sample |
|---|---:|---:|---:|
| Mobile (run #1) | 43 | 30 | 30 |
| Mobile (run #2) | 43 | 30 | 52 |
| Desktop | 91 | 63 | 88 |

Interpretation:
- Desktop recovered close to pre-wave baseline (91 -> 88).
- Mobile shows high run-to-run variance (30 and 52) under simulated throttling; rollback removed the wave-specific regression commit, but single-run mobile numbers are noisy.
- Safety objective achieved: unstable optimization removed from production path.

## Build and Runtime Health
- `next build`: PASS
- Key live routes: PASS (HTTP 200)
  - /
  - /about
  - /contact
  - /downloads
  - /eligibility
  - /income
  - /why
  - /bima-sakhi-delhi
  - /blog

## Governance Outcome
- Reversibility worked as designed.
- Blast radius remained bounded to one homepage composition file.
- Production was restored using explicit revert commit with auditable lineage.

## Current Stable State
- Wave-2 defer strategy is not active in production.
- Prior Wave-1 optimizations remain active (hero/CSS/animation/GTM tuning from earlier cycle).
- Repo head contains revert commit `560a253` on `main`.

## Next Safe Optimization Lane
1. Keep homepage section render order stable.
2. Target CPU-heavy client logic and hydration hotspots inside individual sections instead of deferring large section groups.
3. Use 3-run median for mobile audits to reduce false decisions from single-run variance.
4. Promote only if median improves and no profile regresses beyond agreed guardrails.
