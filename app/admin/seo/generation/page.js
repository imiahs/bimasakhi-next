import React from 'react';
import { supabase } from '@/lib/supabase';
import QueueControls from '@/components/admin/QueueControls';

export default async function GenerationQueueDashboard() {
    const { data: queueStats } = await supabase.from('generation_queue').select('status, progress, total_items') || [];
    const { data: metrics } = await supabase.from('generation_metrics').select('*').limit(1).single();
    const { data: logs } = await supabase.from('generation_logs').select('*').order('created_at', { ascending: false }).limit(20);

    const pending = queueStats?.filter(q => q.status === 'pending') || [];
    const processing = queueStats?.filter(q => q.status === 'processing') || [];

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-white">Mass Generation Engine</h1>
            
            <QueueControls />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="admin-panel rounded-xl p-5 border-l-2 border-blue-500">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Pages Generated</h3>
                    <p className="text-3xl font-bold text-white">{metrics?.generated_pages || 0}</p>
                </div>
                <div className="admin-panel rounded-xl p-5 border-l-2 border-orange-500">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Active Queues</h3>
                    <p className="text-3xl font-bold text-white">{processing.length}</p>
                </div>
                <div className="admin-panel rounded-xl p-5 border-l-2 border-purple-500">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Pending Batches</h3>
                    <p className="text-3xl font-bold text-white">{pending.length}</p>
                </div>
            </div>

            <div className="admin-panel rounded-2xl p-5">
                <h2 className="text-lg font-bold text-white mb-4">Recent Generation Logs</h2>
                {logs?.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                                <th className="p-3 font-semibold text-slate-400 text-xs uppercase">Event</th>
                                <th className="p-3 font-semibold text-slate-400 text-xs uppercase">Message</th>
                                <th className="p-3 font-semibold text-slate-400 text-xs uppercase">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                                    <td className="p-3 text-sm">
                                        <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-xs">
                                            {log.event_type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-sm text-slate-300">{log.message}</td>
                                    <td className="p-3 text-sm text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-slate-500">No recent logs identified.</p>
                )}
            </div>
        </div>
    );
}
