import React from 'react';
import { supabase } from '@/lib/supabase';

export default async function SystemPerformance() {
    const { data: cacheStats } = await supabase.from('page_cache').select('id', { count: 'exact', head: true });

    // Naively simulate or surface DB load variables normally tracked in performance_metrics
    const { count: missCount } = await supabase.from('performance_metrics').select('id', { count: 'exact', head: true }).eq('cache_hit', false);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-white">Edge Performance & Caching</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="admin-panel rounded-xl p-5 border-l-2 border-indigo-500">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Pre-Rendered Bot Nodes (Cached URLs)</h3>
                    <p className="text-3xl font-bold text-white mt-2">{cacheStats || 0}</p>
                    <p className="text-xs text-indigo-400 mt-1">Pages guaranteed completely bypassing database & react render cycles.</p>
                </div>

                <div className="admin-panel rounded-xl p-5 border-l-2 border-emerald-500">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Cache Misses</h3>
                    <p className="text-3xl font-bold text-white mt-2">{missCount || 0}</p>
                    <p className="text-xs text-emerald-400 mt-1">Recorded instances generating payloads natively on-the-fly dynamically.</p>
                </div>
            </div>

            <div className="admin-panel rounded-2xl p-5">
                <h3 className="font-bold text-white mb-2">Worker Integration</h3>
                <p className="text-sm text-slate-400">The Edge Cache worker routinely iterates \`/api/admin/jobs/cache-worker\` generating headless Chromium requests directly caching heavy localities reducing CPU load bounds.</p>
            </div>
        </div>
    );
}
