'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import MetricCard from '@/components/admin/ui/MetricCard';

export default function CCCOverview() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [genSlug, setGenSlug] = useState('');
    const [generating, setGenerating] = useState(false);
    const [genResult, setGenResult] = useState(null);

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

    // Fix 2c: Create a new blank draft
    const handleCreateDraft = async () => {
        try {
            const res = await fetch('/api/admin/ccc/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create_blank' }),
                credentials: 'include',
            });
            const data = await res.json();
            if (data.success && data.draft?.id) {
                window.location.href = `/admin/ccc/drafts/${data.draft.id}`;
            } else {
                alert(data.error || 'Failed to create draft');
            }
        } catch (err) {
            alert('Error creating draft: ' + err.message);
        }
    };

    // Fix 2d: Single-page generation trigger
    const handleGenerateSingle = async () => {
        if (!genSlug.trim()) return;
        setGenerating(true);
        setGenResult(null);
        try {
            const res = await fetch('/api/admin/ccc/generate-single', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: genSlug.trim() }),
                credentials: 'include',
            });
            const data = await res.json();
            setGenResult(data.success ? { type: 'success', message: data.message || 'Generation triggered' } : { type: 'error', message: data.error || 'Failed' });
            if (data.success) setGenSlug('');
        } catch (err) {
            setGenResult({ type: 'error', message: err.message });
        } finally {
            setGenerating(false);
        }
    };

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
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Content Command Center</h1>
                    <p className="text-sm text-slate-400 mt-1">AI-generated page drafts — review, edit, approve</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Fix 2c: Create New Page button */}
                    <button
                        onClick={handleCreateDraft}
                        className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors"
                    >
                        + New Page
                    </button>
                    <Link
                        href="/admin/ccc/drafts"
                        className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                    >
                        View All Drafts →
                    </Link>
                </div>
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

            {/* Fix 2d: Single-page generation trigger */}
            <div className="admin-panel rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">⚡ Generate Single Page</h3>
                <p className="text-sm text-slate-400 mb-4">Enter a slug to trigger AI generation for a specific page.</p>
                <div className="flex gap-3 items-center">
                    <input
                        type="text"
                        value={genSlug}
                        onChange={(e) => setGenSlug(e.target.value)}
                        placeholder="e.g. lic-agent-krishna-nagar-delhi"
                        className="flex-1 px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500/40"
                    />
                    <button
                        onClick={handleGenerateSingle}
                        disabled={generating || !genSlug.trim()}
                        className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                    >
                        {generating ? 'Generating...' : 'Generate'}
                    </button>
                </div>
                {genResult && (
                    <p className={`mt-2 text-sm ${genResult.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {genResult.message}
                    </p>
                )}
            </div>
        </div>
    );
}
