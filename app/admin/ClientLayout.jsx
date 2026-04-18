'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminProvider, useAdmin } from '@/context/AdminContext';
import { adminApi } from '@/lib/adminApi';

/* ── SVG Icons ── */
const icons = {
    HQ: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <rect x="3" y="3" width="6" height="6" rx="1.5" />
            <rect x="11" y="3" width="6" height="6" rx="1.5" />
            <rect x="3" y="11" width="6" height="6" rx="1.5" />
            <rect x="11" y="11" width="6" height="6" rx="1.5" />
        </svg>
    ),
    CR: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <circle cx="10" cy="7" r="3.5" />
            <path d="M3.5 17c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5" />
        </svg>
    ),
    AI: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.93 4.93l2.12 2.12M12.95 12.95l2.12 2.12M4.93 15.07l2.12-2.12M12.95 7.05l2.12-2.12" />
            <circle cx="10" cy="10" r="2.5" />
        </svg>
    ),
    RX: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <path d="M10 2L3 7v6l7 5 7-5V7l-7-5z" />
            <path d="M7.5 10l2 2 3.5-4" />
        </svg>
    ),
    AN: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <path d="M3 16V8l3.5-3 3 3 3.5-5L17 8v8" />
            <line x1="3" y1="16" x2="17" y2="16" />
        </svg>
    ),
    LG: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <rect x="3" y="3" width="14" height="14" rx="2" />
            <line x1="6" y1="7" x2="14" y2="7" />
            <line x1="6" y1="10" x2="12" y2="10" />
            <line x1="6" y1="13" x2="10" y2="13" />
        </svg>
    ),
    CN: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <circle cx="10" cy="10" r="3" />
            <path d="M10 2a1.5 1.5 0 010 3M10 15a1.5 1.5 0 010 3M2 10a1.5 1.5 0 013 0M15 10a1.5 1.5 0 013 0M4.22 4.22a1.5 1.5 0 012.12 2.12M13.66 13.66a1.5 1.5 0 012.12 2.12M15.78 4.22a1.5 1.5 0 01-2.12 2.12M6.34 13.66a1.5 1.5 0 01-2.12 2.12" />
        </svg>
    ),
    LO: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3M13 6l4 4-4 4M8 10h9" />
        </svg>
    ),
    CC: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <path d="M4 4h12a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
            <path d="M7 8h6M7 11h4" />
        </svg>
    ),
};

const NAV_LINKS = [
    { label: 'Dashboard', href: '/admin', icon: 'HQ', note: 'Mission control' },
    { label: 'CRM', href: '/admin/crm', icon: 'CR', note: 'Lead operations' },
    { label: 'Content', href: '/admin/ccc', icon: 'CC', note: 'Draft review' },
    { label: 'Bulk', href: '/admin/ccc/bulk', icon: 'BK', note: 'Job planner' },
    { label: 'Geo', href: '/admin/locations/geo', icon: 'AN', note: 'Coverage intel' },
    { label: 'Queue', href: '/admin/ai', icon: 'AI', note: 'Worker engine' },
    { label: 'Failed', href: '/admin/failed-leads', icon: 'RX', note: 'Recovery lane' },
    { label: 'Analytics', href: '/admin/analytics', icon: 'AN', note: 'Attribution' },
    { label: 'Logs', href: '/admin/logs', icon: 'LG', note: 'Runtime trail' },
    { label: 'Features', href: '/admin/control/features', icon: 'CN', note: 'Toggle controls' },
    { label: 'Workflow', href: '/admin/control/workflow', icon: 'CN', note: 'Thresholds & caps' },
    { label: 'Audit', href: '/admin/system/audit', icon: 'LG', note: 'Action history' },
    { label: 'Health', href: '/admin/system/health', icon: 'HB', note: 'Vendor resilience' },
    { label: 'DLQ', href: '/admin/system/dlq', icon: 'DL', note: 'Dead letters' },
    { label: 'Settings', href: '/admin/settings', icon: 'CN', note: 'Legacy switches' }
];

/* ── Safe Mode Banner ── */
function SafeModeBanner() {
    const [safeMode, setSafeMode] = useState(false);

    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch('/api/admin/feature-flags', { credentials: 'include' });
                const json = await res.json();
                if (json.success) {
                    const flag = json.data?.find(f => f.key === 'safe_mode');
                    setSafeMode(flag?.value === true);
                }
            } catch { /* ignore */ }
        };
        check();
        const interval = setInterval(check, 15000);
        return () => clearInterval(interval);
    }, []);

    if (!safeMode) return null;

    return (
        <div className="border-b-2 border-red-500/50 bg-red-500/10 px-4 py-2 text-center">
            <span className="text-sm font-semibold text-red-400">
                🔴 SAFE MODE ACTIVE — All automated operations are paused
            </span>
        </div>
    );
}

/* ── System Health Badge ── */
function HealthBadge() {
    const [health, setHealth] = useState(null);

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const res = await fetch('/api/status');
                const data = await res.json();
                setHealth(data);
            } catch { setHealth(null); }
        };
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    if (!health) return null;

    const mode = health.checks?.system_mode || 'unknown';
    const status = health.status || 'unknown';

    const config = {
        ok: { label: 'LIVE', color: 'bg-emerald-500', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.5)]', text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
        degraded: { label: 'DEGRADED', color: 'bg-amber-500', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.5)]', text: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10' },
    };
    const c = config[status] || { label: 'DOWN', color: 'bg-red-500', glow: 'shadow-[0_0_12px_rgba(244,63,94,0.5)]', text: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/10' };

    return (
        <div className={`flex items-center gap-2.5 rounded-full border ${c.border} ${c.bg} px-3.5 py-1.5`}>
            <span className={`mc-pulse h-2 w-2 rounded-full ${c.color} ${c.glow}`} />
            <span className={`text-xs font-bold tracking-wider ${c.text}`}>{c.label}</span>
            {mode !== 'normal' && (
                <span className="text-[10px] font-mono text-white/40 uppercase">{mode}</span>
            )}
        </div>
    );
}

function InnerLayout({ children }) {
    const pathname = usePathname();
    const { isAuthenticated, isLoading, globalError } = useAdmin();
    const [loggingOut, setLoggingOut] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const activeLink = useMemo(() => (
        NAV_LINKS.find((link) => pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href)))
    ), [pathname]);

    if (pathname === '/admin/login') {
        return <div className="admin-root flex min-h-screen items-center justify-center p-6">{children}</div>;
    }

    if (isLoading) {
        return (
            <div className="admin-root flex min-h-screen flex-col items-center justify-center p-6">
                <div className="flex flex-col items-center text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" />
                    <p className="admin-kicker mt-6">Initializing</p>
                    <p className="mt-2 text-sm text-slate-500">Loading mission control...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await adminApi.logout();
            window.location.href = '/admin/login';
        } catch {
            window.location.href = '/admin/login';
        }
    };

    return (
        <div className="admin-root">
            <div className="admin-shell flex h-screen overflow-hidden">
                {/* ── Slim Sidebar ── */}
                <aside className={`admin-sidebar flex flex-col transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-60'}`}>
                    {/* Brand */}
                    <div className="relative flex items-center gap-3 border-b border-white/[0.06] px-4 py-4">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-lg shadow-emerald-500/20">
                            BS
                        </div>
                        {!collapsed && (
                            <div className="min-w-0">
                                <h1 className="text-sm font-semibold text-white tracking-tight">Bima Sakhi</h1>
                                <p className="text-[10px] font-mono text-slate-500 tracking-wider">MISSION CONTROL</p>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="admin-scrollbar flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
                        {NAV_LINKS.map((link) => {
                            const active = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${
                                        active
                                            ? 'mc-nav-active text-emerald-400'
                                            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                                    }`}
                                >
                                    <span className={`flex-shrink-0 ${active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                        {icons[link.icon]}
                                    </span>

                                    {!collapsed && (
                                        <span className="text-[13px] font-medium">{link.label}</span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logout */}
                    <div className="border-t border-white/[0.06] p-2">
                        <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-slate-500 transition-all hover:bg-white/[0.04] hover:text-slate-300 disabled:opacity-40"
                        >
                            <span className="flex-shrink-0">{icons.LO}</span>
                            {!collapsed && (
                                <span className="text-[13px] font-medium">{loggingOut ? 'Closing...' : 'Logout'}</span>
                            )}
                        </button>
                    </div>
                </aside>

                {/* ── Main Area ── */}
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    {/* Top Bar */}
                    <header className="mc-topbar px-4 py-2.5 lg:px-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setCollapsed((v) => !v)}
                                    className="rounded-lg border border-white/[0.06] p-2 text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-300"
                                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                >
                                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                                        <line x1="3" y1="5" x2="17" y2="5" /><line x1="3" y1="10" x2="17" y2="10" /><line x1="3" y1="15" x2="17" y2="15" />
                                    </svg>
                                </button>

                                <div>
                                    <h2 className="text-sm font-semibold text-white">
                                        {activeLink?.label || 'Dashboard'}
                                    </h2>
                                    <p className="text-[11px] text-slate-500">{activeLink?.note || 'Live operator board'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <HealthBadge />

                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-lg shadow-emerald-500/15">
                                    A
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Safe Mode Banner */}
                    <SafeModeBanner />

                    {/* Content */}
                    <main className="admin-scrollbar flex-1 overflow-y-auto px-4 py-5 lg:px-6 lg:py-6">
                        {globalError && (
                            <div className="admin-toast-error mb-5 rounded-xl px-4 py-3 text-sm font-medium">
                                System Error: {globalError}
                            </div>
                        )}

                        <div className="mx-auto max-w-[80rem]">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}

export default function ClientLayout({ children }) {
    return (
        <AdminProvider>
            <InnerLayout>{children}</InnerLayout>
        </AdminProvider>
    );
}
