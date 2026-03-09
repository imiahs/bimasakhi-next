'use client';

import React, { useState, useEffect } from 'react';

const LandingContent = () => {
    const [generating, setGenerating] = useState(false);
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadAnalyses = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/ai/landing');
            const data = await res.json();
            if (data.analyses) {
                setAnalyses(data.analyses);
            }
        } catch (err) {
            console.error('Failed to load landing analyses', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnalyses();
    }, []);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch('/api/admin/ai/landing', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                await loadAnalyses();
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
                    <h1>Landing Page Optimization</h1>
                    <p>AI-driven analysis of bounce rates, scroll depth, and interaction counts.</p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition disabled:bg-slate-400 flex items-center gap-2 shadow-sm"
                >
                    <span>🔎</span>
                    {generating ? 'Scanning Landing Metrics...' : 'Analyze Landing Pages'}
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <span className="text-teal-600">📊</span> Performance Reports
                    </h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500 font-medium">Loading Analysis Reports...</div>
                ) : analyses.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {analyses.map((rep, i) => (
                            <div key={i} className="p-5 hover:bg-slate-50 transition-colors">
                                <div className="flex flex-wrap md:flex-nowrap justify-between items-start mb-3 gap-4">
                                    <div className="flex-grow">
                                        <h4 className="text-lg font-bold text-slate-900 font-mono text-sm">{rep.page_path}</h4>
                                        <div className="mt-2 flex items-center gap-4 text-sm font-semibold text-slate-600">
                                            <div className="flex flex-col">
                                                <span className="text-xs uppercase tracking-wider text-slate-400">Bounce Rate</span>
                                                <span className={rep.bounce_rate > 70 ? 'text-red-500' : 'text-green-600'}>{rep.bounce_rate}%</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs uppercase tracking-wider text-slate-400">Scroll Depth</span>
                                                <span className={rep.scroll_depth < 30 ? 'text-red-500' : 'text-teal-600'}>{rep.scroll_depth}%</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs uppercase tracking-wider text-slate-400">CTA Interactions</span>
                                                <span className="text-blue-600">{rep.cta_clicks}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-teal-50 text-teal-900 border border-teal-100 p-4 rounded-lg mt-3">
                                    <h5 className="font-bold text-xs uppercase tracking-wider mb-2 opacity-80 flex items-center gap-1">
                                        <span>💡</span> AI Optimization Strategy
                                    </h5>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{rep.ai_optimization_report}</p>
                                </div>
                                <div className="mt-3 text-xs text-slate-400 text-right">
                                    Analyzed: {new Date(rep.analyzed_at).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center flex flex-col items-center">
                        <span className="text-4xl mb-3 opacity-50">🧭</span>
                        <h4 className="text-lg font-bold text-slate-700 mb-1">No Landing Analyses Yet</h4>
                        <p className="text-slate-500 text-sm max-w-md">Click "Analyze Landing Pages" to synthesize interaction logs into actionable structural evaluations.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LandingContent;
