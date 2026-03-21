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

    if (pathname === '/admin/login') {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center">{children}</div>;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 font-medium">Initializing Bima Sakhi OS...</p>
            </div>
        );
    }

    if (!isAuthenticated) return null; // Context handles redirect

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
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* LIFT SIDEBAR */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold">BS</div>
                    <h1 className="text-xl font-bold tracking-tight">OS Control</h1>
                </div>
                
                <nav className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1 px-3">
                        {NAV_LINKS.map(link => {
                            const active = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
                            return (
                                <li key={link.href}>
                                    <Link href={link.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                                        <span className="text-lg">{link.icon}</span>
                                        {link.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={handleLogout} disabled={loggingOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-all">
                        <span>🚪</span>
                        {loggingOut ? 'Logging out...' : 'Logout Securely'}
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* TOP HEADER */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-slate-800 hidden sm:block">
                            {NAV_LINKS.find(l => pathname === l.href || (l.href!=='/admin'&&pathname.startsWith(l.href)))?.label || 'Dashboard'}
                        </h2>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <span className="text-sm font-medium text-slate-600">System Online</span>
                        </div>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-slate-700">Administrator</p>
                                <p className="text-xs text-slate-500">Root Access</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold border border-indigo-200">
                                A
                            </div>
                        </div>
                    </div>
                </header>

                {/* SCROLLABLE WORKSPACE */}
                <main className="flex-1 overflow-y-auto p-8 relative">
                    {globalError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
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
