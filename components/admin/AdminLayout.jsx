'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import CommandPalette from './CommandPalette';

const ADMIN_LINKS = [
    { label: 'Dashboard', href: '/admin', icon: '📊' },
    { label: 'Leads', href: '/admin/leads', icon: '👥' },
    { label: 'Failed Leads', href: '/admin/failed', icon: '🚨' },
    { label: 'AI Queue', href: '/admin/ai', icon: '⚡' },
    { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
    { label: 'Logs', href: '/admin/logs', icon: '📋' },
    { label: 'Settings', href: '/admin/settings', icon: '⚙️' },
];

const AdminLayout = ({ children }) => {
    const pathname = usePathname();
    const router = useRouter();
    const [paletteOpen, setPaletteOpen] = useState(false);

    // Auth Check (Existing - untouched)
    useEffect(() => {
        if (pathname === '/admin/login') return;
        fetch('/api/admin?action=check')
            .then(res => res.json())
            .then(data => { if (!data.authenticated) router.push('/admin/login'); })
            .catch(() => router.push('/admin/login'));
    }, [pathname, router]);

    // Logout (Existing - untouched)
    const handleLogout = async () => {
        try {
            await fetch('/api/admin?action=logout', { method: 'POST' });
            router.push('/admin/login');
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    // Cmd + K (Existing - untouched)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setPaletteOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (pathname === '/admin/login') {
        return <div className="admin-login-wrapper">{children}</div>;
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {/* Sidebar - TailAdmin Style */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 w-64 flex-shrink-0">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
                        BS
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">Bima Sakhi</h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">Admin OS</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                    {ADMIN_LINKS.map((link) => {
                        const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                        ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                                    }`}
                            >
                                <span className={`text-lg ${isActive ? 'opacity-100' : 'opacity-70 text-slate-400'}`}>{link.icon}</span>
                                <span>{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-sm font-medium transition-all"
                    >
                        <span className="text-lg opacity-70 border-transparent">⛔</span>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm z-0">
                    <div
                        onClick={() => setPaletteOpen(true)}
                        className="flex items-center bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-lg px-4 py-2 w-72 cursor-pointer transition-all shadow-sm"
                    >
                        <span className="text-slate-400 mr-2 text-sm">🔎</span>
                        <span className="text-slate-400 text-sm font-medium">Search (Cmd + K)</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-800 leading-none">Admin</p>
                            <p className="text-[11px] font-semibold text-emerald-600 mt-1 uppercase tracking-wide flex items-center gap-1 justify-end"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Online</p>
                        </div>
                        <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-700 font-bold shadow-sm">
                            A
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto bg-slate-50 p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </div>
    );
};

export default AdminLayout;