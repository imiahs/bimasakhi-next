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
        <footer className="site-footer bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800">
            {/* Layer 1: Main Grid (Brand, About, Contact & Navigation) */}
            <div className="container max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
                {/* Column 1 - Brand & About (5 cols) */}
                <div className="md:col-span-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <Image
                            src="https://litucwmzwhpqfgyahpcl.supabase.co/storage/v1/object/public/media/logo/logo1-1779744851525.webp"
                            alt="Bima Sakhi Logo"
                            width={40}
                            height={40}
                            className="w-10 h-10 object-contain"
                        />
                        <div>
                            <span className="font-bold text-xl text-white block leading-tight">Bima Sakhi</span>
                            <span className="text-xs font-semibold text-blue-400">Operated by IMIAH Services</span>
                        </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        BimaSakhi.com is an independent career awareness and recruitment assistance platform helping eligible individuals explore LIC agency opportunities through guidance, education, and application support. We do not sell insurance policies or collect insurance premiums.
                    </p>

                    <div className="text-xs font-medium text-slate-400 pt-1">
                        Career Guidance • LIC Agency Opportunities • Financial Independence
                    </div>

                    {/* Support Contact Quick Card */}
                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 text-xs space-y-1.5 mt-3">
                        <div className="font-semibold text-white">Direct Support Contact:</div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-300">
                            <span>📧 <a href="mailto:support@bimasakhi.com" className="text-blue-400 hover:underline">support@bimasakhi.com</a></span>
                            <span>📞 <a href="tel:+919311073365" className="text-blue-400 hover:underline">+91-9311073365</a></span>
                        </div>
                        <div className="text-slate-400 text-[11px] pt-0.5">
                            📍 Location: Krishna Nagar, East Delhi, Delhi, India
                        </div>
                    </div>
                </div>

                {/* Columns 2 to 4 - Dynamic Navigation Groups (7 cols) */}
                <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6 pt-1 md:pt-0">
                    {footerGroups.map((group) => (
                        <div key={group.id || group.name} className="space-y-3">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider m-0">
                                {group.name}
                            </h4>
                            <ul className="list-none p-0 m-0 space-y-2 text-xs sm:text-sm">
                                {(group.children || []).map((item) => (
                                    item.slug ? (
                                        <li key={item.id || item.slug}>
                                            <Link 
                                                href={item.slug}
                                                className="text-slate-300 hover:text-white transition-colors"
                                            >
                                                {item.name}
                                            </Link>
                                        </li>
                                    ) : null
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Layer 2: Trust & Disclosure Bar */}
            <div className="border-t border-slate-800 bg-slate-950/60 py-6">
                <div className="container max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Concise Trademark & Independence Statement */}
                    <div className="text-xs text-slate-400 leading-relaxed max-w-3xl text-center md:text-left">
                        BimaSakhi.com is independently operated by <strong>IMIAH Services</strong> and is not the official website of LIC. <strong>LIC®</strong> is a registered trademark of Life Insurance Corporation of India.
                    </div>

                    {/* Trust Badges */}
                    <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold">
                        <span className="px-2.5 py-1 rounded-full border border-blue-500/40 text-blue-300 bg-blue-950/40">
                            Independent Platform
                        </span>
                        <span className="px-2.5 py-1 rounded-full border border-slate-700 text-slate-300 bg-slate-800/40">
                            Privacy First
                        </span>
                        <span className="px-2.5 py-1 rounded-full border border-emerald-500/40 text-emerald-300 bg-emerald-950/40">
                            Recruitment Support
                        </span>
                    </div>
                </div>
            </div>

            {/* Layer 3: Footer Bottom & Visitor Counter */}
            <div className="border-t border-slate-800/80 pt-6">
                <div className="container max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                        <VisitorCounter />
                    </div>
                    <div>
                        © {new Date().getFullYear()} IMIAH Services. All Rights Reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;