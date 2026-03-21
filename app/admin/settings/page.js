'use client';
import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

export default function SettingsPage() {
    const [config, setConfig] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const res = await adminApi.getConfig();
            setConfig(res || {});
        } catch (err) {
            console.error("Config load failed", err);
            setToast({ type: 'error', text: 'Failed to synchronize configuration variables.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadConfig(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await adminApi.saveConfig(config);
            setToast({ type: 'success', text: 'Configuration securely committed to Edge Network.' });
        } catch (err) {
            setToast({ type: 'error', text: `Save blocked: ${err.message}` });
        } finally {
            setSaving(false);
            setTimeout(() => setToast(null), 4000);
        }
    };

    const handleChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-slate-500 font-medium">
            <div className="w-6 h-6 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mr-3"></div>
            Decrypting Configuration Hashes...
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">System Configuration</h1>
                <p className="text-sm text-slate-500 mt-1">Mutate frontend behavior globally bypassing static source code deployments.</p>
            </div>

            {toast && (
                <div className={`p-4 rounded-lg font-medium shadow-sm transition-all ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {toast.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-8">
                {/* APPLICATION Toggles */}
                <div>
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Application Constraints</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                            <div>
                                <span className="font-bold text-slate-700 block">Pause Admissions</span>
                                <span className="text-xs text-slate-500">Temporarily block all new CRM inputs globally.</span>
                            </div>
                            <input type="checkbox" checked={config.isAppPaused || false} onChange={e => handleChange('isAppPaused', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                        </label>
                        <label className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                            <div>
                                <span className="font-bold text-slate-700 block">Pause Redirects</span>
                                <span className="text-xs text-slate-500">Stop smart routing post-conversion execution.</span>
                            </div>
                            <input type="checkbox" checked={config.isRedirectPaused || false} onChange={e => handleChange('isRedirectPaused', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                        </label>
                    </div>
                </div>

                {/* COPYWRITING OVERRIDES */}
                <div>
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Marketing Copywriting</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Hero Title</label>
                            <input type="text" value={config.heroTitle || ''} onChange={e => handleChange('heroTitle', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Hero Subtitle</label>
                            <input type="text" value={config.heroSubtitle || ''} onChange={e => handleChange('heroSubtitle', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Button CTA Text</label>
                            <input type="text" value={config.ctaText || ''} onChange={e => handleChange('ctaText', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Delhi Exclusivity Message</label>
                            <input type="text" value={config.delhiOnlyMessage || ''} onChange={e => handleChange('delhiOnlyMessage', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                        </div>
                    </div>
                </div>

                {/* ANALYTICS TAGS */}
                <div>
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Third-Party Analytics Tags</h3>
                    <div className="space-y-4 bg-slate-50 p-6 rounded-lg border border-slate-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={config.isAnalyticsEnabled || false} onChange={e => handleChange('isAnalyticsEnabled', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                            <span className="font-bold text-slate-700">Enable Analytics Telemetry</span>
                        </label>
                        {config.isAnalyticsEnabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Google Analytics ID</label>
                                    <input type="text" placeholder="G-XXXXXXXXXX" value={config.gaMeasurementId || ''} onChange={e => handleChange('gaMeasurementId', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Google Tag Manager Container</label>
                                    <input type="text" placeholder="GTM-XXXXXXX" value={config.gtmContainerId || ''} onChange={e => handleChange('gtmContainerId', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-4">
                    <button type="button" onClick={() => loadConfig()} className="px-6 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition">Discard Changes</button>
                    <button type="submit" disabled={saving} className="px-8 py-2 bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-md shadow-indigo-600/20">
                        {saving ? 'Synchronizing...' : 'Save Configuration'}
                    </button>
                </div>
            </form>
        </div>
    );
}
