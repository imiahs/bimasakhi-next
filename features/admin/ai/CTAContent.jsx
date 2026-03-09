'use client';

import React, { useState, useEffect } from 'react';

const CTAContent = () => {
    const [generating, setGenerating] = useState(false);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadRecommendations = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/ai/cta');
            const data = await res.json();
            if (data.recommendations) {
                setRecommendations(data.recommendations);
            }
        } catch (err) {
            console.error('Failed to load CTA recommendations', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRecommendations();
    }, []);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch('/api/admin/ai/cta', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                await loadRecommendations();
            } else {
                alert('Generation failed: ' + data.error);
            }
        } catch (error) {
            alert('Failed to reach AI generator.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="admin-page-header flex justify-between items-center">
                <div>
                    <h1>Automated CTA Optimizer</h1>
                    <p>AI-driven rules to dynamically redirect drop-off prone funnels to secondary conversion endpoints.</p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition disabled:bg-slate-400 flex items-center gap-2 shadow-sm"
                >
                    <span>🔁</span>
                    {generating ? 'Calculating Routing Paths...' : 'Generate Call-To-Action Rules'}
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <span className="text-indigo-600">🔀</span> Proposed AI Redirects
                    </h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500 font-medium">Loading Smart CTA Contexts...</div>
                ) : recommendations.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {recommendations.map((rec, i) => (
                            <div key={i} className="p-5 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-slate-100 px-3 py-1 rounded-full border border-slate-300">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Condition:</span>
                                            <span className="ml-2 font-mono text-sm font-semibold text-slate-800">{rec.condition_type}</span>
                                        </div>
                                        <span className="text-slate-400">{'->'}</span>
                                        <div className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                                            <span className="text-xs font-bold text-indigo-500 uppercase">Triggers on:</span>
                                            <span className="ml-2 font-mono text-sm font-semibold text-indigo-800">{rec.condition_value}</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-2">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${rec.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : rec.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            STATUS: {rec.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <span className="text-sm text-slate-500 font-semibold mr-2">Suggested CTA React Component: </span>
                                    <code className="text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 font-bold">{'<'}{rec.suggested_cta_component}{' />'}</code>
                                </div>

                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg mt-3">
                                    <p className="text-sm text-slate-600 italic">"{rec.reasoning}"</p>
                                </div>

                                <div className="mt-4 flex justify-between items-center">
                                    <div className="text-xs text-slate-400">
                                        Proposed on: {new Date(rec.created_at).toLocaleString()}
                                    </div>
                                    {rec.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-1.5 rounded-md border border-indigo-200 shadow-sm transition">Approve Redirect</button>
                                            <button className="text-xs font-medium text-slate-600 hover:text-slate-800 bg-white px-3 py-1.5 rounded-md border border-slate-300 transition">Dismiss</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center flex flex-col items-center">
                        <span className="text-4xl mb-3 opacity-50">🧭</span>
                        <h4 className="text-lg font-bold text-slate-700 mb-1">No CTA Rules Evaluated</h4>
                        <p className="text-slate-500 text-sm max-w-md">Click "Generate Call-To-Action Rules" to discover optimized drop-off redirects.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CTAContent;
