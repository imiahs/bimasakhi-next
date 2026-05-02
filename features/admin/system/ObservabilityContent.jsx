'use client';

import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';

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

    useEffect(() => {
        let cancelled = false;

        async function fetchMetrics() {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch('/api/admin/observability', {
                    credentials: 'include',
                    cache: 'no-store',
                });
                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Failed to load observability data');
                }

                if (!cancelled) {
                    setPayload(data);
                }
            } catch (fetchError) {
                if (!cancelled) {
                    setPayload(null);
                    setError(fetchError.message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchMetrics();
        const interval = setInterval(fetchMetrics, 30000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    const snapshot = payload?.snapshot || {};
    const eventBus = payload?.event_bus || [];
    const executives = payload?.executives || [];
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

                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="admin-button-secondary self-start"
                >
                    Refresh Snapshot
                </button>
            </div>

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
