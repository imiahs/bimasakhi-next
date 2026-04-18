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

    return (
        <div className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-all ${
            isSafeMode && flag.value
                ? 'border-red-500/40 bg-red-500/10'
                : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
        }`}>
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
                {flag.last_changed_by && (
                    <p className="mt-1 text-[10px] text-slate-600">
                        Last changed by {flag.last_changed_by} at {new Date(flag.last_changed_at).toLocaleString()}
                    </p>
                )}
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
    );
}

export default function FeatureControlPage() {
    const [flags, setFlags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [error, setError] = useState(null);
    const [confirmSafe, setConfirmSafe] = useState(false);
    const [pendingSafeValue, setPendingSafeValue] = useState(null);

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
