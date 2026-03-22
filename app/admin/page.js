'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/adminApi';

export default function DashboardPage() {
    const router = useRouter();
    const [health, setHealth] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [queue, setQueue] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [recommendations, setRecommendations] = useState([]);

    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState(null);
    const [error, setError] = useState(null);

    const fetchAll = async () => {
        try {
            const [hRes, mRes, qRes, alertRes, recRes] = await Promise.all([
                adminApi.getSystemHealth(),
                adminApi.getBusinessMetrics(),
                adminApi.getQueueStatus(),
                adminApi.getAlerts(),
                adminApi.getRecommendations()
            ]);

            if (hRes?.success) setHealth(hRes.data);
            if (mRes?.success) setMetrics(mRes.data);
            if (qRes?.success) setQueue(qRes.data);
            if (alertRes?.success) setAlerts(alertRes.data || []);
            if (recRes?.success) setRecommendations(recRes.data || []);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const executeAction = async (alert) => {
        setActioning(alert.id);
        try {
            if (alert.suggested_action?.includes('retry')) {
                await adminApi.retryFailed();
                await fetchAll();
            } else if (alert.suggested_action?.includes('crm')) {
                router.push('/admin/crm');
            } else if (alert.suggested_action?.includes('logs')) {
                router.push('/admin/logs');
            }
        } catch (e) {
            alert(`Action failed: ${e.message}`);
        } finally {
            setActioning(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh]">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-6 text-gray-400 text-lg">Loading Intelligence Engine...</p>
            </div>
        );
    }

    if (error) {
        return <div className="p-8 bg-red-950 text-red-400 rounded-3xl">Dashboard load failed: {error}</div>;
    }

    const criticals = alerts.filter(a => a.severity === 'critical');
    const warnings = alerts.filter(a => a.severity === 'warning');

    return (
        <div className="max-w-screen-2xl mx-auto space-y-12">

            {/* HEADER */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">Autonomous Action Center</h1>
                    <p className="text-gray-400 mt-2">Real-time decisions • Zero human delay</p>
                </div>

                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                    <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></span>
                    SYSTEM ONLINE
                </div>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* CRITICAL */}
                <div className="bg-white/5 backdrop-blur-xl border border-red-500/20 rounded-3xl p-8 shadow-[0_0_30px_rgba(255,0,0,0.08)]">
                    <h3 className="text-red-400 text-lg font-semibold mb-6">🔴 Critical Priorities</h3>

                    {criticals.length ? criticals.map((a, i) => (
                        <div key={i} className="mb-5 p-5 rounded-2xl bg-black/40 border border-red-500/30">
                            <p className="text-gray-200">{a.message}</p>

                            {a.action_required && (
                                <button
                                    onClick={() => executeAction(a)}
                                    className="mt-4 w-full py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-semibold"
                                >
                                    {actioning === a.id ? 'Executing...' : 'Fix Now ⚡'}
                                </button>
                            )}
                        </div>
                    )) : (
                        <div className="p-8 text-center bg-emerald-900/20 rounded-2xl border border-emerald-500/20 text-emerald-400">
                            ✓ System stable
                        </div>
                    )}
                </div>

                {/* WARNINGS */}
                <div className="bg-white/5 backdrop-blur-xl border border-yellow-500/20 rounded-3xl p-8 shadow-[0_0_30px_rgba(255,200,0,0.08)]">
                    <h3 className="text-yellow-400 text-lg font-semibold mb-6">⚠️ Active Warnings</h3>

                    {warnings.length ? warnings.map((w, i) => (
                        <div key={i} className="mb-5 p-5 rounded-2xl bg-black/40 border border-yellow-500/30">
                            <p className="text-gray-200 text-sm">{w.message}</p>
                        </div>
                    )) : (
                        <div className="p-8 text-center text-emerald-400">
                            ✓ No warnings
                        </div>
                    )}
                </div>

                {/* GROWTH */}
                <div className="bg-white/5 backdrop-blur-xl border border-blue-500/20 rounded-3xl p-8 shadow-[0_0_30px_rgba(0,150,255,0.08)]">
                    <h3 className="text-blue-400 text-lg font-semibold mb-6">💡 Growth Directives</h3>

                    {recommendations.length ? recommendations.map((r, i) => (
                        <div key={i} className="mb-4 p-4 bg-black/40 rounded-2xl border border-blue-500/20 text-gray-300 text-sm">
                            {r}
                        </div>
                    )) : (
                        <div className="text-gray-500 text-center py-10">
                            Pipeline optimal
                        </div>
                    )}
                </div>
            </div>

            {/* TELEMETRY */}
            <div>
                <h2 className="text-2xl text-white font-semibold mb-6">Live Telemetry</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                    <Card title="Leads Today" value={metrics?.today_leads} sub={`Total: ${metrics?.total_leads}`} />
                    <Card title="Conversions" value={metrics?.today_conversions} sub={metrics?.conversion_rate} green />
                    <RevenueCard value={metrics?.estimated_revenue} />
                    <Card title="Failed Drops" value={health?.failed_leads_count} sub={`${health?.retry_pending} retrying`} red />

                </div>
            </div>

            {/* SYSTEM */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Status title="AI Engine" value={health?.ai_status} />
                <Status title="Zoho Sync" value={health?.crm_status} />
                <Status title="Queue" value={`${queue?.pending} pending`} />
            </div>

        </div>
    );
}

/* COMPONENTS */

const Card = ({ title, value = 0, sub = '', green, red }) => (
    <div className={`bg-white/5 backdrop-blur-xl rounded-3xl p-8 border ${green ? 'border-emerald-500/30' : red ? 'border-red-500/30' : 'border-white/10'
        }`}>
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-4xl font-bold text-white mt-3">{value}</p>
        <p className="text-xs text-gray-500 mt-2">{sub}</p>
    </div>
);

const RevenueCard = ({ value = 0 }) => (
    <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-3xl p-8 text-white shadow-lg">
        <p className="text-violet-200 text-sm">Revenue</p>
        <p className="text-4xl font-bold mt-4">₹{value?.toLocaleString()}</p>
    </div>
);

const Status = ({ title, value }) => (
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-xl font-semibold text-emerald-400 mt-2">{value || 'Operational'}</p>
    </div>
);