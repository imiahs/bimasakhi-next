'use client';
import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';

const DEFAULT_CONFIG = {
    ai_enabled: false,
    queue_paused: true,
    batch_size: 5,
    crm_auto_routing: false,
    followup_enabled: false
};

/* ── Premium Toggle Switch ── */
function MSwitch({ checked, onChange }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="mc-switch"
            data-state={checked ? 'on' : 'off'}
        >
            <span className="mc-switch-thumb" />
        </button>
    );
}

/* ── Toggle Row ── */
function ToggleRow({ label, description, checked, onChange }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 transition hover:bg-white/[0.04]">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-200">{label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            </div>
            <MSwitch checked={checked || false} onChange={onChange} />
        </div>
    );
}

/* ── Section Card ── */
function SectionCard({ icon, title, subtitle, children }) {
    return (
        <section className="admin-panel mc-card-hover rounded-2xl p-5 lg:p-6">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    {icon}
                </div>
                <div>
                    <h3 className="text-base font-semibold text-white">{title}</h3>
                    <p className="text-xs text-slate-500">{subtitle}</p>
                </div>
            </div>
            <div className="space-y-2">
                {children}
            </div>
        </section>
    );
}

export default function SettingsPage() {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getConfig();
            setConfig({ ...DEFAULT_CONFIG, ...(response?.data || response || {}) });
        } catch (err) {
            console.error('Config load failed', err);
            setToast({ type: 'error', text: 'Failed to load runtime configuration.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfig();
    }, []);

    const handleChange = (key, value) => {
        setConfig((previous) => ({
            ...previous,
            [key]: key === 'batch_size' ? Number(value) : value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);

        try {
            const response = await adminApi.saveConfig(config);
            setConfig({ ...DEFAULT_CONFIG, ...(response?.data || config) });
            setToast({ type: 'success', text: 'Runtime controls updated.' });
        } catch (err) {
            setToast({ type: 'error', text: `Save blocked: ${err.message}` });
        } finally {
            setSaving(false);
            setTimeout(() => setToast(null), 4000);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" />
                    <p className="admin-kicker mt-6">Config sync</p>
                    <p className="mt-2 text-sm text-slate-500">Loading runtime controls...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <section className="admin-panel admin-glow-ring overflow-hidden rounded-2xl px-6 py-6 lg:px-8 lg:py-7">
                <div className="relative">
                    <p className="admin-kicker">System configuration</p>
                    <h1 className="admin-heading-xl mt-3 max-w-2xl">Control the live engine without touching code.</h1>
                    <p className="admin-copy mt-4 max-w-xl text-sm">
                        These switches control CRM routing, queue dispatch, AI scoring, and followup triggers in real-time.
                    </p>

                    {/* Quick status pills */}
                    <div className="mt-6 flex flex-wrap gap-2">
                        {[
                            { label: 'AI', on: config.ai_enabled },
                            { label: 'Queue', on: !config.queue_paused },
                            { label: 'CRM Routing', on: config.crm_auto_routing },
                            { label: 'Followup', on: config.followup_enabled }
                        ].map((item) => (
                            <span
                                key={item.label}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${
                                    item.on
                                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                        : 'border-white/[0.06] bg-white/[0.03] text-slate-500'
                                }`}
                            >
                                <span className={`h-1.5 w-1.5 rounded-full ${item.on ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                                {item.label}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {toast && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${toast.type === 'success' ? 'admin-toast-success' : 'admin-toast-error'}`}>
                    {toast.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 lg:grid-cols-2">
                    {/* Section 1: System Control */}
                    <SectionCard
                        title="System Control"
                        subtitle="Core engine switches"
                        icon={
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                                <path d="M10 2v3M10 15v3M2 10h3M15 10h3" /><circle cx="10" cy="10" r="3" />
                            </svg>
                        }
                    >
                        <ToggleRow
                            label="AI Enabled"
                            description="Gemini scoring and page generation"
                            checked={config.ai_enabled}
                            onChange={(v) => handleChange('ai_enabled', v)}
                        />
                        <ToggleRow
                            label="Queue Paused"
                            description="Stops queue dispatch without deleting jobs"
                            checked={config.queue_paused}
                            onChange={(v) => handleChange('queue_paused', v)}
                        />
                    </SectionCard>

                    {/* Section 2: CRM Pipeline */}
                    <SectionCard
                        title="CRM Pipeline"
                        subtitle="Lead routing and followup"
                        icon={
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                                <circle cx="10" cy="7" r="3.5" /><path d="M3.5 17c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5" />
                            </svg>
                        }
                    >
                        <ToggleRow
                            label="Auto Routing"
                            description="Route new leads into Zoho CRM automatically"
                            checked={config.crm_auto_routing}
                            onChange={(v) => handleChange('crm_auto_routing', v)}
                        />
                        <ToggleRow
                            label="Followup Enabled"
                            description="Post-routing followup when provider is configured"
                            checked={config.followup_enabled}
                            onChange={(v) => handleChange('followup_enabled', v)}
                        />
                    </SectionCard>
                </div>

                {/* Section 3: Worker Config */}
                <SectionCard
                    title="Worker Config"
                    subtitle="Page generation throughput"
                    icon={
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                            <rect x="3" y="5" width="14" height="10" rx="2" /><line x1="7" y1="9" x2="13" y2="9" /><line x1="7" y1="12" x2="11" y2="12" />
                        </svg>
                    }
                >
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                        <label className="block text-sm font-semibold text-slate-200">Batch Size</label>
                        <p className="mt-0.5 text-xs text-slate-500">Items per worker run. Recommended: 3-8</p>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={config.batch_size || 5}
                            onChange={(event) => handleChange('batch_size', event.target.value)}
                            className="admin-input mt-3 w-full max-w-[160px] px-3 py-2.5 text-sm font-semibold"
                        />
                    </div>
                </SectionCard>

                <div className="admin-warning rounded-xl px-4 py-3 text-xs font-medium">
                    Marketing config lives under <code className="rounded bg-white/10 px-1.5 py-0.5 text-emerald-400">/api/config</code>. This panel is runtime engine control only.
                </div>

                <div className="flex flex-wrap justify-end gap-3 pt-1">
                    <button type="button" onClick={loadConfig} className="admin-button-secondary">
                        Reload config
                    </button>
                    <button type="submit" disabled={saving} className="admin-button-primary">
                        {saving ? 'Saving...' : 'Save controls'}
                    </button>
                </div>
            </form>
        </div>
    );
}
