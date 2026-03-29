'use client';
import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';
import MetricCard from '@/components/admin/ui/MetricCard';

function DistributionList({ title, items = [], accentClass }) {
    return (
        <section className="admin-panel rounded-[2rem] p-5">
            <div className="mb-5">
                <p className="admin-kicker">{title}</p>
                <h2 className="mt-3 text-xl font-semibold tracking-[-0.05em] text-zinc-950">Top live contributors</h2>
            </div>

            <div className="space-y-4">
                {items.length > 0 ? items.map((item, index) => (
                    <div key={`${item.name}-${index}`}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm font-medium">
                            <span className="truncate text-zinc-800">{item.name}</span>
                            <span className="text-zinc-500">{item.value}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-zinc-200/70">
                            <div
                                className={`h-2.5 rounded-full ${accentClass}`}
                                style={{ width: `${Math.min(item.value * 8, 100)}%` }}
                            />
                        </div>
                    </div>
                )) : (
                    <p className="text-sm text-zinc-500">No attribution data available yet.</p>
                )}
            </div>
        </section>
    );
}

export default function AnalyticsPage() {
    const [stats, setStats] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);

        try {
            const [statsResponse, metricsResponse] = await Promise.all([
                adminApi.getStats(),
                adminApi.getBusinessMetrics()
            ]);

            setStats(statsResponse.success !== undefined ? statsResponse.data : statsResponse);
            setMetrics(metricsResponse.success ? metricsResponse.data : metricsResponse);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="admin-panel flex flex-col items-center rounded-[2rem] px-10 py-12 text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/70 border-t-teal-700" />
                    <p className="admin-kicker mt-6">Analytics sync</p>
                    <p className="mt-3 text-sm font-medium text-zinc-600">Loading live attribution signals...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="admin-panel admin-glow-ring overflow-hidden rounded-[2rem] px-6 py-5 lg:px-7 lg:py-6">
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="admin-kicker">Attribution</p>
                        <h1 className="admin-heading-xl mt-4 max-w-3xl text-zinc-950">Read the operating economics behind your traffic and leads.</h1>
                        <p className="admin-copy mt-5 max-w-2xl text-base">
                            This board connects source attribution, geography, conversions, and top-of-funnel application volume so you can decide where to scale next.
                        </p>
                    </div>

                    <button onClick={fetchAnalytics} className="admin-button-secondary">
                        Refresh analytics
                    </button>
                </div>
            </section>

            {error && (
                <div className="admin-toast-error rounded-[1.5rem] px-4 py-3 text-sm font-medium shadow-sm">
                    Failed to render analytics: {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Total Leads" value={metrics?.total_leads || 0} subtitle="Total CRM pipeline volume" icon="TL" statusColor="success" />
                <MetricCard title="Converted" value={metrics?.converted_leads ?? metrics?.conversions ?? 0} subtitle="Converted lead count" icon="CV" />
                <MetricCard title="Conversion Rate" value={`${Number(metrics?.conversion_rate || 0).toFixed(1)}%`} subtitle="Closed pipeline ratio" icon="RT" />
                <MetricCard title="Revenue" value={`Rs ${(metrics?.estimated_revenue || 0).toLocaleString()}`} subtitle="Tracked conversion value" icon="RV" />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <DistributionList title="Top cities" items={metrics?.top_cities || []} accentClass="bg-indigo-500" />
                <DistributionList title="Top sources" items={metrics?.top_sources || []} accentClass="bg-emerald-500" />
            </div>

            <section className="admin-panel rounded-[2rem] p-5">
                <div className="mb-5">
                    <p className="admin-kicker">Stats feed</p>
                    <h2 className="mt-3 text-xl font-semibold tracking-[-0.05em] text-zinc-950">Current application funnel snapshot</h2>
                </div>

                {!stats ? (
                    <p className="text-sm text-zinc-500">No stats payload available.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="admin-subpanel rounded-[1.4rem] p-4">
                            <p className="admin-kicker">Applications</p>
                            <p className="mt-2 text-[2rem] font-semibold tracking-[-0.06em] text-zinc-950">{stats.totalApplications || 0}</p>
                            <p className="mt-2 text-sm text-zinc-500">Application count from stats feed.</p>
                        </div>
                        <div className="admin-subpanel rounded-[1.4rem] p-4">
                            <p className="admin-kicker">Attribution entries</p>
                            <p className="mt-2 text-[2rem] font-semibold tracking-[-0.06em] text-zinc-950">{stats.attribution?.length || 0}</p>
                            <p className="mt-2 text-sm text-zinc-500">Distinct source groupings available for comparison.</p>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
