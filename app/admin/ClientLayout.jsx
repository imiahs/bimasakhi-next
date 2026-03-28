'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminProvider, useAdmin } from '@/context/AdminContext';
import { adminApi } from '@/lib/adminApi';

const NAV_LINKS = [
    { label: 'Dashboard', href: '/admin', icon: 'HQ', note: 'Mission control' },
    { label: 'CRM', href: '/admin/crm', icon: 'CR', note: 'Lead operations' },
    { label: 'Queue', href: '/admin/ai', icon: 'AI', note: 'Worker engine' },
    { label: 'Failed', href: '/admin/failed-leads', icon: 'RX', note: 'Recovery lane' },
    { label: 'Analytics', href: '/admin/analytics', icon: 'AN', note: 'Attribution' },
    { label: 'Logs', href: '/admin/logs', icon: 'LG', note: 'Runtime trail' },
    { label: 'Settings', href: '/admin/settings', icon: 'CN', note: 'Live switches' }
];

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
                <div className="admin-panel flex min-w-[280px] flex-col items-center rounded-[2rem] px-10 py-12 text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/70 border-t-teal-700" />
                    <p className="admin-kicker mt-6">Admin boot</p>
                    <p className="mt-3 text-sm font-medium text-zinc-600">Initializing the live control room...</p>
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
            <div className="admin-shell flex h-screen overflow-hidden text-zinc-900 selection:bg-teal-700 selection:text-white">
                <aside className={`admin-sidebar flex flex-col border-r border-white/10 text-white transition-all duration-300 ${collapsed ? 'w-24' : 'w-[22rem]'}`}>
                    <div className="relative border-b border-white/10 px-5 py-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] border border-white/10 bg-white/10 text-sm font-semibold tracking-[0.22em] text-white shadow-[0_14px_30px_rgba(15,118,110,0.22)]">
                                BS
                            </div>
                            {!collapsed && (
                                <div>
                                    <p className="admin-kicker text-white/45">Bima Sakhi OS</p>
                                    <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">Growth Engine</h1>
                                    <p className="mt-1 text-sm text-white/55">Lead, queue, AI, and recovery</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <nav className="admin-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-6">
                        {NAV_LINKS.map((link, index) => {
                            const active = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`group relative flex items-center gap-3 overflow-hidden rounded-[1.4rem] border px-3 py-3 transition-all ${
                                        active
                                            ? 'border-white/15 bg-white/12 text-white shadow-[0_18px_30px_rgba(0,0,0,0.18)]'
                                            : 'border-transparent text-white/68 hover:border-white/10 hover:bg-white/8 hover:text-white'
                                    }`}
                                >
                                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border text-[11px] font-semibold tracking-[0.22em] ${
                                        active
                                            ? 'border-white/10 bg-white/10 text-white'
                                            : 'border-white/10 bg-black/10 text-white/78'
                                    }`}>
                                        {link.icon}
                                    </span>

                                    {!collapsed && (
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold">{link.label}</span>
                                                <span className="admin-kicker text-white/35">0{index + 1}</span>
                                            </div>
                                            <p className="mt-1 truncate text-xs text-white/45">{link.note}</p>
                                        </div>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="border-t border-white/10 p-4">
                        <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="flex w-full items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/6 px-3 py-3 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                        >
                            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/10 bg-black/10 text-[11px] font-semibold tracking-[0.22em] text-white/80">
                                LO
                            </span>
                            {!collapsed && (
                                <div className="text-left">
                                    <p className="font-semibold">{loggingOut ? 'Closing...' : 'Logout'}</p>
                                    <p className="text-xs text-white/45">End secure session</p>
                                </div>
                            )}
                        </button>
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <header className="border-b border-[rgba(77,61,40,0.08)] px-5 py-4 lg:px-8">
                        <div className="admin-panel flex items-center justify-between rounded-[1.8rem] px-4 py-4 lg:px-6">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setCollapsed((value) => !value)}
                                    className="admin-button-secondary px-4 py-3 text-sm"
                                >
                                    {collapsed ? 'Expand' : 'Collapse'}
                                </button>

                                <div>
                                    <p className="admin-kicker">Admin flow</p>
                                    <h2 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-zinc-950">
                                        {activeLink?.label || 'Dashboard'}
                                    </h2>
                                    <p className="mt-1 text-sm text-zinc-500">{activeLink?.note || 'Live operator board'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="hidden items-center gap-3 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 md:flex">
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.6)]" />
                                    <div>
                                        <p className="admin-kicker !text-emerald-700">System pulse</p>
                                        <p className="text-sm font-semibold text-emerald-800">Live operator access</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 rounded-full border border-[rgba(77,61,40,0.08)] bg-white/65 px-3 py-2">
                                    <div className="hidden text-right md:block">
                                        <p className="text-sm font-semibold text-zinc-950">Admin</p>
                                        <p className="text-xs text-zinc-500">Runtime access</p>
                                    </div>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white shadow-sm">
                                        A
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="admin-scrollbar flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-8">
                        {globalError && (
                            <div className="admin-toast-error mb-6 rounded-[1.4rem] px-4 py-3 text-sm font-medium shadow-sm">
                                System Error: {globalError}
                            </div>
                        )}

                        <div className="mx-auto max-w-[92rem]">
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
