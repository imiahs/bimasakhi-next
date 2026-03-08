'use client';

import { createContext, useState, useEffect, useCallback } from 'react';
import { getStorage, setStorage, STORAGE_KEYS } from '@/utils/storage';

export const UserContext = createContext();

const DEFAULT_USER_STATE = {
    visitedPages: [],
    hasSubmitted: false,
    source: 'website',
    city: ''
};

export const UserProvider = ({ children }) => {
    const [userState, setUserState] = useState(DEFAULT_USER_STATE);
    const [isMounted, setIsMounted] = useState(false);

    // Initial Load - runs only on client
    useEffect(() => {
        setIsMounted(true);
        const stored = getStorage(STORAGE_KEYS.USER, DEFAULT_USER_STATE);

        // Task 1: Traffic Source Tracking
        let currentSource = stored ? stored.source : 'direct';

        // Only override if we don't have a specific stored external source, or if we want to catch a new one
        if (!stored || stored.source === 'website' || stored.source === 'direct') {
            const params = new URLSearchParams(window.location.search);
            const utmSource = params.get('utm_source');
            const referrer = document.referrer;
            const path = window.location.pathname;

            if (utmSource) {
                currentSource = utmSource.toLowerCase();
            } else if (referrer) {
                try {
                    const refUrl = new URL(referrer);
                    if (refUrl.hostname.includes('google')) currentSource = 'google';
                    else if (refUrl.hostname.includes('facebook')) currentSource = 'facebook';
                    else if (refUrl.hostname.includes('instagram')) currentSource = 'instagram';
                    else if (refUrl.hostname.includes('youtube')) currentSource = 'youtube';
                    else if (!refUrl.hostname.includes(window.location.hostname)) currentSource = 'referral';
                } catch (e) {
                    // ignore invalid URL
                }
            } else if (path.startsWith('/blog')) {
                currentSource = 'blog';
            } else if (path.startsWith('/tools')) {
                currentSource = 'tools';
            }
        }

        const newState = { ...(stored || DEFAULT_USER_STATE), source: currentSource };
        setUserState(newState);

        // Immediately store
        if (!stored) {
            setStorage(STORAGE_KEYS.USER, newState);
        }
    }, []);

    // Save to storage on change
    useEffect(() => {
        if (isMounted) {
            setStorage(STORAGE_KEYS.USER, userState);
        }
    }, [userState, isMounted]);

    const markPageVisited = (pageName) => {
        setUserState((prev) => {
            if (prev.visitedPages.includes(pageName)) return prev;
            return { ...prev, visitedPages: [...prev.visitedPages, pageName] };
        });
    };

    const setSource = useCallback((source) => {
        setUserState((prev) => ({ ...prev, source }));
    }, []);

    const markSubmitted = useCallback((city, leadData = {}) => {
        setUserState((prev) => ({
            ...prev,
            hasSubmitted: true,
            city,
            lastLeadData: leadData
        }));
    }, []);

    return (
        <UserContext.Provider value={{ userState, markPageVisited, setSource, markSubmitted }}>
            {children}
        </UserContext.Provider>
    );
};
