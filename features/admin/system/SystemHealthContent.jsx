'use client';

import React, { useState, useEffect } from 'react';

const SystemHealthContent = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/system');
            const data = await res.json();
            if (data.success) {
                setStatus(data);
            }
        } catch (error) {
            console.error('Failed to fetch system status', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        // Ping every 60s
        const interval = setInterval(fetchStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    const StatusBadge = ({ val }) => {
        const colors = {
            green: 'bg-green-100 text-green-700 border border-green-200',
            yellow: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
            red: 'bg-red-100 text-red-700 border border-red-200',
            gray: 'bg-slate-100 text-slate-500 border border-slate-200'
        };
        const colorClass = colors[val] || colors.gray;

        return (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${colorClass}`}>
                <div className={`w-2 h-2 rounded-full ${val === 'green' ? 'bg-green-500' : val === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                {val === 'green' ? 'Operational' : val === 'yellow' ? 'Degraded' : 'Downtime'}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 h-full p-6">
            <div className="admin-page-header flex justify-between items-center w-full">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">System Health</h1>
                    <p className="text-slate-500 mt-1">Real-time infrastructure monitoring across primary database layers and API connections.</p>
                </div>
                <button
                    onClick={fetchStatus}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition"
                >
                    Ping Services
                </button>
            </div>

            {loading && !status ? (
                <div className="p-8 text-center text-slate-500 animate-pulse bg-white rounded-xl border border-slate-200">
                    Pinging global infrastructure...
                </div>
            ) : status && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Performance Summary Card */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800">Global Cluster Status</h3>
                                <p className="text-slate-500 text-sm mt-1">Monitors active connection state & cluster vitals</p>
                            </div>
                            <StatusBadge val={status.overall} />
                        </div>

                        {status.metrics && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Queue Load</div>
                                    <div className="font-bold text-slate-800">{status.metrics.queue_depth} bounded</div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Worker Uptime</div>
                                    <div className="font-bold text-slate-800">{Math.floor(status.metrics.worker_uptime / 60)} minutes</div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">DB Latency</div>
                                    <div className="font-bold text-slate-800">{status.metrics.supabase_latency_ms} ms</div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Redis Ping</div>
                                    <div className="font-bold text-slate-800">{status.metrics.redis_latency_ms} ms</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-semibold text-slate-800">Supabase Cloud</h3>
                            <StatusBadge val={status.statuses.supabase} />
                        </div>
                        <p className="text-xs text-slate-500">Primary CMS storage (PostgreSQL). Stores content, user overrides, and telemetry output.</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-semibold text-slate-800">SQLite Layer</h3>
                            <StatusBadge val={status.statuses.sqlite} />
                        </div>
                        <p className="text-xs text-slate-500">Local volume storage mounted to Vercel/Node runtime. Processes queues, failures, and event tracking.</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-semibold text-slate-800">Zoho CRM Sync</h3>
                            <StatusBadge val={status.statuses.zoho_api} />
                        </div>
                        <p className="text-xs text-slate-500">Outbound transmission API bridging queued leads into the internal CRM environment.</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-semibold text-slate-800">Background Workers</h3>
                            <StatusBadge val={status.statuses.background_workers} />
                        </div>
                        <p className="text-xs text-slate-500">Asynchronous internal CRON triggers governing database snapshotting and batching logic.</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-semibold text-slate-800">Redis Memory Store</h3>
                            <StatusBadge val={status.statuses.redis || 'red'} />
                        </div>
                        <p className="text-xs text-slate-500">In-memory data structure component routing queue events for BullMQ.</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-semibold text-slate-800">Media Pipeline</h3>
                            <StatusBadge val={status.statuses.media_pipeline} />
                        </div>
                        <p className="text-xs text-slate-500">Sharp.js internal optimizer nodes generating WebP images for Admin Uploads.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemHealthContent;
