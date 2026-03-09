'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

export default function CoachingContent() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                // DOs fetch all unread coaching_alerts across all agents
                // The networkMetricsWorker automatically creates these alerts
                const { data } = await supabase
                    .from('agent_notifications')
                    .select('*, agents!inner(name, city)')
                    .eq('type', 'coaching_alert')
                    .eq('is_read', false)
                    .order('created_at', { ascending: false });

                if (data) setAlerts(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchAlerts();
    }, []);

    const dismissAlert = async (id) => {
        try {
            await supabase.from('agent_notifications').update({ is_read: true }).eq('id', id);
            setAlerts(prev => prev.filter(a => a.id !== id));
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Checking network health...</div>;

    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">DO Coaching Center</h1>
            <p className="text-slate-600 mb-8">Identify bottlenecks, zero production nodes, and low persistency risks across the network.</p>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <ul className="divide-y divide-slate-200">
                    {alerts.length === 0 ? (
                        <li className="p-6 text-center text-slate-500">All clear! No coaching alerts detected.</li>
                    ) : (
                        alerts.map(alert => (
                            <li key={alert.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center space-x-2 mb-1">
                                        <h3 className="text-sm font-bold text-slate-900">{alert.agents.name} ({alert.agents.city})</h3>
                                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 uppercase">Risk</span>
                                    </div>
                                    <p className="text-sm text-slate-700">{alert.message}</p>
                                    <p className="text-xs text-slate-400 mt-2">Detected: {new Date(alert.created_at).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-md text-sm transition">
                                        Message Agent
                                    </button>
                                    <button onClick={() => dismissAlert(alert.id)} className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-md text-sm transition">
                                        Dismiss
                                    </button>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}
