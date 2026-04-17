import React from 'react';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const dynamic = 'force-dynamic';

export default async function SystemWorkers() {
    const supabase = getServiceSupabase();

    // QStash-native: use job_runs instead of worker_health
    const [queueRes, deadLettersRes, jobRunsRes] = await Promise.all([
        supabase.from('generation_queue').select('status, retry_count'),
        supabase.from('job_dead_letters').select('*').order('failed_at', { ascending: false }).limit(20),
        supabase.from('job_runs').select('id, worker_id, status, started_at, finished_at, error_message').order('started_at', { ascending: false }).limit(50)
    ]);

    const queueRows = queueRes.data || [];
    const deadLetters = deadLettersRes.data || [];
    const jobRuns = jobRunsRes.data || [];

    const queueDepth = queueRows.filter((row) => ['pending', 'processing'].includes(row.status)).length;
    const jobsProcessed = jobRuns.filter((row) => ['done', 'completed'].includes(row.status)).length;
    const jobsFailed = jobRuns.filter((row) => row.status === 'failed').length;
    const memoryMb = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-white">Worker Reliability Engine</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="admin-panel rounded-xl p-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Queue Depth</h3>
                    <p className="text-2xl font-bold text-white mt-1">{queueDepth}</p>
                    <p className="text-xs text-slate-500 mt-1">Pending and processing generation jobs.</p>
                </div>
                <div className="admin-panel rounded-xl p-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Node Memory</h3>
                    <p className="text-2xl font-bold text-white mt-1">{memoryMb} MB</p>
                    <p className="text-xs text-slate-500 mt-1">Current server render heap usage.</p>
                </div>
                <div className="admin-panel rounded-xl p-4">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase">Jobs Processed</h3>
                    <p className="text-2xl font-bold text-emerald-300 mt-1">{jobsProcessed}</p>
                </div>
                <div className="admin-panel rounded-xl p-4">
                    <h3 className="text-xs font-bold text-rose-400 uppercase">Jobs Failed</h3>
                    <p className="text-2xl font-bold text-rose-300 mt-1">{jobsFailed}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="admin-panel rounded-2xl p-5">
                    <h2 className="text-lg font-bold text-white mb-4 border-b border-white/[0.06] pb-2">Recent Job Runs (QStash)</h2>
                    <ul className="space-y-3">
                        {jobRuns.slice(0, 20).map((run) => (
                            <li key={run.id} className="flex justify-between items-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                <div>
                                    <span className="font-mono text-sm block text-slate-200">{run.worker_id || 'worker'}</span>
                                    <span className="text-xs text-slate-500">
                                        {run.started_at ? new Date(run.started_at).toLocaleString() : 'N/A'}
                                        {run.error_message ? ` — ${run.error_message}` : ''}
                                    </span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded text-white ${
                                    run.status === 'failed' ? 'bg-red-500' :
                                    ['done', 'completed'].includes(run.status) ? 'bg-green-500' : 'bg-yellow-500'
                                }`}>
                                    {run.status}
                                </span>
                            </li>
                        ))}
                        {jobRuns.length === 0 && (
                            <li className="text-sm text-slate-500">No QStash job runs recorded yet.</li>
                        )}
                    </ul>
                </div>

                <div className="admin-panel rounded-2xl p-5">
                    <h2 className="text-lg font-bold text-rose-400 mb-4 border-b border-white/[0.06] pb-2">Dead Letter Queue</h2>
                    {deadLetters.length > 0 ? (
                        <ul className="space-y-4">
                            {deadLetters.map((entry) => (
                                <li key={entry.id} className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
                                    <div className="font-mono text-xs text-rose-400 mb-1">
                                        {(entry.job_class || 'unknown-job')} | {new Date(entry.failed_at || entry.created_at).toLocaleString()}
                                    </div>
                                    <p className="text-sm text-slate-300">{entry.error || entry.failure_reason || 'No failure reason recorded.'}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-500 text-sm">No dead letter payloads currently trapped in the queue.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
