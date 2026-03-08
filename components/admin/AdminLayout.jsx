'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CommandPalette from './CommandPalette';
import './AdminLayout.css';

const ADMIN_LINKS = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { label: 'Leads', href: '/admin/leads', icon: '👥' },
    { label: 'Blog CMS', href: '/admin/blog', icon: '📝' },
    { label: 'Resources', href: '/admin/resources', icon: '📁' },
    { label: 'Tools', href: '/admin/tools', icon: '🧮' },
    { label: 'Pages', href: '/admin/pages', icon: '📄' },
    { label: 'SEO', href: '/admin/seo', icon: '🔍' },
    { label: 'Media Library', href: '/admin/media', icon: '🖼️' },
    { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
    { label: 'Automation', href: '/admin/automation', icon: '⚡' },
    { label: 'Users', href: '/admin/users', icon: '🛡️' },
    { label: 'Settings', href: '/admin/settings', icon: '⚙️' },
];

const AdminLayout = ({ children }) => {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);

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
                <header className="admin-topbar">
                    <div className="topbar-search" onClick={() => setPaletteOpen(true)} style={{ cursor: 'pointer' }}>
                        <span>🔎</span>
                        <input type="text" placeholder="Search leads, posts, pages... (Cmd+K)" readOnly style={{ cursor: 'pointer' }} />
                    </div>
                    <div className="topbar-profile">
                        <button className="notification-btn">🔔</button>
                        <div className="profile-avatar">S</div>
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
