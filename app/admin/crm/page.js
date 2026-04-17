'use client';
import React, { useEffect, useMemo, useState } from 'react';
import MetricCard from '@/components/admin/ui/MetricCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { adminApi } from '@/lib/adminApi';

const SORT_OPTIONS = [
    { value: 'score_desc', label: 'Highest Score' },
    { value: 'newest', label: 'Newest First' },
    { value: 'score_asc', label: 'Lowest Score' },
    { value: 'city', label: 'City A-Z' }
];

export default function CRMPage() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [convertingId, setConvertingId] = useState(null);
    const [conversionValue, setConversionValue] = useState(15000);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState('score_desc');

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getLeads();
            setLeads(response.leads || []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const sourceOptions = useMemo(() => (
        ['All', ...Array.from(new Set(leads.map((lead) => lead.Lead_Source || lead.source || 'Website')))]
    ), [leads]);

    const statusOptions = useMemo(() => (
        ['All', ...Array.from(new Set(leads.map((lead) => {
            if (lead.is_converted) return 'Converted';
            return lead.status || lead.Lead_Status || 'new';
        })))]
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

            if (sortBy === 'newest') {
                return new Date(right.created_at || right.Created_Time || 0).getTime()
                    - new Date(left.created_at || left.Created_Time || 0).getTime();
            }

            if (sortBy === 'score_asc') return leftScore - rightScore;
            if (sortBy === 'city') {
                return String(left.City || left.city || '').localeCompare(String(right.City || right.city || ''));
            }

            return rightScore - leftScore;
        });
    }, [leads, searchTerm, sourceFilter, statusFilter, sortBy]);

    const summary = useMemo(() => {
        const total = leads.length;
        const converted = leads.filter((lead) => lead.is_converted).length;
        const zohoSynced = leads.filter((lead) => lead.synced_to_zoho || lead.zoho_lead_id).length;
        const hot = leads.filter((lead) => Number(lead.lead_score || lead.score || 0) >= 80).length;

        return { total, converted, zohoSynced, hot };
    }, [leads]);

    const handleConvert = async (event) => {
        event.preventDefault();
        if (!convertingId) return;

        setActionLoading(true);

        try {
            await adminApi.markConverted(convertingId, conversionValue);
            setToast({ type: 'success', text: 'Lead successfully marked as converted.' });
            setConvertingId(null);
            fetchLeads();
        } catch (err) {
            setToast({ type: 'error', text: `Failed: ${err.message}` });
        } finally {
            setActionLoading(false);
            setTimeout(() => setToast(null), 3000);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="admin-panel flex flex-col items-center rounded-[2rem] px-10 py-12 text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" />
                    <p className="admin-kicker mt-6">CRM sync</p>
                    <p className="mt-2 text-sm text-slate-500">Loading live CRM leads...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="admin-panel admin-glow-ring overflow-hidden rounded-2xl px-6 py-5 lg:px-7 lg:py-6">
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="admin-kicker">Lead operations</p>
                        <h1 className="admin-heading-xl mt-4 max-w-3xl">Work the real CRM pipeline, not a sample table.</h1>
                        <p className="admin-copy mt-4 max-w-2xl text-sm">
                            This board shows actual lead records, score visibility, Zoho sync state, and conversion actions for the production pipeline.
                        </p>
                    </div>

                    <button onClick={fetchLeads} className="admin-button-secondary">
                        Refresh leads
                    </button>
                </div>
            </section>

            {toast && (
                <div className={`rounded-[1.5rem] px-4 py-3 text-sm font-medium shadow-sm ${toast.type === 'success' ? 'admin-toast-success' : 'admin-toast-error'}`}>
                    {toast.text}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Total Leads" value={summary.total} subtitle="Visible in the CRM workbench" icon="TL" statusColor="success" />
                <MetricCard title="Hot Leads" value={summary.hot} subtitle="Lead score 80 or higher" icon="HT" statusColor={summary.hot > 0 ? 'warning' : null} />
                <MetricCard title="Zoho Synced" value={summary.zohoSynced} subtitle="Records with CRM sync ids" icon="ZH" />
                <MetricCard title="Converted" value={summary.converted} subtitle="Revenue-attributed leads" icon="CV" />
            </div>

            <section className="admin-panel rounded-2xl p-5">
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
            </section>

            <section className="admin-panel overflow-hidden rounded-2xl">
                {error ? (
                    <div className="px-6 py-10 text-center text-sm font-medium text-rose-400">
                        Failed to load leads: {error}
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="px-6 py-14 text-center text-sm text-slate-500">
                        No leads match the current filters.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-white/[0.06] bg-white/[0.03] text-xs uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-5 py-4 font-semibold">Lead</th>
                                    <th className="px-5 py-4 font-semibold">City</th>
                                    <th className="px-5 py-4 font-semibold">Source</th>
                                    <th className="px-5 py-4 font-semibold">Lead Score</th>
                                    <th className="px-5 py-4 font-semibold">Zoho</th>
                                    <th className="px-5 py-4 font-semibold">Status</th>
                                    <th className="px-5 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {filteredLeads.map((lead) => {
                                    const name = lead.Last_Name || lead.name || 'Unknown';
                                    const city = lead.City || lead.city || 'Unknown';
                                    const source = lead.Lead_Source || lead.source || 'Website';
                                    const score = Number(lead.lead_score || lead.score || 0);
                                    const zohoState = lead.synced_to_zoho || lead.zoho_lead_id ? 'Synced' : 'Local';
                                    const status = lead.is_converted ? 'Converted' : (lead.status || lead.Lead_Status || 'new');

                                    return (
                                        <tr key={lead.id} className={`transition hover:bg-white/[0.03] ${lead.is_converted ? 'opacity-70' : ''}`}>
                                            <td className="px-5 py-4">
                                                <div>
                                                    <p className="font-semibold text-slate-200">{name}</p>
                                                    <p className="mt-1 text-xs text-slate-500">{lead.Mobile || lead.mobile || 'N/A'}</p>
                                                    {lead.email && <p className="mt-1 text-xs text-slate-600">{lead.email}</p>}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-slate-400">{city}</td>
                                            <td className="px-5 py-4 text-slate-400">{source}</td>
                                            <td className="px-5 py-4">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                    score >= 80
                                                        ? 'bg-rose-500/10 text-rose-400'
                                                        : score >= 50
                                                            ? 'bg-amber-500/10 text-amber-400'
                                                            : 'bg-white/[0.06] text-slate-400'
                                                }`}>
                                                    {score}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusBadge status={zohoState} />
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusBadge status={status} />
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {lead.is_converted ? (
                                                    <span className="text-xs font-semibold text-emerald-700">
                                                        Converted {lead.conversion_value ? `(Rs ${Number(lead.conversion_value).toLocaleString()})` : ''}
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => setConvertingId(lead.id)}
                                                        className="admin-button-secondary px-3 py-2 text-xs"
                                                    >
                                                        Mark converted
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {convertingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="admin-panel w-full max-w-md overflow-hidden rounded-2xl shadow-2xl">
                        <div className="border-b border-white/[0.06] bg-white/[0.03] px-6 py-5">
                            <p className="admin-kicker">Conversion record</p>
                            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">Mark lead as converted</h2>
                            <p className="mt-2 text-sm text-slate-500">Store the conversion value against the real lead record.</p>
                        </div>

                        <form onSubmit={handleConvert} className="space-y-5 p-6">
                            <div>
                                <label className="admin-kicker block">Conversion value (Rs)</label>
                                <input
                                    type="number"
                                    value={conversionValue}
                                    onChange={(event) => setConversionValue(event.target.value)}
                                    min="0"
                                    required
                                    className="admin-input mt-3 px-4 py-3 text-sm font-semibold"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setConvertingId(null)}
                                    className="admin-button-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="admin-button-primary flex-1"
                                >
                                    {actionLoading ? 'Saving...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
