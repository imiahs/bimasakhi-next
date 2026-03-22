'use client';

import React, { useState, useEffect } from 'react';
import MetricCard from '@/components/admin/ui/MetricCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';

const SystemHealthContent = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin?action=system-health');
            const response = await res.json();
            if (response.success) {
                setStatus(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch system status', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">Infrastructure Telemetry</h1>
                    <p className="text-sm text-slate-500 mt-1">Real-time health monitoring of edge functions and CRM data transmission queues.</p>
                </div>
                <button
                    onClick={fetchStatus}
                    disabled={loading}
                    className="bg-slate-50 border text-sm font-semibold border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg hover:bg-slate-100 transition shadow-sm"
                >
                    {loading ? 'Pinging...' : '↻ Ping Services'}
                </button>
            </div>

            {loading && !status ? (
                <div className="flex flex-col flex-1 h-[40vh] items-center justify-center">
                    <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="mt-4 text-slate-500 font-medium text-sm">Validating Endpoints...</p>
                </div>
            ) : status && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard 
                            title="Total Jobs Validated" 
                            value={status?.total_leads_today ?? 0}
                            trend="up"
                        />
                         <MetricCard 
                            title="Processing Errors" 
                            value={status?.last_10_errors?.length ?? 0}
                            trend={status?.last_10_errors?.length > 0 ? "down" : null}
                            trendLabel="In Logs"
                        />
                        <MetricCard 
                            title="Failed Retries" 
                            value={status?.failed_leads_count ?? 0}
                            trend={status?.failed_leads_count > 0 ? "down" : null}
                            trendLabel="Review Required"
                        />
                         <MetricCard 
                            title="Pending Recovery" 
                            value={status?.retry_pending ?? 0}
                            subtitle="Safe queued requests"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-800">Zoho CRM Sync</h3>
                                    <p className="text-sm text-slate-500 mt-1">Outbound data piping API.</p>
                                </div>
                                <StatusBadge status={status?.crm_status || 'Unknown'} />
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                                <span className="text-slate-500">Last Synced</span>
                                <span className="font-semibold text-slate-700">Just Now</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-800">AI Background Jobs</h3>
                                    <p className="text-sm text-slate-500 mt-1">Text and meta generation workers.</p>
                                </div>
                                <StatusBadge status={status?.ai_status || 'Unknown'} />
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                                <span className="text-slate-500">Last Execution</span>
                                <span className="font-semibold text-slate-700">Recent</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SystemHealthContent;
