'use client';
import React, { useState, useEffect } from 'react';
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
            const res = await adminApi.getFailedLeads();
            setFailedLeads(res.failed_leads || res.data?.failed_leads || []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFailed(); }, []);

    const handleRetry = async () => {
        if (!confirm('Are you sure you want to force synchronize all failed leads?')) return;
        setActionLoading(true);
        try {
            const res = await adminApi.retryFailed();
            const recovered = res.successCount || res.data?.successCount || 0;
            setToast({ type: 'success', text: `Retried successfully. ${recovered} recovered.` });
            fetchFailed();
        } catch (err) {
            setToast({ type: 'error', text: `Retry failed: ${err.message}` });
        } finally {
            setActionLoading(false);
            setTimeout(() => setToast(null), 4000);
        }
    };

    const handleClear = async () => {
        if (!confirm('DANGER: This permanently deletes the failure logs. Proceed?')) return;
        setActionLoading(true);
        try {
            const res = await adminApi.clearFailed();
            setToast({ type: 'success', text: `Cleared ${res.deleted || 0} failed lead records.` });
            fetchFailed();
        } catch (err) {
            setToast({ type: 'error', text: `Clear failed: ${err.message}` });
        } finally {
            setActionLoading(false);
            setTimeout(() => setToast(null), 4000);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Failed Lead Recovery</h1>
                    <p className="text-sm text-slate-500 mt-1">Inspect real CRM failures, retry them safely, or clear the recovery buffer.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button onClick={fetchFailed} disabled={loading || actionLoading} className="bg-white border text-sm font-bold border-slate-200 text-slate-600 px-4 py-2 flex items-center gap-2 rounded-lg hover:bg-slate-50 transition shadow-sm disabled:opacity-50">
                        ↻ Refresh
                    </button>
                    <button onClick={handleRetry} disabled={loading || actionLoading} className="bg-indigo-600 text-sm font-bold border border-transparent text-white px-4 py-2 flex items-center gap-2 rounded-lg hover:bg-indigo-700 transition shadow-sm disabled:opacity-50">
                        ⚡ Retry All Pending
                    </button>
                    <button onClick={handleClear} disabled={loading || actionLoading} className="bg-rose-50 text-sm font-bold text-rose-600 px-4 py-2 border border-rose-200 rounded-lg flex items-center gap-2 hover:bg-rose-100 transition shadow-sm disabled:opacity-50">
                        🗑️ Clear Memory
                    </button>
                </div>
            </div>

            {toast && (
                <div className={`p-4 rounded-lg font-medium shadow-sm transition-all ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {toast.text}
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-3"></div>
                        Scanning database memory constraints...
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-rose-600 font-medium">Failed to load payload buffer: {error}</div>
                ) : failedLeads.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-3xl mb-4">✓</div>
                        <h3 className="text-lg font-bold text-slate-700">No Failed Leads</h3>
                        <p className="text-slate-400 mt-1">The recovery buffer is currently empty.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Target</th>
                                    <th className="px-6 py-4 font-bold">Mobile</th>
                                    <th className="px-6 py-4 font-bold">Diagnostics Error Trace</th>
                                    <th className="px-6 py-4 font-bold text-right">Failure Incident Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {failedLeads.map((lead, idx) => {
                                    let identity = 'Unknown';
                                    let mobile = 'N/A';
                                    try {
                                        if (lead.payload) {
                                            const p = typeof lead.payload === 'string' ? JSON.parse(lead.payload) : lead.payload;
                                            identity = p.name || p.Last_Name || 'Unknown';
                                            mobile = p.mobile || p.Mobile || 'N/A';
                                        }
                                    } catch(e) {}
                                    return (
                                        <tr key={idx} className="hover:bg-rose-50/30 transition">
                                            <td className="px-6 py-4 font-medium text-slate-800">{identity}</td>
                                            <td className="px-6 py-4 text-slate-600">{mobile}</td>
                                            <td className="px-6 py-4">
                                                <div className="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-md font-mono text-xs inline-block max-w-sm truncate border border-rose-100">
                                                    {lead.error_message || 'Unspecified runtime exception'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-500">
                                                {new Date(lead.created_at).toLocaleString()}
                                                <br />
                                                <span className="text-xs font-bold text-orange-400">Retry Count: {lead.retry_count || 0}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
