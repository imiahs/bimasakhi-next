'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminProvider, useAdmin } from '@/context/AdminContext';
import { adminApi } from '@/lib/adminApi';

const NAV_LINKS = [
    { label: 'Dashboard', href: '/admin', icon: '📊' },
    { label: 'CRM', href: '/admin/crm', icon: '👥' },
    { label: 'Failed Leads', href: '/admin/failed-leads', icon: '🚨' },
    { label: 'AI Queue', href: '/admin/ai', icon: '⚡' },
    { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
    { label: 'Logs', href: '/admin/logs', icon: '🖥️' },
    { label: 'Settings', href: '/admin/settings', icon: '⚙️' }
];

function InnerLayout({ children }) {
    const pathname = usePathname();
    const { isAuthenticated, isLoading, globalError } = useAdmin();
    const [loggingOut, setLoggingOut] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    // 🔐 LOGIN PAGE (UNCHANGED)
    if (pathname === '/admin/login') {
        return <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">{children}</div>;
    }

    // ⏳ LOADING STATE
    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa]">
                <div className="w-8 h-8 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
                <p className="mt-4 text-zinc-500 font-medium text-sm tracking-tight">Initializing Bima Sakhi OS...</p>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    // 🔓 LOGOUT (UNCHANGED)
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
        <div className="flex h-screen overflow-hidden bg-[#fafafa] selection:bg-black selection:text-white font-sans text-zinc-900">

            {/* ================= SIDEBAR ================= */}
            <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-[#fafafa] border-r border-zinc-200 flex flex-col transition-all duration-300 z-10 flex-shrink-0`}>

                {/* Logo */}
                <div className="px-6 py-5 border-b border-zinc-200 flex items-center gap-3">
                    <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center text-white font-bold text-sm tracking-tighter">
                        BS
                    </div>

                    {!collapsed && (
                        <div>
                            <h1 className="text-sm font-semibold text-zinc-900 tracking-tight leading-none">Bima Sakhi</h1>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Admin OS</p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                    {NAV_LINKS.map(link => {
                        const active = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${active
                                    ? 'bg-zinc-200/50 text-black font-semibold'
                                    : 'text-zinc-500 hover:bg-zinc-200/30 hover:text-zinc-900 font-medium'
                                    }`}
                            >
                                <span className={`text-base ${active ? 'opacity-100' : 'opacity-70 text-zinc-400'}`}>{link.icon}</span>
                                {!collapsed && <span>{link.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-zinc-200">
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-200/50 text-zinc-500 hover:text-zinc-900 rounded-md text-sm font-medium transition-colors"
                    >
                        <span className="text-base opacity-70">⛔</span>
                        {!collapsed && (loggingOut ? 'Logging out...' : 'Logout')}
                    </button>
                </div>
            </aside>

            {/* ================= MAIN AREA ================= */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Top Header */}
                <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-8 z-0">

                    {/* Left */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="px-2 py-1 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-md text-zinc-500 text-sm shadow-sm transition-colors focus:outline-none"
                        >
                            {collapsed ? '→' : '←'}
                        </button>

                        <h2 className="text-sm font-semibold text-zinc-900 hidden sm:block tracking-tight">
                            {NAV_LINKS.find(l =>
                                pathname === l.href ||
                                (l.href !== '/admin' && pathname.startsWith(l.href))
                            )?.label || 'Dashboard'}
                        </h2>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-6">

                        {/* Status */}
                        <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            Online
                        </div>

                        {/* User */}
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-semibold text-zinc-900 leading-none">Admin</p>
                                <p className="text-[10px] font-mono text-zinc-500 mt-1">Root Access</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600 font-semibold text-xs">
                                A
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-6 lg:p-10 bg-[#fafafa]">

                    {/* Global Error */}
                    {globalError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm font-medium">
                            System Error: {globalError}
                        </div>
                    )}

                    <div className="max-w-7xl mx-auto">
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