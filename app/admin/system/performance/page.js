import React from 'react';
import { supabase } from '@/lib/supabase';

export default async function SystemPerformance() {
    const { data: cacheStats } = await supabase.from('page_cache').select('id', { count: 'exact', head: true });

    // Naively simulate or surface DB load variables normally tracked in performance_metrics
    const { count: missCount } = await supabase.from('performance_metrics').select('id', { count: 'exact', head: true }).eq('cache_hit', false);

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Edge Performance & Caching</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded shadow border-l-4 border-indigo-500">
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Pre-Rendered Bot Nodes (Cached URLs)</h3>
                    <p className="text-4xl font-black text-indigo-900 mt-2">{cacheStats || 0}</p>
                    <p className="text-xs text-indigo-600 mt-2">Pages guaranteed completely bypassing database & react render cycles.</p>
                </div>

                <div className="bg-white p-6 rounded shadow border-l-4 border-emerald-500">
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Cache Misses</h3>
                    <p className="text-4xl font-black text-emerald-900 mt-2">{missCount || 0}</p>
                    <p className="text-xs text-emerald-600 mt-2">Recorded instances generating payloads natively on-the-fly dynamically.</p>
                </div>
            </div>

            <div className="bg-white rounded shadow p-6">
                <h3 className="font-bold text-gray-800 mb-2">Worker Integration</h3>
                <p className="text-sm text-gray-600">The Edge Cache worker routinely iterates \`/api/admin/jobs/cache-worker\` generating headless Chromium requests directly caching heavy localities reducing CPU load bounds.</p>
            </div>
        </div>
    );
}
