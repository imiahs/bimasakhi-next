'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

function isHrefActive(pathname, href) {
    if (!href) {
        return false;
    }

    if (href === '/') {
        return pathname === '/';
    }

    return pathname === href || pathname?.startsWith(`${href}/`);
}

const FALLBACK_PUBLIC_HEADER_MENU = [
    { id: 'fallback-home', name: 'Home', slug: '/', is_cta: false, children: [] },
    { id: 'fallback-why', name: 'Why Join', slug: '/why', is_cta: false, children: [] },
    { id: 'fallback-income', name: 'Income', slug: '/income', is_cta: false, children: [] },
    { id: 'fallback-eligibility', name: 'Eligibility', slug: '/eligibility', is_cta: false, children: [] },
    { id: 'fallback-blog', name: 'Blog', slug: '/blog', is_cta: false, children: [] },
    {
        id: 'fallback-tools',
        name: 'Tools',
        slug: '/tools',
        is_cta: false,
        children: [
            { id: 'fallback-tools-income', name: 'LIC Income Calculator', slug: '/tools/lic-income-calculator' },
            { id: 'fallback-tools-commission', name: 'LIC Commission Calculator', slug: '/tools/lic-commission-calculator' },
        ],
    },
    { id: 'fallback-downloads', name: 'Downloads', slug: '/downloads', is_cta: false, children: [] },
    { id: 'fallback-about', name: 'About', slug: '/about', is_cta: false, children: [] },
    { id: 'fallback-contact', name: 'Contact', slug: '/contact', is_cta: false, children: [] },
    { id: 'fallback-apply', name: 'Apply Now', slug: '/apply', is_cta: true, children: [] },
];

const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [navigationItems, setNavigationItems] = useState(FALLBACK_PUBLIC_HEADER_MENU);
    const [navigationLoading, setNavigationLoading] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        if (menuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
    }, [menuOpen]);

    const closeMenu = () => {
        setMenuOpen(false);
    };

    useEffect(() => {
        let cancelled = false;

        const fetchNavigation = async () => {
            setNavigationLoading(true);

            try {
                const response = await fetch('/api/navigation', {
                    cache: 'no-store',
                });
                const payload = await response.json();

                if (!payload.success) {
                    throw new Error(payload.error || 'Failed to load navigation.');
                }

                if (!cancelled) {
                    setNavigationItems(Array.isArray(payload.menu) && payload.menu.length > 0
                        ? payload.menu
                        : FALLBACK_PUBLIC_HEADER_MENU);
                }
            } catch {
                if (!cancelled) {
                    setNavigationItems(FALLBACK_PUBLIC_HEADER_MENU);
                }
            } finally {
                if (!cancelled) {
                    setNavigationLoading(false);
                }
            }
        };

        fetchNavigation();

        return () => {
            cancelled = true;
        };
    }, []);

    const navItems = navigationItems.filter((item) => !item.is_cta);
    const ctaItem = navigationItems.find((item) => item.is_cta) || null;

    const navClass = (href) => isHrefActive(pathname, href) ? 'active' : '';

    if (pathname?.startsWith('/admin')) return null;

    return (
        <header className="site-header">

            <div className="container nav-wrapper">

                {/* Logo */}
                <Link href="/" className="brand-logo" onClick={closeMenu}>
                    <Image src="/images/home/logo.png" alt="Bima Sakhi Logo" width={200} height={50} priority style={{ width: 'auto', height: 'auto', maxHeight: '50px' }} />
                    <div className="brand-text">
                        <span className="brand-name">Bima Sakhi</span>
                        <span className="brand-tagline">
                            Women Empowerment through LIC Opportunity
                        </span>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <nav className="nav-links desktop-menu">
                    {navigationLoading ? (
                        <span className="navbar-status">Loading navigation...</span>
                    ) : (
                        navItems.map((item) => {
                            const hasChildren = item.children?.length > 0;
                            const parentActive = isHrefActive(pathname, item.slug) || item.children?.some((child) => isHrefActive(pathname, child.slug));

                            return (
                                <div key={item.id} className={`nav-item ${hasChildren ? 'has-children' : ''}`}>
                                    {item.slug ? (
                                        <Link href={item.slug} className={parentActive ? 'active' : ''}>{item.name}</Link>
                                    ) : (
                                        <button type="button" className={`nav-link-button ${parentActive ? 'active' : ''}`}>{item.name}</button>
                                    )}

                                    {hasChildren && (
                                        <div className="nav-submenu">
                                            {item.children.map((child) => (
                                                child.slug ? (
                                                    <Link key={child.id} href={child.slug} className={navClass(child.slug)}>
                                                        {child.name}
                                                    </Link>
                                                ) : (
                                                    <span key={child.id} className="nav-submenu-label">{child.name}</span>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </nav>

                {/* Desktop CTA */}
                <div className="nav-cta desktop-menu">
                    {ctaItem?.slug ? (
                        <Link href={ctaItem.slug} className="apply-btn">
                            {ctaItem.name}
                        </Link>
                    ) : null}
                </div>

                {/* Hamburger */}
                <div
                    className={`hamburger ${menuOpen ? 'active' : ''}`}
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </div>

            </div>

            {/* Mobile Menu Overlay */}
            <div
                className={`mobile-overlay ${menuOpen ? 'show' : ''}`}
                onClick={closeMenu}
            ></div>

            {/* Mobile Slide Menu */}
            <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
                {navigationLoading ? (
                    <span className="navbar-status">Loading navigation...</span>
                ) : (
                    navItems.map((item) => (
                        <div key={item.id} className="mobile-nav-group">
                            {item.slug ? (
                                <Link href={item.slug} onClick={closeMenu} className={navClass(item.slug)}>{item.name}</Link>
                            ) : (
                                <span className="mobile-nav-label">{item.name}</span>
                            )}

                            {item.children?.length > 0 && (
                                <div className="mobile-submenu">
                                    {item.children.map((child) => (
                                        child.slug ? (
                                            <Link key={child.id} href={child.slug} onClick={closeMenu} className={navClass(child.slug)}>
                                                {child.name}
                                            </Link>
                                        ) : (
                                            <span key={child.id} className="mobile-nav-label mobile-nav-sublabel">{child.name}</span>
                                        )
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}

                {ctaItem?.slug ? (
                    <Link href={ctaItem.slug} className="apply-btn mobile-apply" onClick={closeMenu}>
                        {ctaItem.name}
                    </Link>
                ) : null}

            </div>

        </header>
    );
};

export default Navbar;