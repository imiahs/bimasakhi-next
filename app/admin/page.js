'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';

export default function AdminDashboard() {
    const [metrics, setMetrics] = useState(null);
    const [health, setHealth] = useState(null);
    const [queue, setQueue] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [mRes, hRes, qRes] = await Promise.all([
                    fetch('/api/admin?action=business-metrics').then(r=>r.json()),
                    fetch('/api/admin?action=system-health').then(r=>r.json()),
                    fetch('/api/admin?action=queue-status').then(r=>r.json())
                ]);
                
                if (mRes.success) setMetrics(mRes.data);
                if (hRes.success) setHealth(hRes.data);
                if (qRes.success) setQueue(qRes.data);
            } catch (err) {
                console.error("Dashboard failed to load", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-slate-500">Loading metrics...</span>
            </div>
        );
    }

    if (!metrics || !health) {
        return <div className="p-8 text-red-500 font-medium">Failed to load dashboard data.</div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-slate-800">Business Control Center</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                    <h3 className="text-sm font-semibold text-slate-500 mb-1">Total Leads</h3>
                    <p className="text-3xl font-bold text-slate-800">{metrics.total_leads ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-2">+{metrics.today_leads ?? 0} today</p>
                </Card>
                <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                    <h3 className="text-sm font-semibold text-slate-500 mb-1">Conversions</h3>
                    <p className="text-3xl font-bold text-green-600">{metrics.converted_leads ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-2">+{metrics.today_conversions ?? 0} today ({metrics.conversion_rate})</p>
                </Card>
                <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                    <h3 className="text-sm font-semibold text-slate-500 mb-1">Revenue</h3>
                    <p className="text-3xl font-bold text-indigo-600">₹{metrics.estimated_revenue?.toLocaleString() ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-2">Estimated LTV Value</p>
                </Card>
                <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                    <h3 className="text-sm font-semibold text-slate-500 mb-1">Failed Leads (24H)</h3>
                    <p className="text-3xl font-bold text-red-600">{health.failed_leads_count ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-2">{health.retry_pending ?? 0} pending retry</p>
                </Card>
                <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                    <h3 className="text-sm font-semibold text-slate-500 mb-1">Queue Status</h3>
                    <p className="text-3xl font-bold text-orange-500">{queue?.pending ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-2">{queue?.processing ?? 0} active workers</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Top Performing Cities</h3>
                    {metrics.top_cities?.length > 0 ? (
                        <ul className="space-y-3">
                            {metrics.top_cities.map((city, i) => (
                                <li key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                    <span className="font-medium text-slate-700">{city.name}</span>
                                    <span className="bg-indigo-50 text-indigo-700 py-1 px-3 rounded-full text-xs font-bold">{city.value} leads</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-slate-500 text-sm">No city data available yet.</p>}
                </div>
                
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Top Sources</h3>
                    {metrics.top_sources?.length > 0 ? (
                        <ul className="space-y-3">
                            {metrics.top_sources.map((source, i) => (
                                <li key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                    <span className="font-medium text-slate-700">{source.name}</span>
                                    <span className="bg-emerald-50 text-emerald-700 py-1 px-3 rounded-full text-xs font-bold">{source.value} leads</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-slate-500 text-sm">No source data available yet.</p>}
                </div>
            </div>
        </div>
    );
}
