'use client';

import React, { useState, useEffect } from 'react';
import { FunnelChart, Funnel, Tooltip, LabelList, ResponsiveContainer } from 'recharts';

const AnalyticsContent = () => {
    const [analyzing, setAnalyzing] = useState(false);
    const [aiInsight, setAiInsight] = useState(null);
    const [eventData, setEventData] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const [eventsRes, dashRes] = await Promise.all([
                    fetch('/api/admin/events'),
                    fetch('/api/admin/analytics/dashboard')
                ]);

                const eventsJson = await eventsRes.json();
                const dashJson = await dashRes.json();

                if (eventsJson.success) setEventData(eventsJson);
                if (dashJson.topPages) setDashboardData(dashJson);

            } catch (err) {
                console.error("Failed to fetch analytics", err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);
    // removed duplicate aiInsight

    const handleAnalyzeLeads = async () => {
        setAnalyzing(true);
        setAiInsight(null);
        try {
            const res = await fetch('/api/admin/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'lead-analysis',
                    prompt: 'Analyze current leads and traffic data to generate an actionable insight.',
                    context: {}
                })
            });
            const data = await res.json();
            if (data.success) {
                setAiInsight(data.result);
            } else {
                alert('AI Analysis failed: ' + data.error);
            }
        } catch (error) {
            alert('Failed to reach AI analyzer.');
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="admin-page-header">
                <h1>Funnel & Lead Analytics</h1>
                <p>Granular traffic source analysis, drop-off rates, and CRM conversions.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">Traffic Acquisition Channels</h3>
                    <button
                        onClick={handleAnalyzeLeads}
                        disabled={analyzing}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition disabled:bg-slate-400 flex items-center gap-2"
                    >
                        <span>✨</span>
                        {analyzing ? 'Analyzing Lead Data...' : 'AI Lead Intelligence'}
                    </button>
                </div>

                {aiInsight && (
                    <div className="mb-6 p-4 bg-purple-50 border border-purple-100 rounded-lg text-purple-900">
                        <h4 className="font-bold mb-1">🤖 AI Actionable Insight</h4>
                        <p className="text-sm leading-relaxed">{aiInsight}</p>
                    </div>
                )}

                <div className="h-64 flex flex-col justify-center bg-slate-50 border border-slate-200 rounded-lg p-4">
                    {loading ? (
                        <span className="text-slate-500 font-medium text-center">Loading Analytics...</span>
                    ) : eventData ? (
                        <div className="grid grid-cols-2 gap-4 h-full">
                            <div className="bg-white p-4 rounded border border-slate-200 flex flex-col justify-center items-center">
                                <span className="text-3xl font-bold text-blue-600">{eventData.eventStats.page_view || 0}</span>
                                <span className="text-slate-500 text-sm font-semibold uppercase">Total Views</span>
                            </div>
                            <div className="bg-white p-4 rounded border border-slate-200 flex flex-col justify-center items-center">
                                <span className="text-3xl font-bold text-green-600">{eventData.eventStats.form_submission || 0}</span>
                                <span className="text-slate-500 text-sm font-semibold uppercase">Form Submits</span>
                            </div>
                            <div className="bg-white p-4 rounded border border-slate-200 flex flex-col justify-center items-center">
                                <span className="text-3xl font-bold text-orange-600">{eventData.eventStats.calculator_used || 0}</span>
                                <span className="text-slate-500 text-sm font-semibold uppercase">Calculator Uses</span>
                            </div>
                            <div className="bg-white p-4 rounded border border-slate-200 flex flex-col justify-center items-center">
                                <span className="text-3xl font-bold text-purple-600">{eventData.eventStats.resource_downloaded || 0}</span>
                                <span className="text-slate-500 text-sm font-semibold uppercase">Downloads</span>
                            </div>
                        </div>
                    ) : (
                        <span className="text-slate-500 font-medium text-center">No Event Data Available</span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Top Viewed Pages</h3>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                        {loading ? (
                            <div className="p-4 text-center text-slate-500">Loading...</div>
                        ) : eventData?.topPaths?.length > 0 ? (
                            <ul className="divide-y divide-slate-200">
                                {eventData.topPaths.map((path, idx) => (
                                    <li key={idx} className="p-3 flex justify-between items-center text-sm hover:bg-white">
                                        <span className="font-mono text-blue-600 truncate mr-2" title={path.route_path}>{path.route_path}</span>
                                        <span className="font-bold text-slate-700 bg-slate-200 px-2 py-1 rounded">{path.count} views</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-4 text-center text-slate-500 text-sm">No page interaction data logged yet.</div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Recent Event Stream</h3>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden h-64 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-slate-500">Loading stream...</div>
                        ) : eventData?.recentFeed?.length > 0 ? (
                            <ul className="divide-y divide-slate-200">
                                {eventData.recentFeed.map((event, idx) => (
                                    <li key={idx} className="p-3 text-xs flex flex-col hover:bg-white">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-slate-800 uppercase">{event.event_type}</span>
                                            <span className="text-slate-400 font-mono">{new Date(event.created_at).toLocaleTimeString()}</span>
                                        </div>
                                        <span className="text-slate-600 truncate">{event.route_path}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-4 text-center text-slate-500 text-sm">No events recorded.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Phase 19: Lead Intelligence Dashboards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Conversion Funnel Drop-off</h3>
                    <div className="h-72 w-full bg-slate-50 border border-slate-200 rounded-lg p-4">
                        {loading ? (
                            <div className="text-center text-slate-500 pt-10">Loading Funnel...</div>
                        ) : dashboardData?.funnelData?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <FunnelChart>
                                    <Tooltip />
                                    <Funnel
                                        dataKey="value"
                                        data={dashboardData.funnelData}
                                        isAnimationActive
                                        fill="#8884d8"
                                    >
                                        <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                                    </Funnel>
                                </FunnelChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-slate-500 text-sm pt-10">Funnel data unavailable</div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Highest Scoring Leads</h3>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden h-72 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-slate-500">Loading stream...</div>
                        ) : dashboardData?.topScores?.length > 0 ? (
                            <ul className="divide-y divide-slate-200">
                                {dashboardData.topScores.map((sc, idx) => (
                                    <li key={idx} className="p-3 flex items-center justify-between hover:bg-white text-sm">
                                        <div>
                                            <p className="font-bold text-slate-800">
                                                {sc.lead_cache?.full_name || 'Anonymous User'}
                                            </p>
                                            <p className="text-xs text-slate-500">Ref: {sc.lead_id?.substring(0, 8)}... | {sc.score_reason}</p>
                                        </div>
                                        <div className="flex-shrink-0 bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full border border-green-200">
                                            {sc.score} PTS
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-4 text-center text-slate-500 text-sm">No scored leads yet.</div>
                        )}
                    </div>
                </div>

            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
                <h3 className="text-lg font-semibold mb-4 text-slate-800">Top Traffic Sources</h3>
                <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                    {loading ? (
                        <div className="p-4 text-center text-slate-500">Loading sources...</div>
                    ) : dashboardData?.topTraffic?.length > 0 ? (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 border-b border-slate-200">
                                <tr>
                                    <th className="p-3 font-semibold text-slate-600">Source</th>
                                    <th className="p-3 font-semibold text-slate-600">Visits</th>
                                    <th className="p-3 font-semibold text-slate-600">Leads</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {dashboardData.topTraffic.map((t, i) => (
                                    <tr key={i} className="hover:bg-white transition-colors">
                                        <td className="p-3 font-medium text-slate-700 uppercase">{t.source}</td>
                                        <td className="p-3">{t.visits}</td>
                                        <td className="p-3 text-green-600 font-bold">{t.leads}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-4 text-center text-slate-500 text-sm">No traffic attribution recorded.</div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default AnalyticsContent;
