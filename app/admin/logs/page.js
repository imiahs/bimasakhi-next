'use client';
import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';

export default function SystemLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('');

    const fetchLogs = async (type = filter) => {
        setLoading(true);
        try {
            const response = await adminApi.getLogs(type);
            setLogs(response.logs || []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(filter);
        const interval = setInterval(() => fetchLogs(filter), 30000);
        return () => clearInterval(interval);
    }, [filter]);

    return (
        <div className="space-y-6">
            <section className="admin-panel admin-glow-ring overflow-hidden rounded-[2rem] px-6 py-5 lg:px-7 lg:py-6">
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="admin-kicker">Runtime trail</p>
                        <h1 className="admin-heading-xl mt-4 max-w-3xl text-zinc-950">System diagnostics and live event telemetry.</h1>
                        <p className="admin-copy mt-5 max-w-2xl text-base">
                            Use this stream to confirm deployments, guard blocks, CRM events, and background worker behavior without leaving the control plane.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <select
                            value={filter}
                            onChange={(event) => setFilter(event.target.value)}
                            className="admin-select min-w-[180px] px-4 py-3 text-sm"
                        >
                            <option value="">All tiers</option>
                            <option value="ERROR">System errors</option>
                            <option value="CRM_ERROR">CRM error</option>
                            <option value="AI_FAILURE">AI failure</option>
                            <option value="ADMIN_ACCESS">Admin access</option>
                            <option value="CRON_TRIGGER">Cron trigger</option>
                        </select>
                        <button onClick={() => fetchLogs(filter)} disabled={loading} className="admin-button-secondary">
                            {loading ? 'Syncing...' : 'Refresh logs'}
                        </button>
                    </div>
                </div>
            </section>

            <section className="admin-panel-dark overflow-hidden rounded-[2rem]">
                {loading && logs.length === 0 ? (
                    <div className="flex flex-col items-center px-6 py-14 text-center text-slate-300">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-teal-400" />
                        <p className="admin-kicker mt-6 !text-slate-400">Log stream</p>
                        <p className="mt-3 text-sm">Opening telemetry stream...</p>
                    </div>
                ) : error ? (
                    <div className="px-6 py-10 text-center text-sm font-medium text-rose-300">
                        Connection failed: {error}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="px-6 py-14 text-center text-sm text-slate-400">
                        No runtime events available for the current filter.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap text-left text-sm font-mono">
                            <thead className="border-b border-white/10 bg-slate-950/40 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Timestamp</th>
                                    <th className="px-6 py-3 font-semibold">Type</th>
                                    <th className="px-6 py-3 font-semibold">Message</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {logs.map((log, index) => {
                                    const isError = log.type?.includes('ERROR') || log.type?.includes('FAIL');
                                    const isAuth = log.type?.includes('ADMIN');

                                    return (
                                        <tr key={`${log.id || index}`} className="transition hover:bg-white/5">
                                            <td className="px-6 py-3 text-xs text-slate-500">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                                                    isError
                                                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                                                        : isAuth
                                                            ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                                                            : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                                                }`}>
                                                    {log.type}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-3 ${isError ? 'text-rose-100' : 'text-slate-200'}`}>
                                                {log.message}
                                                {log.metadata && (
                                                    <span className="mt-2 block max-w-3xl overflow-hidden text-ellipsis rounded-xl border border-white/6 bg-black/20 p-2 text-[10px] text-slate-400">
                                                        {JSON.stringify(log.metadata)}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
