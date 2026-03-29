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

function ToggleCard({ label, description, checked, onChange, accent }) {
    const accentClass = accent === 'danger'
        ? 'from-rose-500/10 to-transparent'
        : accent === 'warning'
            ? 'from-amber-500/10 to-transparent'
            : 'from-teal-500/10 to-transparent';

    return (
        <label className={`admin-panel cursor-pointer rounded-[1.5rem] bg-gradient-to-br ${accentClass} p-4 transition hover:-translate-y-0.5`}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="admin-kicker">{label}</p>
                    <p className="mt-3 text-sm font-semibold text-zinc-950">{checked ? 'Enabled' : 'Disabled'}</p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p>
                </div>

                <span className={`relative mt-1 inline-flex h-7 w-12 items-center rounded-full border transition ${
                    checked
                        ? 'border-teal-700 bg-teal-700'
                        : 'border-zinc-300 bg-zinc-200'
                }`}>
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
                </span>
            </div>
            <input
                type="checkbox"
                checked={checked || false}
                onChange={(event) => onChange(event.target.checked)}
                className="sr-only"
            />
        </label>
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
                <div className="admin-panel flex flex-col items-center rounded-[2rem] px-10 py-12 text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/70 border-t-teal-700" />
                    <p className="admin-kicker mt-6">Config sync</p>
                    <p className="mt-3 text-sm font-medium text-zinc-600">Loading live runtime controls...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="admin-panel admin-glow-ring overflow-hidden rounded-[2rem] px-6 py-5 lg:px-7 lg:py-6">
                <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.75fr]">
                    <div>
                        <p className="admin-kicker">System configuration</p>
                        <h1 className="admin-heading-xl mt-4 max-w-3xl text-zinc-950">Control the live engine without touching code.</h1>
                        <p className="admin-copy mt-5 max-w-2xl text-base">
                            These switches decide whether new leads move into CRM, whether the queue dispatches jobs, whether Gemini runs, and whether followups are allowed to fire.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        {[
                            { label: 'CRM Auto Routing', enabled: config.crm_auto_routing },
                            { label: 'Queue Running', enabled: !config.queue_paused },
                            { label: 'AI Enabled', enabled: config.ai_enabled },
                            { label: 'Followup Enabled', enabled: config.followup_enabled }
                        ].map((item) => (
                            <div key={item.label} className="admin-subpanel rounded-[1.5rem] p-4">
                                <p className="admin-kicker">{item.label}</p>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-zinc-900">{item.enabled ? 'Operational' : 'Paused'}</span>
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                                        item.enabled
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-zinc-200/70 text-zinc-600'
                                    }`}>
                                        {item.enabled ? 'On' : 'Off'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {toast && (
                <div className={`rounded-[1.5rem] px-4 py-3 text-sm font-medium shadow-sm ${toast.type === 'success' ? 'admin-toast-success' : 'admin-toast-error'}`}>
                    {toast.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <section className="admin-panel rounded-[2rem] p-5">
                    <div className="mb-5 flex items-center justify-between gap-4">
                        <div>
                            <p className="admin-kicker">Core switches</p>
                            <h2 className="admin-heading-lg mt-3 text-zinc-950">Runtime switches for the production pipeline.</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <ToggleCard
                            label="AI Enabled"
                            description="Allows Gemini page generation and AI lead scoring."
                            checked={config.ai_enabled}
                            onChange={(value) => handleChange('ai_enabled', value)}
                        />
                        <ToggleCard
                            label="Queue Paused"
                            description="Stops generation_queue processing without deleting pending jobs."
                            checked={config.queue_paused}
                            onChange={(value) => handleChange('queue_paused', value)}
                            accent="warning"
                        />
                        <ToggleCard
                            label="CRM Auto Routing"
                            description="Allows newly stored leads to continue into Zoho sync."
                            checked={config.crm_auto_routing}
                            onChange={(value) => handleChange('crm_auto_routing', value)}
                        />
                        <ToggleCard
                            label="Followup Enabled"
                            description="Allows post-routing followup delivery when a provider is configured."
                            checked={config.followup_enabled}
                            onChange={(value) => handleChange('followup_enabled', value)}
                            accent="danger"
                        />
                    </div>
                </section>

                <section className="admin-panel rounded-[2rem] p-5">
                    <div className="mb-5">
                        <p className="admin-kicker">Worker throughput</p>
                        <h2 className="admin-heading-lg mt-3 text-zinc-950">Page generation batch size.</h2>
                        <p className="admin-copy mt-2 text-sm">Controls how many queue items the page generation worker processes in a single execution.</p>
                    </div>

                    <div className="admin-subpanel rounded-[1.4rem] p-4">
                        <label className="admin-kicker block">Batch size</label>
                        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
                            <input
                                type="number"
                                min="1"
                                max="50"
                                value={config.batch_size || 5}
                                onChange={(event) => handleChange('batch_size', event.target.value)}
                                className="admin-input w-full max-w-xs px-4 py-3 text-sm font-semibold"
                            />
                            <p className="text-sm text-zinc-500">Recommended for steady generation on production: 3 to 8 items per run.</p>
                        </div>
                    </div>
                </section>

                <div className="admin-warning rounded-[1.5rem] px-5 py-4 text-sm font-medium shadow-sm">
                    Public homepage copy and marketing tags still live under <code>/api/config</code>. This panel is now reserved for runtime engine control only.
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                    <button type="button" onClick={loadConfig} className="admin-button-secondary">
                        Reload from live config
                    </button>
                    <button type="submit" disabled={saving} className="admin-button-primary">
                        {saving ? 'Saving...' : 'Save runtime controls'}
                    </button>
                </div>
            </form>
        </div>
    );
}
