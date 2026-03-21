'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';

export default function AdminFailedLeads() {
    const [failedLeads, setFailedLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(null);
    const [toast, setToast] = useState('');

    useEffect(() => {
        const fetchFailed = async () => {
            try {
                const res = await fetch('/api/admin?action=get-failed').then(r => r.json());
                if (res.success) setFailedLeads(res.data.failed_leads || []);
            } catch (err) {
                console.error("Failed Leads fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFailed();
    }, []);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 4000);
    };

    const handleRetry = async (id) => {
        if (!confirm("Execute manual forced retry? Resolves directly against Zoho APIs.")) return;

        setRetrying(id);
        try {
            const res = await fetch('/api/admin?action=retry-failed', { method: 'POST' }).then(r=>r.json());
            if (res.success) {
                showToast(`Retry job queued dynamically. Workers are processing anomalistic payloads.`);
                setFailedLeads(failedLeads.filter(l => l.id !== id));
            } else {
                showToast(res.error || 'Retry job rejected natively by runtime bindings.');
            }
        } catch (e) {
            showToast("Critical server interruption handling retries.");
        } finally {
            setRetrying(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-slate-500">Loading anomalies...</span>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 relative">
            {toast && (
                <div className="absolute top-0 right-8 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg font-medium text-sm transition-all animate-bounce z-50">
                    {toast}
                </div>
            )}
            
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <h1 className="text-3xl font-bold text-slate-800">Failed Leads Inspector</h1>
                <span className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                    {failedLeads.length} Actionable Anomalies Detected
                </span>
            </div>
            
            {failedLeads.length === 0 ? (
                <div className="bg-white border text-center border-slate-200 rounded-2xl shadow-sm p-16">
                    <span className="text-5xl border p-4 rounded-full bg-slate-50 border-slate-100 shadow-sm inline-block">🚀</span>
                    <h2 className="mt-6 text-xl font-bold text-slate-700">All Systems Operational</h2>
                    <p className="text-slate-500 mt-2">No failed leads are currently tracking within the telemetry log.</p>
                </div>
            ) : (
                <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Mobile</th>
                                    <th className="px-6 py-4">City</th>
                                    <th className="px-6 py-4">Error Diagnostics</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {failedLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-800">{lead.payload?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4">{lead.payload?.mobile || 'N/A'}</td>
                                        <td className="px-6 py-4">{lead.payload?.city || lead.payload?.metadata?.city || 'Unknown'}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-mono break-all inline-block max-w-xs overflow-hidden text-ellipsis whitespace-nowrap" title={lead.error_message}>
                                                {lead.error_message || 'Unspecified runtime exception'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {lead.retry_count >= 3 ? (
                                                <span className="text-xs bg-slate-100 text-slate-500 font-bold px-3 py-1 rounded">Dead</span>
                                            ) : (
                                                <button 
                                                    onClick={() => handleRetry(lead.id)}
                                                    disabled={retrying !== null}
                                                    className={`px-4 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-colors ${retrying === lead.id ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                                >
                                                    {retrying === lead.id ? 'Pushing...' : 'Force Retry'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}
