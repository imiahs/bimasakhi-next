'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { LanguageContext } from '../../context/LanguageContext';
import Button from '../ui/Button';

const FloatingCTA = () => {
    const [isVisible, setIsVisible] = useState(false);
    const { language } = useContext(LanguageContext);

    useEffect(() => {
        const handleScroll = () => {
            // Show after scrolling 30% of viewport height
            // This ensures it doesn't clash with Hero CTA immediately
            if (window.scrollY > window.innerHeight * 0.4) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const text = language === 'hi' ? 'अभी अप्लाई करें (2 मिनट)' : 'Apply Now (2 Mins)';

    if (!isVisible) return null;

    return (
        <div className="floating-cta-safe md:hidden">
            <Link href="/apply">
                <Button variant="primary" className="shadow-lg w-full">
                    {text} <span style={{ marginLeft: '8px' }}>➝</span>
                </Button>
            </Link>
        </div>
    );
};

export default FloatingCTA;
