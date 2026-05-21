'use client';

import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 8;

function formatNumber(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '--';
    }

    return value.toLocaleString('en-IN');
}

function formatDate(value) {
    if (!value) {
        return '--';
    }

    return new Date(value).toLocaleString('en-IN');
}

function MetricCard({ title, value, tone = 'default', subtext }) {
    const toneClasses = {
        default: 'border-white/[0.06] bg-white/[0.03] text-white',
        success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
        warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
        danger: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
        info: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    };

    return (
        <div className={`rounded-2xl border p-5 ${toneClasses[tone] || toneClasses.default}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
            {subtext && <p className="mt-2 text-sm text-slate-400">{subtext}</p>}
        </div>
    );
}

function ActionButton({ label, tone = 'secondary', disabled = false, onClick }) {
    const toneClasses = {
        secondary: 'admin-button-secondary',
        danger: 'border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
        success: 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20',
        warning: 'border border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`${toneClasses[tone] || toneClasses.secondary} text-xs disabled:cursor-not-allowed disabled:opacity-50`}
        >
            {label}
        </button>
    );
}

function PagedRows({ rows, columns, emptyMessage, currentPage, onPageChange }) {
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const visibleRows = rows.slice(startIndex, startIndex + PAGE_SIZE);

    return (
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        <tr>
                            {columns.map((column) => (
                                <th key={column.key} className="px-4 py-3 font-semibold">{column.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                        {visibleRows.length > 0 ? (
                            visibleRows.map((row, index) => (
                                <tr key={`${row.id || row.created_at || index}-${index}`} className="text-slate-300">
                                    {columns.map((column) => (
                                        <td key={column.key} className="px-4 py-3 align-top">
                                            {column.render ? column.render(row) : (row[column.key] ?? '--')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {rows.length > PAGE_SIZE && (
                <div className="flex flex-col gap-3 border-t border-white/[0.06] bg-white/[0.02] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, rows.length)} of {rows.length}
                    </p>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="admin-button-secondary text-xs">First</button>
                        <button type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="admin-button-secondary text-xs">Prev</button>
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-200">{currentPage} / {totalPages}</span>
                        <button type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="admin-button-secondary text-xs">Next</button>
                        <button type="button" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="admin-button-secondary text-xs">Last</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ObservabilityContent() {
    const [payload, setPayload] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [pendingAction, setPendingAction] = useState('');
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);
    const [eventLevelFilter, setEventLevelFilter] = useState('all');
    const [executiveLevelFilter, setExecutiveLevelFilter] = useState('all');
    const [eventPage, setEventPage] = useState(1);
    const [executivePage, setExecutivePage] = useState(1);

    useEffect(() => {
        setEventPage(1);
        setExecutivePage(1);
    }, [deferredSearch, eventLevelFilter, executiveLevelFilter]);

    const loadObservability = useCallback(async (silent = false) => {
        if (!silent) {
            setLoading(true);
            setError(null);
        }

        try {
            const response = await fetch('/api/admin/observability', {
                credentials: 'include',
                cache: 'no-store',
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to load observability data');
            }

            setPayload(data);
        } catch (fetchError) {
            setPayload(null);
            setError(fetchError.message);
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        loadObservability();
        const interval = setInterval(() => {
            loadObservability(true);
        }, 30000);

        return () => {
            clearInterval(interval);
        };
    }, [loadObservability]);

    useEffect(() => {
        if (!notice) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => setNotice(null), 3000);
        return () => window.clearTimeout(timeoutId);
    }, [notice]);

    const requestShosAction = useCallback(async (actionPayload, successMessage) => {
        const key = `${actionPayload.action}:${actionPayload.id || actionPayload.key || 'bulk'}`;
        setPendingAction(key);
        setNotice(null);

        try {
            const response = await fetch('/api/admin/system/shos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(actionPayload),
            });
            const data = await response.json();

            if (!response.ok || data.success === false) {
                throw new Error(data.error || 'Recovery action failed');
            }

            setNotice({ tone: 'success', text: successMessage });
            await loadObservability(true);
        } catch (actionError) {
            setNotice({ tone: 'error', text: actionError.message || 'Recovery action failed.' });
        } finally {
            setPendingAction('');
        }
    }, [loadObservability]);

    const snapshot = payload?.snapshot || {};
    const eventBus = payload?.event_bus || [];
    const executives = payload?.executives || [];
    const recovery = payload?.recovery || {};
    const recoveryQueueFailures = recovery?.queue_failures?.items || [];
    const recoveryEvents = recovery?.event_failures?.items || [];
    const recoveryAlerts = recovery?.alerts?.items || [];
    const stuckEvents = payload?.stuck_events || [];
    const eventStoreEntries = Object.entries(payload?.event_store || {});

    const filteredEventBus = useMemo(() => {
        return eventBus.filter((entry) => {
            const matchesLevel = eventLevelFilter === 'all' || entry.level === eventLevelFilter;
            const haystack = `${entry.level || ''} ${entry.message || ''} ${entry.event || ''} ${entry.executive || ''}`.toLowerCase();
            const matchesSearch = !deferredSearch.trim() || haystack.includes(deferredSearch.trim().toLowerCase());
            return matchesLevel && matchesSearch;
        });
    }, [deferredSearch, eventBus, eventLevelFilter]);

    const filteredExecutives = useMemo(() => {
        return executives.filter((entry) => {
            const matchesLevel = executiveLevelFilter === 'all' || entry.level === executiveLevelFilter;
            const haystack = `${entry.level || ''} ${entry.message || ''} ${entry.tool || ''} ${entry.executive || ''} ${entry.event_id || ''}`.toLowerCase();
            const matchesSearch = !deferredSearch.trim() || haystack.includes(deferredSearch.trim().toLowerCase());
            return matchesLevel && matchesSearch;
        });
    }, [deferredSearch, executiveLevelFilter, executives]);

    const eventLevels = Array.from(new Set(eventBus.map((entry) => entry.level).filter(Boolean)));
    const executiveLevels = Array.from(new Set(executives.map((entry) => entry.level).filter(Boolean)));

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="admin-kicker">System Telemetry</p>
                    <h1 className="admin-heading-lg mt-2">Production Observability</h1>
                    <p className="admin-copy mt-2 max-w-3xl text-sm">
                        Live queue, event bus, and executive telemetry from the current runtime snapshot. This view now reads the actual API payload, supports search and filtering, and avoids the broken blank state.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => loadObservability()}
                        className="admin-button-secondary self-start"
                    >
                        Refresh Snapshot
                    </button>
                    <a href="/admin/system" className="admin-button-secondary self-start">
                        Open SHOS
                    </a>
                </div>
            </div>

            {notice && (
                <div className={`rounded-xl px-4 py-3 text-sm ${notice.tone === 'error' ? 'admin-toast-error' : 'admin-toast-success'}`}>
                    {notice.text}
                </div>
            )}

            {error && (
                <div className="admin-toast-error rounded-xl px-4 py-3 text-sm">
                    {error}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard title="System Mode" value={payload?.system_mode || '--'} tone="info" subtext={payload?.system_mode_description || 'Current operating mode'} />
                <MetricCard title="Jobs Processed" value={formatNumber(snapshot.jobs_processed)} tone="success" subtext="Completed job runs in this snapshot" />
                <MetricCard title="Jobs Failed" value={formatNumber(snapshot.jobs_failed)} tone="danger" subtext="Failed job runs in this snapshot" />
                <MetricCard title="Queue Depth" value={formatNumber(snapshot.queue_depth)} tone="warning" subtext="Pending or processing queue items" />
                <MetricCard title="Dead Letters" value={formatNumber(snapshot.dead_letters)} tone="danger" subtext="Rows currently in dead-letter storage" />
            </div>

            <div className="admin-panel rounded-2xl p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="admin-kicker">Operator Recovery</p>
                        <h2 className="mt-2 text-lg font-semibold text-white">Act on live failures without leaving observability</h2>
                        <p className="mt-2 max-w-2xl text-sm text-slate-400">
                            These controls use the canonical SHOS action route. Failed queue rows, failed events, and open alerts are actionable here, while stuck-but-not-failed events can be escalated in SHOS.
                        </p>
                    </div>
                    <span className={`self-start rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${String(recovery.overall_health || '').toLowerCase() === 'healthy' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
                        Health {recovery.overall_health || '--'}
                    </span>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-3">
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="admin-kicker">Failed Queue</p>
                                <h3 className="mt-2 text-base font-semibold text-white">SHOS queue failures</h3>
                            </div>
                            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
                                {recovery?.queue_failures?.count || 0} open
                            </span>
                        </div>

                        <div className="mt-4 space-y-3">
                            {recoveryQueueFailures.length > 0 ? recoveryQueueFailures.map((item) => {
                                const retryKey = `queue_retry:${item.id}`;
                                const clearKey = `queue_clear:${item.id}`;

                                return (
                                    <div key={item.id} className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div>
                                                <p className="font-semibold text-white">{item.slug || item.task_type || 'Failed queue row'}</p>
                                                <p className="mt-1 text-xs text-slate-500">{item.id}</p>
                                                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                                                    <span>Task {item.task_type || '--'}</span>
                                                    <span>Retries {item.retry_count || 0}/{item.max_retries || 0}</span>
                                                    <span>Updated {formatDate(item.updated_at)}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <ActionButton
                                                    label="Retry"
                                                    tone="success"
                                                    disabled={pendingAction === retryKey}
                                                    onClick={() => requestShosAction(item.actions?.retry || { action: 'queue_retry_failed', id: item.id }, 'Queue row queued for retry.')}
                                                />
                                                <ActionButton
                                                    label="Clear"
                                                    tone="warning"
                                                    disabled={pendingAction === clearKey}
                                                    onClick={() => requestShosAction(item.actions?.clear || { action: 'queue_clear_failed', id: item.id }, 'Queue failure cleared.')}
                                                />
                                                <a href="/admin/system" className="admin-button-secondary text-xs">
                                                    Open in SHOS
                                                </a>
                                            </div>
                                        </div>
                                        {item.failure_reason ? (
                                            <p className="mt-3 text-xs text-slate-400">{item.failure_reason}</p>
                                        ) : null}
                                    </div>
                                );
                            }) : (
                                <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-4 text-sm text-slate-500">
                                    No failed queue rows are currently open.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="admin-kicker">Failed Events</p>
                                <h3 className="mt-2 text-base font-semibold text-white">SHOS event failures</h3>
                            </div>
                            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
                                {recovery?.event_failures?.count || 0} open
                            </span>
                        </div>

                        <div className="mt-4 space-y-3">
                            {recoveryEvents.length > 0 ? recoveryEvents.map((item) => {
                                const retryKey = `event_retry:${item.id}`;
                                const resolveKey = `event_resolve:${item.id}`;

                                return (
                                    <div key={item.id} className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div>
                                                <p className="font-semibold text-white">{item.event_name || 'Unknown event'}</p>
                                                <p className="mt-1 text-xs text-slate-500">{item.id}</p>
                                                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                                                    <span>Status {item.status || '--'}</span>
                                                    <span>Retries {item.retry_count || 0}/{item.max_retries || 0}</span>
                                                    <span>Updated {formatDate(item.updated_at)}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {item.actions?.retry ? (
                                                    <ActionButton
                                                        label="Retry"
                                                        tone="success"
                                                        disabled={pendingAction === retryKey}
                                                        onClick={() => requestShosAction(item.actions.retry, 'Event queued for retry.')}
                                                    />
                                                ) : null}
                                                <ActionButton
                                                    label="Resolve"
                                                    tone="warning"
                                                    disabled={pendingAction === resolveKey}
                                                    onClick={() => requestShosAction(item.actions?.resolve || { action: 'event_resolve', id: item.id }, 'Event marked resolved.')}
                                                />
                                            </div>
                                        </div>
                                        {item.last_error ? (
                                            <p className="mt-3 text-xs text-slate-400">{item.last_error}</p>
                                        ) : null}
                                    </div>
                                );
                            }) : (
                                <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-4 text-sm text-slate-500">
                                    No failed event rows are currently open.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="admin-kicker">Open Alerts</p>
                                <h3 className="mt-2 text-base font-semibold text-white">SHOS alert actions</h3>
                            </div>
                            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
                                {recovery?.alerts?.count || 0} open
                            </span>
                        </div>

                        <div className="mt-4 space-y-3">
                            {recoveryAlerts.length > 0 ? recoveryAlerts.map((alert) => {
                                const fixKey = `alert_fix:${alert.id}`;
                                const retryKey = `alert_retry:${alert.id}`;
                                const resolveKey = `alert_resolve:${alert.id}`;

                                return (
                                    <div key={alert.id} className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="font-semibold text-white">{alert.alert_type || 'Unknown alert'}</p>
                                                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                                                        {alert.severity || '--'}
                                                    </span>
                                                </div>
                                                <p className="mt-2 text-sm text-slate-300">{alert.message}</p>
                                                <p className="mt-3 text-xs text-slate-500">Created {formatDate(alert.created_at)}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <ActionButton
                                                    label={alert.fix_action?.label || 'Fix'}
                                                    tone="success"
                                                    disabled={pendingAction === fixKey}
                                                    onClick={() => requestShosAction({ action: 'alert_fix', id: alert.id }, 'Alert remediation dispatched.')}
                                                />
                                                <ActionButton
                                                    label={alert.retry_action?.label || 'Retry'}
                                                    tone="warning"
                                                    disabled={pendingAction === retryKey}
                                                    onClick={() => requestShosAction({ action: 'alert_retry', id: alert.id }, 'Alert retry dispatched.')}
                                                />
                                                <ActionButton
                                                    label="Resolve"
                                                    tone="secondary"
                                                    disabled={pendingAction === resolveKey}
                                                    onClick={() => requestShosAction({ action: 'alert_resolve', id: alert.id }, 'Alert marked resolved.')}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-4 text-sm text-slate-500">
                                    No open alerts require operator action.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="admin-panel rounded-2xl p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                        <label className="sr-only" htmlFor="observability-search">Search telemetry</label>
                        <input
                            id="observability-search"
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search events, executives, tools, or messages"
                            className="admin-input px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
                        <select value={eventLevelFilter} onChange={(event) => setEventLevelFilter(event.target.value)} className="admin-select px-3 py-2 text-sm">
                            <option value="all">All Event Levels</option>
                            {eventLevels.map((level) => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>

                        <select value={executiveLevelFilter} onChange={(event) => setExecutiveLevelFilter(event.target.value)} className="admin-select px-3 py-2 text-sm">
                            <option value="all">All Executive Levels</option>
                            {executiveLevels.map((level) => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="admin-panel rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="admin-kicker">Event Store</p>
                            <h2 className="mt-2 text-lg font-semibold text-white">Runtime Snapshot</h2>
                        </div>
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
                            {eventStoreEntries.length} tracked values
                        </span>
                    </div>

                    {eventStoreEntries.length > 0 ? (
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {eventStoreEntries.map(([key, value]) => (
                                <div key={key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{key}</p>
                                    <p className="mt-2 text-lg font-semibold text-white">{typeof value === 'number' ? formatNumber(value) : String(value)}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-5 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-4 text-sm text-slate-500">
                            Event store metrics are not available in this environment yet.
                        </div>
                    )}
                </div>

                <div className="admin-panel rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="admin-kicker">Stuck Events</p>
                            <h2 className="mt-2 text-lg font-semibold text-white">Retry Attention Queue</h2>
                        </div>
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
                            {stuckEvents.length} event{stuckEvents.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    {stuckEvents.length > 0 ? (
                        <div className="mt-5 space-y-3">
                            {stuckEvents.map((event) => (
                                <div key={event.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-white">{event.event_name || 'Unknown event'}</p>
                                            <p className="mt-1 text-xs text-slate-500">{event.id}</p>
                                        </div>
                                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                                            {event.minutes_stuck} min stuck
                                        </span>
                                    </div>
                                    <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                                        <span>Priority: {event.priority || '--'}</span>
                                        <span>Dispatched: {formatDate(event.dispatched_at)}</span>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <a href="/admin/system" className="admin-button-secondary text-xs">
                                            Open in SHOS
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-5 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-4 text-sm text-slate-500">
                            No stuck events in the current snapshot.
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <p className="admin-kicker">Event Bus</p>
                    <h2 className="mt-2 text-lg font-semibold text-white">Recent Dispatch Activity</h2>
                </div>
                <PagedRows
                    rows={filteredEventBus}
                    currentPage={eventPage}
                    onPageChange={setEventPage}
                    emptyMessage="No event bus entries match the current search and filter state."
                    columns={[
                        { key: 'created_at', label: 'Created', render: (row) => <span className="text-xs text-slate-400">{formatDate(row.created_at)}</span> },
                        { key: 'level', label: 'Level', render: (row) => <span className="text-xs font-semibold text-slate-200">{row.level || '--'}</span> },
                        { key: 'event', label: 'Event', render: (row) => <span className="text-xs text-slate-300">{row.event || '--'}</span> },
                        { key: 'executive', label: 'Executive', render: (row) => <span className="text-xs text-slate-300">{row.executive || '--'}</span> },
                        { key: 'message', label: 'Message', render: (row) => <span className="text-xs text-slate-400">{row.message || '--'}</span> },
                    ]}
                />
            </div>

            <div className="space-y-4">
                <div>
                    <p className="admin-kicker">Executives</p>
                    <h2 className="mt-2 text-lg font-semibold text-white">Tool Execution Trail</h2>
                </div>
                <PagedRows
                    rows={filteredExecutives}
                    currentPage={executivePage}
                    onPageChange={setExecutivePage}
                    emptyMessage="No executive activity matches the current search and filter state."
                    columns={[
                        { key: 'created_at', label: 'Created', render: (row) => <span className="text-xs text-slate-400">{formatDate(row.created_at)}</span> },
                        { key: 'level', label: 'Level', render: (row) => <span className="text-xs font-semibold text-slate-200">{row.level || '--'}</span> },
                        { key: 'executive', label: 'Executive', render: (row) => <span className="text-xs text-slate-300">{row.executive || '--'}</span> },
                        { key: 'tool', label: 'Tool', render: (row) => <span className="text-xs text-slate-300">{row.tool || '--'}</span> },
                        { key: 'duration_ms', label: 'Duration', render: (row) => <span className="text-xs text-slate-400">{typeof row.duration_ms === 'number' ? `${row.duration_ms}ms` : '--'}</span> },
                        { key: 'message', label: 'Message', render: (row) => <span className="text-xs text-slate-400">{row.message || '--'}</span> },
                    ]}
                />
            </div>
        </div>
    );
}
