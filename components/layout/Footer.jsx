'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import VisitorCounter from '../ui/VisitorCounter';

const FALLBACK_PUBLIC_FOOTER_GROUPS = [
    {
        id: 'footer-explore',
        name: 'Explore',
        children: [
            { id: 'footer-why', name: 'Why Join', slug: '/why' },
            { id: 'footer-income', name: 'Income Model', slug: '/income' },
            { id: 'footer-eligibility', name: 'Eligibility', slug: '/eligibility' },
            { id: 'footer-apply', name: 'Apply Now', slug: '/apply' },
        ],
    },
    {
        id: 'footer-resources',
        name: 'Resources',
        children: [
            { id: 'footer-downloads', name: 'Downloads', slug: '/downloads' },
            { id: 'footer-contact', name: 'Contact Us', slug: '/contact' },
            { id: 'footer-about', name: 'About Us', slug: '/about' },
        ],
    },
    {
        id: 'footer-legal',
        name: 'Legal',
        children: [
            { id: 'footer-privacy', name: 'Privacy Policy', slug: '/privacy-policy' },
            { id: 'footer-terms', name: 'Terms & Conditions', slug: '/terms-conditions' },
            { id: 'footer-disclaimer', name: 'Disclaimer', slug: '/disclaimer' },
        ],
    },
];

const Footer = () => {
    const pathname = usePathname();
    const [footerGroups, setFooterGroups] = useState(FALLBACK_PUBLIC_FOOTER_GROUPS);

    useEffect(() => {
        let cancelled = false;

        const fetchFooterNavigation = async () => {
            try {
                const response = await fetch('/api/navigation?menu=public_footer', {
                    cache: 'no-store',
                });
                const payload = await response.json();

                if (!payload.success) {
                    throw new Error(payload.error || 'Failed to load footer navigation.');
                }

                const nextGroups = Array.isArray(payload.menu)
                    ? payload.menu.filter((item) => Array.isArray(item.children) && item.children.length > 0)
                    : [];

                if (!cancelled && nextGroups.length > 0) {
                    setFooterGroups(nextGroups);
                }
            } catch {
                if (!cancelled) {
                    setFooterGroups(FALLBACK_PUBLIC_FOOTER_GROUPS);
                }
            }
        };

        fetchFooterNavigation();

        return () => {
            cancelled = true;
        };
    }, []);

    if (pathname?.startsWith('/admin')) return null;

    return (
        <footer className="site-footer">
            <div className="container footer-grid">

                {/* Column 1 - About */}
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <Image
                            src="/images/home/logo1.png"
                            alt="Bima Sakhi Logo"
                            width={40}
                            height={40}
                            className="w-10 h-10"
                        />
                        <h4 className="m-0">Bima Sakhi</h4>
                    </div>
                    <p>
                        A structured LIC agency opportunity platform focused on
                        empowering women through financial independence.
                    </p>
                </div>

                {footerGroups.map((group) => (
                    <div key={group.id || group.name}>
                        <h4>{group.name}</h4>
                        <ul>
                            {(group.children || []).map((item) => (
                                item.slug ? (
                                    <li key={item.id || item.slug}><Link href={item.slug}>{item.name}</Link></li>
                                ) : null
                            ))}
                        </ul>
                    </div>
                ))}

            </div>

            <div className="footer-bottom">
                <VisitorCounter />
                © {new Date().getFullYear()} Bima Sakhi. All Rights Reserved.
            </div>
        </footer>
    );
};

export default Footer;