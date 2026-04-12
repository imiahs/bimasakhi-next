'use client';

import { useEffect, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { ConfigContext } from '@/context/ConfigContext';
import { analytics } from '@/services/analytics';

const AnalyticsTracker = () => {
    const pathname = usePathname();
    const { config } = useContext(ConfigContext);

    // Initialize first-party telemetry immediately on mount
    // GA4/GTM will be added when config loads with explicit analytics flags
    useEffect(() => {
        analytics.initialize(config || {});
    }, [config]);

    useEffect(() => {
        if (pathname) {
            analytics.pageView(pathname);
        }
    }, [pathname]);

    return null;
};

export default AnalyticsTracker;
