'use client';
import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const router = useRouter();
    const [health, setHealth] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [queue, setQueue] = useState(null);
    
    // BI State
    const [alerts, setAlerts] = useState([]);
    const [actionQueue, setActionQueue] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState(null);
    const [error, setError] = useState(null);

    const fetchAll = async () => {
        try {
            const [hRes, mRes, qRes, alertRes, aqRes, recRes] = await Promise.all([
                adminApi.getSystemHealth(),
                adminApi.getBusinessMetrics(),
                adminApi.getQueueStatus(),
                adminApi.getAlerts(),
                adminApi.getActionQueue(),
                adminApi.getRecommendations()
            ]);
            if (hRes.success) setHealth(hRes.data);
            if (mRes.success) setMetrics(mRes.data);
            if (qRes.success) setQueue(qRes.data);
            if (alertRes.success) setAlerts(alertRes.data);
            if (aqRes.success) setActionQueue(aqRes.data);
            if (recRes.success) setRecommendations(recRes.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const executeAction = async (actionId, actionType) => {
        setActioning(actionId);
        try {
            if (actionType === 'retry_failed_leads') {
                await adminApi.retryFailed();
                await fetchAll(); // Refresh metrics seamlessly
            } else if (actionType === 'view_crm') {
                router.push('/admin/crm');
            } else if (actionType === 'check_logs') {
                router.push('/admin/logs');
            }
        } catch (e) {
            alert(`Execution failed: ${e.message}`);
        } finally {
            setActioning(null);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            Computing Business Intelligence Vectors...
        </div>
    );

    if (error) return <div className="p-6 bg-red-50 text-red-600 border border-red-200 rounded-xl">Failed to load Dashboard: {error}</div>;

    const criticals = alerts.filter(a => a.severity === 'critical');
    const warnings = alerts.filter(a => a.severity === 'warning');

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* ROW 0: INTELLIGENCE & DECISION SYSTEM */}
            <h2 className="text-xl font-bold text-slate-800 pb-2 border-b border-slate-200 flex items-center gap-2">
                <span>🧠</span> Autonomous Action Center
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. CRITICAL ACTIONS */}
                <div className="bg-rose-50 border border-rose-200 rounded-xl shadow-sm flex flex-col p-5">
                    <h3 className="font-bold text-rose-800 border-b border-rose-200 pb-2 mb-3 flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </span>
                        Critical Priorities
                    </h3>
                    <div className="space-y-3 flex-1">
                        {criticals.length > 0 ? criticals.map((alert, i) => (
                            <div key={i} className="bg-white rounded-lg p-3 shadow-sm border border-rose-100 flex flex-col justify-between h-full">
                                <p className="text-sm text-slate-700 font-medium mb-3">{alert.message}</p>
                                {alert.action_required && (
                                    <button 
                                        onClick={() => executeAction(alert.id, alert.suggested_action)}
                                        disabled={actioning === alert.id}
                                        className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded transition-colors"
                                    >
                                        {actioning === alert.id ? 'Executing...' : 'Fix Now ⚡'}
                                    </button>
                                )}
                            </div>
                        )) : (
                            <div className="h-full flex items-center justify-center p-4 text-emerald-600 font-medium bg-emerald-50 rounded-lg border border-emerald-100 text-sm">
                                ✓ Zero critical faults. System stable.
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. WARNINGS */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-sm flex flex-col p-5">
                    <h3 className="font-bold text-amber-800 border-b border-amber-200 pb-2 mb-3">
                        ⚠️ Active Warnings
                    </h3>
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[250px] pr-1 styled-scrollbar">
                        {warnings.length > 0 ? warnings.map((warn, i) => (
                            <div key={i} className="bg-white rounded-lg p-3 shadow-sm border border-amber-100">
                                <p className="text-sm text-slate-700 font-medium">{warn.message}</p>
                                {warn.action_required && (
                                    <button 
                                        onClick={() => executeAction(warn.id, warn.suggested_action)}
                                        disabled={actioning === warn.id}
                                        className="mt-3 w-full bg-amber-100 hover:bg-amber-200 text-amber-800 disabled:opacity-50 text-xs font-bold py-1.5 rounded transition-colors"
                                    >
                                        ➔ Route to Solution
                                    </button>
                                )}
                            </div>
                        )) : (
                            <div className="h-full flex items-center justify-center p-4 text-emerald-600 font-medium bg-emerald-50 rounded-lg border border-emerald-100 text-sm">
                                ✓ No active warnings detected.
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. RECOMMENDATIONS */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl shadow-sm flex flex-col p-5">
                    <h3 className="font-bold text-indigo-800 border-b border-indigo-200 pb-2 mb-3">
                        💡 Growth Directives
                    </h3>
                    <div className="space-y-3 flex-1">
                        {recommendations.length > 0 ? recommendations.map((rec, i) => (
                            <div key={i} className="bg-white rounded-lg p-3 shadow-sm border border-indigo-100 flex flex-start gap-2 items-start">
                                <span className="text-indigo-500 mt-0.5">✦</span>
                                <p className="text-xs text-slate-700 font-medium leading-relaxed">{rec}</p>
                            </div>
                        )) : (
                            <div className="h-full flex items-center justify-center p-4 text-slate-500 font-medium bg-slate-100 rounded-lg border border-slate-200 text-sm">
                                Analyzing attribution algorithms...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ROW 1: PRIMARY METRICS */}
            <h2 className="text-xl font-bold text-slate-800 pb-2 border-b border-slate-200 mt-10">Live Telemetry</h2>
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
            
            <style jsx>{`
                .styled-scrollbar::-webkit-scrollbar { width: 4px; }
                .styled-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .styled-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
            `}</style>
        </div>
    );
}
