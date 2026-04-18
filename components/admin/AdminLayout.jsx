'use client';
/**
 * ⚠️ DEPRECATED — Stage 2b fix, Phase 0 Priority R
 *
 * This file is the OLD admin navigation system. It is NO LONGER the active nav.
 * The active nav is: app/admin/ClientLayout.jsx (NAV_LINKS array).
 *
 * This file is retained only as a fallback shell for pages/ router legacy pages.
 * DO NOT add nav links here. All navigation changes go in ClientLayout.jsx ONLY.
 * Bible: Section 45 (Navigation Management), Rule 29 (Geo Control).
 */
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import CommandPalette from './CommandPalette';

/**
 * DEPRECATED: Navigation links moved to app/admin/ClientLayout.jsx
 * Kept as empty array — this component no longer renders its own nav.
 * @deprecated Use ClientLayout.jsx NAV_LINKS instead.
 */
const ADMIN_LINKS = [];

const AdminLayout = ({ children }) => {
    const pathname = usePathname();
    const router = useRouter();
    const [paletteOpen, setPaletteOpen] = useState(false);

    // Auth Check (Existing - untouched)
    useEffect(() => {
        if (pathname === '/admin/login') return;
        fetch('/api/admin/check', {
            method: 'GET',
            credentials: 'include'
        })
            .then(res => res.json())
            .then(data => { if (!data.authenticated) router.push('/admin/login'); })
            .catch(() => router.push('/admin/login'));
    }, [pathname, router]);

    // Logout (Existing - untouched)
    const handleLogout = async () => {
        try {
            await fetch('/api/admin/logout', { method: 'POST' });
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
        <div className="flex h-screen bg-[#fafafa] overflow-hidden font-sans selection:bg-black selection:text-white">
            {/* Sidebar - Vercel OS Style */}
            <aside className="w-64 bg-[#fafafa] border-r border-zinc-200 flex flex-col z-10 flex-shrink-0">
                <div className="px-6 py-5 border-b border-zinc-200 flex items-center gap-3">
                    <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center text-white font-bold text-sm tracking-tighter">
                        BS
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-zinc-900 tracking-tight leading-none">Bima Sakhi</h1>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Admin OS</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                    {ADMIN_LINKS.map((link) => {
                        const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isActive
                                        ? 'bg-zinc-200/50 text-black font-semibold'
                                        : 'text-zinc-500 hover:bg-zinc-200/30 hover:text-zinc-900 font-medium'
                                    }`}
                            >
                                <span className={`text-base ${isActive ? 'opacity-100' : 'opacity-70 text-zinc-400'}`}>{link.icon}</span>
                                <span>{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-200">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2 hover:bg-zinc-200/50 text-zinc-500 hover:text-zinc-900 rounded-md text-sm font-medium transition-colors"
                    >
                        <span className="text-base opacity-70">⛔</span>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-14 bg-white border-b border-zinc-200 px-8 flex items-center justify-between z-0">
                    <div
                        onClick={() => setPaletteOpen(true)}
                        className="flex items-center bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-md px-3 py-1.5 w-64 cursor-pointer transition-colors shadow-sm"
                    >
                        <span className="text-zinc-400 mr-2 text-xs">🔎</span>
                        <span className="text-zinc-500 text-sm">Search (Cmd + K)</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-zinc-900 leading-none">Admin</p>
                            <p className="text-[10px] font-mono text-zinc-500 mt-1 flex items-center gap-1.5 justify-end">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online
                            </p>
                        </div>
                        <div className="w-8 h-8 bg-zinc-100 border border-zinc-200 rounded-full flex items-center justify-center text-zinc-600 text-xs font-semibold">
                            A
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto bg-[#fafafa] p-6 lg:p-10">
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