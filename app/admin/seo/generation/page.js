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
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Mass Generation Engine</h1>
            
            <QueueControls />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500">
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Pages Generated</h3>
                    <p className="text-3xl font-bold text-blue-800">{metrics?.generated_pages || 0}</p>
                </div>
                <div className="bg-white p-6 rounded shadow border-l-4 border-orange-500">
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Active Queues</h3>
                    <p className="text-3xl font-bold text-orange-800">{processing.length}</p>
                </div>
                <div className="bg-white p-6 rounded shadow border-l-4 border-purple-500">
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Pending Batches</h3>
                    <p className="text-3xl font-bold text-purple-800">{pending.length}</p>
                </div>
            </div>

            <div className="bg-white rounded shadow p-6 mb-8">
                <h2 className="text-xl font-bold mb-4">Recent Generation Logs</h2>
                {logs?.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="p-3 font-semibold">Event</th>
                                <th className="p-3 font-semibold">Message</th>
                                <th className="p-3 font-semibold">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 text-sm">
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                            {log.event_type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-sm">{log.message}</td>
                                    <td className="p-3 text-sm text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-gray-500">No recent logs identified in system memory.</p>
                )}
            </div>
        </div>
    );
}
