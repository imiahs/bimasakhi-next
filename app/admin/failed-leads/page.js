'use client';
import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';

export default function FailedLeadsPage() {
    const [failedLeads, setFailedLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);

    const fetchFailed = async () => {
        setLoading(true);
        try {
            const response = await adminApi.getFailedLeads();
            setFailedLeads(response.failed_leads || response.data?.failed_leads || []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFailed();
    }, []);

    const handleRetry = async () => {
        if (!confirm('Retry all failed leads now?')) return;
        setActionLoading(true);
        try {
            const response = await adminApi.retryFailed();
            const recovered = response.successCount || response.data?.successCount || 0;
            setToast({ type: 'success', text: `Retry completed. ${recovered} leads recovered.` });
            fetchFailed();
        } catch (err) {
            setToast({ type: 'error', text: `Retry failed: ${err.message}` });
        } finally {
            setActionLoading(false);
            setTimeout(() => setToast(null), 4000);
        }
    };

    const handleClear = async () => {
        if (!confirm('Permanently clear the failure buffer?')) return;
        setActionLoading(true);
        try {
            const response = await adminApi.clearFailed();
            setToast({ type: 'success', text: `Cleared ${response.deleted || 0} failed lead records.` });
            fetchFailed();
        } catch (err) {
            setToast({ type: 'error', text: `Clear failed: ${err.message}` });
        } finally {
            setActionLoading(false);
            setTimeout(() => setToast(null), 4000);
        }
    };

    return (
        <div className="space-y-8">
            <section className="admin-panel admin-glow-ring overflow-hidden rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="admin-kicker">Recovery lane</p>
                        <h1 className="admin-heading-xl mt-4 max-w-3xl text-zinc-950">Inspect failed CRM records and recover them from one screen.</h1>
                        <p className="admin-copy mt-5 max-w-2xl text-base">
                            This buffer is your zero-lead-loss layer. Review payload failures, retry synchronization, or clear noise after confirmation.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button onClick={fetchFailed} disabled={loading || actionLoading} className="admin-button-secondary">
                            Refresh buffer
                        </button>
                        <button onClick={handleRetry} disabled={loading || actionLoading} className="admin-button-primary">
                            Retry pending
                        </button>
                        <button onClick={handleClear} disabled={loading || actionLoading} className="admin-button-danger">
                            Clear buffer
                        </button>
                    </div>
                </div>
            </section>

            {toast && (
                <div className={`rounded-[1.5rem] px-4 py-3 text-sm font-medium shadow-sm ${toast.type === 'success' ? 'admin-toast-success' : 'admin-toast-error'}`}>
                    {toast.text}
                </div>
            )}

            <section className="admin-panel overflow-hidden rounded-[2rem]">
                {loading ? (
                    <div className="flex flex-col items-center px-6 py-14 text-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/70 border-t-teal-700" />
                        <p className="admin-kicker mt-6">Recovery sync</p>
                        <p className="mt-3 text-sm text-zinc-500">Scanning failed lead buffer...</p>
                    </div>
                ) : error ? (
                    <div className="px-6 py-10 text-center text-sm font-medium text-rose-600">
                        Failed to load payload buffer: {error}
                    </div>
                ) : failedLeads.length === 0 ? (
                    <div className="px-6 py-14 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">
                            OK
                        </div>
                        <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-zinc-900">Recovery buffer is clean.</h3>
                        <p className="mt-2 text-sm text-zinc-500">No failed leads are waiting for manual recovery.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap text-left text-sm">
                            <thead className="border-b border-[rgba(77,61,40,0.08)] bg-[rgba(255,255,255,0.72)] text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Lead</th>
                                    <th className="px-6 py-4 font-semibold">Mobile</th>
                                    <th className="px-6 py-4 font-semibold">Error</th>
                                    <th className="px-6 py-4 font-semibold text-right">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgba(77,61,40,0.06)]">
                                {failedLeads.map((lead, index) => {
                                    let identity = 'Unknown';
                                    let mobile = 'N/A';

                                    try {
                                        if (lead.payload) {
                                            const payload = typeof lead.payload === 'string' ? JSON.parse(lead.payload) : lead.payload;
                                            identity = payload.name || payload.Last_Name || 'Unknown';
                                            mobile = payload.mobile || payload.Mobile || 'N/A';
                                        }
                                    } catch {
                                        identity = 'Payload unreadable';
                                    }

                                    return (
                                        <tr key={`${lead.id || index}`} className="transition hover:bg-[rgba(255,255,255,0.52)]">
                                            <td className="px-6 py-4 font-semibold text-zinc-900">{identity}</td>
                                            <td className="px-6 py-4 text-zinc-600">{mobile}</td>
                                            <td className="px-6 py-4">
                                                <div className="inline-block max-w-md rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                                                    {lead.error_message || lead.error || 'Unspecified runtime exception'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-zinc-500">
                                                {new Date(lead.created_at).toLocaleString()}
                                                <br />
                                                <span className="mt-1 inline-block text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">
                                                    Retry count: {lead.retry_count || 0}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
