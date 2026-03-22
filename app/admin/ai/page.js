'use client';
import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';
import DataTable from '@/components/admin/ui/DataTable';
import StatusBadge from '@/components/admin/ui/StatusBadge';

export default function AIPanelPage() {
    const [queue, setQueue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const fetchQueue = async () => {
        try {
            setLoading(true);
            const res = await adminApi.getQueueStatus();
            setQueue(res?.data || { pending: 0, processing: 0, completed: 0, failed: 0 });
        } catch (err) {
            console.error("Failed to load queue status", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 15000); 
        return () => clearInterval(interval);
    }, []);

    const triggerGeneration = async () => {
        if (!confirm('Manually trigger background SEO Generation queue?')) return;
        setActionLoading(true);
        try {
            const res = await fetch('/api/jobs/pagegen', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Server error');
            setToast({ type: 'success', text: `Triggered successfully. ${data.processed || 0} items processed.` });
            fetchQueue();
        } catch (err) {
            setToast({ type: 'error', text: `Failed to trigger AI Engine: ${err.message}` });
        } finally {
            setActionLoading(false);
            setTimeout(() => setToast(null), 4000);
        }
    };

    // Transforming aggregate metrics into table data to respect "NO existing API modification" rule 
    const queueData = [
        { phase: 'Execution Pending', status: 'Pending', count: queue?.pending ?? 0 },
        { phase: 'Active Engine', status: 'Processing', count: queue?.processing ?? 0 },
        { phase: 'Completed Delivery', status: 'Completed', count: queue?.completed ?? 0 },
        { phase: 'Anomaly Detected', status: 'Failed', count: queue?.failed ?? 0 }
    ];

    const columns = [
        { key: 'phase', label: 'Queue Phase' },
        { key: 'count', label: 'Item Count', render: (row) => <span className="font-semibold text-slate-800">{row.count} items</span> },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">AI Control Panel</h1>
                    <p className="text-sm text-slate-500 mt-1">Monitor SEO generation queues natively via QStash.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchQueue} disabled={loading} className="bg-slate-50 border text-sm font-semibold border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-slate-100 transition shadow-sm">
                        ↻ Sync Status
                    </button>
                    <button 
                        onClick={triggerGeneration}
                        disabled={actionLoading}
                        className="bg-blue-600 border border-transparent text-sm font-semibold text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                    >
                        {actionLoading ? 'Generating...' : '⚡ Generate Payload'}
                    </button>
                </div>
            </div>

            {toast && (
                <div className={`p-4 rounded-lg font-medium shadow-sm transition-all ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {toast.text}
                </div>
            )}

            <div className="pt-2">
                <DataTable 
                    columns={columns} 
                    data={queue ? queueData : []} 
                    loading={loading} 
                    emptyMessage="Queue uninitialized."
                />
            </div>
        </div>
    );
}
