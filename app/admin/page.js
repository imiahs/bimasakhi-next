'use client';
import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';
import Link from 'next/link';

export default function DashboardPage() {
    const [health, setHealth] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [queue, setQueue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [hRes, mRes, qRes] = await Promise.all([
                    adminApi.getSystemHealth(),
                    adminApi.getBusinessMetrics(),
                    adminApi.getQueueStatus()
                ]);
                if (hRes.success) setHealth(hRes.data);
                if (mRes.success) setMetrics(mRes.data);
                if (qRes.success) setQueue(qRes.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            Loading global metrics...
        </div>
    );

    if (error) return <div className="p-6 bg-red-50 text-red-600 border border-red-200 rounded-xl">Failed to load Dashboard: {error}</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ROW 1: PRIMARY METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                    <h3 className="text-slate-500 font-medium text-sm">Leads Today</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <p className="text-3xl font-black text-slate-800">{metrics?.today_leads || 0}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total: {metrics?.total_leads || 0}</p>
                    </div>
                </div>

                <div className="bg-white border border-emerald-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                    <h3 className="text-emerald-700 font-medium text-sm">Conversions Today</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <p className="text-3xl font-black text-emerald-600">{metrics?.today_conversions || 0}</p>
                        <p className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">{metrics?.conversion_rate || '0%'}</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 shadow-md flex flex-col justify-between text-white transform hover:-translate-y-1 transition duration-300">
                    <h3 className="text-indigo-100 font-medium text-sm">Est. Pipeline Revenue</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <p className="text-3xl font-black">₹{(metrics?.estimated_revenue || 0).toLocaleString()}</p>
                    </div>
                </div>

                <div className={`bg-white border ${health?.failed_leads_count > 0 ? 'border-rose-300' : 'border-slate-200'} rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition`}>
                    <h3 className={`${health?.failed_leads_count > 0 ? 'text-rose-600' : 'text-slate-500'} font-medium text-sm`}>Failed Drops (24H)</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <p className={`text-3xl font-black ${health?.failed_leads_count > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{health?.failed_leads_count || 0}</p>
                        <p className="text-xs font-medium text-slate-400">{health?.retry_pending || 0} Retrying...</p>
                    </div>
                </div>
            </div>

            {/* ROW 2: SYSTEM STATUS */}
            <h2 className="text-xl font-bold text-slate-700 pb-2 border-b border-slate-200">Infrastructure Health</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-xl">🧠</div>
                    <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">AI Engine</p>
                        <p className="text-lg font-bold text-emerald-600">{health?.ai_status || 'Operational'}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-xl">⚙️</div>
                    <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Zoho Sync</p>
                        <p className={`text-lg font-bold ${health?.crm_status === 'Operational' ? 'text-emerald-600' : 'text-orange-500'}`}>{health?.crm_status || 'Operational'}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-xl">⏳</div>
                    <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Active Queue</p>
                        <p className="text-lg font-bold text-indigo-600">{queue?.pending || 0} pending / {queue?.processing || 0} active</p>
                    </div>
                </div>
            </div>

            {/* ROW 3: FAULTS & ACTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Recent CRM Errors</h3>
                        <Link href="/admin/failed-leads" className="text-sm font-bold text-indigo-600 hover:underline">View All</Link>
                    </div>
                    <div className="p-0">
                        {health?.last_10_errors?.length > 0 ? (
                            <table className="w-full text-left text-sm">
                                <tbody>
                                    {health.last_10_errors.slice(0, 5).map((err, i) => (
                                        <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                            <td className="py-3 px-6 text-slate-600 font-medium truncate max-w-[200px]">{err.message}</td>
                                            <td className="py-3 px-6 text-slate-400 text-right">{new Date(err.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-slate-400">No recent errors detected. Stable pipeline.</div>
                        )}
                    </div>
                </div>

                <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 p-6 flex flex-col gap-4">
                    <h3 className="font-bold text-white mb-2">Quick Actions</h3>
                    
                    <Link href="/admin/failed-leads" className="group flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition cursor-pointer">
                        <div>
                            <p className="text-white font-medium">Retry Failed Drops</p>
                            <p className="text-slate-400 text-xs mt-1">Force synchronize stuck webhooks</p>
                        </div>
                        <span className="text-slate-300 group-hover:translate-x-1 transition">→</span>
                    </Link>
                    
                    <Link href="/admin/crm" className="group flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition cursor-pointer">
                        <div>
                            <p className="text-white font-medium">View CRM Pipeline</p>
                            <p className="text-slate-400 text-xs mt-1">Manage leads and mark conversions</p>
                        </div>
                        <span className="text-slate-300 group-hover:translate-x-1 transition">→</span>
                    </Link>
                    
                    <Link href="/admin/logs" className="group flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition cursor-pointer">
                        <div>
                            <p className="text-white font-medium">System Diagnostics</p>
                            <p className="text-slate-400 text-xs mt-1">View realtime API traces</p>
                        </div>
                        <span className="text-slate-300 group-hover:translate-x-1 transition">→</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
