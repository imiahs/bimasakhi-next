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
        if (stored) {
            setUserState(stored);
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
