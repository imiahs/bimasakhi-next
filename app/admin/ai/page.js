'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '@/lib/adminApi';
import DataTable from '@/components/admin/ui/DataTable';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import MetricCard from '@/components/admin/ui/MetricCard';

export default function AIPanelPage() {
    const [queue, setQueue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const fetchQueue = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await adminApi.getQueueStatus();
            setQueue(res?.data || { pending: 0, processing: 0, completed: 0, failed: 0 });
        } catch (err) {
            console.error("Failed to load queue status", err);
            setError('Failed to load queue status.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 15000); 
        return () => clearInterval(interval);
    }, [fetchQueue]);

    const triggerGeneration = useCallback(async () => {
        if (!confirm('Manually trigger background SEO Generation queue?')) return;
        setActionLoading(true);
        try {
            const res = await fetch('/api/admin/queue', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Server error');
            setToast({ type: 'success', text: `Triggered successfully. ${data.data?.processed || data.processed || 0} items processed.` });
            fetchQueue();
        } catch (err) {
            setToast({ type: 'error', text: `Failed to trigger AI Engine: ${err.message}` });
        } finally {
            setActionLoading(false);
            setTimeout(() => setToast(null), 4000);
        }
    }, [fetchQueue]);

    // Transform aggregate metrics into table rows
    const queueData = useMemo(() => [
        { id: 'pending', phase: 'Execution Pending', status: 'Pending', count: queue?.pending ?? 0 },
        { id: 'processing', phase: 'Active Engine', status: 'Processing', count: queue?.processing ?? 0 },
        { id: 'completed', phase: 'Completed Delivery', status: 'Completed', count: queue?.completed ?? 0 },
        { id: 'failed', phase: 'Anomaly Detected', status: 'Failed', count: queue?.failed ?? 0 }
    ], [queue]);

    const columns = useMemo(() => [
        { key: 'phase', label: 'Queue Phase' },
        { 
            key: 'count', label: 'Item Count', 
            render: (row) => (
                <span className="font-semibold text-zinc-900 tracking-tight tabular-nums">
                    {row.count} items
                </span>
            )
        },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> }
    ], []);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center bg-white px-6 py-5 rounded-2xl border border-zinc-200 shadow-sm">
                <div>
                    <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">AI Control Panel</h1>
                    <p className="text-sm text-zinc-500 mt-1">Monitor SEO generation queues via QStash.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchQueue} 
                        disabled={loading} 
                        className="bg-white border border-zinc-200 text-sm font-medium text-zinc-600 px-4 py-2 rounded-md hover:bg-zinc-50 hover:text-zinc-900 transition-colors disabled:opacity-50"
                    >
                        ↻ Sync
                    </button>
                    <button 
                        onClick={triggerGeneration}
                        disabled={actionLoading}
                        className="bg-black border border-transparent text-sm font-medium text-white px-4 py-2 rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                        {actionLoading ? 'Generating...' : '⚡ Generate'}
                    </button>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`px-4 py-3 rounded-md text-sm font-medium transition-all ${
                    toast.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {toast.text}
                </div>
            )}

            {/* Quick Metrics Row */}
            {queue && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <MetricCard 
                        title="Pending" 
                        value={queue.pending ?? 0}
                        statusColor={queue.pending > 50 ? 'warning' : null}
                    />
                    <MetricCard 
                        title="Processing" 
                        value={queue.processing ?? 0}
                        statusColor="warning"
                    />
                    <MetricCard 
                        title="Completed" 
                        value={queue.completed ?? 0}
                        statusColor="success"
                    />
                    <MetricCard 
                        title="Failed" 
                        value={queue.failed ?? 0}
                        statusColor={queue.failed > 0 ? 'error' : null}
                    />
                    <MetricCard
                        title="Total"
                        value={queue.total ?? ((queue.pending ?? 0) + (queue.processing ?? 0) + (queue.completed ?? 0) + (queue.failed ?? 0))}
                    />
                </div>
            )}

            {/* Queue Table */}
            <DataTable 
                columns={columns} 
                data={queue ? queueData : []} 
                loading={loading}
                error={error}
                emptyMessage="Queue uninitialized."
            />
        </div>
    );
}
