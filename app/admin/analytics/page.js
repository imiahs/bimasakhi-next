'use client';
import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

export default function AnalyticsPage() {
    const [stats, setStats] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const [sRes, mRes] = await Promise.all([
                adminApi.getStats(),
                adminApi.getBusinessMetrics()
            ]);
            // Disregarding wrapper formatting inconsistencies, standardizing fallback safely:
            setStats(sRes.success !== undefined ? sRes.data : sRes);
            setMetrics(mRes.success ? mRes.data : mRes);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAnalytics(); }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="w-8 h-8 border-4 border-slate-300 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            Computing Revenue Arrays...
        </div>
    );

    if (error) return <div className="p-6 bg-red-50 text-red-600 border border-red-200 rounded-xl">Failed to render charts: {error}</div>;

    const sourcesData = metrics?.top_sources || [];
    const citiesData = metrics?.top_cities || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Analytics & Revenue Platform</h1>
                    <p className="text-sm text-slate-500 mt-1">Granular breakdown tracking conversions natively against local CRM hashes.</p>
                </div>
                <button onClick={fetchAnalytics} className="bg-white border text-sm font-medium border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition shadow-sm">
                    ↻ Sync Arrays
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-6 rounded-xl shadow-md border border-indigo-400">
                    <p className="font-bold text-indigo-100 text-sm tracking-wider uppercase mb-1">Total Pipeline Pipeline</p>
                    <p className="text-4xl font-black">{metrics?.total_leads || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-xl shadow-md border border-emerald-400">
                    <p className="font-bold text-emerald-100 text-sm tracking-wider uppercase mb-1">Closed Won Ratio</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-black">{metrics?.converted_leads || 0}</p>
                        <span className="bg-white/20 px-2 py-0.5 rounded text-sm">{metrics?.conversion_rate || '0%'}</span>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-md border border-purple-400 md:col-span-2">
                    <p className="font-bold text-purple-100 text-sm tracking-wider uppercase mb-1">Estimated Accrued Revenue</p>
                    <div className="mt-1">
                        <p className="text-4xl font-black drop-shadow-sm">₹{(metrics?.estimated_revenue || 0).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Geographic Distribution</h3>
                    <div className="space-y-4">
                        {citiesData.length > 0 ? citiesData.map((c, i) => {
                            const percent = Math.min(((c.value / (metrics?.total_leads || 1)) * 100), 100).toFixed(1);
                            return (
                                <div key={i}>
                                    <div className="flex justify-between text-sm mb-1 font-medium">
                                        <span className="text-slate-700">{c.name}</span>
                                        <span className="text-slate-500">{percent}% ({c.value})</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>
                            );
                        }) : <p className="text-slate-500 text-sm">Awaiting geo-location metrics.</p>}
                    </div>
                </div>

                <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Source Attribution</h3>
                    <div className="space-y-4">
                        {sourcesData.length > 0 ? sourcesData.map((s, i) => {
                            const percent = Math.min(((s.value / (metrics?.total_leads || 1)) * 100), 100).toFixed(1);
                            return (
                                <div key={i}>
                                    <div className="flex justify-between text-sm mb-1 font-medium">
                                        <span className="text-slate-700 truncate max-w-[200px]">{s.name}</span>
                                        <span className="text-slate-500">{percent}% ({s.value})</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>
                            );
                        }) : <p className="text-slate-500 text-sm">Awaiting referrer metrics.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
