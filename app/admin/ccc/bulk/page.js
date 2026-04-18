'use client';
import { useState, useEffect, useCallback } from 'react';

const STATUS_COLORS = {
    planned: '#6b7280',
    running: '#3b82f6',
    paused: '#f59e0b',
    completed: '#22c55e',
    failed: '#ef4444',
    cancelled: '#9ca3af',
};

export default function BulkPlannerPage() {
    const [jobs, setJobs] = useState([]);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [acting, setActing] = useState(null);

    // Form state
    const [form, setForm] = useState({
        name: '',
        description: '',
        intent_type: 'local_service',
        scope: 'locality',
        city_ids: [],
        base_keyword: 'LIC agent',
        keyword_variations: '',
        content_type: 'local_service',
        auto_approve_threshold: 8.0,
        require_review_below: 6.0,
        daily_publish_limit: 20,
        generation_per_hour_cap: 50,
    });

    const fetchJobs = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/ccc/bulk', { credentials: 'include' });
            const json = await res.json();
            if (json.success) setJobs(json.data || []);
        } catch (err) {
            console.error('Failed to fetch bulk jobs:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCities = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/locations/cities', { credentials: 'include' });
            const json = await res.json();
            if (json.success) setCities(json.data || []);
        } catch {
            // If API doesn't exist, try Supabase directly won't work from client
            // Just leave cities empty - user can type
        }
    }, []);

    useEffect(() => {
        fetchJobs();
        fetchCities();
    }, [fetchJobs, fetchCities]);

    const handleCreateJob = async () => {
        setActing('create');
        try {
            const res = await fetch('/api/admin/ccc/bulk', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    keyword_variations: form.keyword_variations
                        ? form.keyword_variations.split(',').map(k => k.trim()).filter(Boolean)
                        : [],
                }),
            });
            const json = await res.json();
            if (json.success) {
                setShowForm(false);
                setForm({
                    name: '', description: '', intent_type: 'local_service', scope: 'locality',
                    city_ids: [], base_keyword: 'LIC agent', keyword_variations: '',
                    content_type: 'local_service', auto_approve_threshold: 8.0,
                    require_review_below: 6.0, daily_publish_limit: 20, generation_per_hour_cap: 50,
                });
                fetchJobs();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setActing(null);
        }
    };

    const handleAction = async (jobId, action) => {
        if (action === 'start' && !confirm('Start this bulk generation job? This will queue pages for AI generation.')) return;
        if (action === 'cancel' && !confirm('Cancel this job? This cannot be undone.')) return;

        setActing(jobId);
        try {
            const res = await fetch(`/api/admin/ccc/bulk/${jobId}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            const json = await res.json();
            if (json.success) {
                fetchJobs();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setActing(null);
        }
    };

    const toggleCity = (cityId) => {
        setForm(prev => ({
            ...prev,
            city_ids: prev.city_ids.includes(cityId)
                ? prev.city_ids.filter(id => id !== cityId)
                : [...prev.city_ids, cityId],
        }));
    };

    if (loading) {
        return <div style={{ padding: 32, color: '#9ca3af' }}>Loading bulk planner...</div>;
    }

    return (
        <div style={{ padding: 24, maxWidth: 1200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>Bulk Job Planner</h1>
                    <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                        Plan and manage bulk page generation jobs across cities and localities
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        padding: '8px 16px', background: '#3b82f6', color: '#fff',
                        border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                    }}
                >
                    {showForm ? 'Cancel' : '+ New Bulk Job'}
                </button>
            </div>

            {/* Create Job Form */}
            {showForm && (
                <div style={{ background: '#1e293b', borderRadius: 8, padding: 24, marginBottom: 24, border: '1px solid #334155' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>New Bulk Generation Job</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Job Name */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Job Name *</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                placeholder="Delhi Localities — April 2026 Sweep"
                                style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14 }}
                            />
                        </div>

                        {/* Description */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Description</label>
                            <input
                                type="text"
                                value={form.description}
                                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                placeholder="Generate all locality pages for Delhi with LIC agent keyword"
                                style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14 }}
                            />
                        </div>

                        {/* Intent Type */}
                        <div>
                            <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Intent Type *</label>
                            <select
                                value={form.intent_type}
                                onChange={e => setForm(p => ({ ...p, intent_type: e.target.value }))}
                                style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14 }}
                            >
                                <option value="local_service">Local Service</option>
                                <option value="how_to">How To</option>
                                <option value="comparison">Comparison</option>
                                <option value="informational">Informational</option>
                            </select>
                        </div>

                        {/* Base Keyword */}
                        <div>
                            <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Base Keyword *</label>
                            <input
                                type="text"
                                value={form.base_keyword}
                                onChange={e => setForm(p => ({ ...p, base_keyword: e.target.value }))}
                                placeholder="LIC agent"
                                style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14 }}
                            />
                        </div>

                        {/* Keyword Variations */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Keyword Variations (comma-separated)</label>
                            <input
                                type="text"
                                value={form.keyword_variations}
                                onChange={e => setForm(p => ({ ...p, keyword_variations: e.target.value }))}
                                placeholder="LIC advisor, Bima Sakhi, insurance agent"
                                style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14 }}
                            />
                        </div>

                        {/* Cities */}
                        {cities.length > 0 && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 4 }}>
                                    Target Cities (leave empty for all)
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {cities.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => toggleCity(c.id)}
                                            style={{
                                                padding: '4px 12px', borderRadius: 4, fontSize: 13, cursor: 'pointer',
                                                border: form.city_ids.includes(c.id) ? '1px solid #3b82f6' : '1px solid #334155',
                                                background: form.city_ids.includes(c.id) ? '#3b82f622' : '#0f172a',
                                                color: form.city_ids.includes(c.id) ? '#60a5fa' : '#9ca3af',
                                            }}
                                        >
                                            {c.city_name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Safety Settings */}
                        <div>
                            <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Auto-approve if quality ≥</label>
                            <input
                                type="number"
                                step="0.1"
                                min="1"
                                max="10"
                                value={form.auto_approve_threshold}
                                onChange={e => setForm(p => ({ ...p, auto_approve_threshold: parseFloat(e.target.value) }))}
                                style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14 }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Require review if quality &lt;</label>
                            <input
                                type="number"
                                step="0.1"
                                min="1"
                                max="10"
                                value={form.require_review_below}
                                onChange={e => setForm(p => ({ ...p, require_review_below: parseFloat(e.target.value) }))}
                                style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14 }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Daily publish limit</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={form.daily_publish_limit}
                                onChange={e => setForm(p => ({ ...p, daily_publish_limit: parseInt(e.target.value) }))}
                                style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14 }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Generation per hour cap</label>
                            <input
                                type="number"
                                min="1"
                                max="200"
                                value={form.generation_per_hour_cap}
                                onChange={e => setForm(p => ({ ...p, generation_per_hour_cap: parseInt(e.target.value) }))}
                                style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14 }}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => setShowForm(false)}
                            style={{ padding: '8px 16px', background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateJob}
                            disabled={!form.name || !form.base_keyword || acting === 'create'}
                            style={{
                                padding: '8px 20px', background: '#3b82f6', color: '#fff',
                                border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                                opacity: (!form.name || !form.base_keyword || acting === 'create') ? 0.5 : 1,
                            }}
                        >
                            {acting === 'create' ? 'Creating...' : 'Create Job'}
                        </button>
                    </div>
                </div>
            )}

            {/* Jobs List */}
            {jobs.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#6b7280', background: '#1e293b', borderRadius: 8 }}>
                    No bulk jobs yet. Create your first bulk generation job.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {jobs.map(job => (
                        <div key={job.id} style={{ background: '#1e293b', borderRadius: 8, padding: 20, border: '1px solid #334155' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{job.name}</h3>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                            color: STATUS_COLORS[job.status], background: `${STATUS_COLORS[job.status]}22`,
                                            textTransform: 'uppercase',
                                        }}>
                                            {job.status}
                                        </span>
                                    </div>
                                    {job.description && (
                                        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{job.description}</p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {job.status === 'planned' && (
                                        <button
                                            onClick={() => handleAction(job.id, 'start')}
                                            disabled={acting === job.id}
                                            style={{
                                                padding: '6px 14px', background: '#22c55e22', color: '#22c55e',
                                                border: '1px solid #22c55e44', borderRadius: 4, cursor: 'pointer',
                                                fontSize: 12, fontWeight: 600,
                                            }}
                                        >
                                            {acting === job.id ? '...' : 'Start'}
                                        </button>
                                    )}
                                    {job.status === 'running' && (
                                        <button
                                            onClick={() => handleAction(job.id, 'pause')}
                                            disabled={acting === job.id}
                                            style={{
                                                padding: '6px 14px', background: '#f59e0b22', color: '#f59e0b',
                                                border: '1px solid #f59e0b44', borderRadius: 4, cursor: 'pointer',
                                                fontSize: 12, fontWeight: 600,
                                            }}
                                        >
                                            Pause
                                        </button>
                                    )}
                                    {job.status === 'paused' && (
                                        <button
                                            onClick={() => handleAction(job.id, 'resume')}
                                            disabled={acting === job.id}
                                            style={{
                                                padding: '6px 14px', background: '#3b82f622', color: '#3b82f6',
                                                border: '1px solid #3b82f644', borderRadius: 4, cursor: 'pointer',
                                                fontSize: 12, fontWeight: 600,
                                            }}
                                        >
                                            Resume
                                        </button>
                                    )}
                                    {['planned', 'running', 'paused'].includes(job.status) && (
                                        <button
                                            onClick={() => handleAction(job.id, 'cancel')}
                                            disabled={acting === job.id}
                                            style={{
                                                padding: '6px 14px', background: '#ef444422', color: '#ef4444',
                                                border: '1px solid #ef444444', borderRadius: 4, cursor: 'pointer',
                                                fontSize: 12, fontWeight: 600,
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {job.total_pages > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                                        <span>Progress: {job.generated_count}/{job.total_pages} generated</span>
                                        <span>{job.total_pages > 0 ? Math.round((job.generated_count / job.total_pages) * 100) : 0}%</span>
                                    </div>
                                    <div style={{ height: 6, background: '#0f172a', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', borderRadius: 3,
                                            width: `${job.total_pages > 0 ? (job.generated_count / job.total_pages) * 100 : 0}%`,
                                            background: STATUS_COLORS[job.status] || '#3b82f6',
                                            transition: 'width 0.3s',
                                        }} />
                                    </div>
                                </div>
                            )}

                            {/* Stats Grid */}
                            <div style={{ display: 'flex', gap: 24, fontSize: 13, flexWrap: 'wrap' }}>
                                <div>
                                    <span style={{ color: '#6b7280' }}>Keyword: </span>
                                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{job.base_keyword}</span>
                                </div>
                                <div>
                                    <span style={{ color: '#6b7280' }}>Intent: </span>
                                    <span style={{ color: '#e2e8f0' }}>{job.intent_type}</span>
                                </div>
                                <div>
                                    <span style={{ color: '#6b7280' }}>Generated: </span>
                                    <span style={{ color: '#22c55e' }}>{job.generated_count}</span>
                                </div>
                                <div>
                                    <span style={{ color: '#6b7280' }}>Approved: </span>
                                    <span style={{ color: '#3b82f6' }}>{job.approved_count}</span>
                                </div>
                                <div>
                                    <span style={{ color: '#6b7280' }}>Published: </span>
                                    <span style={{ color: '#22c55e' }}>{job.published_count}</span>
                                </div>
                                <div>
                                    <span style={{ color: '#6b7280' }}>Failed: </span>
                                    <span style={{ color: job.failed_count > 0 ? '#ef4444' : '#6b7280' }}>{job.failed_count}</span>
                                </div>
                                <div>
                                    <span style={{ color: '#6b7280' }}>Daily limit: </span>
                                    <span style={{ color: '#e2e8f0' }}>{job.daily_publish_limit}/day</span>
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>
                                Created: {new Date(job.created_at).toLocaleString()}
                                {job.created_by && ` by ${job.created_by}`}
                                {job.started_at && ` | Started: ${new Date(job.started_at).toLocaleString()}`}
                                {job.completed_at && ` | Completed: ${new Date(job.completed_at).toLocaleString()}`}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ marginTop: 24, padding: 12, background: '#0f172a', borderRadius: 8, fontSize: 12, color: '#6b7280' }}>
                Bible: Phase 4 (Bulk Job Planner) | Section 10-12 | Sub-modules: 4a DB, 4b planner UI, 4c job runner, 4d progress monitor
            </div>
        </div>
    );
}
