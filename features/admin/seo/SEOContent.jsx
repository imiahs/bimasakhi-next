'use client';

import React, { useState, useEffect } from 'react';
import './SEO.css';

const FILTERS = [
    { id: 'all', label: 'All surfaces' },
    { id: 'static-runtime', label: 'Static runtime' },
    { id: 'runtime-live', label: 'Runtime live' },
    { id: 'override-capable', label: 'Override capable' },
    { id: 'hidden-runtime', label: 'Hidden runtime' },
    { id: 'fragile', label: 'Needs attention' },
];

function formatLabel(value) {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

const SEOContent = () => {
    const [routes, setRoutes] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [filterMode, setFilterMode] = useState('all');

    // Modal states
    const [isEditing, setIsEditing] = useState(false);
    const [currentRoute, setCurrentRoute] = useState(null);
    const [formData, setFormData] = useState({
        meta_title: '',
        meta_description: '',
        canonical_url: '',
        robots_setting: '',
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

            setRoutes(Array.isArray(data.surfaces) ? data.surfaces : []);
            setSummary(data.summary || null);
        } catch (err) {
            console.error('Failed to fetch SEO overrides', err);
            setError('System is currently offline or degraded. Unable to load SEO overrides at this time.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (route) => {
        if (!route?.supports_seo_override) {
            return;
        }

        setCurrentRoute(route);
        setFormData({
            meta_title: route.override?.meta_title || route.effective_title || route.title || '',
            meta_description: route.override?.meta_description || route.effective_description || route.desc || '',
            canonical_url: route.override?.canonical_url || route.canonical_url || '',
            robots_setting: route.override?.robots_setting || route.robots_setting || '',
            og_image: route.override?.og_image || route.og_image || ''
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
                    page_path: currentRoute.page_path,
                    meta_title: formData.meta_title,
                    meta_description: formData.meta_description,
                    canonical_url: formData.canonical_url || null,
                    robots_setting: formData.robots_setting || null,
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
                    page_title: formData.meta_title || currentRoute.effective_title || currentRoute.title,
                    page_description: formData.meta_description || currentRoute.effective_description || currentRoute.desc
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

    const filteredRoutes = routes.filter((route) => {
        const normalizedSearch = searchText.trim().toLowerCase();
        const matchesSearch = !normalizedSearch
            || route.path?.toLowerCase().includes(normalizedSearch)
            || route.title?.toLowerCase().includes(normalizedSearch)
            || route.source_label?.toLowerCase().includes(normalizedSearch);

        if (!matchesSearch) {
            return false;
        }

        if (filterMode === 'runtime-live') {
            return route.runtime_live;
        }

        if (filterMode === 'static-runtime') {
            return (route.authority_labels || []).includes('STATIC_RUNTIME');
        }

        if (filterMode === 'override-capable') {
            return route.supports_seo_override;
        }

        if (filterMode === 'hidden-runtime') {
            return (route.authority_labels || []).includes('HIDDEN_RUNTIME');
        }

        if (filterMode === 'fragile') {
            return route.authority_risk === 'AUTHORITY_FRAGILE' || route.override_state === 'stored_only';
        }

        return true;
    });

    return (
        <div className="admin-seo-wrapper">
            {!isEditing ? (
                <>
                    <div className="admin-page-header">
                        <h1>Canonical SEO Authority</h1>
                        <p>Registry view of runtime, CRUD, index, metadata, and SEO authority. Overrides are only editable where the live runtime actually consumes them.</p>
                    </div>

                    {loading ? (
                        <p style={{ padding: '20px' }}>Loading SEO Routes...</p>
                    ) : error ? (
                        <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-200">
                            <strong>Service Alert: </strong> {error}
                        </div>
                    ) : (
                        <>
                            {summary ? (
                                <div className="seo-summary-grid">
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Total surfaces</span>
                                        <strong>{summary.total_surfaces}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Runtime live</span>
                                        <strong>{summary.runtime_live}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Override capable</span>
                                        <strong>{summary.override_capable}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Static runtime</span>
                                        <strong>{summary.static_runtime}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Static wrapped</span>
                                        <strong>{summary.static_wrapped}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Active overrides</span>
                                        <strong>{summary.override_active}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Hidden runtime</span>
                                        <strong>{summary.hidden_runtime}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Bounded surfaces</span>
                                        <strong>{summary.bounded}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Durable surfaces</span>
                                        <strong>{summary.durable}</strong>
                                    </div>
                                    <div className="seo-summary-card warning">
                                        <span className="seo-summary-label">Authority fragile</span>
                                        <strong>{summary.authority_fragile}</strong>
                                    </div>
                                </div>
                            ) : null}

                            <div className="seo-toolbar">
                                <input
                                    type="search"
                                    className="seo-search"
                                    placeholder="Search path, title, or source"
                                    value={searchText}
                                    onChange={(event) => setSearchText(event.target.value)}
                                />
                                <div className="seo-filter-row">
                                    {FILTERS.map((filter) => (
                                        <button
                                            key={filter.id}
                                            type="button"
                                            className={`seo-filter-pill ${filterMode === filter.id ? 'active' : ''}`}
                                            onClick={() => setFilterMode(filter.id)}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="seo-routes-grid">
                                {filteredRoutes.map((route) => (
                                    <div key={route.id} className="seo-route-card">
                                    <div className="seo-route-header">
                                        <div className="seo-route-heading">
                                            <span className="route-path">{route.path}</span>
                                            <div className="seo-meta-row">
                                                <span className="seo-chip">{route.source_label}</span>
                                                <span className={`seo-chip status-${String(route.record_status || 'unknown').toLowerCase().replace(/_/g, '-')}`}>{formatLabel(route.record_status || 'unknown')}</span>
                                                <span className="seo-chip">{formatLabel(route.metadata_strategy)}</span>
                                                <span className={`seo-chip risk-${String(route.authority_risk || 'unknown').toLowerCase().replace(/_/g, '-')}`}>{formatLabel(route.authority_risk)}</span>
                                            </div>
                                        </div>
                                        <button
                                            className="btn-edit"
                                            onClick={() => handleEdit(route)}
                                            disabled={!route.supports_seo_override}
                                            title={route.supports_seo_override ? 'Edit runtime SEO override' : 'Runtime SEO override is not wired for this surface'}
                                        >
                                            {route.supports_seo_override ? 'Edit Override' : 'Read Only'}
                                        </button>
                                    </div>

                                    <div className="seo-authority-row">
                                        {(route.authority_labels || []).map((label) => (
                                            <span key={`${route.id}-${label}`} className="seo-authority-badge">{formatLabel(label)}</span>
                                        ))}
                                    </div>

                                    <div className="seo-snippet-preview">
                                        <div className="seo-preview-url">https://bimasakhi.com{route.path}</div>
                                        <h3 className="seo-preview-title">{route.effective_title || route.title}</h3>
                                        <p className="seo-preview-desc">{route.effective_description || route.desc}</p>
                                    </div>

                                    <div className="seo-route-details">
                                        <span><strong>Override state:</strong> {formatLabel(route.override_state || 'none')}</span>
                                        <span><strong>Runtime:</strong> {route.runtime_live ? 'Live' : 'Not live'}</span>
                                        <span><strong>Scope:</strong> {formatLabel(route.visibility_scope || 'public')}</span>
                                        <span><strong>Boundary:</strong> {formatLabel(route.boundary_classification || 'partially_bounded')}</span>
                                        <span><strong>Durability:</strong> {formatLabel(route.durability_classification || 'partially_durable')}</span>
                                        <span><strong>Canonical:</strong> {route.canonical_url || 'Runtime default'}</span>
                                        <span><strong>Robots:</strong> {route.robots_setting || 'Runtime default'}</span>
                                        {route.runtime_owner_file ? <span><strong>Owner file:</strong> {route.runtime_owner_file}</span> : null}
                                        {route.shadow_path ? <span><strong>Shadow path:</strong> {route.shadow_path}</span> : null}
                                    </div>

                                    {route.note ? <p className="seo-route-note">{route.note}</p> : null}

                                    <div className="seo-route-actions">
                                        {route.editor_path ? (
                                            <a className="seo-editor-link" href={route.editor_path}>{route.editor_label || 'Open admin surface'}</a>
                                        ) : null}
                                    </div>
                                </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            ) : (
                <div className="blog-editor-view">
                    <div className="admin-page-header flex justify-between items-center w-full max-w-2xl">
                        <div>
                            <h1>Edit SEO Override</h1>
                            <p>Path: <strong>{currentRoute?.page_path}</strong></p>
                        </div>
                        <div className="flex gap-3">
                            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-medium disabled:bg-slate-300" onClick={handleAiOptimization} disabled={analyzing}>
                                {analyzing ? 'Analyzing...' : 'AI Optimize'}
                            </button>
                            <button className="btn-secondary" onClick={() => { setIsEditing(false); setAiSuggestions(null); }}>Cancel</button>
                        </div>
                    </div>

                    <form className="blog-editor-form" style={{ maxWidth: '800px' }} onSubmit={handleSave}>
                        <div className="seo-route-note" style={{ marginBottom: '12px' }}>
                            {currentRoute?.note}
                        </div>

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
                            <label>Canonical URL (Optional)</label>
                            <input
                                type="text"
                                value={formData.canonical_url}
                                onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                                placeholder="https://bimasakhi.com/example-path"
                            />
                        </div>

                        <div className="form-group">
                            <label>Robots Setting (Optional)</label>
                            <select
                                value={formData.robots_setting}
                                onChange={(e) => setFormData({ ...formData, robots_setting: e.target.value })}
                            >
                                <option value="">Runtime default</option>
                                <option value="index, follow">index, follow</option>
                                <option value="noindex, follow">noindex, follow</option>
                                <option value="noindex, nofollow">noindex, nofollow</option>
                            </select>
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
                            <div className="seo-preview-url">https://bimasakhi.com{currentRoute?.page_path}</div>
                            <h3 className="seo-preview-title">{formData.meta_title || currentRoute?.effective_title || currentRoute?.title}</h3>
                            <p className="seo-preview-desc">{formData.meta_description || currentRoute?.effective_description || currentRoute?.desc}</p>
                        </div>

                        <button type="submit" className="btn-primary" style={{ marginTop: '20px' }}>Save Overrides</button>

                        {aiSuggestions && (
                            <div className="mt-8 p-6 bg-purple-50 border border-purple-100 rounded-xl">
                                <h3 className="text-lg font-bold text-purple-900 mb-4">✨ AI SEO Analysis (Score: {aiSuggestions.score}/100)</h3>

                                <div className="mb-4">
                                    <h4 className="font-semibold text-purple-800">Suggestions:</h4>
                                    <ul className="list-disc pl-5 mt-2 space-y-1 text-purple-700">
                                        {(aiSuggestions.suggestions || []).map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>

                                <div className="mb-4">
                                    <h4 className="font-semibold text-purple-800">Target Keywords generated:</h4>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(aiSuggestions.generated_keywords || []).map((kw, i) => (
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
