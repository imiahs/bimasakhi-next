'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

const STATE_STYLES = {
    active: {
        badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
        dot: 'bg-emerald-400',
    },
    idle: {
        badge: 'border-slate-500/20 bg-slate-500/10 text-slate-300',
        dot: 'bg-slate-400',
    },
    paused: {
        badge: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
        dot: 'bg-amber-400',
    },
    degraded: {
        badge: 'border-orange-500/20 bg-orange-500/10 text-orange-300',
        dot: 'bg-orange-400',
    },
    failing: {
        badge: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
        dot: 'bg-rose-400',
    },
};

function formatTimestamp(value) {
    if (!value) return 'Never';
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime())) return value;
    return timestamp.toLocaleString();
}

function formatMetricValue(key, value) {
    if (value == null) return 'n/a';

    if (typeof value === 'boolean') {
        return value ? 'ON' : 'OFF';
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return '0';
        if (typeof value[0] === 'object') return `${value.length} item(s)`;
        return value.join(', ');
    }

    if (typeof value === 'object') {
        if (value.status) {
            const age = value.age_minutes == null ? 'never' : `${value.age_minutes}m ago`;
            return `${value.status} · ${age}`;
        }

        return JSON.stringify(value);
    }

    if (key.endsWith('_at') || key.endsWith('_run')) {
        return formatTimestamp(value);
    }

    if (key.endsWith('_rate') || key.endsWith('_success_rate')) {
        return `${value}%`;
    }

    return String(value);
}

function humanizeMetricKey(key) {
    return key.replace(/_/g, ' ');
}

function StateBadge({ state }) {
    const styles = STATE_STYLES[state] || STATE_STYLES.idle;

    return (
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${styles.badge}`}>
            <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
            {state}
        </span>
    );
}

function SummaryStat({ label, value }) {
    return (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
        </div>
    );
}

function ModuleCard({ module }) {
    const metricEntries = Object.entries(module.metrics || {});

    return (
        <article className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{module.label}</p>
                    <h2 className="text-xl font-semibold text-white">{module.description}</h2>
                </div>
                <StateBadge state={module.state} />
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-300">{module.reason}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {metricEntries.map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{humanizeMetricKey(key)}</p>
                        <p className="mt-2 text-sm font-medium text-slate-100">{formatMetricValue(key, value)}</p>
                    </div>
                ))}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Control links</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {module.control_links.map((href) => (
                            <Link
                                key={href}
                                href={href}
                                className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:border-emerald-400/30 hover:bg-emerald-500/15"
                            >
                                {href}
                            </Link>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Static code anchors</p>
                    <div className="mt-3 space-y-2">
                        {module.code_anchors.map((anchor) => (
                            <div key={`${module.id}-${anchor.path}`} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                                <p className="font-mono text-xs text-slate-100">{anchor.path}</p>
                                <p className="mt-1 text-xs text-slate-400">{anchor.purpose}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </article>
    );
}

function FlowCard({ flow }) {
    return (
        <article className="rounded-2xl border border-white/[0.08] bg-slate-950/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-white">{flow.label}</p>
                    <p className="mt-1 text-sm text-slate-400">{flow.description}</p>
                </div>
                <StateBadge state={flow.state} />
            </div>

            <p className="mt-4 text-sm text-slate-300">{flow.reason}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">Owner: {flow.owner_module_id}</p>
        </article>
    );
}

export default function CodeVisibilityContent() {
    const [snapshot, setSnapshot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchSnapshot = useCallback(async () => {
        try {
            setError('');
            const response = await fetch('/api/admin/system/code', {
                credentials: 'include',
                cache: 'no-store',
            });
            const payload = await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(payload.error || `HTTP ${response.status}`);
            }

            setSnapshot(payload);
        } catch (requestError) {
            setSnapshot(null);
            setError(requestError.message || 'Failed to load code visibility snapshot.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSnapshot();
        const interval = window.setInterval(fetchSnapshot, 30000);
        return () => window.clearInterval(interval);
    }, [fetchSnapshot]);

    const counts = useMemo(() => snapshot?.overall?.counts || {}, [snapshot]);

    if (loading && !snapshot) {
        return <div className="p-8 text-sm text-slate-400">Loading code visibility snapshot...</div>;
    }

    if (error && !snapshot) {
        return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-200">{error}</div>;
    }

    return (
        <div className="space-y-6 p-6">
            <section className="admin-panel admin-glow-ring overflow-hidden rounded-3xl px-6 py-6 lg:px-8 lg:py-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <p className="admin-kicker">Layer 4</p>
                        <h1 className="admin-heading-xl mt-3 max-w-3xl">Code Visibility</h1>
                        <p className="admin-copy mt-4 max-w-2xl text-sm">
                            Read-only system visibility for modules, flows, control paths, and static code anchors. No dynamic scanning. No writes.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <StateBadge state={snapshot?.overall?.state || 'idle'} />
                        <button
                            type="button"
                            onClick={fetchSnapshot}
                            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/[0.14] hover:bg-white/[0.08]"
                        >
                            Refresh snapshot
                        </button>
                    </div>
                </div>

                <div className="mt-6 rounded-3xl border border-white/[0.08] bg-slate-950/60 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">System reading</p>
                            <p className="mt-2 text-lg font-semibold text-white">{snapshot?.overall?.reason}</p>
                        </div>
                        <p className="text-sm text-slate-400">Captured at {formatTimestamp(snapshot?.captured_at)}</p>
                    </div>
                </div>
            </section>

            {error ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                    Last refresh warning: {error}
                </div>
            ) : null}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryStat label="Active" value={counts.active || 0} />
                <SummaryStat label="Idle" value={counts.idle || 0} />
                <SummaryStat label="Paused" value={counts.paused || 0} />
                <SummaryStat label="Degraded" value={counts.degraded || 0} />
                <SummaryStat label="Failing" value={counts.failing || 0} />
            </section>

            <section className="space-y-4">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Modules</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">What the system is doing now</h2>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    {(snapshot?.modules || []).map((module) => (
                        <ModuleCard key={module.id} module={module} />
                    ))}
                </div>
            </section>

            <section className="space-y-4">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Flows</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Which execution lanes are moving</h2>
                </div>

                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {(snapshot?.flows || []).map((flow) => (
                        <FlowCard key={flow.id} flow={flow} />
                    ))}
                </div>
            </section>
        </div>
    );
}