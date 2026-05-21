'use client';

import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';

function formatDate(value) {
    if (!value) return 'Unknown';

    try {
        return new Date(value).toLocaleString();
    } catch {
        return String(value);
    }
}

function formatPercent(value) {
    const numeric = Number(value || 0);
    return `${numeric.toFixed(1)}%`;
}

function titleize(value) {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
}

function buttonClass(tone = 'neutral') {
    const base = 'rounded-full border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40';

    if (tone === 'primary') {
        return `${base} border-amber-400/60 bg-amber-300 text-slate-950 hover:bg-amber-200`;
    }

    if (tone === 'success') {
        return `${base} border-emerald-500/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25`;
    }

    if (tone === 'danger') {
        return `${base} border-rose-500/50 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25`;
    }

    if (tone === 'warning') {
        return `${base} border-orange-500/50 bg-orange-500/15 text-orange-100 hover:bg-orange-500/25`;
    }

    return `${base} border-slate-700 bg-slate-900/70 text-slate-100 hover:border-slate-500 hover:bg-slate-800/80`;
}

function sectionCardClass(extra = '') {
    return `rounded-[24px] border border-slate-800/90 bg-slate-950/55 shadow-[0_18px_60px_rgba(2,6,23,0.35)] ${extra}`;
}

function statusTone(status) {
    const normalized = String(status || '').toLowerCase();

    if (normalized.includes('healthy') || normalized.includes('delivered') || normalized.includes('resolved') || normalized.includes('completed')) {
        return 'text-emerald-200 border-emerald-500/40 bg-emerald-500/10';
    }

    if (normalized.includes('degraded') || normalized.includes('failed') || normalized.includes('critical') || normalized.includes('terminal')) {
        return 'text-rose-200 border-rose-500/40 bg-rose-500/10';
    }

    if (normalized.includes('pending') || normalized.includes('active') || normalized.includes('warning') || normalized.includes('safe_mode')) {
        return 'text-amber-100 border-amber-500/40 bg-amber-500/10';
    }

    return 'text-slate-200 border-slate-700 bg-slate-900/70';
}

function MetricCard({ label, value, note, accent }) {
    return (
        <div className="rounded-[20px] border border-slate-800/90 bg-slate-950/55 p-4 shadow-[0_12px_30px_rgba(2,6,23,0.2)]">
            <div className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${accent || 'text-slate-500'}`}>
                {label}
            </div>
            <div className="mt-3 text-3xl font-semibold text-slate-50">{value}</div>
            <div className="mt-2 text-sm text-slate-400">{note}</div>
        </div>
    );
}

function StatusPill({ label, status }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusTone(status)}`}>
            {label}: {titleize(status)}
        </span>
    );
}

function ActionButton({ tone, label, onClick, disabled }) {
    return (
        <button className={buttonClass(tone)} onClick={onClick} disabled={disabled} type="button">
            {label}
        </button>
    );
}

function JsonDetails({ label, value }) {
    return (
        <details className="rounded-2xl border border-slate-800/90 bg-slate-950/60 px-4 py-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {label}
            </summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-200">
                {JSON.stringify(value, null, 2)}
            </pre>
        </details>
    );
}

function Checklist({ items }) {
    if (!items?.length) {
        return <div className="text-sm text-slate-500">No validation gate for this control.</div>;
    }

    return (
        <div className="space-y-2">
            {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/90 bg-slate-950/45 px-3 py-2 text-sm">
                    <span className="text-slate-200">{item.label}</span>
                    <span className={item.passed ? 'text-emerald-300' : 'text-rose-300'}>
                        {item.passed ? 'PASS' : `FAIL (${item.current})`}
                    </span>
                </div>
            ))}
        </div>
    );
}

function getFlagLabels(flag) {
    if (flag.key === 'queue_paused') {
        return {
            enable: 'Pause Queue',
            disable: 'Resume Queue',
            validated: null,
        };
    }

    if (flag.key === 'safe_mode') {
        return {
            enable: 'Enter Safe Mode',
            disable: 'Exit Safe Mode',
            validated: null,
        };
    }

    return {
        enable: 'Force Enable',
        disable: 'Disable',
        validated: 'Enable With Validation',
    };
}

function FlashBanner({ flash }) {
    if (!flash) return null;

    const toneClass = flash.tone === 'error'
        ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
        : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100';

    return (
        <div className={`rounded-[20px] border px-4 py-3 text-sm ${toneClass}`}>
            {flash.message}
        </div>
    );
}

export default function ShosControlCenter() {
    const [snapshot, setSnapshot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [flash, setFlash] = useState(null);
    const [actionReason, setActionReason] = useState('');
    const [pendingAction, setPendingAction] = useState('');
    const [flagAutoReverts, setFlagAutoReverts] = useState({});

    const loadSnapshot = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/system/shos?limit=8', { cache: 'no-store' });
            const data = await response.json();

            if (!response.ok || data.success === false) {
                throw new Error(data.error || 'Failed to load SHOS snapshot');
            }

            startTransition(() => {
                setSnapshot(data);
            });

            if (data.auto_reverts?.reverted > 0) {
                setFlash({
                    tone: 'success',
                    message: `${data.auto_reverts.reverted} scheduled auto-revert${data.auto_reverts.reverted > 1 ? 's' : ''} processed.`,
                });
            }
        } catch (fetchError) {
            setError(fetchError.message || 'Unable to load SHOS snapshot');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSnapshot();
        const intervalId = window.setInterval(loadSnapshot, 45000);
        return () => window.clearInterval(intervalId);
    }, [loadSnapshot]);

    const requestAction = useCallback(async (payload, options = {}) => {
        const key = `${payload.action}:${payload.id || payload.key || payload.source_type || 'bulk'}`;

        if (options.confirmMessage && !window.confirm(options.confirmMessage)) {
            return;
        }

        const mergedReason = payload.reason ?? actionReason.trim();
        if (options.reasonRequired && !mergedReason) {
            setFlash({ tone: 'error', message: 'Provide an operator reason before changing feature flags.' });
            return;
        }

        setPendingAction(key);
        setFlash(null);

        try {
            const response = await fetch('/api/admin/system/shos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...payload,
                    reason: mergedReason || null,
                }),
            });

            const data = await response.json();
            if (!response.ok || data.success === false) {
                throw new Error(data.error || 'Operator action failed');
            }

            setFlash({
                tone: 'success',
                message: titleize(payload.action.replace(/:/g, ' ')) + ' completed successfully.',
            });

            await loadSnapshot();
        } catch (requestError) {
            setFlash({
                tone: 'error',
                message: requestError.message || 'Operator action failed',
            });
        } finally {
            setPendingAction('');
        }
    }, [actionReason, loadSnapshot]);

    const metrics = snapshot?.metrics || {};
    const featureFlags = snapshot?.feature_flags || [];
    const dlqItems = snapshot?.dlq?.items || [];
    const queueItems = snapshot?.queue_failures?.items || [];
    const deliveryItems = snapshot?.delivery_failures?.items || [];
    const eventItems = snapshot?.event_failures?.items || [];
    const alertItems = snapshot?.alerts?.items || [];
    const errorItems = snapshot?.errors?.items || [];
    const liveEscalations = snapshot?.escalations?.live || [];
    const staleEscalations = snapshot?.escalations?.stale || [];
    const acknowledgedEscalations = snapshot?.escalations?.acknowledged || [];
    const historicalItems = snapshot?.historical_incidents?.items || [];
    const historicalWarnings = snapshot?.historical_incidents?.warnings || [];
    const stuckEvents = snapshot?.replay?.stuck_events || [];
    const operationalHealth = snapshot?.consistency?.operational_health || metrics.overall_health || 'UNKNOWN';
    const forensicHealth = snapshot?.consistency?.forensic_health || metrics.forensic_overall_health || operationalHealth;
    const operationalSummary = snapshot?.health?.operational_summary || {};
    const forensicSummary = snapshot?.health?.forensic_summary || {};
    const authorityRows = useMemo(() => {
        if (!snapshot?.consistency) return [];

        return [
            {
                label: 'Operational DLQ',
                value: snapshot.consistency.dlq_pending,
                state: snapshot.consistency.matches_health_dlq_total ? 'Aligned' : 'Mismatch',
                note: `Active health count ${snapshot.health?.visibility?.dead_letters?.active_pending_count ?? 0}`,
                toneClass: snapshot.consistency.matches_health_dlq_total
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-200',
            },
            {
                label: 'Forensic DLQ',
                value: snapshot.health?.failures?.dlq_depth_total ?? 0,
                state: 'Forensic',
                note: `Historical ${snapshot.consistency.historical_dead_letters ?? 0}`,
                toneClass: 'border-slate-700 bg-slate-900/70 text-slate-200',
            },
            {
                label: 'Live Escalations',
                value: snapshot.consistency.live_unacknowledged_escalations ?? 0,
                state: (snapshot.consistency.live_unacknowledged_escalations ?? 0) > 0 ? 'Live' : 'Clear',
                note: 'Escalation-authoritative rows',
                toneClass: (snapshot.consistency.live_unacknowledged_escalations ?? 0) > 0
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
            },
            {
                label: 'Stale Escalations',
                value: snapshot.consistency.stale_unacknowledged_escalations ?? 0,
                state: (snapshot.consistency.stale_unacknowledged_escalations ?? 0) > 0 ? 'Stale' : 'Clear',
                note: 'Visible but not live-authoritative',
                toneClass: (snapshot.consistency.stale_unacknowledged_escalations ?? 0) > 0
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
            },
            {
                label: 'Acknowledged',
                value: metrics.acknowledged_escalations_recent ?? 0,
                state: 'Historical',
                note: 'Recent acknowledged escalation records',
                toneClass: 'border-slate-700 bg-slate-900/70 text-slate-200',
            },
        ];
    }, [metrics.acknowledged_escalations_recent, snapshot]);

    if (loading && !snapshot) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center rounded-[28px] border border-slate-800/90 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),transparent_28%),linear-gradient(180deg,#07111f_0%,#0b1727_42%,#111827_100%)] p-8 text-slate-100">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-amber-300" />
                    <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Loading SHOS</div>
                </div>
            </div>
        );
    }

    if (error && !snapshot) {
        return (
            <div className="rounded-[28px] border border-rose-500/40 bg-slate-950/70 p-8 text-slate-100">
                <div className="text-lg font-semibold text-rose-100">Failed to load SHOS</div>
                <div className="mt-2 text-sm text-rose-200">{error}</div>
                <div className="mt-6">
                    <ActionButton tone="danger" label="Retry" onClick={loadSnapshot} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen rounded-[28px] border border-slate-800/90 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),transparent_24%),linear-gradient(180deg,#07111f_0%,#091423_42%,#111827_100%)] p-4 text-slate-100 md:p-6">
            <div className="space-y-6">
                <div className={`${sectionCardClass('overflow-hidden')} p-6`}>
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Self-Healing Operator System</div>
                            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
                                System control without code intervention
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                                SHOS is the canonical operator surface for feature flags, DLQ recovery, queue remediation, delivery repair, replay visibility, escalation authority, and bounded health interpretation.
                            </p>
                            <div className="mt-5 flex flex-wrap gap-2">
                                <StatusPill label="Operational" status={operationalHealth} />
                                {forensicHealth !== operationalHealth ? <StatusPill label="Forensic" status={forensicHealth} /> : null}
                                <StatusPill label="Control Source" status={snapshot?.control_plane?.source || 'shos'} />
                                <StatusPill label="Last Sync" status={snapshot?.timestamp ? formatDate(snapshot.timestamp) : 'Unknown'} />
                            </div>
                        </div>

                        <div className="w-full max-w-xl space-y-4 rounded-[24px] border border-slate-800/90 bg-slate-950/55 p-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Operator reason</div>
                                <p className="mt-2 text-sm text-slate-400">
                                    SHOS writes this reason into action history for flag changes and recovery actions.
                                </p>
                            </div>
                            <textarea
                                className="min-h-[104px] w-full rounded-[20px] border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-400/60"
                                placeholder="Example: Retry failed queue jobs after verifying provider latency has recovered."
                                value={actionReason}
                                onChange={(event) => setActionReason(event.target.value)}
                            />
                            <div className="flex flex-wrap gap-3">
                                <ActionButton tone="primary" label={loading ? 'Refreshing...' : 'Refresh SHOS'} onClick={loadSnapshot} disabled={loading} />
                            </div>
                        </div>
                    </div>
                </div>

                <FlashBanner flash={flash} />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="DLQ Pending" value={metrics.dlq_pending ?? 0} note="Actionable dead letters" accent="text-amber-300" />
                    <MetricCard label="Historical DLQ" value={metrics.historical_dead_letters ?? 0} note="Forensic dead-letter residue" accent="text-slate-300" />
                    <MetricCard label="Queue Failed" value={metrics.queue_failed ?? 0} note="Failed queue rows" accent="text-rose-300" />
                    <MetricCard label="Delivery Failed" value={metrics.delivery_failed ?? 0} note="Failed external deliveries" accent="text-orange-300" />
                    <MetricCard label="Replay Failures" value={metrics.event_failed ?? 0} note="Failed event-store replay items" accent="text-cyan-300" />
                    <MetricCard label="Live Escalations" value={metrics.live_unacknowledged_escalations ?? 0} note="Still escalation-authoritative" accent="text-rose-300" />
                    <MetricCard label="Stale Escalations" value={metrics.stale_unacknowledged_escalations ?? 0} note="Visible but not live-authoritative" accent="text-amber-200" />
                    <MetricCard label="Alerts Open" value={metrics.alerts_open ?? 0} note="Unresolved system alerts" accent="text-sky-300" />
                    <MetricCard label="Errors Open" value={metrics.errors_open ?? 0} note="Runtime + system errors" accent="text-fuchsia-300" />
                </div>

                <div className={`${sectionCardClass()} p-6`}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Authority reconciliation</div>
                            <h2 className="mt-2 text-xl font-semibold text-slate-50">Operational truth vs forensic visibility</h2>
                        </div>
                        <div className="text-sm text-slate-400">Live operator authority is explicit; historical residue stays visible without inheriting live degraded meaning.</div>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        {authorityRows.map((row) => (
                            <div key={row.label} className="rounded-[20px] border border-slate-800/90 bg-slate-950/55 p-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{row.label}</div>
                                <div className="mt-3 flex items-end justify-between gap-3">
                                    <div className="text-3xl font-semibold text-slate-50">{row.value}</div>
                                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${row.toneClass}`}>
                                        {row.state}
                                    </span>
                                </div>
                                <div className="mt-2 text-sm text-slate-400">{row.note}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 grid gap-4 xl:grid-cols-2">
                        <div className="rounded-[20px] border border-slate-800/90 bg-slate-950/55 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Live degraded authority</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {operationalSummary.hard_failures?.length ? operationalSummary.hard_failures.map((item) => (
                                    <span key={item} className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-200">
                                        {titleize(item)}
                                    </span>
                                )) : <span className="text-sm text-slate-400">No live degraded-state reasons are currently classified.</span>}
                            </div>
                        </div>
                        <div className="rounded-[20px] border border-slate-800/90 bg-slate-950/55 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Forensic residue</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {forensicSummary.warnings?.length ? forensicSummary.warnings.map((item) => (
                                    <span key={item} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">
                                        {titleize(item)}
                                    </span>
                                )) : <span className="text-sm text-slate-400">No preserved forensic residue is currently classified.</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <div className={`${sectionCardClass()} p-6`}>
                        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Escalation authority</div>
                                <h2 className="mt-2 text-xl font-semibold text-slate-50">Live, stale, and acknowledged escalation lanes</h2>
                            </div>
                            <div className="text-sm text-slate-400">Escalations no longer inherit one implicit meaning.</div>
                        </div>
                        <div className="mt-5 space-y-4">
                            {[...liveEscalations, ...staleEscalations, ...acknowledgedEscalations].length ? [...liveEscalations, ...staleEscalations, ...acknowledgedEscalations].map((item) => (
                                <div key={`${item.incident_state}:${item.id}`} className="rounded-[20px] border border-slate-800/90 bg-slate-950/55 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="text-base font-semibold text-slate-50">{item.message}</div>
                                                <StatusPill label="Severity" status={item.severity} />
                                                <StatusPill label="State" status={item.incident_state} />
                                                <StatusPill label="Authority" status={item.authority_class} />
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                                                <span>Created {formatDate(item.created_at)}</span>
                                                <span>Retry count {item.retry_count}</span>
                                                {item.next_escalation_at ? <span>Next escalation {formatDate(item.next_escalation_at)}</span> : null}
                                                {item.acknowledged_at ? <span>Acknowledged {formatDate(item.acknowledged_at)}</span> : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )) : <div className="text-sm text-slate-400">No escalation records are currently visible.</div>}
                        </div>
                    </div>

                    <div className={`${sectionCardClass()} p-6`}>
                        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Replay authority</div>
                                <h2 className="mt-2 text-xl font-semibold text-slate-50">Failed event replay and stuck-event visibility</h2>
                            </div>
                            <div className="text-sm text-slate-400">Replay artifacts remain operator-visible without being collapsed into generic health text.</div>
                        </div>
                        <div className="mt-5 space-y-4">
                            {eventItems.length ? eventItems.map((item) => (
                                <div key={item.id} className="rounded-[20px] border border-slate-800/90 bg-slate-950/55 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="text-base font-semibold text-slate-50">{titleize(item.event_name)}</div>
                                                <StatusPill label="State" status={item.incident_state} />
                                                <StatusPill label="Authority" status={item.authority_class} />
                                            </div>
                                            <div className="mt-2 text-sm text-slate-300">{item.last_error || 'Failed replay path without recorded error text.'}</div>
                                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                                                <span>Created {formatDate(item.created_at)}</span>
                                                <span>Updated {formatDate(item.updated_at)}</span>
                                                <span>Retries {item.retry_count}/{item.max_retries}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <ActionButton tone="success" label="Retry Replay" onClick={() => requestAction({ action: 'event_retry', id: item.id })} disabled={pendingAction === `event_retry:${item.id}`} />
                                            <ActionButton tone="neutral" label="Mark Resolved" onClick={() => requestAction({ action: 'event_resolve', id: item.id })} disabled={pendingAction === `event_resolve:${item.id}`} />
                                        </div>
                                    </div>
                                </div>
                            )) : <div className="text-sm text-slate-400">No failed replay items are currently visible.</div>}
                            {stuckEvents.length ? (
                                <div className="rounded-[20px] border border-slate-800/90 bg-slate-950/55 p-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Stuck event visibility</div>
                                    <div className="mt-3 space-y-3">
                                        {stuckEvents.map((event) => (
                                            <div key={event.id} className="rounded-2xl border border-slate-800/90 bg-slate-950/60 px-4 py-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="text-sm font-semibold text-slate-50">{titleize(event.event_name)}</div>
                                                    <StatusPill label="Authority" status={event.authority_class} />
                                                </div>
                                                <div className="mt-2 text-xs text-slate-400">Dispatched {formatDate(event.dispatched_at)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className={`${sectionCardClass()} p-6`}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Historical visibility</div>
                            <h2 className="mt-2 text-xl font-semibold text-slate-50">Preserved forensic residue without live-authority leakage</h2>
                        </div>
                        <div className="text-sm text-slate-400">Historical artifacts remain audit-visible and intentionally separate from live operator backlog.</div>
                    </div>
                    <div className="mt-5 grid gap-4 xl:grid-cols-2">
                        <div className="space-y-4">
                            {historicalItems.length ? historicalItems.map((item) => (
                                <div key={item.id} className="rounded-[20px] border border-slate-800/90 bg-slate-950/55 p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="text-base font-semibold text-slate-50">{item.label}</div>
                                        <StatusPill label="State" status={item.incident_state} />
                                        <StatusPill label="Authority" status={item.authority_class} />
                                    </div>
                                    <div className="mt-2 text-sm text-slate-300">{item.detail}</div>
                                    <div className="mt-3 text-xs text-slate-400">Count {item.count}</div>
                                </div>
                            )) : <div className="text-sm text-slate-400">No preserved historical artifacts are currently classified.</div>}
                        </div>
                        <div className="rounded-[20px] border border-slate-800/90 bg-slate-950/55 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Forensic warning ledger</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {historicalWarnings.length ? historicalWarnings.map((item) => (
                                    <span key={item} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">
                                        {titleize(item)}
                                    </span>
                                )) : <span className="text-sm text-slate-400">No forensic warnings recorded in this snapshot.</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`${sectionCardClass()} p-6`}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Feature flag control</div>
                            <h2 className="mt-2 text-xl font-semibold text-slate-50">Validated enable, override, and auto-revert</h2>
                        </div>
                        <div className="text-sm text-slate-400">Each flag shows the latest SHOS change record with who/why/when.</div>
                    </div>
                    <div className="mt-5 grid gap-4 xl:grid-cols-2">
                        {featureFlags.map((flag) => {
                            const labels = getFlagLabels(flag);
                            const actionKey = `feature_flag_set:${flag.key}`;
                            const isPending = pendingAction === actionKey;
                            return (
                                <div key={flag.key} className="rounded-[22px] border border-slate-800/90 bg-slate-950/55 p-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg font-semibold text-slate-50">{flag.label}</h3>
                                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${flag.value ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>
                                                    {flag.value ? 'ON' : 'OFF'}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-sm text-slate-300">{flag.description}</p>
                                            <div className="mt-3 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
                                                <div>Last changed: <span className="text-slate-200">{formatDate(flag.history?.last_changed_at)}</span></div>
                                                <div>Changed by: <span className="text-slate-200">{flag.history?.changed_by || 'unknown/legacy'}</span></div>
                                                <div className="sm:col-span-2">Reason: <span className="text-slate-200">{flag.history?.reason || 'no reason recorded'}</span></div>
                                                {flag.history?.auto_revert_at ? (
                                                    <div className="sm:col-span-2">Auto-revert: <span className="text-slate-200">{formatDate(flag.history.auto_revert_at)}</span></div>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="min-w-[220px] rounded-[20px] border border-slate-800/90 bg-slate-950/80 p-4">
                                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Auto-revert minutes</div>
                                            <input
                                                type="number"
                                                min="0"
                                                value={flagAutoReverts[flag.key] || ''}
                                                onChange={(event) => setFlagAutoReverts((current) => ({
                                                    ...current,
                                                    [flag.key]: event.target.value,
                                                }))}
                                                className="mt-3 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-400/60"
                                                placeholder="0 = no auto-revert"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-5">
                                        <Checklist items={flag.validation_checks} />
                                    </div>

                                    <div className="mt-5 flex flex-wrap gap-3">
                                        {labels.validated ? (
                                            <ActionButton
                                                tone="success"
                                                label={labels.validated}
                                                disabled={!flag.can_enable_safely || flag.value || isPending}
                                                onClick={() => requestAction({
                                                    action: 'feature_flag_set',
                                                    key: flag.key,
                                                    mode: 'validated',
                                                    auto_revert_minutes: Number(flagAutoReverts[flag.key] || 0),
                                                }, { reasonRequired: true })}
                                            />
                                        ) : null}

                                        <ActionButton
                                            tone="warning"
                                            label={labels.enable}
                                            disabled={flag.value || isPending}
                                            onClick={() => requestAction({
                                                action: 'feature_flag_set',
                                                key: flag.key,
                                                mode: 'force',
                                                auto_revert_minutes: Number(flagAutoReverts[flag.key] || 0),
                                            }, { reasonRequired: true, confirmMessage: `Force change ${flag.label}?` })}
                                        />

                                        <ActionButton
                                            tone="danger"
                                            label={labels.disable}
                                            disabled={!flag.value || isPending}
                                            onClick={() => requestAction({
                                                action: 'feature_flag_set',
                                                key: flag.key,
                                                mode: 'disable',
                                            }, { reasonRequired: true })}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <div className={`${sectionCardClass()} p-6`}>
                        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">DLQ control</div>
                                <h2 className="mt-2 text-xl font-semibold text-slate-50">Retry, discard, or resolve without deletion</h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <ActionButton
                                    tone="success"
                                    label="Retry All"
                                    disabled={!dlqItems.length || pendingAction === 'dlq_retry_all:bulk'}
                                    onClick={() => requestAction({ action: 'dlq_retry_all' }, { confirmMessage: 'Retry all pending DLQ items?' })}
                                />
                                <ActionButton
                                    tone="warning"
                                    label="Clear All"
                                    disabled={!dlqItems.length || pendingAction === 'dlq_clear_all:bulk'}
                                    onClick={() => requestAction({ action: 'dlq_clear_all' }, { confirmMessage: 'Resolve all pending DLQ items?' })}
                                />
                            </div>
                        </div>
                        <div className="mt-5 space-y-4">
                            {dlqItems.length ? dlqItems.map((item) => (
                                <div key={item.id} className="rounded-[20px] border border-slate-800/90 bg-slate-950/55 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="text-base font-semibold text-slate-50">{item.job_class}</div>
                                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusTone(item.operator_status)}`}>
                                                    {titleize(item.operator_status)}
                                                </span>
                                            </div>
                                            <div className="mt-2 text-sm text-slate-300">{item.failure_reason}</div>
                                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                                                <span>Failed at {formatDate(item.failed_at)}</span>
                                                <span>Retry count {item.retry_count}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <ActionButton tone="success" label="Retry" onClick={() => requestAction({ action: 'dlq_retry', id: item.id })} disabled={pendingAction === `dlq_retry:${item.id}`} />
                                            <ActionButton tone="warning" label="Discard" onClick={() => requestAction({ action: 'dlq_discard', id: item.id }, { confirmMessage: 'Discard this DLQ item without deleting history?' })} disabled={pendingAction === `dlq_discard:${item.id}`} />
                                            <ActionButton tone="neutral" label="Mark Resolved" onClick={() => requestAction({ action: 'dlq_resolve', id: item.id })} disabled={pendingAction === `dlq_resolve:${item.id}`} />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <JsonDetails label="Payload" value={item.payload} />
                                    </div>
                                </div>
                            )) : <div className="text-sm text-slate-400">No pending DLQ items.</div>}
                        </div>
                    </div>

                    <div className={`${sectionCardClass()} p-6`}>
                        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Queue failure control</div>
                                <h2 className="mt-2 text-xl font-semibold text-slate-50">Safe retry, cancel, and clear failed queue rows</h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <ActionButton tone="success" label="Retry Failed" onClick={() => requestAction({ action: 'queue_retry_failed' }, { confirmMessage: 'Retry all failed queue rows?' })} disabled={!queueItems.length || pendingAction === 'queue_retry_failed:bulk'} />
                                <ActionButton tone="warning" label="Clear Failed" onClick={() => requestAction({ action: 'queue_clear_failed' }, { confirmMessage: 'Clear failed queue rows without deleting history?' })} disabled={!queueItems.length || pendingAction === 'queue_clear_failed:bulk'} />
                            </div>
                        </div>
                        <div className="mt-5 space-y-4">
                            {queueItems.length ? queueItems.map((item) => (
                                <div key={item.id} className="rounded-[20px] border border-slate-800/90 bg-slate-950/55 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="text-base font-semibold text-slate-50">{titleize(item.task_type)}</div>
                                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusTone(item.operator_status || item.status)}`}>
                                                    {titleize(item.status)}
                                                </span>
                                            </div>
                                            <div className="mt-2 text-sm text-slate-300">{item.failure_reason}</div>
                                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                                                <span>Created {formatDate(item.created_at)}</span>
                                                <span>Updated {formatDate(item.updated_at)}</span>
                                                <span>Retries {item.retry_count}/{item.max_retries}</span>
                                                {item.slug ? <span>Slug {item.slug}</span> : null}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <ActionButton tone="success" label="Retry" onClick={() => requestAction({ action: 'queue_retry_failed', id: item.id })} disabled={pendingAction === `queue_retry_failed:${item.id}`} />
                                            <ActionButton tone="warning" label="Cancel" onClick={() => requestAction({ action: 'queue_cancel_failed', id: item.id }, { confirmMessage: 'Cancel this failed queue row?' })} disabled={pendingAction === `queue_cancel_failed:${item.id}`} />
                                            <ActionButton tone="danger" label="Clear" onClick={() => requestAction({ action: 'queue_clear_failed', id: item.id }, { confirmMessage: 'Clear this failed queue row without deleting history?' })} disabled={pendingAction === `queue_clear_failed:${item.id}`} />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <JsonDetails label="Payload" value={item.payload} />
                                    </div>
                                </div>
                            )) : <div className="text-sm text-slate-400">No failed queue rows.</div>}
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <div className={`${sectionCardClass()} p-6`}>
                        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Delivery failure control</div>
                                <h2 className="mt-2 text-xl font-semibold text-slate-50">Retry failed deliveries or mark them terminal</h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <ActionButton tone="success" label="Retry All" onClick={() => requestAction({ action: 'delivery_retry_all' }, { confirmMessage: 'Retry all failed deliveries?' })} disabled={!deliveryItems.length || pendingAction === 'delivery_retry_all:bulk'} />
                            </div>
                        </div>
                        <div className="mt-5 space-y-4">
                            {deliveryItems.length ? deliveryItems.map((item) => (
                                <div key={item.id} className="rounded-[20px] border border-slate-800/90 bg-slate-950/55 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="text-base font-semibold text-slate-50">{titleize(item.event_name)}</div>
                                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusTone(item.status)}`}>
                                                    {titleize(item.status)}
                                                </span>
                                            </div>
                                            <div className="mt-2 text-sm text-slate-300">{item.target_path || item.provider_message_id}</div>
                                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                                                <span>Attempts {item.attempt_count}</span>
                                                <span>Provider retries {item.provider_retry_count}</span>
                                                <span>Failed at {formatDate(item.failed_at)}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <ActionButton tone="success" label="Retry Delivery" onClick={() => requestAction({ action: 'delivery_retry', id: item.id })} disabled={pendingAction === `delivery_retry:${item.id}`} />
                                            <ActionButton tone="danger" label="Mark Terminal" onClick={() => requestAction({ action: 'delivery_mark_terminal', id: item.id }, { confirmMessage: 'Mark this delivery terminal?' })} disabled={pendingAction === `delivery_mark_terminal:${item.id}`} />
                                        </div>
                                    </div>
                                    <div className="mt-4 grid gap-3">
                                        <JsonDetails label="Retry History" value={item.retry_history} />
                                        {item.error_payload && Object.keys(item.error_payload).length ? <JsonDetails label="Error Payload" value={item.error_payload} /> : null}
                                    </div>
                                </div>
                            )) : <div className="text-sm text-slate-400">No failed deliveries.</div>}
                        </div>
                    </div>

                    <div className={`${sectionCardClass()} p-6`}>
                        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Alert action system</div>
                                <h2 className="mt-2 text-xl font-semibold text-slate-50">Every alert exposes fix, retry, and resolve actions</h2>
                            </div>
                            <div className="text-sm text-slate-400">Queue and delivery alerts are mapped to real recovery actions.</div>
                        </div>
                        <div className="mt-5 space-y-4">
                            {alertItems.length ? alertItems.map((alert) => (
                                <div key={alert.id} className="rounded-[20px] border border-slate-800/90 bg-slate-950/55 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="text-base font-semibold text-slate-50">{titleize(alert.alert_type)}</div>
                                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusTone(alert.severity)}`}>
                                                    {titleize(alert.severity)}
                                                </span>
                                            </div>
                                            <div className="mt-2 text-sm text-slate-300">{alert.message}</div>
                                            <div className="mt-3 text-xs text-slate-400">Created {formatDate(alert.created_at)}</div>
                                            {alert.delivery ? (
                                                <div className="mt-2 text-xs text-slate-400">
                                                    Delivery: {titleize(alert.delivery.delivery_status)} • Next escalation {formatDate(alert.delivery.next_escalation_at)}
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <ActionButton tone="success" label={alert.fix_action?.label || 'Fix'} onClick={() => requestAction({ action: 'alert_fix', id: alert.id })} disabled={pendingAction === `alert_fix:${alert.id}`} />
                                            <ActionButton tone="warning" label={alert.retry_action?.label || 'Retry'} onClick={() => requestAction({ action: 'alert_retry', id: alert.id })} disabled={pendingAction === `alert_retry:${alert.id}`} />
                                            <ActionButton tone="neutral" label="Resolve" onClick={() => requestAction({ action: 'alert_resolve', id: alert.id })} disabled={pendingAction === `alert_resolve:${alert.id}`} />
                                        </div>
                                    </div>
                                </div>
                            )) : <div className="text-sm text-slate-400">No open alerts.</div>}
                        </div>
                    </div>
                </div>

                <div className={`${sectionCardClass()} p-6`}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Error control system</div>
                            <h2 className="mt-2 text-xl font-semibold text-slate-50">Retry by source map or mark errors resolved</h2>
                        </div>
                        <div className="text-sm text-slate-400">Runtime and system error ledgers are merged here into one operator view.</div>
                    </div>
                    <div className="mt-5 space-y-4">
                        {errorItems.length ? errorItems.map((item) => (
                            <div key={`${item.source_type}:${item.id}`} className="rounded-[20px] border border-slate-800/90 bg-slate-950/55 p-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="text-base font-semibold text-slate-50">{item.source_mapping?.label || 'Unknown source'}</div>
                                            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                                                {titleize(item.source_type)}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm text-slate-300">{item.message}</div>
                                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                                            <span>Created {formatDate(item.created_at)}</span>
                                            {item.route ? <span>Route {item.route}</span> : null}
                                            {item.component ? <span>Component {item.component}</span> : null}
                                            {item.error_type ? <span>Type {item.error_type}</span> : null}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <ActionButton tone="warning" label={item.retry_action?.label || 'Retry'} onClick={() => requestAction({ action: 'error_retry', id: item.id, source_type: item.source_type })} disabled={pendingAction === `error_retry:${item.id}`} />
                                        <ActionButton tone="neutral" label="Mark Resolved" onClick={() => requestAction({ action: 'error_resolve', id: item.id, source_type: item.source_type })} disabled={pendingAction === `error_resolve:${item.id}`} />
                                    </div>
                                </div>
                                {item.stack_trace ? (
                                    <div className="mt-4">
                                        <JsonDetails label="Stack trace" value={item.stack_trace} />
                                    </div>
                                ) : null}
                            </div>
                        )) : <div className="text-sm text-slate-400">No open errors.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}