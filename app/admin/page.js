'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/adminApi';
import MetricCard from '@/components/admin/ui/MetricCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'score_desc', label: 'Highest Score' },
    { value: 'score_asc', label: 'Lowest Score' },
    { value: 'city', label: 'City A-Z' }
];

function RuntimeFlag({ label, enabled, detail }) {
    return (
        <div className="admin-subpanel rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="admin-kicker">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-200">{enabled ? 'Enabled' : 'Disabled'}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>
                </div>
                <StatusBadge status={enabled ? 'ON' : 'OFF'} size="md" />
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const [health, setHealth] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [queue, setQueue] = useState(null);
    const [leads, setLeads] = useState([]);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [warnings, setWarnings] = useState([]);
    const [queueActionLoading, setQueueActionLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState('newest');

    const fetchAll = useCallback(async ({ silent = false } = {}) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        const nextWarnings = [];

        const [
            healthRes,
            metricsRes,
            queueRes,
            leadsRes,
            configRes
        ] = await Promise.allSettled([
            adminApi.getSystemHealth(),
            adminApi.getBusinessMetrics(),
            adminApi.getQueueStatus(),
            adminApi.getLeads(),
            adminApi.getConfig()
        ]);

        let failureCount = 0;

        if (healthRes.status === 'fulfilled' && healthRes.value?.success) {
            setHealth(healthRes.value.data);
        } else {
            failureCount += 1;
            nextWarnings.push('System health signals are temporarily unavailable.');
        }

        if (metricsRes.status === 'fulfilled' && metricsRes.value?.success) {
            setMetrics(metricsRes.value.data);
        } else {
            failureCount += 1;
            nextWarnings.push('Metrics API is degraded. Lead and queue panels are still using live fallback data.');
        }

        if (queueRes.status === 'fulfilled' && queueRes.value?.success) {
            setQueue(queueRes.value.data);
        } else {
            failureCount += 1;
            nextWarnings.push('Queue snapshot could not be refreshed.');
        }

        if (leadsRes.status === 'fulfilled') {
            setLeads(leadsRes.value?.leads || []);
        } else {
            failureCount += 1;
            nextWarnings.push('CRM lead feed failed to load.');
        }

        if (configRes.status === 'fulfilled' && configRes.value?.success) {
            setConfig(configRes.value.data);
        } else {
            failureCount += 1;
            nextWarnings.push('Runtime control state could not be verified.');
        }

        setWarnings(nextWarnings);
        setError(failureCount === 5 ? 'Failed to load admin dashboard.' : null);
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const triggerGeneration = useCallback(async () => {
        if (!confirm('Trigger the page generation worker now?')) return;
        setQueueActionLoading(true);

        try {
            const response = await fetch('/api/admin/queue', { method: 'POST' });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to trigger queue worker');
            }

            setToast({
                type: 'success',
                text: data.data?.message || 'Generation worker triggered successfully.'
            });
            fetchAll({ silent: true });
        } catch (err) {
            setToast({
                type: 'error',
                text: err.message || 'Failed to trigger generation worker.'
            });
        } finally {
            setQueueActionLoading(false);
            setTimeout(() => setToast(null), 4000);
        }
    }, [fetchAll]);

    const sourceOptions = useMemo(() => (
        ['All', ...Array.from(new Set(leads.map((lead) => lead.source || lead.Lead_Source || 'Website')))]
    ), [leads]);

    const statusOptions = useMemo(() => (
        ['All', ...Array.from(new Set(leads.map((lead) => (
            lead.is_converted ? 'Converted' : (lead.status || lead.Lead_Status || 'new')
        ))))]
    ), [leads]);

    const filteredLeads = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        const nextLeads = leads.filter((lead) => {
            const name = lead.Last_Name || lead.name || '';
            const mobile = lead.Mobile || lead.mobile || '';
            const email = lead.email || '';
            const city = lead.City || lead.city || '';
            const source = lead.Lead_Source || lead.source || 'Website';
            const status = lead.is_converted ? 'Converted' : (lead.status || lead.Lead_Status || 'new');

            const matchesSearch = !normalizedSearch || [name, mobile, email, city, source]
                .some((value) => String(value).toLowerCase().includes(normalizedSearch));
            const matchesSource = sourceFilter === 'All' || source === sourceFilter;
            const matchesStatus = statusFilter === 'All' || status === statusFilter;

            return matchesSearch && matchesSource && matchesStatus;
        });

        return nextLeads.sort((left, right) => {
            const leftScore = Number(left.lead_score || left.score || 0);
            const rightScore = Number(right.lead_score || right.score || 0);

            if (sortBy === 'score_desc') return rightScore - leftScore;
            if (sortBy === 'score_asc') return leftScore - rightScore;
            if (sortBy === 'city') {
                return String(left.City || left.city || '').localeCompare(String(right.City || right.city || ''));
            }

            return new Date(right.created_at || right.Created_Time || 0).getTime()
                - new Date(left.created_at || left.Created_Time || 0).getTime();
        });
    }, [leads, searchTerm, sourceFilter, statusFilter, sortBy]);

    const topLeads = filteredLeads.slice(0, 10);

    const totalLeadsValue = metrics?.total_leads ?? leads.length ?? '--';
    const todayLeadsValue = metrics?.today_leads ?? health?.total_leads_today ?? '--';
    const queuePendingValue = metrics?.queue_pending ?? queue?.pending ?? '--';
    const queueTotalValue = metrics?.queue_total ?? queue?.total ?? 0;
    const activePagesValue = metrics?.active_pages ?? '--';

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" />
                    <p className="admin-kicker mt-6">Dashboard sync</p>
                    <p className="mt-2 text-sm text-slate-500">Loading mission control...</p>
                </div>
            </div>
        );
    }

    if (error && !health && !metrics && !queue && leads.length === 0) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="admin-panel max-w-xl rounded-[2rem] px-8 py-10 text-center">
                    <p className="admin-kicker">Dashboard offline</p>
                    <h1 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-rose-400">{error}</h1>
                    <p className="mt-3 text-sm text-slate-500">The control plane did not return any usable live data.</p>
                    <button
                        onClick={() => fetchAll()}
                        className="admin-button-secondary mt-6"
                    >
                        Retry load
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="admin-panel admin-glow-ring overflow-hidden rounded-2xl px-6 py-5 lg:px-7 lg:py-6">
                <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.72fr]">
                    <div>
                        <p className="admin-kicker">Mission control</p>
                        <h1 className="admin-heading-xl mt-4 max-w-4xl">Production control panel for the real growth engine.</h1>
                        <p className="admin-copy mt-4 max-w-2xl text-sm">
                            This board reads the live lead system, queue system, runtime switches, and recovery state. It is designed for active operations, not reporting theater.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                onClick={() => fetchAll({ silent: true })}
                                disabled={refreshing}
                                className="admin-button-secondary"
                            >
                                {refreshing ? 'Refreshing...' : 'Refresh live board'}
                            </button>
                            <Link href="/admin/settings" className="admin-button-primary">
                                Open runtime settings
                            </Link>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <div className="admin-subpanel rounded-xl p-4">
                            <p className="admin-kicker">CRM route</p>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-200">Zoho sync path</span>
                                <StatusBadge status={config?.crm_auto_routing ? 'Operational' : 'Paused'} size="md" />
                            </div>
                        </div>
                        <div className="admin-subpanel rounded-xl p-4">
                            <p className="admin-kicker">Queue state</p>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-200">Worker dispatch</span>
                                <StatusBadge status={config?.queue_paused ? 'Paused' : 'Operational'} size="md" />
                            </div>
                        </div>
                        <div className="admin-subpanel rounded-xl p-4">
                            <p className="admin-kicker">AI state</p>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-200">Generation and scoring</span>
                                <StatusBadge status={config?.ai_enabled ? 'Operational' : 'Paused'} size="md" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {warnings.length > 0 && (
                <div className="admin-warning rounded-[1.5rem] px-5 py-4 text-sm font-medium shadow-sm">
                    {warnings[0]}
                </div>
            )}

            {toast && (
                <div className={`rounded-[1.5rem] px-4 py-3 text-sm font-medium shadow-sm ${toast.type === 'success' ? 'admin-toast-success' : 'admin-toast-error'}`}>
                    {toast.text}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Total Leads" value={totalLeadsValue} subtitle="Live records available in the CRM pipeline" icon="LD" statusColor="success" />
                <MetricCard title="Today Leads" value={todayLeadsValue} subtitle="Rows created since local midnight" icon="TD" />
                <MetricCard title="Queue Pending" value={queuePendingValue} subtitle={`${queueTotalValue} total jobs in generation queue`} icon="QP" statusColor={Number(queuePendingValue) > 0 ? 'warning' : null} />
                <MetricCard title="Active Pages" value={activePagesValue} subtitle="Published entries from page index" icon="PX" />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
                <section className="admin-panel rounded-2xl p-5 xl:col-span-2">
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <div>
                            <p className="admin-kicker">Runtime controls</p>
                            <h2 className="admin-heading-lg mt-3">Live switches controlling business behavior.</h2>
                        </div>
                        <Link href="/admin/settings" className="text-sm font-semibold text-emerald-400 underline-offset-4 hover:text-emerald-300 hover:underline">
                            Manage
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <RuntimeFlag label="CRM Auto Routing" enabled={Boolean(config?.crm_auto_routing)} detail="Controls local save versus Zoho handoff." />
                        <RuntimeFlag label="Queue Running" enabled={!Boolean(config?.queue_paused)} detail="Queue worker execution state." />
                        <RuntimeFlag label="AI Enabled" enabled={Boolean(config?.ai_enabled)} detail="Gemini generation and lead scoring availability." />
                        <RuntimeFlag label="Followup Enabled" enabled={Boolean(config?.followup_enabled)} detail="Post-routing followup dispatch availability." />
                    </div>
                </section>

                <section className="admin-panel rounded-2xl p-5">
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <div>
                            <p className="admin-kicker">System health</p>
                            <h2 className="admin-heading-lg mt-3">Runtime health and recovery visibility.</h2>
                        </div>
                        <Link href="/admin/logs" className="text-sm font-semibold text-emerald-400 underline-offset-4 hover:text-emerald-300 hover:underline">
                            View logs
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="admin-subpanel rounded-xl p-4">
                            <p className="admin-kicker">CRM</p>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-200">Zoho routing state</span>
                                <StatusBadge status={health?.crm_status || 'Unknown'} size="md" />
                            </div>
                        </div>
                        <div className="admin-subpanel rounded-xl p-4">
                            <p className="admin-kicker">AI</p>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-200">Worker state</span>
                                <StatusBadge status={health?.ai_status || 'Unknown'} size="md" />
                            </div>
                        </div>
                        <div className="admin-subpanel rounded-xl p-4">
                            <p className="admin-kicker">Today</p>
                            <p className="mt-2 text-[1.75rem] font-bold tracking-[-0.04em] text-white">{health?.total_leads_today ?? 0}</p>
                            <p className="mt-1 text-xs text-slate-500">Live leads created today</p>
                        </div>
                        <div className="admin-subpanel rounded-xl p-4">
                            <p className="admin-kicker">Failed leads</p>
                            <p className="mt-2 text-[1.75rem] font-bold tracking-[-0.04em] text-white">{health?.failed_leads_count ?? 0}</p>
                            <p className="mt-1 text-xs text-slate-500">Records currently stuck in recovery</p>
                        </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-200">Recent errors</h3>
                            <span className="admin-kicker">{health?.last_10_errors?.length || 0} visible</span>
                        </div>

                        <div className="space-y-3">
                            {(health?.last_10_errors || []).length > 0 ? (
                                health.last_10_errors.slice(0, 3).map((item, index) => (
                                    <div key={`${item.created_at}-${index}`} className="admin-subpanel rounded-xl p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-200">{item.component || 'Unknown component'}</p>
                                                <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.message}</p>
                                            </div>
                                            <StatusBadge status={item.resolved ? 'Resolved' : 'Open'} />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500">No recent runtime errors reported.</p>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.9fr]">
                <section className="admin-panel rounded-2xl p-5">
                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="admin-kicker">Lead operations</p>
                            <h2 className="admin-heading-lg mt-3">CRM lead table</h2>
                            <p className="admin-copy mt-2 text-sm">Search, filter, and triage the live leads feeding the recruitment engine.</p>
                        </div>
                        <Link href="/admin/crm" className="text-sm font-semibold text-emerald-400 underline-offset-4 hover:text-emerald-300 hover:underline">
                            Open full CRM
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search lead, mobile, email..."
                            className="admin-input px-4 py-3 text-sm"
                        />
                        <select
                            value={sourceFilter}
                            onChange={(event) => setSourceFilter(event.target.value)}
                            className="admin-select px-4 py-3 text-sm"
                        >
                            {sourceOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            className="admin-select px-4 py-3 text-sm"
                        >
                            {statusOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        <select
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value)}
                            className="admin-select px-4 py-3 text-sm"
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.06]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-white/[0.06] bg-white/[0.03] text-xs uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3.5 font-semibold">Lead</th>
                                        <th className="px-4 py-3.5 font-semibold">City</th>
                                        <th className="px-4 py-3.5 font-semibold">Source</th>
                                        <th className="px-4 py-3.5 font-semibold">Score</th>
                                        <th className="px-4 py-3.5 font-semibold">Zoho</th>
                                        <th className="px-4 py-3.5 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {topLeads.length > 0 ? topLeads.map((lead) => {
                                        const name = lead.Last_Name || lead.name || 'Unknown';
                                        const mobile = lead.Mobile || lead.mobile || 'N/A';
                                        const city = lead.City || lead.city || 'Unknown';
                                        const source = lead.Lead_Source || lead.source || 'Website';
                                        const zohoState = lead.synced_to_zoho || lead.zoho_lead_id ? 'Synced' : 'Local';
                                        const leadStatus = lead.is_converted ? 'Converted' : (lead.status || lead.Lead_Status || 'new');

                                        return (
                                            <tr key={lead.id} className="transition hover:bg-white/[0.03]">
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="font-semibold text-slate-200">{name}</p>
                                                        <p className="mt-0.5 text-xs text-slate-500">{mobile}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-400">{city}</td>
                                                <td className="px-4 py-3 text-slate-400">{source}</td>
                                                <td className="px-4 py-3">
                                                    <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-300">
                                                        {Number(lead.lead_score || lead.score || 0)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={zohoState} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={leadStatus} />
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                                                No leads match the current filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <section className="space-y-5">
                    <div className="admin-panel rounded-2xl p-5">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <p className="admin-kicker">Queue status</p>
                                <h2 className="admin-heading-lg mt-3">Generation pipeline</h2>
                                <p className="admin-copy mt-2 text-sm">Live job states from generation queue with direct worker trigger.</p>
                            </div>
                            <button
                                onClick={triggerGeneration}
                                disabled={queueActionLoading}
                                className="admin-button-primary"
                            >
                                {queueActionLoading ? 'Triggering...' : 'Run PageGen'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Pending', value: queue?.pending ?? 0 },
                                { label: 'Processing', value: queue?.processing ?? 0 },
                                { label: 'Completed', value: queue?.completed ?? 0 },
                                { label: 'Failed', value: queue?.failed ?? 0 }
                            ].map((item) => (
                                <div key={item.label} className="admin-subpanel rounded-xl p-4">
                                    <p className="admin-kicker">{item.label}</p>
                                    <p className="mt-2 text-[1.75rem] font-bold tracking-[-0.04em] text-white">{item.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 rounded-xl border border-white/[0.06] bg-gradient-to-br from-emerald-500/[0.06] to-transparent p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="admin-kicker">Queue total</p>
                                    <p className="mt-2 text-sm font-semibold text-slate-300">All known jobs in the current generation pipeline.</p>
                                </div>
                                <span className="text-3xl font-bold tracking-[-0.04em] text-white">{queue?.total ?? 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="admin-panel rounded-2xl p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="admin-kicker">Quick actions</p>
                                <h2 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-white">Operator shortcuts</h2>
                            </div>
                            <span className="admin-kicker">Ops</span>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <Link href="/admin/crm" className="admin-subpanel rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">
                                Open CRM lead operations
                            </Link>
                            <Link href="/admin/failed-leads" className="admin-subpanel rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">
                                Review failed lead recovery
                            </Link>
                            <Link href="/admin/analytics" className="admin-subpanel rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">
                                Open analytics and attribution
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
