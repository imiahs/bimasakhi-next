'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

// Initialize Supabase client safely
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function GrowthDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        scoreDistribution: [],
        routingStats: [],
        marketingSource: [],
        agentPerformance: [],
        recentLogs: []
    });

    useEffect(() => {
        if (supabase) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Lead Score Distribution
            const { data: scoreData } = await supabase.from('leads').select('lead_score');
            const distribution = [
                { name: '0-20', count: 0 },
                { name: '21-40', count: 0 },
                { name: '41-60', count: 0 },
                { name: '61-80', count: 0 },
                { name: '81-100', count: 0 },
            ];
            scoreData?.forEach(l => {
                const s = l.lead_score || 0;
                if (s <= 20) distribution[0].count++;
                else if (s <= 40) distribution[1].count++;
                else if (s <= 60) distribution[2].count++;
                else if (s <= 80) distribution[3].count++;
                else distribution[4].count++;
            });

            // 2. Marketing Source Performance
            const { data: trafficData } = await supabase
                .from('traffic_sources')
                .select('source, leads')
                .order('leads', { ascending: false })
                .limit(5);

            // 3. Agent Conversion
            const { data: agentData } = await supabase
                .from('agent_business_metrics')
                .select('agent_id, leads_assigned, leads_converted')
                .order('leads_assigned', { ascending: false })
                .limit(5);

            // 4. Recent AI logs
            const { data: logs } = await supabase
                .from('ai_decision_logs')
                .select('id, lead_id, decision_type, decision_reason, created_at')
                .order('created_at', { ascending: false })
                .limit(10);

            setData({
                scoreDistribution: distribution,
                marketingSource: trafficData || [],
                agentPerformance: agentData || [],
                recentLogs: logs || []
            });
        } catch (err) {
            console.error('Dashboard Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading Growth Insights...</div>;
    if (!supabase) return <div className="p-8 text-center text-rose-400 font-semibold">Database configuration missing. Please check your environment variables.</div>;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-white">AI Growth Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Score Distribution */}
                <div className="admin-panel rounded-2xl p-5">
                    <h2 className="text-base font-semibold text-slate-200 mb-4">Lead Score Distribution</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.scoreDistribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Marketing Sources */}
                <div className="admin-panel rounded-2xl p-5">
                    <h2 className="text-base font-semibold text-slate-200 mb-4">Top Lead Sources</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.marketingSource}
                                    dataKey="leads"
                                    nameKey="source"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label
                                >
                                    {data.marketingSource.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Agent Performance */}
                <div className="admin-panel rounded-2xl p-5">
                    <h2 className="text-base font-semibold text-slate-200 mb-4">Agent Performance (Leads Assigned vs Converted)</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.agentPerformance} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="agent_id" type="category" tick={false} width={0} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="leads_assigned" name="Assigned" fill="#93c5fd" />
                                <Bar dataKey="leads_converted" name="Converted" fill="#1e40af" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Automation Logs */}
                <div className="admin-panel rounded-2xl p-5 overflow-hidden">
                    <h2 className="text-base font-semibold text-slate-200 mb-4">Recent AI Events</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="border-b border-white/[0.06] bg-white/[0.03]">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium text-slate-400">Type</th>
                                    <th className="px-4 py-2 text-left font-medium text-slate-400">Reason</th>
                                    <th className="px-4 py-2 text-left font-medium text-slate-400">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {data.recentLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-white/[0.03]">
                                        <td className="px-4 py-2 capitalize font-semibold text-emerald-400">{log.decision_type}</td>
                                        <td className="px-4 py-2 text-slate-400 truncate max-w-xs">{log.decision_reason}</td>
                                        <td className="px-4 py-2 text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
