import React from 'react';
import { supabase } from '@/lib/supabase';

export default async function IndexWorkerDashboard() {
    const { count: activeCount } = await supabase.from('page_index').select('id', { count: 'exact', head: true }).eq('status', 'active');
    const { count: pendingCount } = await supabase.from('page_index').select('id', { count: 'exact', head: true }).eq('status', 'pending_index');
    const { count: disabledCount } = await supabase.from('page_index').select('id', { count: 'exact', head: true }).in('status', ['disabled', 'noindex']);

    const { data: recommendations } = await supabase.from('seo_growth_recommendations').select('*').limit(10).order('created_at', { ascending: false });

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Search Index Control Worker</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Live (Indexed) Pages</h3>
                    <p className="text-3xl font-bold text-green-800">{activeCount || 0}</p>
                </div>
                <div className="bg-white p-6 rounded shadow border-l-4 border-yellow-500">
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Pending Drip Feed</h3>
                    <p className="text-3xl font-bold text-yellow-800">{pendingCount || 0}</p>
                </div>
                <div className="bg-white p-6 rounded shadow border-l-4 border-red-500">
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Disabled / NoIndex (Thin Content)</h3>
                    <p className="text-3xl font-bold text-red-800">{disabledCount || 0}</p>
                </div>
            </div>

            <div className="bg-white rounded shadow p-6">
                <h2 className="text-xl font-bold mb-4">AI SEO Worker Recommendations</h2>
                {recommendations?.length > 0 ? (
                    <ul className="space-y-4">
                        {recommendations.map(req => (
                            <li key={req.id} className="p-4 border rounded bg-gray-50">
                                <span className="font-bold block mb-1 text-gray-800">{req.recommendation_type.replace(/_/g, ' ').toUpperCase()}</span>
                                <p className="text-sm text-gray-600 mb-2">{req.ai_rationale}</p>
                                <p className="text-xs text-blue-600 font-mono tracking-tighter">Status: {req.status}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">No active AI optimizations pending.</p>
                )}
            </div>
        </div>
    );
}
