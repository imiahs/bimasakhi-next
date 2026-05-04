import React from 'react';
import { supabase } from '@/lib/supabase';

export default async function IndexWorkerDashboard() {
    const { count: publishedCount } = await supabase.from('page_index').select('id', { count: 'exact', head: true }).eq('status', 'published');
    const { count: pendingCount } = await supabase.from('page_index').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('indexing_status', 'pending');
    const { count: blockedCount } = await supabase.from('page_index').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('indexing_status', 'blocked');

    const { data: recommendations } = await supabase.from('seo_growth_recommendations').select('*').limit(10).order('created_at', { ascending: false });

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-white">Search Index Control Worker</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="admin-panel rounded-xl p-5 border-l-2 border-green-500">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Published Pages</h3>
                    <p className="text-3xl font-bold text-white">{publishedCount || 0}</p>
                </div>
                <div className="admin-panel rounded-xl p-5 border-l-2 border-yellow-500">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Pending Indexing</h3>
                    <p className="text-3xl font-bold text-white">{pendingCount || 0}</p>
                </div>
                <div className="admin-panel rounded-xl p-5 border-l-2 border-red-500">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Blocked From Index</h3>
                    <p className="text-3xl font-bold text-white">{blockedCount || 0}</p>
                </div>
            </div>

            <div className="admin-panel rounded-2xl p-5">
                <h2 className="text-lg font-bold text-white mb-4">AI SEO Worker Recommendations</h2>
                {recommendations?.length > 0 ? (
                    <ul className="space-y-4">
                        {recommendations.map(req => (
                            <li key={req.id} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.03]">
                                <span className="font-bold block mb-1 text-slate-200">{req.recommendation_type.replace(/_/g, ' ').toUpperCase()}</span>
                                <p className="text-sm text-slate-400 mb-2">{req.ai_rationale}</p>
                                <p className="text-xs text-emerald-400 font-mono">Status: {req.status}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-slate-500">No active AI optimizations pending.</p>
                )}
            </div>
        </div>
    );
}
