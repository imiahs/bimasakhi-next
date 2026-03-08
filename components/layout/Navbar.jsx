'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false);
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

    const navClass = (href) => pathname === href ? 'active' : '';

    return (
        <header className="site-header">

            <div className="container nav-wrapper">

                {/* Logo */}
                <Link href="/" className="brand-logo" onClick={closeMenu}>
                    <img src="/images/home/logo.png" alt="Bima Sakhi Logo" />
                    <div className="brand-text">
                        <span className="brand-name">Bima Sakhi</span>
                        <span className="brand-tagline">
                            Women Empowerment through LIC Opportunity
                        </span>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <nav className="nav-links desktop-menu">
                    <Link href="/" className={navClass('/')}>Home</Link>
                    <Link href="/why" className={navClass('/why')}>Why Join</Link>
                    <Link href="/income" className={navClass('/income')}>Income</Link>
                    <Link href="/eligibility" className={navClass('/eligibility')}>Eligibility</Link>
                    <Link href="/blog" className={navClass('/blog')}>Blog</Link>
                    <Link href="/tools" className={navClass('/tools')}>Tools</Link>
                    <Link href="/downloads" className={navClass('/downloads')}>Downloads</Link>
                    <Link href="/about" className={navClass('/about')}>About</Link>
                    <Link href="/contact" className={navClass('/contact')}>Contact</Link>
                </nav>

                {/* Desktop CTA */}
                <div className="nav-cta desktop-menu">
                    <Link href="/apply" className="apply-btn">
                        Apply Now
                    </Link>
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

                <Link href="/" onClick={closeMenu} className={navClass('/')}>Home</Link>
                <Link href="/why" onClick={closeMenu} className={navClass('/why')}>Why Join</Link>
                <Link href="/income" onClick={closeMenu} className={navClass('/income')}>Income</Link>
                <Link href="/eligibility" onClick={closeMenu} className={navClass('/eligibility')}>Eligibility</Link>
                <Link href="/blog" onClick={closeMenu} className={navClass('/blog')}>Blog</Link>
                <Link href="/tools" onClick={closeMenu} className={navClass('/tools')}>Tools</Link>
                <Link href="/downloads" onClick={closeMenu} className={navClass('/downloads')}>Downloads</Link>
                <Link href="/about" onClick={closeMenu} className={navClass('/about')}>About</Link>
                <Link href="/contact" onClick={closeMenu} className={navClass('/contact')}>Contact</Link>

                <Link href="/apply" className="apply-btn mobile-apply" onClick={closeMenu}>
                    Apply Now
                </Link>

            </div>

        </header>
    );
};

export default Navbar;