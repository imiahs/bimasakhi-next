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
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            {/* Sidebar - More Premium Look */}
            <aside className="w-72 bg-gray-950 border-r border-gray-800 flex flex-col">
                <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-inner">
                        BS
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tighter">Bima Sakhi</h1>
                        <p className="text-xs text-gray-500 -mt-1">OS Control • Root Access</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {ADMIN_LINKS.map((link) => {
                        const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-medium transition-all ${isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                                        : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                                    }`}
                            >
                                <span className="text-xl opacity-90">{link.icon}</span>
                                <span>{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-5 py-3 text-red-400 hover:bg-red-950/60 rounded-2xl text-sm font-medium transition-all"
                    >
                        <span className="text-xl">⛔</span>
                        Logout Securely
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-gray-900 border-b border-gray-800 px-8 flex items-center justify-between">
                    <div
                        onClick={() => setPaletteOpen(true)}
                        className="flex items-center bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-2xl px-5 py-2 w-96 cursor-pointer transition-all"
                    >
                        <span className="text-gray-400 mr-3 text-xl">🔎</span>
                        <span className="text-gray-400 text-sm">Search anything... (Ctrl + K)</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-sm font-medium text-white">Administrator</p>
                            <p className="text-xs text-emerald-400">● Online</p>
                        </div>
                        <div className="w-9 h-9 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold ring-2 ring-indigo-500/30">
                            A
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto bg-gray-950 p-6 lg:p-8">
                    <div className="max-w-screen-2xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </div>
    );
};

export default AdminLayout;