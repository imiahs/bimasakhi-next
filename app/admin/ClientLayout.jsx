'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminProvider, useAdmin } from '@/context/AdminContext';
import { adminApi } from '@/lib/adminApi';

const NAV_LINKS = [
    { label: 'Dashboard', href: '/admin', icon: 'DS' },
    { label: 'CRM', href: '/admin/crm', icon: 'CR' },
    { label: 'Queue', href: '/admin/ai', icon: 'QU' },
    { label: 'Failed', href: '/admin/failed-leads', icon: 'FL' },
    { label: 'Analytics', href: '/admin/analytics', icon: 'AN' },
    { label: 'Logs', href: '/admin/logs', icon: 'LG' },
    { label: 'Settings', href: '/admin/settings', icon: 'ST' }
];

function InnerLayout({ children }) {
    const pathname = usePathname();
    const { isAuthenticated, isLoading, globalError } = useAdmin();
    const [loggingOut, setLoggingOut] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    if (pathname === '/admin/login') {
        return <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">{children}</div>;
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f7f5]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-black" />
                <p className="mt-4 text-sm font-medium tracking-tight text-zinc-500">Initializing admin control panel...</p>
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
        <div className="flex h-screen overflow-hidden bg-[#f7f7f5] font-sans text-zinc-900 selection:bg-black selection:text-white">
            <aside className={`${collapsed ? 'w-24' : 'w-72'} flex flex-col border-r border-zinc-200 bg-[#f7f7f5] transition-all duration-300`}>
                <div className="flex items-center gap-3 border-b border-zinc-200 px-6 py-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-sm font-semibold tracking-tight text-white shadow-sm">
                        BS
                    </div>
                    {!collapsed && (
                        <div>
                            <h1 className="text-sm font-semibold tracking-tight text-zinc-950">Bima Sakhi</h1>
                            <p className="mt-0.5 text-[11px] font-medium text-zinc-500">Admin Control</p>
                        </div>
                    )}
                </div>

                <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
                    {NAV_LINKS.map((link) => {
                        const active = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-colors ${
                                    active
                                        ? 'bg-zinc-950 text-white shadow-sm'
                                        : 'text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-950'
                                }`}
                            >
                                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border text-[10px] font-semibold tracking-[0.18em] ${
                                    active
                                        ? 'border-white/10 bg-white/10 text-white'
                                        : 'border-zinc-200 bg-white text-zinc-500'
                                }`}>
                                    {link.icon}
                                </span>
                                {!collapsed && <span className="font-medium">{link.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-zinc-200 p-4">
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-200/50 hover:text-zinc-950"
                    >
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-[10px] font-semibold tracking-[0.18em] text-zinc-500">
                            LO
                        </span>
                        {!collapsed && <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>}
                    </button>
                </div>
            </aside>

            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-50"
                        >
                            {collapsed ? 'Expand' : 'Collapse'}
                        </button>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Admin Flow</p>
                            <h2 className="text-sm font-semibold tracking-tight text-zinc-950">
                                {NAV_LINKS.find((link) => pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href)))?.label || 'Dashboard'}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Online
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden text-right md:block">
                                <p className="text-sm font-semibold text-zinc-950">Admin</p>
                                <p className="mt-0.5 text-[11px] text-zinc-500">Runtime Access</p>
                            </div>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-xs font-semibold text-zinc-700">
                                A
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto bg-[#f7f7f5] p-6 lg:p-10">
                    {globalError && (
                        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
                            System Error: {globalError}
                        </div>
                    )}

                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
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
