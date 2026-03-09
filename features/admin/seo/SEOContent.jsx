'use client';

import React, { useState, useEffect } from 'react';
import './SEO.css';

const defaultRoutes = [
    { id: 1, path: '/', title: 'Bima Sakhi - LIC Agency Career for Women (Delhi NCR)', desc: 'Join Bima Sakhi, a premier LIC agency career platform for women in Delhi NCR. High commission structure with full mentorship.' },
    { id: 2, path: '/why', title: 'Why Become Bima Sakhi? – LIC Career Benefits', desc: 'Secure your financial independence. Discover the benefits of becoming an LIC agent with Bima Sakhi.' },
    { id: 3, path: '/income', title: 'LIC Agent Income Calculator | Bima Sakhi', desc: 'Calculate your potential earnings as an LIC agent with our free commission calculator.' },
    { id: 4, path: '/eligibility', title: 'LIC Agent Eligibility & Requirements | Bima Sakhi', desc: 'Check if you qualify to become an LIC Bima Sakhi agent. Education, age, document requirements.' },
    { id: 5, path: '/apply', title: 'Apply to Become an LIC Agent | Bima Sakhi', desc: 'Start your journey with LIC today. Submit your application for the Bima Sakhi program.' },
];

const SEOContent = () => {
    const [routes, setRoutes] = useState(defaultRoutes);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal states
    const [isEditing, setIsEditing] = useState(false);
    const [currentRoute, setCurrentRoute] = useState(null);
    const [formData, setFormData] = useState({
        meta_title: '',
        meta_description: '',
        og_image: ''
    });

    // AI States
    const [analyzing, setAnalyzing] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState(null);

    useEffect(() => {
        fetchOverrides();
    }, []);

    const fetchOverrides = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/admin/seo');

            if (!res.ok) {
                throw new Error('API returned an error');
            }

            const data = await res.json();

            if (data.overrides) {
                // Merge database overrides into defaultRoutes
                const mergedPaths = defaultRoutes.map(defRoute => {
                    const dbOverride = data.overrides.find(o => o.page_path === defRoute.path);
                    if (dbOverride) {
                        return {
                            ...defRoute,
                            title: dbOverride.meta_title || defRoute.title,
                            desc: dbOverride.meta_description || defRoute.desc,
                            og_image: dbOverride.og_image || ''
                        };
                    }
                    return defRoute;
                });

                // Also add any routes that were only in DB but not in defaultRoutes
                data.overrides.forEach(dbOverride => {
                    if (!mergedPaths.find(p => p.path === dbOverride.page_path)) {
                        mergedPaths.push({
                            id: Math.random(),
                            path: dbOverride.page_path,
                            title: dbOverride.meta_title,
                            desc: dbOverride.meta_description,
                            og_image: dbOverride.og_image || ''
                        });
                    }
                });

                setRoutes(mergedPaths);
            }
        } catch (err) {
            console.error('Failed to fetch SEO overrides', err);
            setError('System is currently offline or degraded. Unable to load SEO overrides at this time.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (route) => {
        setCurrentRoute(route);
        setFormData({
            meta_title: route.title || '',
            meta_description: route.desc || '',
            og_image: route.og_image || ''
        });
        setIsEditing(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/seo', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    page_path: currentRoute.path,
                    meta_title: formData.meta_title,
                    meta_description: formData.meta_description,
                    og_image: formData.og_image
                })
            });

            if (res.ok) {
                setIsEditing(false);
                fetchOverrides();
            } else {
                alert('Save failed.');
            }
        } catch (error) {
            console.error('Error saving SEO override', error);
        }
    };

    const handleAiOptimization = async () => {
        setAnalyzing(true);
        setAiSuggestions(null);
        try {
            const res = await fetch('/api/admin/seo/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    page_path: currentRoute.path,
                    page_title: formData.meta_title || currentRoute.title,
                    page_description: formData.meta_description || currentRoute.desc
                })
            });
            const data = await res.json();
            if (data.success) {
                setAiSuggestions(data.analysis);
            } else {
                alert('AI Analysis failed: ' + data.error);
            }
        } catch (error) {
            alert('Failed to reach AI optimizer.');
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="admin-seo-wrapper">
            {!isEditing ? (
                <>
                    <div className="admin-page-header">
                        <h1>Global SEO Manager</h1>
                        <p>Override metadata, canonicals, and preview Google Search snippets. Injected dynamically via the core Page Layout component.</p>
                    </div>

                    {loading ? (
                        <p style={{ padding: '20px' }}>Loading SEO Routes...</p>
                    ) : error ? (
                        <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-200">
                            <strong>Service Alert: </strong> {error}
                        </div>
                    ) : (
                        <div className="seo-routes-grid">
                            {routes.map(route => (
                                <div key={route.id} className="seo-route-card">
                                    <div className="seo-route-header">
                                        <span className="route-path">{route.path}</span>
                                        <button className="btn-edit" onClick={() => handleEdit(route)}>✏️ Edit Metadata</button>
                                    </div>

                                    <div className="seo-snippet-preview">
                                        <div className="seo-preview-url">https://bimasakhi.com{route.path}</div>
                                        <h3 className="seo-preview-title">{route.title}</h3>
                                        <p className="seo-preview-desc">{route.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="blog-editor-view">
                    <div className="admin-page-header flex justify-between items-center w-full max-w-2xl">
                        <div>
                            <h1>Edit Metadata</h1>
                            <p>Path: <strong>{currentRoute?.path}</strong></p>
                        </div>
                        <div className="flex gap-3">
                            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-medium disabled:bg-slate-300" onClick={handleAiOptimization} disabled={analyzing}>
                                {analyzing ? 'Analyzing...' : '✨ AI Optimize'}
                            </button>
                            <button className="btn-secondary" onClick={() => { setIsEditing(false); setAiSuggestions(null); }}>Cancel</button>
                        </div>
                    </div>

                    <form className="blog-editor-form" style={{ maxWidth: '800px' }} onSubmit={handleSave}>
                        <div className="form-group">
                            <label>Meta Title ({formData.meta_title.length} / 60 chars)</label>
                            <input
                                type="text"
                                value={formData.meta_title}
                                onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                                maxLength={80}
                                required
                            />
                            <div style={{ height: '4px', background: '#e2e8f0', marginTop: '6px', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min((formData.meta_title.length / 60) * 100, 100)}%`, background: formData.meta_title.length > 60 ? '#ef4444' : '#3b82f6' }} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Meta Description ({formData.meta_description.length} / 160 chars)</label>
                            <textarea
                                value={formData.meta_description}
                                onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                                maxLength={200}
                                rows="4"
                                required
                            />
                            <div style={{ height: '4px', background: '#e2e8f0', marginTop: '6px', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min((formData.meta_description.length / 160) * 100, 100)}%`, background: formData.meta_description.length > 160 ? '#ef4444' : '#10b981' }} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>OpenGraph Image URL (Optional)</label>
                            <input
                                type="text"
                                value={formData.og_image}
                                onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
                                placeholder="/uploads/hero-banner.jpg"
                            />
                        </div>

                        <div className="seo-snippet-preview" style={{ marginTop: '30px' }}>
                            <div className="seo-preview-url">https://bimasakhi.com{currentRoute?.path}</div>
                            <h3 className="seo-preview-title">{formData.meta_title || currentRoute?.title}</h3>
                            <p className="seo-preview-desc">{formData.meta_description || currentRoute?.desc}</p>
                        </div>

                        <button type="submit" className="btn-primary" style={{ marginTop: '20px' }}>Save Overrides</button>

                        {aiSuggestions && (
                            <div className="mt-8 p-6 bg-purple-50 border border-purple-100 rounded-xl">
                                <h3 className="text-lg font-bold text-purple-900 mb-4">✨ AI SEO Analysis (Score: {aiSuggestions.score}/100)</h3>

                                <div className="mb-4">
                                    <h4 className="font-semibold text-purple-800">Suggestions:</h4>
                                    <ul className="list-disc pl-5 mt-2 space-y-1 text-purple-700">
                                        {aiSuggestions.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>

                                <div className="mb-4">
                                    <h4 className="font-semibold text-purple-800">Target Keywords generated:</h4>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {aiSuggestions.generated_keywords.map((kw, i) => (
                                            <span key={i} className="px-2 py-1 bg-white text-purple-600 rounded text-sm border border-purple-200">{kw}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            )}
        </div>
    );
};

export default SEOContent;
