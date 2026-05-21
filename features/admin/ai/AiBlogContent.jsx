'use client';

import React, { useState } from 'react';

const AiBlogContent = () => {
    const [topic, setTopic] = useState('');
    const [promptFields, setPromptFields] = useState({
        prompt_template_id: '',
        role: '',
        tone: '',
        keywords: '',
        location: '',
        intent: 'blog',
    });
    const [templates, setTemplates] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState(null);

    React.useEffect(() => {
        async function loadTemplates() {
            try {
                const res = await fetch('/api/admin/cms/structure?resource=prompt_templates&limit=100', {
                    credentials: 'include',
                    cache: 'no-store',
                });
                const data = await res.json();
                if (data.success) {
                    setTemplates((data.rows || []).filter((row) => row.status !== 'archived'));
                }
            } catch {
                setTemplates([]);
            }
        }

        loadTemplates();
    }, []);

    const handleGenerate = async (action) => {
        if (!topic.trim()) return;
        setGenerating(true);
        setResult(null);

        try {
            const res = await fetch('/api/admin/blog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate',
                    topic,
                    intent: promptFields.intent || 'blog',
                    prompt_template_id: promptFields.prompt_template_id || null,
                    role: promptFields.role,
                    tone: promptFields.tone,
                    keywords: promptFields.keywords,
                    location: promptFields.location,
                }),
                credentials: 'include',
            });
            const data = await res.json();
            if (data.success) {
                setResult(`Blog draft created: ${data.post?.title || topic}\nSlug: ${data.post?.slug || '--'}\nPrompt source: ${data.prompt_source || 'fallback'}`);
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

                <div className="grid md:grid-cols-3 gap-3 mb-4">
                    <select
                        value={promptFields.prompt_template_id}
                        onChange={(event) => setPromptFields((current) => ({ ...current, prompt_template_id: event.target.value }))}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Fallback / default template</option>
                        {templates.map((template) => (
                            <option key={template.id} value={template.id}>{template.name || template.id}</option>
                        ))}
                    </select>
                    <input value={promptFields.role} onChange={(event) => setPromptFields((current) => ({ ...current, role: event.target.value }))} placeholder="Role" className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input value={promptFields.tone} onChange={(event) => setPromptFields((current) => ({ ...current, tone: event.target.value }))} placeholder="Tone" className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input value={promptFields.keywords} onChange={(event) => setPromptFields((current) => ({ ...current, keywords: event.target.value }))} placeholder="Keywords" className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input value={promptFields.location} onChange={(event) => setPromptFields((current) => ({ ...current, location: event.target.value }))} placeholder="Location" className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input value={promptFields.intent} onChange={(event) => setPromptFields((current) => ({ ...current, intent: event.target.value }))} placeholder="Intent" className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => handleGenerate('generate-blog')}
                        disabled={generating || !topic}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition disabled:bg-slate-400"
                    >
                        Generate Blog Draft
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
