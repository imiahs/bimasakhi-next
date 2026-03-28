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

export default function SettingsPage() {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const res = await adminApi.getConfig();
            setConfig({ ...DEFAULT_CONFIG, ...(res?.data || res || {}) });
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
        setConfig((prev) => ({
            ...prev,
            [key]: key === 'batch_size' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await adminApi.saveConfig(config);
            setConfig({ ...DEFAULT_CONFIG, ...(res?.data || config) });
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
            <div className="flex items-center justify-center h-64 text-slate-500 font-medium">
                <div className="w-6 h-6 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mr-3"></div>
                Loading runtime controls...
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">System Configuration</h1>
                <p className="text-sm text-slate-500 mt-1">These controls affect the live lead, AI, queue, and followup engine.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: 'CRM Auto Routing', enabled: config.crm_auto_routing },
                    { label: 'Queue Running', enabled: !config.queue_paused },
                    { label: 'AI Enabled', enabled: config.ai_enabled },
                    { label: 'Followup Enabled', enabled: config.followup_enabled }
                ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                        <p className={`mt-3 text-lg font-bold ${item.enabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {item.enabled ? 'ON' : 'OFF'}
                        </p>
                    </div>
                ))}
            </div>

            {toast && (
                <div className={`p-4 rounded-lg font-medium shadow-sm transition-all ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {toast.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-8">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Core Switches</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                            <div>
                                <span className="font-bold text-slate-700 block">AI Enabled</span>
                                <span className="text-xs text-slate-500">Allows Gemini page generation and AI lead scoring.</span>
                            </div>
                            <input type="checkbox" checked={config.ai_enabled || false} onChange={(e) => handleChange('ai_enabled', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                        </label>

                        <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                            <div>
                                <span className="font-bold text-slate-700 block">Queue Paused</span>
                                <span className="text-xs text-slate-500">Stops `generation_queue` processing without touching stored jobs.</span>
                            </div>
                            <input type="checkbox" checked={config.queue_paused || false} onChange={(e) => handleChange('queue_paused', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                        </label>

                        <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                            <div>
                                <span className="font-bold text-slate-700 block">CRM Auto Routing</span>
                                <span className="text-xs text-slate-500">Allows new leads to continue from DB storage into Zoho sync.</span>
                            </div>
                            <input type="checkbox" checked={config.crm_auto_routing || false} onChange={(e) => handleChange('crm_auto_routing', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                        </label>

                        <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                            <div>
                                <span className="font-bold text-slate-700 block">Followup Enabled</span>
                                <span className="text-xs text-slate-500">Allows post-routing followup delivery when a provider is configured.</span>
                            </div>
                            <input type="checkbox" checked={config.followup_enabled || false} onChange={(e) => handleChange('followup_enabled', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                        </label>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Worker Throughput</h3>
                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Batch Size</label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={config.batch_size || 5}
                            onChange={(e) => handleChange('batch_size', e.target.value)}
                            className="w-full md:w-48 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-2">Controls how many queue items `pagegen` processes in one execution.</p>
                    </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Public homepage copy and tag settings still live under `/api/config`. This page now controls only the production runtime engine.
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-4">
                    <button type="button" onClick={loadConfig} className="px-6 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition">Reload</button>
                    <button type="submit" disabled={saving} className="px-8 py-2 bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-md shadow-indigo-600/20">
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </form>
        </div>
    );
}
