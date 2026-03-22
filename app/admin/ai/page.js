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
        { key: 'count', label: 'Item Count', render: (row) => <span className="font-semibold text-zinc-900 tracking-tight">{row.count} items</span> },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center bg-white px-6 py-5 rounded-xl border border-zinc-200">
                <div>
                    <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">AI Control Panel</h1>
                    <p className="text-sm text-zinc-500 mt-1">Monitor SEO generation queues natively via QStash.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchQueue} disabled={loading} className="bg-white border border-zinc-200 text-sm font-medium text-zinc-600 px-4 py-2 rounded-md hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
                        ↻ Sync Status
                    </button>
                    <button 
                        onClick={triggerGeneration}
                        disabled={actionLoading}
                        className="bg-black border border-transparent text-sm font-medium text-white px-4 py-2 rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                        {actionLoading ? 'Generating...' : '⚡ Generate Payload'}
                    </button>
                </div>
            </div>

            {toast && (
                <div className={`px-4 py-3 rounded-md text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
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
