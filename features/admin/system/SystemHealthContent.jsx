'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MetricCard from '@/components/admin/ui/MetricCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';

const SystemHealthContent = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin?action=system-health');
            const response = await res.json();
            if (response.success) {
                setStatus(response.data);
            } else {
                setError('Failed to load system health data.');
            }
        } catch (err) {
            console.error('Failed to fetch system status', err);
            setError('Network error. Cannot reach health endpoint.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 60000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center bg-white px-6 py-5 rounded-xl border border-zinc-200">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Infrastructure Telemetry</h1>
                    <p className="text-sm text-zinc-500 mt-1">Real-time health monitoring of services and data queues.</p>
                </div>
                <button
                    onClick={fetchStatus}
                    disabled={loading}
                    className="bg-white border text-sm font-medium border-zinc-200 text-zinc-600 px-4 py-2 rounded-md hover:bg-zinc-50 hover:text-zinc-900 transition-colors disabled:opacity-50"
                >
                    {loading ? 'Pinging...' : '↻ Ping Services'}
                </button>
            </div>

            {/* Loading State */}
            {loading && !status ? (
                <div className="flex flex-col flex-1 h-[40vh] items-center justify-center">
                    <div className="w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full animate-spin" />
                    <p className="mt-4 text-zinc-500 font-medium text-sm">Validating Endpoints...</p>
                </div>
            ) : error && !status ? (
                /* Error State */
                <div className="flex flex-col flex-1 h-[40vh] items-center justify-center gap-4">
                    <span className="text-red-500 text-3xl">⚠</span>
                    <p className="text-red-600 font-medium text-sm">{error}</p>
                    <button 
                        onClick={fetchStatus}
                        className="px-4 py-2 text-sm font-medium bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            ) : status && (
                <>
                    {/* Metric Cards Grid — 4 columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard 
                            title="Total Jobs Validated" 
                            value={status?.total_leads_today ?? 0}
                            trend="up"
                            icon="📊"
                            statusColor="success"
                        />
                        <MetricCard 
                            title="Processing Errors" 
                            value={status?.last_10_errors?.length ?? 0}
                            trend={status?.last_10_errors?.length > 0 ? "down" : null}
                            trendLabel="In Logs"
                            icon="🐛"
                            statusColor={status?.last_10_errors?.length > 0 ? 'error' : null}
                        />
                        <MetricCard 
                            title="Failed Retries" 
                            value={status?.failed_leads_count ?? 0}
                            trend={status?.failed_leads_count > 0 ? "down" : null}
                            trendLabel="Review Required"
                            icon="🔄"
                            statusColor={status?.failed_leads_count > 0 ? 'warning' : null}
                        />
                        <MetricCard 
                            title="Pending Recovery" 
                            value={status?.retry_pending ?? 0}
                            subtitle="Safe queued requests"
                            icon="🛡️"
                        />
                    </div>

                    {/* Service Status Cards — 2 columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-zinc-200 flex flex-col justify-between hover:border-zinc-300 transition-colors">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="font-semibold text-zinc-900 tracking-tight">Zoho CRM Sync</h3>
                                    <p className="text-sm text-zinc-500 mt-1">Outbound data piping API.</p>
                                </div>
                                <StatusBadge status={status?.crm_status || 'Unknown'} />
                            </div>
                            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Last Synced</span>
                                <span className="font-medium text-zinc-900">Just Now</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-zinc-200 flex flex-col justify-between hover:border-zinc-300 transition-colors">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="font-semibold text-zinc-900 tracking-tight">AI Background Jobs</h3>
                                    <p className="text-sm text-zinc-500 mt-1">Text and meta generation workers.</p>
                                </div>
                                <StatusBadge status={status?.ai_status || 'Unknown'} />
                            </div>
                            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Last Execution</span>
                                <span className="font-medium text-zinc-900">Recent</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SystemHealthContent;
