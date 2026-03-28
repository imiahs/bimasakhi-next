'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
            const response = await adminApi.getQueueStatus();
            setQueue(response?.data || { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 });
        } catch (err) {
            console.error('Failed to load queue status', err);
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
        if (!confirm('Manually trigger the background generation worker now?')) return;
        setActionLoading(true);
        try {
            const response = await fetch('/api/admin/queue', { method: 'POST' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Server error');
            setToast({ type: 'success', text: data.data?.message || 'Worker trigger accepted.' });
            fetchQueue();
        } catch (err) {
            setToast({ type: 'error', text: `Failed to trigger queue worker: ${err.message}` });
        } finally {
            setActionLoading(false);
            setTimeout(() => setToast(null), 4000);
        }
    }, [fetchQueue]);

    const queueData = useMemo(() => [
        { id: 'pending', phase: 'Execution Pending', status: 'Pending', count: queue?.pending ?? 0 },
        { id: 'processing', phase: 'Active Engine', status: 'Processing', count: queue?.processing ?? 0 },
        { id: 'completed', phase: 'Completed Delivery', status: 'Completed', count: queue?.completed ?? 0 },
        { id: 'failed', phase: 'Anomaly Detected', status: 'Failed', count: queue?.failed ?? 0 }
    ], [queue]);

    const columns = useMemo(() => [
        { key: 'phase', label: 'Queue phase' },
        {
            key: 'count',
            label: 'Item count',
            render: (row) => (
                <span className="font-semibold tabular-nums text-zinc-900">
                    {row.count} items
                </span>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => <StatusBadge status={row.status} />
        }
    ], []);

    return (
        <div className="space-y-8">
            <section className="admin-panel admin-glow-ring overflow-hidden rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="admin-kicker">Queue control</p>
                        <h1 className="admin-heading-xl mt-4 max-w-3xl text-zinc-950">Monitor generation workload and manually dispatch the worker.</h1>
                        <p className="admin-copy mt-5 max-w-2xl text-base">
                            This panel reflects the real generation queue backing page creation. Use it to watch backlog, live execution, and failures before enabling wider automation.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button onClick={fetchQueue} disabled={loading} className="admin-button-secondary">
                            {loading ? 'Syncing...' : 'Refresh queue'}
                        </button>
                        <button onClick={triggerGeneration} disabled={actionLoading} className="admin-button-primary">
                            {actionLoading ? 'Triggering...' : 'Run PageGen'}
                        </button>
                    </div>
                </div>
            </section>

            {toast && (
                <div className={`rounded-[1.5rem] px-4 py-3 text-sm font-medium shadow-sm ${toast.type === 'success' ? 'admin-toast-success' : 'admin-toast-error'}`}>
                    {toast.text}
                </div>
            )}

            {queue && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
                    <MetricCard title="Pending" value={queue.pending ?? 0} icon="PD" statusColor={queue.pending > 0 ? 'warning' : null} />
                    <MetricCard title="Processing" value={queue.processing ?? 0} icon="PR" statusColor="warning" />
                    <MetricCard title="Completed" value={queue.completed ?? 0} icon="OK" statusColor="success" />
                    <MetricCard title="Failed" value={queue.failed ?? 0} icon="FL" statusColor={queue.failed > 0 ? 'error' : null} />
                    <MetricCard title="Total" value={queue.total ?? 0} icon="TL" />
                </div>
            )}

            <DataTable
                columns={columns}
                data={queue ? queueData : []}
                loading={loading}
                error={error}
                emptyMessage="Queue is currently empty."
            />
        </div>
    );
}
