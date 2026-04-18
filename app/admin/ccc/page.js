'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import MetricCard from '@/components/admin/ui/MetricCard';

export default function CCCOverview() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const statuses = ['draft', 'review', 'approved', 'rejected', 'published'];
                const counts = {};

                for (const status of statuses) {
                    const res = await fetch(`/api/admin/ccc/drafts?status=${status}&limit=1`);
                    const data = await res.json();
                    counts[status] = data.total || 0;
                }

                counts.total = Object.values(counts).reduce((a, b) => a + b, 0);
                setStats(counts);
            } catch (err) {
                console.error('Failed to load CCC stats:', err);
                setStats({ draft: 0, review: 0, approved: 0, rejected: 0, published: 0, total: 0 });
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-white">Content Command Center</h1>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="admin-panel rounded-2xl p-5 h-32 animate-pulse bg-white/[0.03]" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Content Command Center</h1>
                    <p className="text-sm text-slate-400 mt-1">AI-generated page drafts — review, edit, approve</p>
                </div>
                <Link
                    href="/admin/ccc/drafts"
                    className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                >
                    View All Drafts →
                </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <MetricCard title="Drafts" value={stats.draft} subtitle="Awaiting review" statusColor="warning" icon="📝" />
                <MetricCard title="In Review" value={stats.review} subtitle="Under evaluation" statusColor="warning" icon="🔍" />
                <MetricCard title="Approved" value={stats.approved} subtitle="Ready to publish" statusColor="success" icon="✅" />
                <MetricCard title="Published" value={stats.published} subtitle="Live on site" statusColor="success" icon="🌐" />
                <MetricCard title="Rejected" value={stats.rejected} subtitle="Needs revision" statusColor="error" icon="❌" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Link href="/admin/ccc/drafts?status=draft" className="admin-panel mc-card-hover rounded-2xl p-6 block">
                    <h3 className="text-lg font-semibold text-white mb-2">📋 Pending Review</h3>
                    <p className="text-sm text-slate-400">
                        {stats.draft} draft{stats.draft !== 1 ? 's' : ''} waiting for your review.
                        Click to see all pending content.
                    </p>
                </Link>

                <Link href="/admin/ccc/drafts?status=approved" className="admin-panel mc-card-hover rounded-2xl p-6 block">
                    <h3 className="text-lg font-semibold text-white mb-2">🚀 Recently Approved</h3>
                    <p className="text-sm text-slate-400">
                        {stats.approved} page{stats.approved !== 1 ? 's' : ''} approved and live.
                        Click to see published content.
                    </p>
                </Link>
            </div>
        </div>
    );
}
