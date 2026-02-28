'use client';

import { useEffect, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { ConfigContext } from '@/context/ConfigContext';
import { analytics } from '@/services/analytics';

const AnalyticsTracker = () => {
    const pathname = usePathname();
    const { config } = useContext(ConfigContext);

    useEffect(() => {
        if (config) {
            analytics.initialize(config);
        }
    }, [config]);

    useEffect(() => {
        analytics.pageView(pathname);
    }, [pathname]);

    return null;
};

export default AnalyticsTracker;
