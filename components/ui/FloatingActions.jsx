'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import FloatingWhatsApp from './FloatingWhatsApp';
import '../../styles/FloatingActions.css';

// Build-time fix: Disable SSR for FloatingApply to prevent "E is not defined" ReferenceErrors
// caused by `useSearchParams` in a global layout component.
const FloatingApply = dynamic(() => import('./FloatingApply'), { ssr: false });

const FloatingActions = () => {

    const [visible, setVisible] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 250) {
                setVisible(true);
            } else {
                setVisible(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (pathname === "/apply") return null;
    if (!visible) return null;

    return (
        <div className="floating-actions-wrapper">
            <FloatingWhatsApp />
            <FloatingApply />
        </div>
    );
};

export default FloatingActions;