'use client';

import React, { useState, useEffect } from 'react';

const ObservabilityContent = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/observability');
            const data = await res.json();
            if (data.success) {
                setMetrics(data.snapshot);
            }
        } catch (error) {
            console.error('Failed to fetch metrics', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, []);

    const MetricCard = ({ title, value, subtext, color = 'blue' }) => (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-2">{title}</h3>
            <div className={`text-4xl font-bold text-${color}-600 mb-2`}>{value}</div>
            <p className="text-xs text-slate-500">{subtext}</p>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 h-full p-6">
            <div className="admin-page-header flex justify-between items-center w-full">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Production Observability</h1>
                    <p className="text-slate-500 mt-1">Real-time metrics streaming from memory batches (flushed every 10 mins).</p>
                </div>
                <button
                    onClick={fetchMetrics}
                    disabled={loading}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition"
                >
                    {loading ? 'Refreshing...' : 'Refresh Snapshot'}
                </button>
            </div>

            {loading && !metrics ? (
                <div className="p-8 text-center text-slate-500 animate-pulse bg-white rounded-xl border border-slate-200">
                    Loading metrics snapshot...
                </div>
            ) : metrics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <MetricCard
                        title="Jobs Processed"
                        value={metrics.jobs_processed.toLocaleString()}
                        subtext="Total tasks completed successfully since last flush."
                        color="green"
                    />
                    <MetricCard
                        title="Jobs Failed"
                        value={metrics.jobs_failed.toLocaleString()}
                        subtext="Tasks resulting in worker exception."
                        color="red"
                    />
                    <MetricCard
                        title="Global Error Rate"
                        value={metrics.error_rate.toLocaleString()}
                        subtext="System errors caught and logged safely."
                        color="orange"
                    />
                    <MetricCard
                        title="Redis Latency"
                        value={`${metrics.redis_latency_ms}ms`}
                        subtext="Average ping time to QStash webhooks."
                    />
                    <MetricCard
                        title="Supabase DB Latency"
                        value={`${metrics.supabase_latency_ms}ms`}
                        subtext="Average cold query execution limits."
                    />
                    <MetricCard
                        title="Worker Uptime"
                        value={`${Math.floor(metrics.worker_uptime / 60)}m`}
                        subtext="Total continuous runtime of node process."
                    />
                </div>
            ) : (
                <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-200">
                    Unable to load observability data. System latency wrapper may be offline.
                </div>
            )}
        </div>
    );
};

export default ObservabilityContent;
