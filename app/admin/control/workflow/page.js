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
                        <input
                            type={config.value_type === 'number' ? 'number' : 'text'}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            step={config.value_type === 'number' ? (displayValue % 1 !== 0 ? '0.1' : '1') : undefined}
                            className="w-32 rounded border border-white/10 bg-white/[0.05] px-2 py-1 text-sm text-white focus:border-emerald-500 focus:outline-none"
                            autoFocus
                        />
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
            <div>
                <h1 className="text-xl font-semibold text-white">Workflow Control</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Configure thresholds, caps, and rules — no code deployment needed
                </p>
            </div>

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
