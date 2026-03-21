'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import CommandPalette from './CommandPalette';
import './AdminLayout.css';

const ADMIN_LINKS = [
    { label: 'Dashboard', href: '/admin', icon: '📊' },
    { label: 'Leads', href: '/admin/leads', icon: '👥' },
    { label: 'Queue', href: '/admin/seo/queue', icon: '⏳' },
    { label: 'Revenue', href: '/admin/revenue', icon: '💰' },
    { label: 'System Health', href: '/admin/system', icon: '🩺' },
    { label: 'Failed Leads', href: '/admin/failed', icon: '🚨' },
    { label: 'Settings', href: '/admin/settings', icon: '⚙️' }
];

const AdminLayout = ({ children }) => {
    const pathname = usePathname();
    const router = useRouter(); // Require 'useRouter' injection at top
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);

    // Global Authenticatication Check Effect
    useEffect(() => {
        if (pathname === '/admin/login') return;
        fetch('/api/admin?action=check')
            .then(res => res.json())
            .then(data => { if (!data.authenticated) router.push('/admin/login'); })
            .catch(() => router.push('/admin/login'));
    }, [pathname, router]);

    const handleLogout = async () => {
        try {
            await fetch('/api/admin?action=logout', { method: 'POST' });
            router.push('/admin/login');
        } catch(e) { console.error("Logout failed", e); }
    };

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

    // Don't show layout on login page
    if (pathname === '/admin/login') {
        return <div className="admin-login-wrapper">{children}</div>;
    }

    return (
        <div className="admin-layout-container">
            {/* LEFT SIDEBAR */}
            <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="admin-sidebar-header">
                    <span className="text-2xl">🔥</span>
                    <h2>Bima Sakhi OS</h2>
                </div>
                <nav className="admin-nav">
                    <ul>
                        {ADMIN_LINKS.map(link => {
                            const isActive = pathname.startsWith(link.href);
                            return (
                                <li key={link.href} className="admin-nav-item">
                                    <Link href={link.href} className={`admin-nav-link ${isActive ? 'active' : ''}`}>
                                        <span className="nav-icon">{link.icon}</span>
                                        <span className="nav-label">{link.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </aside>

            {/* MAIN CONTENT WRAPPER */}
            <div className="admin-main-wrapper">
                {/* TOPBAR */}
                <header className="admin-topbar flex justify-between items-center py-4 px-6 bg-white border-b border-slate-200">
                    <div className="topbar-search flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-1/3" onClick={() => setPaletteOpen(true)} style={{ cursor: 'pointer' }}>
                        <span className="text-slate-400 mr-2">🔎</span>
                        <input type="text" placeholder="Search operations (Cmd+K)" readOnly className="bg-transparent border-none outline-none text-sm w-full cursor-pointer text-slate-600" />
                    </div>
                    <div className="topbar-profile flex items-center gap-4">
                        <span className="font-semibold text-slate-700 text-sm hidden md:block">Administrator</span>
                        <Link href="/admin/profile" className="profile-avatar bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-9 h-9 flex items-center justify-center font-bold transition">A</Link>
                        <button onClick={handleLogout} className="text-sm bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 font-medium transition cursor-pointer">Logout</button>
                    </div>
                </header>

                {/* DYNAMIC WORKSPACE */}
                <main className="admin-workspace">
                    {children}
                </main>
            </div>

            <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </div>
    );
};

export default AdminLayout;
