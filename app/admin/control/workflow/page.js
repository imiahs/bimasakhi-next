'use client';
import React, { useEffect, useState, useCallback } from 'react';

const CATEGORY_LABELS = {
    quality: 'Content Quality Thresholds',
    publishing: 'Publishing Rules',
    generation: 'Generation Rules',
    leads: 'Lead Rules',
    ai: 'AI Configuration',
    cost: 'Cost Controls',
};

const AI_MODEL_OPTIONS = [
    'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo',
    'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku',
    'gemini-1.5-pro', 'gemini-1.5-flash',
];

const CATEGORY_ICONS = {
    quality: '📊',
    publishing: '🌐',
    generation: '⚡',
    leads: '👥',
    ai: '🤖',
    cost: '💰',
};

function ConfigRow({ config, onSave, saving }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(
        config.value_type === 'text' ? config.value_text : config.value_number
    );
    const [error, setError] = useState(null);

    const displayValue = config.value_type === 'text' ? config.value_text : config.value_number;
    const isModelKey = config.key?.includes('ai_model') || config.key?.includes('model');

    const handleSave = async () => {
        setError(null);
        if (config.value_type === 'number') {
            const num = Number(value);
            if (isNaN(num)) { setError('Must be a number'); return; }
            if (config.min_value !== null && num < config.min_value) { setError(`Min: ${config.min_value}`); return; }
            if (config.max_value !== null && num > config.max_value) { setError(`Max: ${config.max_value}`); return; }
        }
        const result = await onSave(config.key, value);
        if (result.success) {
            setEditing(false);
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04]">
            <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-white">{config.label}</span>
                <p className="mt-0.5 text-xs text-slate-500">{config.description}</p>
                {config.min_value !== null && config.max_value !== null && (
                    <p className="mt-0.5 text-[10px] text-slate-600">
                        Range: {config.min_value} – {config.max_value}
                    </p>
                )}
                {config.last_changed_by && (
                    <p className="mt-0.5 text-[10px] text-slate-600">
                        Last changed by {config.last_changed_by}
                    </p>
                )}
            </div>
            <div className="ml-4 flex items-center gap-2">
                {editing ? (
                    <>
                        {isModelKey ? (
                            <select
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="w-40 rounded border border-white/10 bg-white/[0.05] px-2 py-1 text-sm text-white focus:border-emerald-500 focus:outline-none"
                                autoFocus
                            >
                                {AI_MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                                {!AI_MODEL_OPTIONS.includes(String(value)) && <option value={value}>{value} (custom)</option>}
                            </select>
                        ) : (
                            <input
                                type={config.value_type === 'number' ? 'number' : 'text'}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                step={config.value_type === 'number' ? (displayValue % 1 !== 0 ? '0.1' : '1') : undefined}
                                className="w-32 rounded border border-white/10 bg-white/[0.05] px-2 py-1 text-sm text-white focus:border-emerald-500 focus:outline-none"
                                autoFocus
                            />
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving === config.key}
                            className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {saving === config.key ? '...' : 'Save'}
                        </button>
                        <button
                            onClick={() => { setEditing(false); setValue(displayValue); setError(null); }}
                            className="rounded border border-white/10 px-3 py-1 text-xs text-slate-400 hover:bg-white/[0.04]"
                        >
                            Cancel
                        </button>
                    </>
                ) : (
                    <>
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-sm font-mono text-emerald-400">
                            {displayValue}
                        </span>
                        <button
                            onClick={() => setEditing(true)}
                            className="rounded border border-white/10 px-2 py-1 text-xs text-slate-400 hover:bg-white/[0.04] hover:text-white"
                        >
                            Edit
                        </button>
                    </>
                )}
            </div>
            {error && (
                <span className="ml-2 text-xs text-red-400">{error}</span>
            )}
        </div>
    );
}

export default function WorkflowControlPage() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [error, setError] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newConfig, setNewConfig] = useState({ key: '', label: '', description: '', category: 'system', value_type: 'number', value: '', min_value: '', max_value: '' });

    const handleCreateConfig = async (e) => {
        e.preventDefault();
        if (!newConfig.key || !newConfig.label) return;
        setCreating(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/workflow-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(newConfig),
            });
            const json = await res.json();
            if (json.success) {
                setShowCreate(false);
                setNewConfig({ key: '', label: '', description: '', category: 'system', value_type: 'number', value: '', min_value: '', max_value: '' });
                await fetchConfig();
            } else {
                setError(json.error || 'Failed to create config');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/workflow-config', { credentials: 'include' });
            const json = await res.json();
            if (json.success) setConfigs(json.data);
            else setError(json.error);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);

    const handleSave = async (key, value) => {
        setSaving(key);
        try {
            const res = await fetch('/api/admin/workflow-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ key, value }),
            });
            const json = await res.json();
            if (json.success) {
                setConfigs(prev => prev.map(c => c.key === key ? { ...c, ...json.data } : c));
                return { success: true };
            }
            return { success: false, error: json.error };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            setSaving(null);
        }
    };

    const grouped = configs.reduce((acc, c) => {
        const cat = c.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(c);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-white">Workflow Control</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Configure thresholds, caps, and rules — no code deployment needed
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="rounded-lg border border-blue-500/30 bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/30 transition-colors"
                >
                    + New Config
                </button>
            </div>

            {showCreate && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-white">Create New Config Key</h3>
                    <form onSubmit={handleCreateConfig} className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Key *</label>
                            <input type="text" required value={newConfig.key} onChange={(e) => setNewConfig(c => ({ ...c, key: e.target.value.replace(/[^a-z0-9_]/g, '') }))} placeholder="my_threshold" className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/40" />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Label *</label>
                            <input type="text" required value={newConfig.label} onChange={(e) => setNewConfig(c => ({ ...c, label: e.target.value }))} placeholder="My Threshold" className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/40" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Description</label>
                            <input type="text" value={newConfig.description} onChange={(e) => setNewConfig(c => ({ ...c, description: e.target.value }))} placeholder="What this config controls" className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/40" />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Category</label>
                            <select value={newConfig.category} onChange={(e) => setNewConfig(c => ({ ...c, category: e.target.value }))} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/40">
                                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Type</label>
                            <select value={newConfig.value_type} onChange={(e) => setNewConfig(c => ({ ...c, value_type: e.target.value }))} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/40">
                                <option value="number">Number</option>
                                <option value="text">Text</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Default Value</label>
                            <input type={newConfig.value_type === 'number' ? 'number' : 'text'} value={newConfig.value} onChange={(e) => setNewConfig(c => ({ ...c, value: e.target.value }))} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/40" />
                        </div>
                        <div className="flex items-end gap-4">
                            <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                {creating ? 'Creating...' : 'Create Config'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
                const catConfigs = grouped[cat];
                if (!catConfigs || catConfigs.length === 0) return null;

                return (
                    <div key={cat} className="space-y-2">
                        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <span>{CATEGORY_ICONS[cat]}</span>
                            {label}
                        </h2>
                        <div className="space-y-1.5">
                            {catConfigs.map(config => (
                                <ConfigRow
                                    key={config.key}
                                    config={config}
                                    onSave={handleSave}
                                    saving={saving}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
