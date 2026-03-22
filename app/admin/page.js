'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/adminApi';
import MetricCard from '@/components/admin/ui/MetricCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';

export default function DashboardPage() {
    const router = useRouter();
    const [health, setHealth] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [queue, setQueue] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAll = async () => {
        try {
            const [hRes, mRes, qRes] = await Promise.all([
                adminApi.getSystemHealth(),
                adminApi.getBusinessMetrics(),
                adminApi.getQueueStatus()
            ]);
            if (hRes?.success) setHealth(hRes.data);
            if (mRes?.success) setMetrics(mRes.data);
            if (qRes?.success) setQueue(qRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    if (loading) {
        return (
            <div className="flex flex-col flex-1 h-[60vh] items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 font-medium text-sm">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-[22px] font-semibold text-zinc-900 tracking-tight">System Overview</h1>
                    <p className="text-zinc-500 mt-1 text-sm">Real-time metrics and operational intelligence.</p>
                </div>
            </div>

            {/* DASHBOARD MANDATORY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    title="Total Leads Today" 
                    value={metrics?.today_leads || 0} 
                    trend="up" 
                    trendLabel="vs Yesterday" 
                />
                <MetricCard 
                    title="Total Pages Generated" 
                    value={queue?.completed || 0} 
                    subtitle={`${queue?.processing || 0} currently processing`} 
                />
                <MetricCard 
                    title="Queue Pending" 
                    value={queue?.pending || 0} 
                    trend={queue?.pending > 100 ? "down" : null}
                    trendLabel={queue?.pending > 100 ? "High Backlog" : null}
                />
                <MetricCard 
                    title="CRM Status" 
                    value={health?.crm_status || 'Checking...'} 
                    trend={health?.crm_status === 'Operational' ? 'up' : 'down'}
                    trendLabel={health?.crm_status === 'Operational' ? 'Online' : 'Degraded'}
                />
            </div>

            {/* INFRASTRUCTURE SNAPSHOT */}
            <div className="bg-white p-6 rounded-xl border border-zinc-200">
                 <h2 className="font-semibold text-zinc-900 mb-6 tracking-tight text-sm uppercase">Service Health</h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="p-4 bg-[#fafafa] rounded-lg border border-zinc-200 flex justify-between items-center transition-colors hover:border-zinc-300">
                         <div>
                            <p className="text-sm font-medium text-zinc-800 mb-0.5">Zoho Pipeline</p>
                            <p className="text-xs text-zinc-500">Outbound data wrapper</p>
                         </div>
                         <StatusBadge status={health?.crm_status || 'Pending'} />
                     </div>
                     <div className="p-4 bg-[#fafafa] rounded-lg border border-zinc-200 flex justify-between items-center transition-colors hover:border-zinc-300">
                         <div>
                            <p className="text-sm font-medium text-zinc-800 mb-0.5">AI Generator</p>
                            <p className="text-xs text-zinc-500">Content chron engine</p>
                         </div>
                         <StatusBadge status={health?.ai_status || 'Pending'} />
                     </div>
                     <div className="p-4 bg-[#fafafa] rounded-lg border border-zinc-200 flex justify-between items-center transition-colors hover:border-zinc-300">
                         <div>
                            <p className="text-sm font-medium text-zinc-800 mb-0.5">Dropped Anomalies</p>
                            <p className="text-xs text-zinc-500">Failed ingestions</p>
                         </div>
                         <StatusBadge status={(health?.failed_leads_count || 0) > 0 ? 'Failed' : 'Operational'} />
                     </div>
                 </div>
            </div>
        </div>
    );
}