'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import './SEO.css';

const FILTERS = [
    { id: 'all', label: 'All surfaces' },
    { id: 'structured-safe', label: 'Structured safe' },
    { id: 'partially-structured', label: 'Partially structured' },
    { id: 'structured-content', label: 'Structured content' },
    { id: 'metadata-structured', label: 'Metadata structured' },
    { id: 'seo-structured', label: 'SEO structured' },
    { id: 'helper-fragmented', label: 'Helper fragmented' },
    { id: 'read-only', label: 'Read only' },
    { id: 'static-runtime', label: 'Static runtime' },
    { id: 'runtime-live', label: 'Runtime live' },
    { id: 'hidden-runtime', label: 'Hidden runtime' },
    { id: 'fragile', label: 'Needs attention' },
];

function formatLabel(value) {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildRouteActionLinks(route) {
    const candidates = [
        { href: route.structured_editor_path, label: route.structured_editor_label },
        { href: route.metadata_editor_path, label: route.metadata_editor_label },
        { href: route.content_editor_path, label: route.content_editor_label },
        { href: route.seo_editor_path, label: route.seo_editor_label },
        { href: route.related_editor_path, label: route.related_editor_label },
    ].filter((link) => link.href && link.label);

    const seen = new Set();

    return candidates.filter((link) => {
        const key = `${link.href}|${link.label}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

const SEOContent = () => {
    const searchParams = useSearchParams();
    const [routes, setRoutes] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [filterMode, setFilterMode] = useState('all');
    const [autoOpenedPath, setAutoOpenedPath] = useState(null);

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
    const requestedPath = searchParams.get('path');

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

    useEffect(() => {
        if (!requestedPath) {
            return;
        }

        const normalizedPath = requestedPath === '/' ? '/' : `/${String(requestedPath).replace(/^\/+/, '')}`;

        if (loading || isEditing || autoOpenedPath === normalizedPath) {
            return;
        }

        const matchedRoute = routes.find((route) => route.page_path === normalizedPath || route.path === normalizedPath);
        if (!matchedRoute) {
            return;
        }

        setSearchText(normalizedPath);

        if (matchedRoute.supports_seo_override) {
            handleEdit(matchedRoute);
        }

        setAutoOpenedPath(normalizedPath);
    }, [autoOpenedPath, isEditing, loading, requestedPath, routes]);

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

        if (filterMode === 'structured-safe') {
            return route.structured_classification === 'STRUCTURED_SAFE';
        }

        if (filterMode === 'partially-structured') {
            return route.structured_classification === 'PARTIALLY_STRUCTURED';
        }

        if (filterMode === 'structured-content') {
            return route.supports_structured_content;
        }

        if (filterMode === 'metadata-structured') {
            return route.supports_structured_metadata;
        }

        if (filterMode === 'seo-structured') {
            return route.supports_structured_seo;
        }

        if (filterMode === 'helper-fragmented') {
            return (route.structured_authority_labels || []).includes('HELPER_FRAGMENTED');
        }

        if (filterMode === 'read-only') {
            return route.structured_classification === 'READ_ONLY_BY_DESIGN';
        }

        if (filterMode === 'static-runtime') {
            return (route.authority_labels || []).includes('STATIC_RUNTIME');
        }

        if (filterMode === 'hidden-runtime') {
            return (route.authority_labels || []).includes('HIDDEN_RUNTIME');
        }

        if (filterMode === 'fragile') {
            return route.structured_classification === 'OWNERSHIP_FRAGILE'
                || route.structured_registry_durability === 'REGISTRY_FRAGILE'
                || route.snapshot_version_readiness === 'VERSIONING_FRAGILE'
                || route.authority_risk === 'AUTHORITY_FRAGILE'
                || route.override_state === 'stored_only'
                || route.editability_classification === 'EDITABILITY_FRAGILE'
                || route.editability_durability === 'EDITABILITY_FRAGILE';
        }

        return true;
    });

    return (
        <div className="admin-seo-wrapper">
            {!isEditing ? (
                <>
                    <div className="admin-page-header">
                        <h1>Canonical Structured Authority</h1>
                        <p>Registry view of runtime-compatible structured ownership, metadata authority, SEO continuity, and bounded editor lanes. Structured visibility is emitted only where an existing tracked surface already owns that lane.</p>
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
                                        <span className="seo-summary-label">Structured safe</span>
                                        <strong>{summary.structured_safe}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Partially structured</span>
                                        <strong>{summary.partially_structured}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Structured content</span>
                                        <strong>{summary.structured_content}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Metadata structured</span>
                                        <strong>{summary.metadata_structured}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">SEO structured</span>
                                        <strong>{summary.seo_structured}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Read only</span>
                                        <strong>{summary.structured_read_only}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Runtime live</span>
                                        <strong>{summary.runtime_live}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Helper fragmented</span>
                                        <strong>{summary.helper_fragmented}</strong>
                                    </div>
                                    <div className="seo-summary-card warning">
                                        <span className="seo-summary-label">Ownership fragile</span>
                                        <strong>{summary.ownership_fragile}</strong>
                                    </div>
                                    <div className="seo-summary-card">
                                        <span className="seo-summary-label">Snapshot survivable</span>
                                        <strong>{summary.snapshot_survivable}</strong>
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
                                {filteredRoutes.map((route) => {
                                    const actionLinks = buildRouteActionLinks(route);
                                    const authorityLabels = route.structured_authority_labels || route.editable_authority_labels || route.authority_labels || [];

                                    return (
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
                                            disabled={!route.supports_seo_edit}
                                            title={route.supports_seo_edit ? 'Edit runtime SEO override' : 'Runtime SEO override is not wired for this surface'}
                                        >
                                            {route.supports_seo_edit ? 'Edit Override' : 'Read Only'}
                                        </button>
                                    </div>

                                    <div className="seo-authority-row">
                                        {authorityLabels.map((label) => (
                                            <span key={`${route.id}-${label}`} className="seo-authority-badge">{formatLabel(label)}</span>
                                        ))}
                                    </div>

                                    <div className="seo-snippet-preview">
                                        <div className="seo-preview-url">https://bimasakhi.com{route.path}</div>
                                        <h3 className="seo-preview-title">{route.effective_title || route.title}</h3>
                                        <p className="seo-preview-desc">{route.effective_description || route.desc}</p>
                                    </div>

                                    <div className="seo-route-details">
                                        <span><strong>Structured:</strong> {formatLabel(route.structured_classification || 'read_only_by_design')}</span>
                                        <span><strong>Structured durability:</strong> {formatLabel(route.structured_durability || 'partially_durable')}</span>
                                        <span><strong>Registry durability:</strong> {formatLabel(route.structured_registry_durability || 'partially_durable')}</span>
                                        <span><strong>Versioning:</strong> {formatLabel(route.snapshot_version_readiness || 'partially_survivable')}</span>
                                        <span><strong>Owner model:</strong> {formatLabel(route.structured_owner_model || 'file_route_runtime')}</span>
                                        <span><strong>Storage lane:</strong> {route.structured_storage_lane || 'runtime_file'}</span>
                                        <span><strong>Override state:</strong> {formatLabel(route.override_state || 'none')}</span>
                                        <span><strong>Runtime:</strong> {route.runtime_live ? 'Live' : 'Not live'}</span>
                                        <span><strong>Scope:</strong> {formatLabel(route.visibility_scope || 'public')}</span>
                                        <span><strong>Boundary:</strong> {formatLabel(route.boundary_classification || 'partially_bounded')}</span>
                                        <span><strong>Durability:</strong> {formatLabel(route.durability_classification || 'partially_durable')}</span>
                                        <span><strong>Structured content:</strong> {route.supports_structured_content ? 'Owned' : 'No'}</span>
                                        <span><strong>Metadata structure:</strong> {route.supports_structured_metadata ? 'Owned' : 'No'}</span>
                                        <span><strong>SEO structure:</strong> {route.supports_structured_seo ? 'Owned' : 'No'}</span>
                                        <span><strong>Metadata lane:</strong> {route.supports_metadata_edit ? 'Editable' : 'Read only'}</span>
                                        <span><strong>Content lane:</strong> {route.supports_content_edit ? 'Editable' : 'Read only'}</span>
                                        <span><strong>Layout:</strong> {route.layout_protected ? 'Protected' : 'Editable'}</span>
                                        <span><strong>Canonical:</strong> {route.canonical_url || 'Runtime default'}</span>
                                        <span><strong>Robots:</strong> {route.robots_setting || 'Runtime default'}</span>
                                        {route.runtime_owner_file ? <span><strong>Owner file:</strong> {route.runtime_owner_file}</span> : null}
                                        {route.shadow_path ? <span><strong>Shadow path:</strong> {route.shadow_path}</span> : null}
                                    </div>

                                    {route.note ? <p className="seo-route-note">{route.note}</p> : null}

                                    <div className="seo-route-actions">
                                        {actionLinks.map((link) => (
                                            <a key={`${route.id}-${link.href}-${link.label}`} className="seo-editor-link" href={link.href}>{link.label}</a>
                                        ))}
                                    </div>
                                </div>
                                );})}
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
