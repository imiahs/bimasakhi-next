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
            const res = await adminApi.getLeads();
            setLeads(res.leads || []);
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

    const sourceOptions = useMemo(() => {
        return ['All', ...Array.from(new Set(leads.map((lead) => lead.Lead_Source || lead.source || 'Website')))];
    }, [leads]);

    const statusOptions = useMemo(() => {
        return ['All', ...Array.from(new Set(leads.map((lead) => {
            if (lead.is_converted) return 'Converted';
            return lead.status || lead.Lead_Status || 'new';
        })))];
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

            if (sortBy === 'newest') {
                return new Date(right.created_at || right.Created_Time || 0).getTime() - new Date(left.created_at || left.Created_Time || 0).getTime();
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
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-zinc-200 border-t-black" />
                <p className="mt-4 text-sm font-medium text-zinc-500">Loading live CRM leads...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Leads Panel</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">CRM Pipeline</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
                        Real lead records, score visibility, Zoho sync state, and conversion tracking in one operator view.
                    </p>
                </div>

                <button
                    onClick={fetchLeads}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
                >
                    Refresh Leads
                </button>
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
                <MetricCard title="Total Leads" value={summary.total} subtitle="Visible in the CRM workbench" statusColor="success" />
                <MetricCard title="Hot Leads" value={summary.hot} subtitle="Lead score 80 or higher" statusColor={summary.hot > 0 ? 'warning' : null} />
                <MetricCard title="Zoho Synced" value={summary.zohoSynced} subtitle="Records with CRM sync ids" />
                <MetricCard title="Converted" value={summary.converted} subtitle="Closed or revenue-attributed leads" />
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                {error ? (
                    <div className="px-6 py-10 text-center text-sm font-medium text-rose-600">
                        Failed to load leads: {error}
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="px-6 py-14 text-center text-sm text-zinc-500">
                        No leads match the current filters.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50 text-xs uppercase tracking-[0.18em] text-zinc-500">
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
                            <tbody className="divide-y divide-zinc-100">
                                {filteredLeads.map((lead) => {
                                    const name = lead.Last_Name || lead.name || 'Unknown';
                                    const city = lead.City || lead.city || 'Unknown';
                                    const source = lead.Lead_Source || lead.source || 'Website';
                                    const score = Number(lead.lead_score || lead.score || 0);
                                    const zohoState = lead.synced_to_zoho || lead.zoho_lead_id ? 'Synced' : 'Local';
                                    const status = lead.is_converted ? 'Converted' : (lead.status || lead.Lead_Status || 'new');

                                    return (
                                        <tr key={lead.id} className={`transition hover:bg-zinc-50/80 ${lead.is_converted ? 'opacity-70' : ''}`}>
                                            <td className="px-5 py-4">
                                                <div>
                                                    <p className="font-medium text-zinc-950">{name}</p>
                                                    <p className="mt-1 text-xs text-zinc-500">{lead.Mobile || lead.mobile || 'N/A'}</p>
                                                    {lead.email && <p className="mt-1 text-xs text-zinc-400">{lead.email}</p>}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-zinc-600">{city}</td>
                                            <td className="px-5 py-4 text-zinc-600">{source}</td>
                                            <td className="px-5 py-4">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                    score >= 80
                                                        ? 'bg-rose-100 text-rose-700'
                                                        : score >= 50
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-zinc-100 text-zinc-700'
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
                                                        Converted {lead.conversion_value ? `(₹${Number(lead.conversion_value).toLocaleString()})` : ''}
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => setConvertingId(lead.id)}
                                                        className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
                                                    >
                                                        Mark Converted
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
            </div>

            {convertingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
                        <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-5">
                            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Mark Lead as Converted</h2>
                            <p className="mt-1 text-sm text-zinc-500">Store the conversion value against the real lead record.</p>
                        </div>

                        <form onSubmit={handleConvert} className="space-y-5 p-6">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-zinc-800">Conversion Value (₹)</label>
                                <input
                                    type="number"
                                    value={conversionValue}
                                    onChange={(event) => setConversionValue(event.target.value)}
                                    min="0"
                                    required
                                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setConvertingId(null)}
                                    className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
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
