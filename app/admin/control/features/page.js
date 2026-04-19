'use client';
import React, { useEffect, useState, useCallback } from 'react';

const CATEGORY_LABELS = {
    generation: 'Content Generation',
    publishing: 'Publishing & SEO',
    leads: 'Lead Management',
    automation: 'Automation & Alerts',
    system: 'System Controls',
};

const CATEGORY_ICONS = {
    generation: '⚡',
    publishing: '🌐',
    leads: '👥',
    automation: '🔄',
    system: '🛡️',
};

function ToggleSwitch({ checked, onChange, restricted, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0f1a] ${
                checked
                    ? restricted ? 'bg-red-500 focus:ring-red-500' : 'bg-emerald-500 focus:ring-emerald-500'
                    : 'bg-slate-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    );
}

function FlagRow({ flag, onToggle, updating }) {
    const isSafeMode = flag.key === 'safe_mode';
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const loadHistory = async () => {
        if (showHistory) { setShowHistory(false); return; }
        setShowHistory(true);
        setHistoryLoading(true);
        try {
            const params = new URLSearchParams({ search: flag.key, limit: '10' });
            const res = await fetch(`/api/admin/audit-log?${params}`, { credentials: 'include' });
            const json = await res.json();
            setHistory(json.success ? (json.data || []) : []);
        } catch { setHistory([]); }
        finally { setHistoryLoading(false); }
    };

    return (
        <div className={`rounded-lg border transition-all ${
            isSafeMode && flag.value
                ? 'border-red-500/40 bg-red-500/10'
                : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
        }`}>
            <div className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isSafeMode && flag.value ? 'text-red-400' : 'text-white'}`}>
                        {flag.label}
                    </span>
                    {flag.restricted && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-mono text-amber-400">
                            RESTRICTED
                        </span>
                    )}
                    {isSafeMode && (
                        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-mono text-red-400">
                            EMERGENCY
                        </span>
                    )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{flag.description}</p>
                <div className="mt-1 flex items-center gap-3">
                    {flag.last_changed_by && (
                        <span className="text-[10px] text-slate-600">
                            Last changed by {flag.last_changed_by} at {new Date(flag.last_changed_at).toLocaleString()}
                        </span>
                    )}
                    <button onClick={loadHistory} className="text-[10px] text-blue-400 hover:text-blue-300">
                        {showHistory ? 'Hide History' : 'History'}
                    </button>
                </div>
            </div>
            <div className="ml-4 flex items-center gap-3">
                <span className={`text-xs font-mono ${flag.value ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {flag.value ? 'ON' : 'OFF'}
                </span>
                <ToggleSwitch
                    checked={flag.value}
                    onChange={(val) => onToggle(flag.key, val)}
                    restricted={flag.restricted}
                    disabled={updating === flag.key}
                />
            </div>
            </div>
            {showHistory && (
                <div className="border-t border-white/[0.04] px-4 py-2">
                    {historyLoading ? (
                        <p className="text-[10px] text-slate-500">Loading...</p>
                    ) : history.length === 0 ? (
                        <p className="text-[10px] text-slate-500">No change history found</p>
                    ) : (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {history.map((h, i) => (
                                <div key={i} className="flex items-center gap-3 text-[10px]">
                                    <span className="text-slate-600 font-mono w-32">{new Date(h.created_at).toLocaleString()}</span>
                                    <span className="text-slate-400">{h.action}</span>
                                    <span className="text-slate-500">{h.admin_email || h.admin_id || 'system'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function FeatureControlPage() {
    const [flags, setFlags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [error, setError] = useState(null);
    const [confirmSafe, setConfirmSafe] = useState(false);
    const [pendingSafeValue, setPendingSafeValue] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newFlag, setNewFlag] = useState({ key: '', label: '', description: '', category: 'system', value: false, restricted: false });

    const fetchFlags = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/feature-flags', { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                setFlags(json.data);
            } else {
                setError(json.error || 'Failed to load');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchFlags(); }, [fetchFlags]);

    const handleToggle = async (key, value) => {
        // Safe Mode requires double confirmation
        if (key === 'safe_mode') {
            setConfirmSafe(true);
            setPendingSafeValue(value);
            return;
        }
        await doToggle(key, value);
    };

    const doToggle = async (key, value) => {
        setUpdating(key);
        setError(null);
        try {
            const res = await fetch('/api/admin/feature-flags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ key, value }),
            });
            const json = await res.json();
            if (json.success) {
                setFlags(prev => prev.map(f => f.key === key ? { ...f, ...json.data } : f));
            } else {
                setError(json.error || 'Toggle failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setUpdating(null);
        }
    };

    const confirmSafeMode = async () => {
        setConfirmSafe(false);
        if (pendingSafeValue !== null) {
            await doToggle('safe_mode', pendingSafeValue);
            setPendingSafeValue(null);
        }
    };

    const handleCreateFlag = async (e) => {
        e.preventDefault();
        if (!newFlag.key || !newFlag.label) return;
        setCreating(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/feature-flags', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(newFlag),
            });
            const json = await res.json();
            if (json.success) {
                setShowCreate(false);
                setNewFlag({ key: '', label: '', description: '', category: 'system', value: false, restricted: false });
                await fetchFlags();
            } else {
                setError(json.error || 'Failed to create flag');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    // Group by category
    const grouped = flags.reduce((acc, flag) => {
        const cat = flag.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(flag);
        return acc;
    }, {});

    const safeMode = flags.find(f => f.key === 'safe_mode');
    const onCount = flags.filter(f => f.value && f.key !== 'safe_mode').length;
    const totalCount = flags.filter(f => f.key !== 'safe_mode').length;

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-white">Feature Control</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Toggle system features on/off without code deployment
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400">
                        {onCount}/{totalCount} active
                    </span>
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="rounded-lg border border-blue-500/30 bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/30 transition-colors"
                    >
                        + New Flag
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            {/* Safe Mode Banner */}
            {safeMode?.value && (
                <div className="rounded-lg border-2 border-red-500/50 bg-red-500/10 p-4">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🔴</span>
                        <div>
                            <h3 className="text-sm font-bold text-red-400">SAFE MODE ACTIVE</h3>
                            <p className="text-xs text-red-400/70">All automated operations are paused. System is in read-only mode.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Safe Mode Confirmation Dialog */}
            {confirmSafe && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="mx-4 w-full max-w-md rounded-xl border border-white/10 bg-[#0f1520] p-6 shadow-2xl">
                        <h3 className="text-lg font-semibold text-white">
                            {pendingSafeValue ? '🔴 Activate Safe Mode?' : '🟢 Deactivate Safe Mode?'}
                        </h3>
                        <p className="mt-2 text-sm text-slate-400">
                            {pendingSafeValue
                                ? 'This will HALT all automated operations: generation, publishing, emails, WhatsApp alerts. The system enters read-only mode.'
                                : 'This will resume all automated operations. Make sure the issue that triggered Safe Mode has been resolved.'
                            }
                        </p>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => { setConfirmSafe(false); setPendingSafeValue(null); }}
                                className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.04]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmSafeMode}
                                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white ${
                                    pendingSafeValue ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {pendingSafeValue ? 'Yes, Activate Safe Mode' : 'Yes, Resume Operations'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Feature Flag Categories */}
            {showCreate && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-white">Create New Feature Flag</h3>
                    <form onSubmit={handleCreateFlag} className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Key *</label>
                            <input type="text" required value={newFlag.key} onChange={(e) => setNewFlag(f => ({ ...f, key: e.target.value.replace(/[^a-z0-9_]/g, '') }))} placeholder="my_feature_enabled" className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/40" />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Label *</label>
                            <input type="text" required value={newFlag.label} onChange={(e) => setNewFlag(f => ({ ...f, label: e.target.value }))} placeholder="My Feature" className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/40" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Description</label>
                            <input type="text" value={newFlag.description} onChange={(e) => setNewFlag(f => ({ ...f, description: e.target.value }))} placeholder="What this flag controls" className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/40" />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Category</label>
                            <select value={newFlag.category} onChange={(e) => setNewFlag(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500/40">
                                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end gap-4">
                            <label className="flex items-center gap-2 text-xs text-slate-400">
                                <input type="checkbox" checked={newFlag.restricted} onChange={(e) => setNewFlag(f => ({ ...f, restricted: e.target.checked }))} /> Restricted
                            </label>
                            <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                {creating ? 'Creating...' : 'Create Flag'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
                const catFlags = grouped[cat];
                if (!catFlags || catFlags.length === 0) return null;

                return (
                    <div key={cat} className="space-y-2">
                        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <span>{CATEGORY_ICONS[cat]}</span>
                            {label}
                        </h2>
                        <div className="space-y-1.5">
                            {catFlags.map(flag => (
                                <FlagRow
                                    key={flag.key}
                                    flag={flag}
                                    onToggle={handleToggle}
                                    updating={updating}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
