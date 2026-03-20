import React from 'react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function SystemWorkers() {
    // 1. Hardware State (Migrated to QStash + Postgres)
    const { count: pgCount } = await supabase.from('generation_queue').select('id', { count: 'exact', head: true });
    
    // Node memory heuristics mapping edge bounding limits
    const memoryMb = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;

    const { data: heartbeats } = await supabase.from('worker_heartbeats').select('*').order('last_heartbeat', { ascending: false });
    const { data: dlq } = await supabase.from('dead_letter_queue').select('*').order('created_at', { ascending: false }).limit(20);
    const { data: metrics } = await supabase.from('system_metrics_snapshot').select('*').limit(1).single();

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Worker Reliability Engine</h1>

            {/* BullMQ Hardware Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-800 text-white p-4 rounded shadow">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">Redis Queue Depth</h3>
                    <p className="text-3xl font-black mt-1">{metrics?.queue_depth || 0}</p>
                    <p className="text-xs text-gray-400 mt-2">Active pending bounded tasks.</p>
                </div>
                <div className="bg-gray-800 text-white p-4 rounded shadow">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">Node Memory</h3>
                    <p className="text-3xl font-black mt-1">{memoryMb} MB</p>
                    <p className="text-xs text-gray-400 mt-2">Heap allocations.</p>
                </div>
                <div className="bg-gray-800 text-white p-4 rounded shadow">
                    <h3 className="text-xs font-bold text-green-400 uppercase">Jobs Processed</h3>
                    <p className="text-3xl font-black mt-1 text-green-100">{metrics?.jobs_processed || 0}</p>
                </div>
                <div className="bg-gray-800 text-white p-4 rounded shadow">
                    <h3 className="text-xs font-bold text-red-400 uppercase">Jobs Failed</h3>
                    <p className="text-3xl font-black mt-1 text-red-100">{metrics?.jobs_failed || 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded shadow p-6">
                    <h2 className="text-xl font-bold mb-4 border-b pb-2">Active Heartbeats</h2>
                    <ul className="space-y-3">
                        {heartbeats?.map(w => {
                            const isStale = new Date(w.last_heartbeat) < new Date(Date.now() - 60000);
                            return (
                                <li key={w.id} className="flex justify-between items-center p-3 border rounded bg-gray-50">
                                    <span className="font-mono text-sm">{w.worker_name}</span>
                                    <span className={`text-xs px-2 py-1 rounded text-white ${isStale ? 'bg-red-500' : 'bg-green-500'}`}>
                                        {isStale ? 'Stale / Restarting' : 'Healthy'}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="bg-white rounded shadow p-6">
                    <h2 className="text-xl font-bold mb-4 border-b pb-2 text-red-600">Dead Letter Queue (Unrecoverable)</h2>
                    {dlq?.length > 0 ? (
                        <ul className="space-y-4">
                            {dlq.map(d => (
                                <li key={d.id} className="p-3 border rounded bg-red-50">
                                    <div className="font-mono text-xs text-red-800 mb-1">{d.job_type} • {new Date(d.created_at).toLocaleString()}</div>
                                    <p className="text-sm text-gray-700">{d.failure_reason}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-sm">No dead letter payloads currently trapped in the queue natively.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
