'use client';

import { createContext } from 'react';
import useSWR from 'swr';
import axios from 'axios';

export const ConfigContext = createContext();

const DEFAULT_CONFIG = {
    isAppPaused: false,
    isRedirectPaused: false,
    delhiOnlyMessage: 'Currently onboarding women from Delhi NCR only.',
    ctaText: 'Apply on WhatsApp',
    heroTitle: 'Become a LIC Agent',
    heroSubtitle: 'Government Backed Commission Career',
};

// SWR Fetcher
const fetcher = url => axios.get(url).then(res => res.data);

export const ConfigProvider = ({ children }) => {
    const { data: config, error, mutate } = useSWR('/api/admin-data/config-get', fetcher, {
        fallbackData: DEFAULT_CONFIG,
        refreshInterval: 0,
        revalidateOnFocus: false
    });

    const updateConfig = async (newConfig) => {
        mutate({ ...config, ...newConfig }, false);
        console.warn("Config updates must be done via Admin Panel.");
    };

    const refreshConfig = () => mutate();

    return (
        <ConfigContext.Provider value={{ config: config || DEFAULT_CONFIG, updateConfig, refreshConfig }}>
            {children}
        </ConfigContext.Provider>
    );
};
