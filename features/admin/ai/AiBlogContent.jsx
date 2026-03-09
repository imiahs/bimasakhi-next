'use client';

import React, { useState } from 'react';

const AiBlogContent = () => {
    const [topic, setTopic] = useState('');
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState(null);

    const handleGenerate = async (action) => {
        if (!topic.trim()) return;
        setGenerating(true);
        setResult(null);

        try {
            const res = await fetch('/api/admin/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: action,
                    prompt: `Generate content for topic: ${topic}`,
                    context: { keyword: topic }
                })
            });
            const data = await res.json();
            if (data.success) {
                setResult(data.result);
            } else {
                setResult(`Error: ${data.error}`);
            }
        } catch (error) {
            setResult('Failed to reach AI service.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full p-6">
            <div className="admin-page-header">
                <h1 className="text-2xl font-bold text-slate-800">AI Content Generator</h1>
                <p className="text-slate-500 mt-1">Generate structural outlines and metadata blueprints for the CMS using the AI Engine.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Target Keyword or Topic</label>
                <input
                    type="text"
                    placeholder="e.g. Benefits of LIC Jeevan Anand"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                />

                <div className="flex gap-4">
                    <button
                        onClick={() => handleGenerate('generate-blog-outline')}
                        disabled={generating || !topic}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition disabled:bg-slate-400"
                    >
                        Generate Blog Outline
                    </button>
                    <button
                        onClick={() => handleGenerate('generate-seo-title')}
                        disabled={generating || !topic}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium transition disabled:bg-slate-400"
                    >
                        Draft SEO Title
                    </button>
                    <button
                        onClick={() => handleGenerate('generate-seo-desc')}
                        disabled={generating || !topic}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg font-medium transition disabled:bg-slate-400"
                    >
                        Draft Meta Description
                    </button>
                </div>
            </div>

            {generating && (
                <div className="p-8 text-center text-slate-500 animate-pulse bg-white rounded-xl border border-slate-200">
                    <span className="text-xl">✨</span> Connecting to AI Provider...
                </div>
            )}

            {result && !generating && (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h3 className="font-semibold text-slate-800 mb-4">AI Output:</h3>
                    <pre className="whitespace-pre-wrap text-slate-700 font-sans leading-relaxed">{result}</pre>
                    <button className="mt-4 text-blue-600 font-medium hover:underline text-sm" onClick={() => navigator.clipboard.writeText(result)}>
                        Copy to Clipboard
                    </button>
                </div>
            )}
        </div>
    );
};

export default AiBlogContent;
