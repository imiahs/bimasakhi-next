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
    const pathname = usePathname();

    if (pathname === "/apply" || pathname?.startsWith("/admin")) return null;

    return (
        <div className="floating-actions-wrapper">
            <FloatingWhatsApp />
            <FloatingApply />
        </div>
    );
};

export default FloatingActions;