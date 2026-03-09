'use client';

import React, { useState, useEffect } from 'react';

const RecruiterContent = () => {
    const [predicting, setPredicting] = useState(false);
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadPredictions = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/ai/recruiter');
            const data = await res.json();
            if (data.predictions) {
                setPredictions(data.predictions);
            }
        } catch (err) {
            console.error('Failed to load predictions', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPredictions();
    }, []);

    const handleGeneratePredictions = async () => {
        setPredicting(true);
        try {
            const res = await fetch('/api/admin/ai/recruiter', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                await loadPredictions();
            } else {
                alert('Prediction generator failed: ' + data.error);
            }
        } catch (error) {
            alert('Failed to reach AI generator.');
        } finally {
            setPredicting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="admin-page-header flex justify-between items-center">
                <div>
                    <h1>AI Recruitment Assistant</h1>
                    <p>Predictive conversion analysis and automated follow-up strategies for top leads.</p>
                </div>
                <button
                    onClick={handleGeneratePredictions}
                    disabled={predicting}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition disabled:bg-slate-400 flex items-center gap-2 shadow-sm"
                >
                    <span>🎯</span>
                    {predicting ? 'Analyzing Queues...' : 'Generate New Predictions'}
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <span className="text-purple-600">🤖</span> Top Recommended Actions
                    </h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500 font-medium">Loading AI Predictions...</div>
                ) : predictions.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {predictions.map((pred, i) => (
                            <div key={i} className="p-5 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900">{pred.leads?.full_name || 'Anonymous Lead'}</h4>
                                        <div className="text-sm text-slate-500 flex items-center gap-3 mt-1">
                                            <span>📱 {pred.leads?.mobile || 'No Mobile'}</span>
                                            <span>📍 {pred.leads?.city || 'Unknown City'}</span>
                                            <span className="bg-slate-200 px-2 py-0.5 rounded text-xs text-slate-700 font-medium uppercase">{pred.leads?.status || 'New'}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Conversion Prob.</div>
                                        <div className={`text-2xl font-black ${pred.conversion_probability >= 75 ? 'text-green-600' : pred.conversion_probability >= 40 ? 'text-orange-500' : 'text-red-500'}`}>
                                            {pred.conversion_probability}%
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-purple-50 text-purple-900 border border-purple-100 p-4 rounded-lg">
                                    <h5 className="font-bold text-sm mb-1 uppercase tracking-wider opacity-80 flex items-center gap-2">
                                        <span>💡</span> AI Recommended Action
                                    </h5>
                                    <p className="text-sm leading-relaxed">{pred.recommended_action}</p>
                                </div>
                                <div className="mt-3 text-xs text-slate-400 text-right">
                                    Generated: {new Date(pred.generated_at).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center flex flex-col items-center">
                        <span className="text-4xl mb-3 opacity-50">📭</span>
                        <h4 className="text-lg font-bold text-slate-700 mb-1">No Predictions Available</h4>
                        <p className="text-slate-500 text-sm max-w-md">The AI hasn't analyzed any high-scoring leads recently. Click "Generate New Predictions" to analyze the current queue.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecruiterContent;
