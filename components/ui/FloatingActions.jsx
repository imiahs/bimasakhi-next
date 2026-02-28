'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import FloatingApply from './FloatingApply';
import FloatingWhatsApp from './FloatingWhatsApp';
import '../../styles/FloatingActions.css';

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