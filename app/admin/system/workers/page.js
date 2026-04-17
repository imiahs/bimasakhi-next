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
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Worker Reliability Engine</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-800 text-white p-4 rounded shadow">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">Queue Depth</h3>
                    <p className="text-3xl font-black mt-1">{queueDepth}</p>
                    <p className="text-xs text-gray-400 mt-2">Pending and processing generation jobs.</p>
                </div>
                <div className="bg-gray-800 text-white p-4 rounded shadow">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">Node Memory</h3>
                    <p className="text-3xl font-black mt-1">{memoryMb} MB</p>
                    <p className="text-xs text-gray-400 mt-2">Current server render heap usage.</p>
                </div>
                <div className="bg-gray-800 text-white p-4 rounded shadow">
                    <h3 className="text-xs font-bold text-green-400 uppercase">Jobs Processed</h3>
                    <p className="text-3xl font-black mt-1 text-green-100">{jobsProcessed}</p>
                </div>
                <div className="bg-gray-800 text-white p-4 rounded shadow">
                    <h3 className="text-xs font-bold text-red-400 uppercase">Jobs Failed</h3>
                    <p className="text-3xl font-black mt-1 text-red-100">{jobsFailed}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded shadow p-6">
                    <h2 className="text-xl font-bold mb-4 border-b pb-2">Recent Job Runs (QStash)</h2>
                    <ul className="space-y-3">
                        {jobRuns.slice(0, 20).map((run) => (
                            <li key={run.id} className="flex justify-between items-center p-3 border rounded bg-gray-50">
                                <div>
                                    <span className="font-mono text-sm block">{run.worker_id || 'worker'}</span>
                                    <span className="text-xs text-gray-500">
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
                            <li className="text-sm text-gray-500">No QStash job runs recorded yet.</li>
                        )}
                    </ul>
                </div>

                <div className="bg-white rounded shadow p-6">
                    <h2 className="text-xl font-bold mb-4 border-b pb-2 text-red-600">Dead Letter Queue</h2>
                    {deadLetters.length > 0 ? (
                        <ul className="space-y-4">
                            {deadLetters.map((entry) => (
                                <li key={entry.id} className="p-3 border rounded bg-red-50">
                                    <div className="font-mono text-xs text-red-800 mb-1">
                                        {(entry.job_class || 'unknown-job')} | {new Date(entry.failed_at || entry.created_at).toLocaleString()}
                                    </div>
                                    <p className="text-sm text-gray-700">{entry.error || entry.failure_reason || 'No failure reason recorded.'}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-sm">No dead letter payloads currently trapped in the queue.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
