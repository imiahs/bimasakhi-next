'use client';

import React, { useState, useEffect } from 'react';

const SystemHealthContent = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin?action=system-health');
            const response = await res.json();
            if (response.success) {
                setStatus(response.data);
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
                            <StatusBadge val={status?.crm_status?.toLowerCase() === 'operational' ? 'green' : 'yellow'} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Leads Today</div>
                                <div className="font-bold text-slate-800">{status?.total_leads_today ?? 0} generated</div>
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Failed Leads (24H)</div>
                                <div className="font-bold text-slate-800">{status?.failed_leads_count ?? 0} failed</div>
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pending Retries</div>
                                <div className="font-bold text-slate-800">{status?.retry_pending ?? 0} queued</div>
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Recent Errors</div>
                                <div className="font-bold text-slate-800">{status?.last_10_errors?.length ?? 0} logged</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-semibold text-slate-800">Zoho CRM Sync</h3>
                            <StatusBadge val={status?.crm_status?.toLowerCase() === 'operational' ? 'green' : 'yellow'} />
                        </div>
                        <p className="text-xs text-slate-500">Outbound transmission API bridging queued leads into the internal CRM environment.</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-semibold text-slate-800">AI Background Jobs</h3>
                            <StatusBadge val={status?.ai_status?.toLowerCase() === 'operational' ? 'green' : 'yellow'} />
                        </div>
                        <p className="text-xs text-slate-500">Asynchronous internal AI triggers governing text generation logic.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemHealthContent;
