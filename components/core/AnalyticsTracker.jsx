'use client';

import { useEffect, useContext, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ConfigContext } from '@/context/ConfigContext';
import { analytics } from '@/services/analytics';

const AnalyticsTracker = () => {
    const pathname = usePathname();
    const { config } = useContext(ConfigContext);
    const sessionStarted = useRef(false);

    // Initialize analytics immediately on mount
    useEffect(() => {
        analytics.initialize(config || {});

        // Fire session_started exactly once per app session (Strict Mode safe)
        if (!sessionStarted.current) {
            sessionStarted.current = true;
            analytics.dispatch('session_started', 'App Init', { 
                referrer: document.referrer || 'direct' 
            });
        }
    }, [config]);

    // Track page views
    useEffect(() => {
        if (pathname) {
            analytics.pageView(pathname);
        }
    }, [pathname]);

    return null;
};

export default AnalyticsTracker;
