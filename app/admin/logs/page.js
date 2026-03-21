'use client';
import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

export default function SystemLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('');

    const fetchLogs = async (type = filter) => {
        setLoading(true);
        try {
            const res = await adminApi.getLogs(type);
            setLogs(res.logs || []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Initial Load + Auto Refresh every 30s
    useEffect(() => {
        fetchLogs(filter);
        const interval = setInterval(() => fetchLogs(filter), 30000);
        return () => clearInterval(interval);
    }, [filter]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">System Diagnostics</h1>
                    <p className="text-sm text-slate-500 mt-1">Real-time unhandled exception telemetry stream tracing.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none font-medium shadow-sm"
                    >
                        <option value="">All Tiers</option>
                        <option value="ERROR">SYSTEM ERRORS</option>
                        <option value="CRM_ERROR">CRM_ERROR</option>
                        <option value="AI_FAILURE">AI_FAILURE</option>
                        <option value="ADMIN_ACCESS">ADMIN_ACCESS</option>
                        <option value="CRON_TRIGGER">CRON_TRIGGER</option>
                    </select>
                    <button onClick={() => fetchLogs(filter)} disabled={loading} className="bg-indigo-600 border border-transparent text-white px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-lg hover:bg-indigo-700 transition shadow-sm disabled:opacity-50">
                        🔄 Sync Array
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 rounded-xl shadow-xl overflow-hidden border border-slate-700">
                {loading && logs.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-3"></div>
                        Establishing Secure Socket Link...
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-rose-500 font-bold">Connection Failed: {error}</div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 font-mono text-sm">Waiting for incoming packets...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap font-mono">
                            <thead className="bg-slate-800 text-slate-400 border-b border-slate-700 text-xs">
                                <tr>
                                    <th className="px-6 py-3 font-medium uppercase tracking-wider">Timestamp</th>
                                    <th className="px-6 py-3 font-medium uppercase tracking-wider">Exception Thread</th>
                                    <th className="px-6 py-3 font-medium uppercase tracking-wider w-full">Message Buffer</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {logs.map((log, idx) => {
                                    const isErr = log.type?.includes('ERROR') || log.type?.includes('FAIL');
                                    const isAuth = log.type?.includes('ADMIN');
                                    return (
                                        <tr key={idx} className="hover:bg-slate-800/50 transition">
                                            <td className="px-6 py-3 text-slate-500 text-xs">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-widest ${isErr ? 'bg-rose-950/50 text-rose-400 border border-rose-900/50' : isAuth ? 'bg-indigo-950/50 text-indigo-400 border border-indigo-900/50' : 'bg-slate-800 text-emerald-400 border border-slate-700'}`}>
                                                    {log.type}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-3 font-medium ${isErr ? 'text-rose-200' : 'text-slate-300'}`}>
                                                {log.message}
                                                {log.metadata && (
                                                    <span className="block mt-1 text-slate-500 text-[10px] truncate max-w-2xl bg-slate-950 p-1.5 rounded border border-slate-800">
                                                        {JSON.stringify(log.metadata)}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
