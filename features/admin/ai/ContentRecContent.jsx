'use client';

import React, { useState, useEffect } from 'react';

const ContentRecContent = () => {
    const [generating, setGenerating] = useState(false);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadRecommendations = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/ai/content');
            const data = await res.json();
            if (data.recommendations) {
                setRecommendations(data.recommendations);
            }
        } catch (err) {
            console.error('Failed to load content recommendations', err);
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
            const res = await fetch('/api/admin/ai/content', { method: 'POST' });
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
                    <h1>AI Content Analyzer</h1>
                    <p>Discover which topics drive leads and get AI-generated expansion strategies.</p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition disabled:bg-slate-400 flex items-center gap-2 shadow-sm"
                >
                    <span>🧠</span>
                    {generating ? 'Scanning Content Metrics...' : 'Generate Content Insights'}
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <span className="text-blue-600">📝</span> Active Recommendations
                    </h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500 font-medium">Loading AI Recommendations...</div>
                ) : recommendations.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {recommendations.map((rec, i) => (
                            <div key={i} className="p-5 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900 font-mono text-sm">{rec.target_path}</h4>
                                        <div className="mt-1">
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${rec.recommendation_type === 'fix_dropoff' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                                                {rec.recommendation_type.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-2">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${rec.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : rec.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            {rec.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-blue-50 text-blue-900 border border-blue-100 p-4 rounded-lg mt-3">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{rec.ai_suggestion}</p>
                                </div>
                                <div className="mt-3 flex justify-between items-center">
                                    <div className="text-xs text-slate-400">
                                        Generated: {new Date(rec.created_at).toLocaleString()}
                                    </div>
                                    {rec.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button className="text-xs font-medium text-green-600 hover:text-green-800 bg-green-50 px-3 py-1 rounded border border-green-200 transition">Approve & Apply</button>
                                            <button className="text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 px-3 py-1 rounded border border-red-200 transition">Dismiss</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center flex flex-col items-center">
                        <span className="text-4xl mb-3 opacity-50">📰</span>
                        <h4 className="text-lg font-bold text-slate-700 mb-1">No Recommendations Yet</h4>
                        <p className="text-slate-500 text-sm max-w-md">Click "Generate Content Insights" to analyze current performance metrics.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentRecContent;
