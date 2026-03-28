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
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-zinc-900">{label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">{detail}</p>
                </div>
                <StatusBadge status={enabled ? 'ON' : 'OFF'} />
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

        const [healthRes, metricsRes, queueRes, leadsRes, configRes] = await Promise.allSettled([
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
        }

        if (metricsRes.status === 'fulfilled' && metricsRes.value?.success) {
            setMetrics(metricsRes.value.data);
        } else {
            failureCount += 1;
        }

        if (queueRes.status === 'fulfilled' && queueRes.value?.success) {
            setQueue(queueRes.value.data);
        } else {
            failureCount += 1;
        }

        if (leadsRes.status === 'fulfilled') {
            setLeads(leadsRes.value?.leads || []);
        } else {
            failureCount += 1;
        }

        if (configRes.status === 'fulfilled' && configRes.value?.success) {
            setConfig(configRes.value.data);
        } else {
            failureCount += 1;
        }

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

    const sourceOptions = useMemo(() => {
        return ['All', ...Array.from(new Set(leads.map((lead) => lead.source || lead.Lead_Source || 'Website')))];
    }, [leads]);

    const statusOptions = useMemo(() => {
        return ['All', ...Array.from(new Set(leads.map((lead) => (
            lead.is_converted ? 'Converted' : (lead.status || lead.Lead_Status || 'new')
        ))))];
    }, [leads]);

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

            return new Date(right.created_at || right.Created_Time || 0).getTime() - new Date(left.created_at || left.Created_Time || 0).getTime();
        });
    }, [leads, searchTerm, sourceFilter, statusFilter, sortBy]);

    const topLeads = filteredLeads.slice(0, 10);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-zinc-200 border-t-black" />
                <p className="mt-4 text-sm font-medium text-zinc-500">Loading admin command center...</p>
            </div>
        );
    }

    if (error && !health && !metrics && !queue && leads.length === 0) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
                <span className="text-3xl text-red-500">!</span>
                <p className="text-sm font-medium text-red-600">{error}</p>
                <button
                    onClick={() => fetchAll()}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Admin Reliability</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Production Control Panel</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
                        Live leads, live queue, live system flags. This page is the operator view of the actual engine, not a mock dashboard.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => fetchAll({ silent: true })}
                        disabled={refreshing}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50"
                    >
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <Link
                        href="/admin/settings"
                        className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
                    >
                        Open Settings
                    </Link>
                </div>
            </div>

            {toast && (
                <div className={`rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm ${
                    toast.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}>
                    {toast.text}
                </div>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Total Leads" value={metrics?.total_leads ?? '—'} subtitle="Live records in the recruitment pipeline" statusColor="success" />
                <MetricCard title="Today Leads" value={metrics?.today_leads ?? '—'} subtitle="New rows created since midnight" />
                <MetricCard title="Queue Pending" value={metrics?.queue_pending ?? queue?.pending ?? '—'} subtitle={`${metrics?.queue_total ?? queue?.total ?? 0} total jobs in generation_queue`} statusColor={(metrics?.queue_pending ?? queue?.pending ?? 0) > 0 ? 'warning' : null} />
                <MetricCard title="Active Pages" value={metrics?.active_pages ?? '—'} subtitle="Live indexed pages from page_index" />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
                <div className="xl:col-span-2">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold tracking-tight text-zinc-950">Runtime Controls</h2>
                                <p className="mt-1 text-sm text-zinc-500">These switches drive live behavior through the real config table.</p>
                            </div>
                            <Link href="/admin/settings" className="text-sm font-medium text-zinc-700 underline-offset-4 hover:text-black hover:underline">
                                Manage
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <RuntimeFlag label="CRM Auto Routing" enabled={Boolean(config?.crm_auto_routing)} detail="Controls local-save only vs Zoho handoff." />
                            <RuntimeFlag label="Queue Running" enabled={!Boolean(config?.queue_paused)} detail="Queue worker execution state." />
                            <RuntimeFlag label="AI Enabled" enabled={Boolean(config?.ai_enabled)} detail="Lead scoring and AI generation availability." />
                            <RuntimeFlag label="Followup Enabled" enabled={Boolean(config?.followup_enabled)} detail="Post-routing followup dispatch availability." />
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-2">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold tracking-tight text-zinc-950">System Health</h2>
                                <p className="mt-1 text-sm text-zinc-500">Runtime flags and the latest health signals from the live stack.</p>
                            </div>
                            <Link href="/admin/logs" className="text-sm font-medium text-zinc-700 underline-offset-4 hover:text-black hover:underline">
                                View logs
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">CRM</p>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-sm font-medium text-zinc-900">Zoho routing state</span>
                                    <StatusBadge status={health?.crm_status || 'Unknown'} />
                                </div>
                            </div>
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">AI</p>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-sm font-medium text-zinc-900">Worker execution state</span>
                                    <StatusBadge status={health?.ai_status || 'Unknown'} />
                                </div>
                            </div>
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Today</p>
                                <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">{health?.total_leads_today ?? 0}</p>
                                <p className="mt-1 text-xs text-zinc-500">Live leads created today</p>
                            </div>
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Failed Leads</p>
                                <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">{health?.failed_leads_count ?? 0}</p>
                                <p className="mt-1 text-xs text-zinc-500">Records currently stuck in recovery</p>
                            </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-zinc-900">Recent Errors</h3>
                                <span className="text-xs text-zinc-500">{health?.last_10_errors?.length || 0} visible</span>
                            </div>
                            <div className="space-y-3">
                                {(health?.last_10_errors || []).length > 0 ? (
                                    health.last_10_errors.slice(0, 3).map((item, index) => (
                                        <div key={`${item.created_at}-${index}`} className="rounded-xl border border-zinc-200 bg-white p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-medium text-zinc-900">{item.component || 'Unknown component'}</p>
                                                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">{item.message}</p>
                                                </div>
                                                <StatusBadge status={item.resolved ? 'Resolved' : 'Open'} />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-zinc-500">No recent runtime errors reported.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_0.95fr]">
                <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">CRM Lead Table</h2>
                            <p className="mt-1 text-sm text-zinc-500">Search, filter, and sort the live leads feeding the recruitment engine.</p>
                        </div>
                        <Link href="/admin/crm" className="text-sm font-medium text-zinc-700 underline-offset-4 hover:text-black hover:underline">
                            Open full CRM
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search lead, mobile, email..."
                            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white"
                        />
                        <select
                            value={sourceFilter}
                            onChange={(event) => setSourceFilter(event.target.value)}
                            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white"
                        >
                            {sourceOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white"
                        >
                            {statusOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        <select
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value)}
                            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white"
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-50 text-xs uppercase tracking-[0.18em] text-zinc-500">
                                    <tr>
                                        <th className="px-5 py-4 font-semibold">Lead</th>
                                        <th className="px-5 py-4 font-semibold">City</th>
                                        <th className="px-5 py-4 font-semibold">Source</th>
                                        <th className="px-5 py-4 font-semibold">Score</th>
                                        <th className="px-5 py-4 font-semibold">Zoho</th>
                                        <th className="px-5 py-4 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 bg-white">
                                    {topLeads.length > 0 ? topLeads.map((lead) => {
                                        const name = lead.Last_Name || lead.name || 'Unknown';
                                        const mobile = lead.Mobile || lead.mobile || 'N/A';
                                        const city = lead.City || lead.city || 'Unknown';
                                        const source = lead.Lead_Source || lead.source || 'Website';
                                        const zohoState = lead.synced_to_zoho || lead.zoho_lead_id ? 'Synced' : 'Local';
                                        const leadStatus = lead.is_converted ? 'Converted' : (lead.status || lead.Lead_Status || 'new');

                                        return (
                                            <tr key={lead.id} className="transition hover:bg-zinc-50/80">
                                                <td className="px-5 py-4">
                                                    <div>
                                                        <p className="font-medium text-zinc-950">{name}</p>
                                                        <p className="mt-1 text-xs text-zinc-500">{mobile}</p>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-zinc-600">{city}</td>
                                                <td className="px-5 py-4 text-zinc-600">{source}</td>
                                                <td className="px-5 py-4">
                                                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                                                        {Number(lead.lead_score || lead.score || 0)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <StatusBadge status={zohoState} />
                                                </td>
                                                <td className="px-5 py-4">
                                                    <StatusBadge status={leadStatus} />
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-12 text-center text-sm text-zinc-500">
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
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold tracking-tight text-zinc-950">Queue Status</h2>
                                <p className="mt-1 text-sm text-zinc-500">Live job states from generation_queue with manual worker control.</p>
                            </div>
                            <button
                                onClick={triggerGeneration}
                                disabled={queueActionLoading}
                                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50"
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
                                <div key={item.label} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{item.label}</p>
                                    <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{item.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-zinc-900">Total Queue Size</p>
                                    <p className="mt-1 text-xs text-zinc-500">All known jobs in the current generation pipeline.</p>
                                </div>
                                <span className="text-2xl font-semibold tracking-tight text-zinc-950">{queue?.total ?? 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">Quick Actions</h2>
                            <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">Ops</span>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <Link href="/admin/crm" className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100">
                                Open CRM lead operations
                            </Link>
                            <Link href="/admin/failed-leads" className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100">
                                Review failed lead recovery
                            </Link>
                            <Link href="/admin/analytics" className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100">
                                Open analytics and attribution
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
