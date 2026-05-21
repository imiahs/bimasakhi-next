'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { buildPagePrompt, getSystemPrompt } from '@/lib/ai/promptTemplates';

const PAGE_SIZE = 10;
const DEFAULT_PAGEGEN_AUDIENCE = 'women aged 25-45 from middle-class families looking for financial independence';

const STATUS_COLORS = {
    planned: '#6b7280',
    running: '#3b82f6',
    paused: '#f59e0b',
    completed: '#22c55e',
    failed: '#ef4444',
    cancelled: '#94a3b8',
};

const PANEL_STYLE = {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 12,
};

const INPUT_STYLE = {
    width: '100%',
    padding: '10px 12px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 14,
};

const SMALL_INPUT_STYLE = {
    ...INPUT_STYLE,
    padding: '8px 10px',
    fontSize: 13,
};

const STATUS_OPTIONS = ['all', 'planned', 'running', 'paused', 'completed', 'failed', 'cancelled'];

function formatDate(value) {
    if (!value) {
        return '--';
    }

    try {
        return new Date(value).toLocaleString();
    } catch {
        return String(value);
    }
}

function labelize(value) {
    return String(value || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
}

function buildButtonStyle(tone = 'secondary', disabled = false, selected = false) {
    const base = {
        padding: '7px 14px',
        borderRadius: 7,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid transparent',
        opacity: disabled ? 0.55 : 1,
        transition: 'opacity 0.2s ease',
        whiteSpace: 'nowrap',
    };

    if (tone === 'primary') {
        return {
            ...base,
            background: '#2563eb',
            color: '#ffffff',
            borderColor: '#2563eb',
        };
    }

    if (tone === 'success') {
        return {
            ...base,
            background: '#14532d',
            color: '#86efac',
            borderColor: '#166534',
        };
    }

    if (tone === 'warning') {
        return {
            ...base,
            background: '#3f2a02',
            color: '#fbbf24',
            borderColor: '#92400e',
        };
    }

    if (tone === 'danger') {
        return {
            ...base,
            background: '#3f1d1d',
            color: '#fca5a5',
            borderColor: '#7f1d1d',
        };
    }

    if (tone === 'ghost') {
        return {
            ...base,
            background: selected ? '#1d4ed822' : 'transparent',
            color: selected ? '#93c5fd' : '#cbd5e1',
            borderColor: selected ? '#2563eb' : '#334155',
        };
    }

    return {
        ...base,
        background: selected ? '#1d4ed822' : '#0f172a',
        color: selected ? '#93c5fd' : '#e2e8f0',
        borderColor: selected ? '#2563eb' : '#334155',
    };
}

function getDisplayStatus(job) {
    return job?.effective_status || job?.status || 'planned';
}

function getProgress(job) {
    const total = Math.max(job?.queue_total_items || 0, job?.total_pages || 0, 0);
    const current = Math.max(job?.generated_count || 0, job?.queue_progress || 0, 0);
    const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

    return { total, current, percent };
}

function buildListPath({ page, status, search, createdFrom, createdTo }) {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        status,
    });

    if (search.trim()) {
        params.set('search', search.trim());
    }

    if (createdFrom) {
        params.set('created_from', createdFrom);
    }

    if (createdTo) {
        params.set('created_to', createdTo);
    }

    return `/api/admin/ccc/bulk?${params.toString()}`;
}

function getScopeSummary(job) {
    const cityCount = Array.isArray(job?.city_ids) ? job.city_ids.length : 0;
    const localityCount = Array.isArray(job?.locality_ids) ? job.locality_ids.length : 0;
    const pincodeCount = Array.isArray(job?.pincode_list) ? job.pincode_list.length : 0;

    const parts = [
        `${labelize(job?.scope || 'locality')} scope`,
        `${cityCount} cities`,
        `${localityCount} localities`,
    ];

    if (pincodeCount > 0) {
        parts.push(`${pincodeCount} pincodes`);
    }

    return parts.join(' • ');
}

function getFailureCount(jobs) {
    return (jobs || []).filter((job) => getDisplayStatus(job) === 'failed').length;
}

function slugifyPromptSegment(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'area';
}

function MetricCard({ label, value, accent }) {
    return (
        <div style={{ ...PANEL_STYLE, padding: 16, minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: accent || '#64748b', fontWeight: 700 }}>
                {label}
            </div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: '#f8fafc' }}>
                {value}
            </div>
        </div>
    );
}

function InfoRow({ label, value, accent }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
            <span style={{ color: '#94a3b8' }}>{label}</span>
            <span style={{ color: accent || '#e2e8f0', fontWeight: 600, textAlign: 'right' }}>{value}</span>
        </div>
    );
}

export default function BulkPlannerPage() {
    const [jobs, setJobs] = useState([]);
    const [summary, setSummary] = useState({
        total_jobs: 0,
        page_jobs: 0,
        running_jobs: 0,
        planned_jobs: 0,
        paused_jobs: 0,
        completed_jobs: 0,
        failed_jobs: 0,
    });
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
    const [cities, setCities] = useState([]);
    const [promptTemplates, setPromptTemplates] = useState([]);
    const [availableLocalities, setAvailableLocalities] = useState([]);
    const [localitiesLoading, setLocalitiesLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [detailError, setDetailError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [acting, setActing] = useState(null);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        created_from: '',
        created_to: '',
    });
    const deferredSearch = useDeferredValue(filters.search);

    const [form, setForm] = useState({
        name: '',
        description: '',
        intent_type: 'local_service',
        scope: 'locality',
        city_ids: [],
        locality_ids: [],
        base_keyword: 'LIC agent',
        keyword_variations: '',
        content_type: 'local_service',
        auto_approve_threshold: 8.0,
        require_review_below: 6.0,
        daily_publish_limit: 20,
        generation_per_hour_cap: 50,
        prompt_template_id: '',
        role: '',
        tone: '',
        keywords: '',
        location: '',
        intent: 'local_service',
    });

    const pageFailureCount = useMemo(() => getFailureCount(jobs), [jobs]);
    const bulkPromptPreview = useMemo(() => {
        const baseKeyword = form.base_keyword.trim();

        if (!baseKeyword) {
            return null;
        }

        const selectedCity = cities.find((city) => form.city_ids.includes(city.id));
        const selectedLocality = availableLocalities.find((locality) => form.locality_ids.includes(locality.id));

        const cityName = selectedCity?.city_name || 'selected city';
        const locationName = form.scope === 'city'
            ? cityName
            : selectedLocality?.locality_name || availableLocalities[0]?.locality_name || 'selected locality';
        const sampleSlug = form.scope === 'city'
            ? `bima-sakhi-${slugifyPromptSegment(cityName)}`
            : `bima-sakhi-${slugifyPromptSegment(cityName)}-${slugifyPromptSegment(locationName)}`;
        const sampleKeyword = `${baseKeyword} in ${locationName}`;

        return {
            cityName,
            locationName,
            audience: DEFAULT_PAGEGEN_AUDIENCE,
            role: form.role || 'default',
            tone: form.tone || 'default',
            promptTemplate: promptTemplates.find((template) => template.id === form.prompt_template_id)?.name || 'Fallback / default',
            sampleSlug,
            sampleKeyword,
            usesPlaceholder: !selectedCity || (form.scope === 'locality' && !selectedLocality),
            systemPrompt: getSystemPrompt(),
            userPrompt: buildPagePrompt({
                city: cityName,
                keyword: sampleKeyword,
                slug: sampleSlug,
                audience: DEFAULT_PAGEGEN_AUDIENCE,
            }),
        };
    }, [availableLocalities, cities, form.base_keyword, form.city_ids, form.locality_ids, form.prompt_template_id, form.role, form.scope, form.tone, promptTemplates]);

    const fetchJobDetail = useCallback(async (jobId) => {
        if (!jobId) {
            setSelectedJob(null);
            setDetailError(null);
            return;
        }

        setDetailLoading(true);
        setDetailError(null);

        try {
            const response = await fetch(`/api/admin/ccc/bulk/${jobId}`, {
                credentials: 'include',
                cache: 'no-store',
            });
            const json = await response.json();

            if (!response.ok || json.success === false) {
                throw new Error(json.error || 'Failed to load job detail');
            }

            setSelectedJob(json.data || null);
        } catch (detailErr) {
            setSelectedJob(null);
            setDetailError(detailErr.message);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const fetchJobs = useCallback(async (pageOverride = pagination.page, preferredJobId = null) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(buildListPath({
                page: pageOverride,
                status: filters.status,
                search: deferredSearch,
                createdFrom: filters.created_from,
                createdTo: filters.created_to,
            }), {
                credentials: 'include',
                cache: 'no-store',
            });
            const json = await response.json();

            if (!response.ok || json.success === false) {
                throw new Error(json.error || 'Failed to fetch bulk jobs');
            }

            const nextJobs = json.data || [];
            setJobs(nextJobs);
            setSummary(json.summary || {
                total_jobs: 0,
                page_jobs: 0,
                running_jobs: 0,
                planned_jobs: 0,
                paused_jobs: 0,
                completed_jobs: 0,
                failed_jobs: 0,
            });
            setPagination({
                page: json.page || pageOverride,
                totalPages: json.totalPages || 1,
                total: json.total || 0,
                limit: json.limit || PAGE_SIZE,
            });

            const candidateId = preferredJobId || selectedJobId;
            const nextSelectedId = nextJobs.find((job) => job.id === candidateId)?.id || nextJobs[0]?.id || null;
            setSelectedJobId(nextSelectedId);
            if (!nextSelectedId) {
                setSelectedJob(null);
            }
        } catch (fetchErr) {
            setJobs([]);
            setSummary({
                total_jobs: 0,
                page_jobs: 0,
                running_jobs: 0,
                planned_jobs: 0,
                paused_jobs: 0,
                completed_jobs: 0,
                failed_jobs: 0,
            });
            setPagination({ page: pageOverride, totalPages: 1, total: 0, limit: PAGE_SIZE });
            setSelectedJobId(null);
            setSelectedJob(null);
            setError(fetchErr.message);
        } finally {
            setLoading(false);
        }
    }, [deferredSearch, filters.created_from, filters.created_to, filters.status, pagination.page, selectedJobId]);

    const fetchCities = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/locations/cities', { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                setCities(json.data || []);
            }
        } catch {
            setCities([]);
        }
    }, []);

    useEffect(() => {
        fetchCities();
    }, [fetchCities]);

    useEffect(() => {
        async function fetchPromptTemplates() {
            try {
                const response = await fetch('/api/admin/cms/structure?resource=prompt_templates&limit=100', {
                    credentials: 'include',
                    cache: 'no-store',
                });
                const json = await response.json();
                if (json.success) {
                    setPromptTemplates((json.rows || []).filter((row) => row.status !== 'archived'));
                }
            } catch {
                setPromptTemplates([]);
            }
        }

        fetchPromptTemplates();
    }, []);

    useEffect(() => {
        fetchJobs(pagination.page);
    }, [fetchJobs, pagination.page]);

    useEffect(() => {
        fetchJobDetail(selectedJobId);
    }, [fetchJobDetail, selectedJobId]);

    useEffect(() => {
        setPagination((current) => ({ ...current, page: 1 }));
    }, [deferredSearch, filters.created_from, filters.created_to, filters.status]);

    useEffect(() => {
        if (form.city_ids.length === 0 || form.scope !== 'locality') {
            setAvailableLocalities([]);
            return;
        }

        const loadLocalities = async () => {
            setLocalitiesLoading(true);
            try {
                const collected = [];
                for (const cityId of form.city_ids) {
                    const response = await fetch(`/api/admin/locations/localities?city_id=${cityId}`, { credentials: 'include' });
                    const json = await response.json();
                    if (json.success) {
                        collected.push(...(json.data || []));
                    }
                }
                setAvailableLocalities(collected);
            } catch {
                setAvailableLocalities([]);
            } finally {
                setLocalitiesLoading(false);
            }
        };

        loadLocalities();
    }, [form.city_ids, form.scope]);

    const setNotice = (text, tone = 'info') => {
        setMessage({ text, tone });
    };

    const resetForm = () => {
        setForm({
            name: '',
            description: '',
            intent_type: 'local_service',
            scope: 'locality',
            city_ids: [],
            locality_ids: [],
            base_keyword: 'LIC agent',
            keyword_variations: '',
            content_type: 'local_service',
            auto_approve_threshold: 8.0,
            require_review_below: 6.0,
            daily_publish_limit: 20,
            generation_per_hour_cap: 50,
            prompt_template_id: '',
            role: '',
            tone: '',
            keywords: '',
            location: '',
            intent: 'local_service',
        });
    };

    const handleCreateJob = async () => {
        setActing('create');
        setError(null);

        try {
            const response = await fetch('/api/admin/ccc/bulk', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    keyword_variations: form.keyword_variations
                        ? form.keyword_variations.split(',').map((entry) => entry.trim()).filter(Boolean)
                        : [],
                    prompt_template_id: form.prompt_template_id || null,
                    role: form.role,
                    tone: form.tone,
                    keywords: form.keywords,
                    location: form.location,
                    intent: form.intent,
                }),
            });

            const json = await response.json();
            if (!response.ok || json.success === false) {
                throw new Error(json.error || 'Failed to create bulk job');
            }

            resetForm();
            setShowForm(false);
            setPagination((current) => ({ ...current, page: 1 }));
            await fetchJobs(1, json.data?.id || null);
            setNotice('Bulk job created. Operator history updated.', 'success');
        } catch (createErr) {
            setError(createErr.message);
        } finally {
            setActing(null);
        }
    };

    const handleAction = async (jobId, action, isGlobal = false) => {
        if (action === 'start' && !window.confirm('Start this bulk generation job? This will queue pages for AI generation.')) {
            return;
        }

        if (action === 'cancel' && !window.confirm('Cancel this job and stop remaining queue work?')) {
            return;
        }

        if (action === 'retry_failed' && !window.confirm(isGlobal
            ? 'Retry all failed bulk jobs currently attached to failed queue rows?'
            : 'Retry this failed bulk job?')) {
            return;
        }

        if (action === 'clear_failed' && !window.confirm(isGlobal
            ? 'Clear failed queue artifacts for all failed bulk jobs?'
            : 'Clear failed queue artifacts for this job?')) {
            return;
        }

        const actionKey = isGlobal ? `global:${action}` : `${jobId}:${action}`;
        setActing(actionKey);
        setError(null);

        try {
            const endpoint = isGlobal ? '/api/admin/ccc/bulk' : `/api/admin/ccc/bulk/${jobId}`;
            const response = await fetch(endpoint, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isGlobal ? { action } : { action, id: jobId }),
            });
            const json = await response.json();

            if (!response.ok || json.success === false) {
                throw new Error(json.error || 'Bulk action failed');
            }

            await fetchJobs(pagination.page, jobId || selectedJobId);
            if (!isGlobal && jobId) {
                await fetchJobDetail(jobId);
            } else if (selectedJobId) {
                await fetchJobDetail(selectedJobId);
            }

            setNotice(json.message || `${labelize(action)} completed.`, 'success');
        } catch (actionErr) {
            setError(actionErr.message);
        } finally {
            setActing(null);
        }
    };

    const toggleCity = (cityId) => {
        setForm((current) => {
            const cityIds = current.city_ids.includes(cityId)
                ? current.city_ids.filter((value) => value !== cityId)
                : [...current.city_ids, cityId];

            return {
                ...current,
                city_ids: cityIds,
                locality_ids: [],
            };
        });
    };

    const toggleLocality = (localityId) => {
        setForm((current) => ({
            ...current,
            locality_ids: current.locality_ids.includes(localityId)
                ? current.locality_ids.filter((value) => value !== localityId)
                : [...current.locality_ids, localityId],
        }));
    };

    const selectAllLocalities = () => {
        setForm((current) => ({
            ...current,
            locality_ids: availableLocalities.map((entry) => entry.id),
        }));
    };

    const clearAllLocalities = () => {
        setForm((current) => ({ ...current, locality_ids: [] }));
    };

    const renderRowActions = (job) => {
        const displayStatus = getDisplayStatus(job);
        const isBusy = acting && acting.startsWith(`${job.id}:`);

        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                    type="button"
                    onClick={() => setSelectedJobId(job.id)}
                    style={buildButtonStyle('ghost', false, selectedJobId === job.id)}
                >
                    Details
                </button>

                {displayStatus === 'planned' && (
                    <button type="button" onClick={() => handleAction(job.id, 'start')} disabled={isBusy} style={buildButtonStyle('success', isBusy)}>
                        {acting === `${job.id}:start` ? 'Starting...' : 'Start'}
                    </button>
                )}

                {displayStatus === 'running' && (
                    <>
                        <button type="button" onClick={() => handleAction(job.id, 'pause')} disabled={isBusy} style={buildButtonStyle('warning', isBusy)}>
                            {acting === `${job.id}:pause` ? 'Pausing...' : 'Pause'}
                        </button>
                        <button type="button" onClick={() => handleAction(job.id, 'cancel')} disabled={isBusy} style={buildButtonStyle('danger', isBusy)}>
                            {acting === `${job.id}:cancel` ? 'Cancelling...' : 'Cancel'}
                        </button>
                    </>
                )}

                {displayStatus === 'paused' && (
                    <>
                        <button type="button" onClick={() => handleAction(job.id, 'resume')} disabled={isBusy} style={buildButtonStyle('primary', isBusy)}>
                            {acting === `${job.id}:resume` ? 'Resuming...' : 'Resume'}
                        </button>
                        <button type="button" onClick={() => handleAction(job.id, 'cancel')} disabled={isBusy} style={buildButtonStyle('danger', isBusy)}>
                            {acting === `${job.id}:cancel` ? 'Cancelling...' : 'Cancel'}
                        </button>
                    </>
                )}

                {displayStatus === 'failed' && (
                    <>
                        <button type="button" onClick={() => handleAction(job.id, 'retry_failed')} disabled={isBusy} style={buildButtonStyle('primary', isBusy)}>
                            {acting === `${job.id}:retry_failed` ? 'Retrying...' : 'Retry Failed'}
                        </button>
                        <button type="button" onClick={() => handleAction(job.id, 'clear_failed')} disabled={isBusy} style={buildButtonStyle('danger', isBusy)}>
                            {acting === `${job.id}:clear_failed` ? 'Clearing...' : 'Clear Failed'}
                        </button>
                    </>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: 24, maxWidth: 1400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Bulk Job Planner</h1>
                    <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 8, maxWidth: 760 }}>
                        Operator control surface for bulk generation history, filters, detail inspection, failure triage, retry, cancel, and queue artifact cleanup.
                    </p>
                </div>
                <button type="button" onClick={() => setShowForm((current) => !current)} style={buildButtonStyle('primary', false)}>
                    {showForm ? 'Close Planner Form' : '+ New Bulk Job'}
                </button>
            </div>

            {message && (
                <div style={{
                    ...PANEL_STYLE,
                    padding: '12px 16px',
                    marginBottom: 16,
                    borderColor: message.tone === 'success' ? '#166534' : '#334155',
                    color: message.tone === 'success' ? '#86efac' : '#cbd5e1',
                }}>
                    {message.text}
                </div>
            )}

            {error && (
                <div style={{
                    ...PANEL_STYLE,
                    padding: '12px 16px',
                    marginBottom: 16,
                    borderColor: '#7f1d1d',
                    color: '#fecaca',
                }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 24 }}>
                <MetricCard label="Total Jobs" value={summary.total_jobs} accent="#60a5fa" />
                <MetricCard label="Running" value={summary.running_jobs} accent="#60a5fa" />
                <MetricCard label="Planned" value={summary.planned_jobs} accent="#94a3b8" />
                <MetricCard label="Completed" value={summary.completed_jobs} accent="#4ade80" />
                <MetricCard label="Failures On Page" value={pageFailureCount} accent="#f87171" />
            </div>

            <div style={{ ...PANEL_STYLE, padding: 18, marginBottom: 24 }}>
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(3, minmax(150px, 0.8fr)) auto', alignItems: 'end' }}>
                    <div>
                        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Search</label>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                            placeholder="Search by job name, description, or keyword"
                            style={SMALL_INPUT_STYLE}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Status</label>
                        <select
                            value={filters.status}
                            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                            style={SMALL_INPUT_STYLE}
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option === 'all' ? 'All statuses' : labelize(option)}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Created From</label>
                        <input
                            type="date"
                            value={filters.created_from}
                            onChange={(event) => setFilters((current) => ({ ...current, created_from: event.target.value }))}
                            style={SMALL_INPUT_STYLE}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Created To</label>
                        <input
                            type="date"
                            value={filters.created_to}
                            onChange={(event) => setFilters((current) => ({ ...current, created_to: event.target.value }))}
                            style={SMALL_INPUT_STYLE}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => handleAction(null, 'retry_failed', true)} disabled={pageFailureCount === 0 || acting === 'global:retry_failed'} style={buildButtonStyle('primary', pageFailureCount === 0 || acting === 'global:retry_failed')}>
                            {acting === 'global:retry_failed' ? 'Retrying...' : 'Retry Failed Jobs'}
                        </button>
                        <button type="button" onClick={() => handleAction(null, 'clear_failed', true)} disabled={pageFailureCount === 0 || acting === 'global:clear_failed'} style={buildButtonStyle('danger', pageFailureCount === 0 || acting === 'global:clear_failed')}>
                            {acting === 'global:clear_failed' ? 'Clearing...' : 'Clear Failed Jobs'}
                        </button>
                    </div>
                </div>
            </div>

            {showForm && (
                <div style={{ ...PANEL_STYLE, padding: 24, marginBottom: 24 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f8fafc', marginBottom: 16 }}>New Bulk Generation Job</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Job Name *</label>
                            <input type="text" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Delhi Localities — April 2026 Sweep" style={INPUT_STYLE} />
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Description</label>
                            <input type="text" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Generate all locality pages for Delhi with LIC agent keyword" style={INPUT_STYLE} />
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Intent Type *</label>
                            <select value={form.intent_type} onChange={(event) => setForm((current) => ({ ...current, intent_type: event.target.value }))} style={INPUT_STYLE}>
                                <option value="local_service">Local Service</option>
                                <option value="how_to">How To</option>
                                <option value="comparison">Comparison</option>
                                <option value="informational">Informational</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Scope *</label>
                            <select value={form.scope} onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value, locality_ids: [] }))} style={INPUT_STYLE}>
                                <option value="city">City-level pages</option>
                                <option value="locality">Locality-level pages</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Base Keyword *</label>
                            <input type="text" value={form.base_keyword} onChange={(event) => setForm((current) => ({ ...current, base_keyword: event.target.value }))} placeholder="LIC agent" style={INPUT_STYLE} />
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Keyword Variations</label>
                            <input type="text" value={form.keyword_variations} onChange={(event) => setForm((current) => ({ ...current, keyword_variations: event.target.value }))} placeholder="LIC advisor, Bima Sakhi, insurance agent" style={INPUT_STYLE} />
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Prompt Template</label>
                            <select value={form.prompt_template_id} onChange={(event) => setForm((current) => ({ ...current, prompt_template_id: event.target.value }))} style={INPUT_STYLE}>
                                <option value="">Fallback / default</option>
                                {promptTemplates.map((template) => (
                                    <option key={template.id} value={template.id}>{template.name || template.id}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Prompt Intent</label>
                            <input type="text" value={form.intent} onChange={(event) => setForm((current) => ({ ...current, intent: event.target.value }))} style={INPUT_STYLE} />
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Prompt Role</label>
                            <input type="text" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} style={INPUT_STYLE} />
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Prompt Tone</label>
                            <input type="text" value={form.tone} onChange={(event) => setForm((current) => ({ ...current, tone: event.target.value }))} style={INPUT_STYLE} />
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Prompt Keywords</label>
                            <input type="text" value={form.keywords} onChange={(event) => setForm((current) => ({ ...current, keywords: event.target.value }))} placeholder="comma separated" style={INPUT_STYLE} />
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Prompt Location Override</label>
                            <input type="text" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} style={INPUT_STYLE} />
                        </div>

                        {cities.length > 0 && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Target Cities</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {cities.map((city) => (
                                        <button key={city.id} type="button" onClick={() => toggleCity(city.id)} style={buildButtonStyle('ghost', false, form.city_ids.includes(city.id))}>
                                            {city.city_name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {form.scope === 'locality' && form.city_ids.length > 0 && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                    <label style={{ fontSize: 12, color: '#94a3b8' }}>Target Localities</label>
                                    {availableLocalities.length > 0 && (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button type="button" onClick={selectAllLocalities} style={buildButtonStyle('ghost', false)}>Select All</button>
                                            <button type="button" onClick={clearAllLocalities} style={buildButtonStyle('ghost', false)}>Clear</button>
                                        </div>
                                    )}
                                </div>

                                {localitiesLoading ? (
                                    <div style={{ fontSize: 12, color: '#94a3b8', padding: 8 }}>Loading localities...</div>
                                ) : availableLocalities.length === 0 ? (
                                    <div style={{ fontSize: 12, color: '#94a3b8', padding: 8 }}>No localities found for the selected cities.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 200, overflowY: 'auto', padding: 4 }}>
                                        {availableLocalities.map((locality) => (
                                            <button key={locality.id} type="button" onClick={() => toggleLocality(locality.id)} style={buildButtonStyle('ghost', false, form.locality_ids.includes(locality.id))}>
                                                {locality.locality_name}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {form.locality_ids.length > 0 && (
                                    <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 4 }}>
                                        {form.locality_ids.length} of {availableLocalities.length} localities selected
                                    </div>
                                )}
                            </div>
                        )}

                        {bulkPromptPreview && (
                            <div style={{ gridColumn: '1 / -1', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#64748b' }}>
                                            AI Prompt Preview
                                        </div>
                                        <p style={{ fontSize: 13, color: '#94a3b8', margin: '8px 0 0' }}>
                                            Uses the live pagegen prompt templates with a sample page derived from the current planner form.
                                        </p>
                                    </div>
                                    {bulkPromptPreview.usesPlaceholder && (
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>
                                            Sample uses placeholder targeting
                                        </span>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 12 }}>
                                    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 12 }}>
                                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>Sample City</div>
                                        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{bulkPromptPreview.cityName}</div>
                                    </div>
                                    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 12 }}>
                                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>Sample Keyword</div>
                                        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{bulkPromptPreview.sampleKeyword}</div>
                                    </div>
                                    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 12 }}>
                                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>Worker Audience</div>
                                        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{bulkPromptPreview.audience}</div>
                                    </div>
                                    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 12 }}>
                                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>Sample Slug</div>
                                        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600, wordBreak: 'break-word' }}>{bulkPromptPreview.sampleSlug}</div>
                                    </div>
                                </div>

                                <details style={{ border: '1px solid #166534', borderRadius: 8, background: '#14532d22', padding: 12, marginBottom: 12 }} open>
                                    <summary style={{ cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#86efac' }}>
                                        User Prompt Preview
                                    </summary>
                                    <pre style={{ marginTop: 12, maxHeight: 260, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, lineHeight: 1.6, color: '#e2e8f0' }}>{bulkPromptPreview.userPrompt}</pre>
                                </details>

                                <details style={{ border: '1px solid #334155', borderRadius: 8, background: '#1e293b', padding: 12 }}>
                                    <summary style={{ cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#cbd5e1' }}>
                                        System Prompt Preview
                                    </summary>
                                    <pre style={{ marginTop: 12, maxHeight: 260, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, lineHeight: 1.6, color: '#e2e8f0' }}>{bulkPromptPreview.systemPrompt}</pre>
                                </details>
                            </div>
                        )}

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Auto-approve if quality ≥</label>
                            <input type="number" step="0.1" min="1" max="10" value={form.auto_approve_threshold} onChange={(event) => setForm((current) => ({ ...current, auto_approve_threshold: Number.parseFloat(event.target.value) || 0 }))} style={INPUT_STYLE} />
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Require review if quality &lt;</label>
                            <input type="number" step="0.1" min="1" max="10" value={form.require_review_below} onChange={(event) => setForm((current) => ({ ...current, require_review_below: Number.parseFloat(event.target.value) || 0 }))} style={INPUT_STYLE} />
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Daily publish limit</label>
                            <input type="number" min="1" max="100" value={form.daily_publish_limit} onChange={(event) => setForm((current) => ({ ...current, daily_publish_limit: Number.parseInt(event.target.value || '0', 10) || 0 }))} style={INPUT_STYLE} />
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Generation per hour cap</label>
                            <input type="number" min="1" max="200" value={form.generation_per_hour_cap} onChange={(event) => setForm((current) => ({ ...current, generation_per_hour_cap: Number.parseInt(event.target.value || '0', 10) || 0 }))} style={INPUT_STYLE} />
                        </div>
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setShowForm(false)} style={buildButtonStyle('secondary', false)}>Cancel</button>
                        <button type="button" onClick={handleCreateJob} disabled={!form.name || !form.base_keyword || acting === 'create'} style={buildButtonStyle('primary', !form.name || !form.base_keyword || acting === 'create')}>
                            {acting === 'create' ? 'Creating...' : 'Create Job'}
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(0, 1.15fr) minmax(360px, 0.95fr)', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {loading && jobs.length === 0 ? (
                        <div style={{ ...PANEL_STYLE, padding: 32, color: '#94a3b8' }}>Loading bulk planner history...</div>
                    ) : jobs.length === 0 ? (
                        <div style={{ ...PANEL_STYLE, padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                            No bulk jobs match the current operator filters.
                        </div>
                    ) : (
                        jobs.map((job) => {
                            const displayStatus = getDisplayStatus(job);
                            const progress = getProgress(job);
                            const selected = selectedJobId === job.id;

                            return (
                                <div key={job.id} style={{
                                    ...PANEL_STYLE,
                                    padding: 20,
                                    borderColor: selected ? '#2563eb' : '#334155',
                                    boxShadow: selected ? '0 0 0 1px rgba(37,99,235,0.35)' : 'none',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc', margin: 0 }}>{job.name}</h3>
                                                <span style={{
                                                    padding: '3px 9px',
                                                    borderRadius: 999,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color: STATUS_COLORS[displayStatus] || '#cbd5e1',
                                                    background: `${STATUS_COLORS[displayStatus] || '#64748b'}22`,
                                                    textTransform: 'uppercase',
                                                }}>
                                                    {displayStatus}
                                                </span>
                                                {job.queue_status && job.queue_status !== displayStatus && (
                                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Queue: {job.queue_status}</span>
                                                )}
                                            </div>
                                            {job.description && (
                                                <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6, marginBottom: 0 }}>{job.description}</p>
                                            )}
                                            <p style={{ fontSize: 12, color: '#64748b', marginTop: 8, marginBottom: 0 }}>{getScopeSummary(job)}</p>
                                        </div>
                                        {renderRowActions(job)}
                                    </div>

                                    {progress.total > 0 && (
                                        <div style={{ marginBottom: 14 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                                                <span>Progress: {progress.current}/{progress.total}</span>
                                                <span>{progress.percent}%</span>
                                            </div>
                                            <div style={{ height: 8, background: '#0f172a', borderRadius: 999, overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${progress.percent}%`,
                                                    background: STATUS_COLORS[displayStatus] || '#3b82f6',
                                                    transition: 'width 0.3s ease',
                                                }} />
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, fontSize: 13, marginBottom: 12 }}>
                                        <InfoRow label="Keyword" value={job.base_keyword || '--'} />
                                        <InfoRow label="Intent" value={labelize(job.intent_type || '--')} />
                                        <InfoRow label="Generated" value={job.generated_count || 0} accent="#4ade80" />
                                        <InfoRow label="Approved" value={job.approved_count || 0} accent="#93c5fd" />
                                        <InfoRow label="Published" value={job.published_count || 0} accent="#4ade80" />
                                        <InfoRow label="Failed" value={job.failed_count || (job.has_failed_queue ? 1 : 0)} accent={displayStatus === 'failed' ? '#fca5a5' : '#e2e8f0'} />
                                    </div>

                                    <div style={{ fontSize: 11, color: '#64748b' }}>
                                        Created: {formatDate(job.created_at)}
                                        {job.created_by ? ` by ${job.created_by}` : ''}
                                        {job.started_at ? ` | Started: ${formatDate(job.started_at)}` : ''}
                                        {job.completed_at ? ` | Completed: ${formatDate(job.completed_at)}` : ''}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                            Showing {jobs.length === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" onClick={() => setPagination((current) => ({ ...current, page: Math.max(1, current.page - 1) }))} disabled={pagination.page <= 1} style={buildButtonStyle('secondary', pagination.page <= 1)}>
                                Previous
                            </button>
                            <button type="button" onClick={() => setPagination((current) => ({ ...current, page: Math.min(current.totalPages, current.page + 1) }))} disabled={pagination.page >= pagination.totalPages} style={buildButtonStyle('secondary', pagination.page >= pagination.totalPages)}>
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 16 }}>
                    <div style={{ ...PANEL_STYLE, padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#64748b' }}>
                                    Job Detail View
                                </div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', margin: '8px 0 0' }}>
                                    {selectedJob?.name || 'Select a bulk job'}
                                </h2>
                            </div>
                            {selectedJob && (
                                <span style={{
                                    padding: '4px 10px',
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: STATUS_COLORS[getDisplayStatus(selectedJob)] || '#cbd5e1',
                                    background: `${STATUS_COLORS[getDisplayStatus(selectedJob)] || '#64748b'}22`,
                                    textTransform: 'uppercase',
                                }}>
                                    {getDisplayStatus(selectedJob)}
                                </span>
                            )}
                        </div>

                        {detailLoading ? (
                            <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading job detail...</div>
                        ) : detailError ? (
                            <div style={{ color: '#fecaca', fontSize: 13 }}>{detailError}</div>
                        ) : !selectedJob ? (
                            <div style={{ color: '#94a3b8', fontSize: 13 }}>Select a bulk job from the history list to inspect queue state, failures, and recent runs.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                                    <div style={{ background: '#0f172a', borderRadius: 10, padding: 14 }}>
                                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>Queue Snapshot</div>
                                        <InfoRow label="Queue ID" value={selectedJob.queue?.id || '--'} />
                                        <InfoRow label="Queue Status" value={selectedJob.queue?.status || 'detached'} accent={STATUS_COLORS[selectedJob.queue?.status] || '#e2e8f0'} />
                                        <InfoRow label="Retry Count" value={selectedJob.queue?.retry_count || 0} />
                                        <InfoRow label="Queued Pages" value={selectedJob.targeting_summary?.queued_pages || 0} />
                                    </div>

                                    <div style={{ background: '#0f172a', borderRadius: 10, padding: 14 }}>
                                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>Targeting</div>
                                        <InfoRow label="Cities" value={selectedJob.targeting_summary?.city_count || 0} />
                                        <InfoRow label="Localities" value={selectedJob.targeting_summary?.locality_count || 0} />
                                        <InfoRow label="Pincodes" value={selectedJob.targeting_summary?.pincode_count || 0} />
                                        <InfoRow label="Keyword" value={selectedJob.base_keyword || '--'} />
                                    </div>

                                    <div style={{ background: '#0f172a', borderRadius: 10, padding: 14 }}>
                                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>Draft Outcome</div>
                                        <InfoRow label="Draft" value={selectedJob.draft_stats?.draft || 0} />
                                        <InfoRow label="Approved" value={selectedJob.draft_stats?.approved || 0} />
                                        <InfoRow label="Rejected" value={selectedJob.draft_stats?.rejected || 0} />
                                        <InfoRow label="Published" value={selectedJob.draft_stats?.published || 0} />
                                    </div>

                                    <div style={{ background: '#0f172a', borderRadius: 10, padding: 14 }}>
                                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>Failure Inspection</div>
                                        <InfoRow label="Has Failure" value={selectedJob.failure_summary?.has_failure ? 'Yes' : 'No'} accent={selectedJob.failure_summary?.has_failure ? '#fca5a5' : '#86efac'} />
                                        <InfoRow label="Failed Runs" value={selectedJob.failure_summary?.failed_runs || 0} />
                                        <InfoRow label="Dead Letters" value={selectedJob.failure_summary?.dead_letters || 0} />
                                        <InfoRow label="Last Error" value={selectedJob.failure_summary?.last_error || '--'} accent={selectedJob.failure_summary?.last_error ? '#fecaca' : '#e2e8f0'} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {selectedJob.failure_summary?.can_retry && (
                                        <button type="button" onClick={() => handleAction(selectedJob.id, 'retry_failed')} disabled={acting === `${selectedJob.id}:retry_failed`} style={buildButtonStyle('primary', acting === `${selectedJob.id}:retry_failed`)}>
                                            {acting === `${selectedJob.id}:retry_failed` ? 'Retrying...' : 'Retry Failed Job'}
                                        </button>
                                    )}
                                    {selectedJob.failure_summary?.can_clear && (
                                        <button type="button" onClick={() => handleAction(selectedJob.id, 'clear_failed')} disabled={acting === `${selectedJob.id}:clear_failed`} style={buildButtonStyle('danger', acting === `${selectedJob.id}:clear_failed`)}>
                                            {acting === `${selectedJob.id}:clear_failed` ? 'Clearing...' : 'Clear Failed Job'}
                                        </button>
                                    )}
                                    {['running', 'paused'].includes(getDisplayStatus(selectedJob)) && (
                                        <button type="button" onClick={() => handleAction(selectedJob.id, 'cancel')} disabled={acting === `${selectedJob.id}:cancel`} style={buildButtonStyle('danger', acting === `${selectedJob.id}:cancel`)}>
                                            {acting === `${selectedJob.id}:cancel` ? 'Cancelling...' : 'Cancel Running Job'}
                                        </button>
                                    )}
                                </div>

                                <div style={{ background: '#0f172a', borderRadius: 10, padding: 14 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginBottom: 10 }}>Recent Queue / Worker History</div>
                                    {(selectedJob.job_runs || []).length === 0 ? (
                                        <div style={{ fontSize: 13, color: '#94a3b8' }}>No job run history recorded for this queue yet.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {selectedJob.job_runs.map((run) => (
                                                <div key={run.id} style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                                                        <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{run.worker_id || 'pagegen-worker'}</span>
                                                        <span style={{ color: STATUS_COLORS[run.status] || '#cbd5e1', fontSize: 11, textTransform: 'uppercase' }}>{run.status}</span>
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#64748b' }}>{formatDate(run.started_at)}{run.finished_at ? ` → ${formatDate(run.finished_at)}` : ''}</div>
                                                    {run.error_message && (
                                                        <div style={{ fontSize: 12, color: '#fecaca', marginTop: 6 }}>{run.error_message}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ background: '#0f172a', borderRadius: 10, padding: 14 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginBottom: 10 }}>Failure Payloads</div>
                                    {(selectedJob.dead_letters || []).length === 0 ? (
                                        <div style={{ fontSize: 13, color: '#94a3b8' }}>No dead-letter payloads linked to this job.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {selectedJob.dead_letters.map((entry) => (
                                                <div key={entry.id} style={{ border: '1px solid #7f1d1d', borderRadius: 8, padding: 10, background: '#3f1d1d22' }}>
                                                    <div style={{ fontSize: 11, color: '#fca5a5', marginBottom: 4 }}>
                                                        {entry.job_class || 'pagegen'} • {formatDate(entry.failed_at || entry.created_at)}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: '#fecaca' }}>{entry.error_message || 'No failure reason recorded.'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ background: '#0f172a', borderRadius: 10, padding: 14 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginBottom: 10 }}>Generation Logs</div>
                                    {(selectedJob.generation_logs || []).length === 0 ? (
                                        <div style={{ fontSize: 13, color: '#94a3b8' }}>No queue timeline events recorded yet.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {selectedJob.generation_logs.map((entry) => (
                                                <div key={entry.id} style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                                        <span style={{ fontSize: 11, color: '#93c5fd', textTransform: 'uppercase' }}>{entry.event_type}</span>
                                                        <span style={{ fontSize: 11, color: '#64748b' }}>{formatDate(entry.created_at)}</span>
                                                    </div>
                                                    <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 6 }}>{entry.message}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ background: '#0f172a', borderRadius: 10, padding: 14 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginBottom: 10 }}>Recent Drafts</div>
                                    {(selectedJob.recent_drafts || []).length === 0 ? (
                                        <div style={{ fontSize: 13, color: '#94a3b8' }}>No drafts linked to this bulk job yet.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {selectedJob.recent_drafts.map((draft) => (
                                                <div key={draft.id} style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                                        <div>
                                                            <div style={{ fontSize: 13, color: '#f8fafc', fontWeight: 600 }}>{draft.page_title || draft.slug}</div>
                                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{draft.slug}</div>
                                                        </div>
                                                        <span style={{ fontSize: 11, color: STATUS_COLORS[draft.status] || '#cbd5e1', textTransform: 'uppercase' }}>{draft.status}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
                                                        <span>{draft.word_count || 0} words</span>
                                                        <span>Quality: {draft.quality_score ?? '--'}</span>
                                                        <span>{formatDate(draft.updated_at || draft.published_at)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ background: '#0f172a', borderRadius: 10, padding: 14 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginBottom: 10 }}>Event / Observability Trace</div>
                                    <div style={{ display: 'grid', gap: 10 }}>
                                        {(selectedJob.event_store || []).slice(0, 6).map((entry) => (
                                            <div key={entry.id} style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                                    <span style={{ fontSize: 11, color: '#93c5fd' }}>{entry.event_name}</span>
                                                    <span style={{ fontSize: 11, color: '#64748b' }}>{formatDate(entry.created_at)}</span>
                                                </div>
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Status: {entry.status || '--'}{typeof entry.retry_count === 'number' ? ` • Retries: ${entry.retry_count}` : ''}</div>
                                            </div>
                                        ))}
                                        {(selectedJob.observability_logs || []).slice(0, 6).map((entry) => (
                                            <div key={entry.id} style={{ border: '1px solid #334155', borderRadius: 8, padding: 10 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                                    <span style={{ fontSize: 11, color: '#cbd5e1' }}>{entry.level || 'INFO'} • {entry.source || 'bulk_planner'}</span>
                                                    <span style={{ fontSize: 11, color: '#64748b' }}>{formatDate(entry.created_at)}</span>
                                                </div>
                                                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{entry.message}</div>
                                            </div>
                                        ))}
                                        {(selectedJob.event_store || []).length === 0 && (selectedJob.observability_logs || []).length === 0 && (
                                            <div style={{ fontSize: 13, color: '#94a3b8' }}>No recent trace rows found for this job.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ ...PANEL_STYLE, padding: 12, fontSize: 12, color: '#64748b' }}>
                        Bible: Phase 4 (Bulk Job Planner) | Operator completion adds search, filters, job history, detail inspection, failure triage, retry, and cancel/clear controls without changing the runtime lane.
                    </div>
                </div>
            </div>
        </div>
    );
}
