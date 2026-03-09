'use client';

import React, { useState, useEffect } from 'react';

const GrowthContent = () => {
    const [generating, setGenerating] = useState({ campaigns: false, forecast: false, suggestions: false });
    const [data, setData] = useState({ campaigns: [], forecasts: [], suggestions: [] });
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/ai/growth');
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error('Failed to load growth data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleGenerate = async (target) => {
        setGenerating(prev => ({ ...prev, [target]: true }));
        try {
            const res = await fetch('/api/admin/ai/growth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: target })
            });
            const json = await res.json();
            if (json.success) {
                await loadData();
            } else {
                alert(`Failed to generate ${target}: ` + json.error);
            }
        } catch (error) {
            alert('Failed to reach AI generator.');
        } finally {
            setGenerating(prev => ({ ...prev, [target]: false }));
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full pb-10">
            <div className="admin-page-header">
                <div>
                    <h1>AI Growth & Campaign Intelligence</h1>
                    <p>Automated conversion forecasts, traffic analysis, and actionable growth strategies.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Campaigns Dashboard */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <span className="text-orange-500">📢</span> Campaign Intelligence
                        </h3>
                        <button onClick={() => handleGenerate('campaigns')} disabled={generating.campaigns} className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1 rounded text-xs font-bold transition disabled:opacity-50">
                            {generating.campaigns ? 'Analyzing...' : 'Deep Scan'}
                        </button>
                    </div>
                    <div className="p-5 flex-grow overflow-y-auto max-h-96">
                        {loading ? <div className="text-center text-slate-500">Loading...</div> : data.campaigns?.length > 0 ? (
                            <div className="space-y-4">
                                {data.campaigns.map((c, i) => (
                                    <div key={i} className="border border-slate-100 bg-slate-50 p-3 rounded">
                                        <div className="font-bold text-sm text-slate-800 uppercase text-xs mb-1">Source: {c.source}</div>
                                        <p className="text-sm text-slate-600">{c.ai_insight}</p>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-center text-slate-500 text-sm py-10">No campaign insights generated.</div>}
                    </div>
                </div>

                {/* Conversion Forecasts */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <span className="text-blue-500">🔮</span> Predictive Funnel Analysis
                        </h3>
                        <button onClick={() => handleGenerate('forecast')} disabled={generating.forecast} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded text-xs font-bold transition disabled:opacity-50">
                            {generating.forecast ? 'Forecasting...' : 'Run Forecast'}
                        </button>
                    </div>
                    <div className="p-5 flex-grow overflow-y-auto max-h-96">
                        {loading ? <div className="text-center text-slate-500">Loading...</div> : data.forecasts?.length > 0 ? (
                            <div className="space-y-4">
                                {data.forecasts.map((f, i) => (
                                    <div key={i} className="border border-blue-100 bg-white p-4 rounded-lg shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Predicting: {new Date(f.forecast_date).toLocaleDateString()}</span>
                                            <span className="text-xs text-slate-400">{new Date(f.generated_at).toLocaleString()}</span>
                                        </div>
                                        <div className="flex gap-6 mb-3">
                                            <div>
                                                <div className="text-xs text-slate-400 uppercase font-semibold">Expected Leads</div>
                                                <div className="text-2xl font-black text-slate-800">{f.expected_leads}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-400 uppercase font-semibold">Expected Conversions</div>
                                                <div className="text-2xl font-black text-green-600">{f.expected_conversions}</div>
                                            </div>
                                        </div>
                                        <div className="bg-blue-50 text-blue-900 border border-blue-100 p-3 rounded text-sm">
                                            {f.ai_reasoning}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-center text-slate-500 text-sm py-10">No conversion forecasts projected yet.</div>}
                    </div>
                </div>
            </div>

            {/* Growth Suggestions */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <span className="text-green-500">🌱</span> Automated Growth Suggestions
                    </h3>
                    <button onClick={() => handleGenerate('suggestions')} disabled={generating.suggestions} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:bg-slate-400 flex items-center gap-2">
                        <span>🧪</span> {generating.suggestions ? 'Simulating...' : 'Generate Strategies'}
                    </button>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500 font-medium">Loading Strategies...</div>
                ) : data.suggestions?.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {data.suggestions.map((sug, i) => (
                            <div key={i} className="p-5 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-lg font-bold text-slate-900">{sug.title}</h4>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${sug.potential_impact === 'high' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                        Impact: {sug.potential_impact}
                                    </span>
                                </div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Type: {sug.suggestion_type.replace('_', ' ')}</div>
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">{sug.description}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400">Generated: {new Date(sug.created_at).toLocaleString()}</span>
                                    {sug.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded border border-blue-200 transition">Execute / Build</button>
                                            <button className="text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 px-3 py-1 rounded border border-red-200 transition">Dismiss</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-10 text-center text-slate-500 flex flex-col items-center">
                        <span className="text-4xl mb-3 opacity-50">🚀</span>
                        <h4 className="text-md font-bold mb-1">No pending growth experiments.</h4>
                        <p className="text-sm">Click the button above to discover untouched audience pipelines.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GrowthContent;
