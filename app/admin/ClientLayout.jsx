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
        return <div className="min-h-screen bg-gray-950 flex items-center justify-center">{children}</div>;
    }

    // ⏳ LOADING STATE
    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-6 text-gray-400 font-medium">Initializing Bima Sakhi OS...</p>
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
        <div className="flex h-screen overflow-hidden bg-gray-950">

            {/* ================= SIDEBAR ================= */}
            <aside className={`${collapsed ? 'w-20' : 'w-72'} bg-gray-950 border-r border-gray-800 flex flex-col transition-all duration-300`}>

                {/* Logo */}
                <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
                        BS
                    </div>

                    {!collapsed && (
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Bima Sakhi</h1>
                            <p className="text-xs text-gray-500 -mt-1">OS Control • Root Access</p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                    {NAV_LINKS.map(link => {
                        const active = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${active
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                                    : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                                    }`}
                            >
                                <span className="text-xl">{link.icon}</span>
                                {!collapsed && <span>{link.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-950/50 transition-all"
                    >
                        <span>🚪</span>
                        {!collapsed && (loggingOut ? 'Logging out...' : 'Logout Securely')}
                    </button>
                </div>
            </aside>

            {/* ================= MAIN AREA ================= */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Top Header */}
                <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">

                    {/* Left */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 text-sm"
                        >
                            {collapsed ? '➡️' : '⬅️'}
                        </button>

                        <h2 className="text-lg font-semibold text-white hidden sm:block">
                            {NAV_LINKS.find(l =>
                                pathname === l.href ||
                                (l.href !== '/admin' && pathname.startsWith(l.href))
                            )?.label || 'Dashboard'}
                        </h2>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-6">

                        {/* Status */}
                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                            System Online
                        </div>

                        {/* User */}
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-medium text-white">Administrator</p>
                                <p className="text-xs text-gray-400">Root Access</p>
                            </div>
                            <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                                A
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-8 bg-gray-950">

                    {/* Global Error */}
                    {globalError && (
                        <div className="mb-6 p-4 bg-red-950 border border-red-800 rounded-2xl text-red-400">
                            System Error: {globalError}
                        </div>
                    )}

                    {children}
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