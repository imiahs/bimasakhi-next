'use client';

import { createContext, useState, useEffect } from 'react';
import { getStorage, setStorage, STORAGE_KEYS } from '@/utils/storage';

export const UserContext = createContext();

const DEFAULT_USER_STATE = {
    visitedPages: [],
    hasSubmitted: false,
    source: 'website',
    city: ''
};

export const UserProvider = ({ children }) => {
    const [userState, setUserState] = useState(() => {
        return getStorage(STORAGE_KEYS.USER, DEFAULT_USER_STATE);
    });

    useEffect(() => {
        setStorage(STORAGE_KEYS.USER, userState);
    }, [userState]);

    const markPageVisited = (pageName) => {
        setUserState((prev) => {
            if (prev.visitedPages.includes(pageName)) return prev;
            return { ...prev, visitedPages: [...prev.visitedPages, pageName] };
        });
    };

    const setSource = (source) => {
        setUserState((prev) => ({ ...prev, source }));
    };

    const markSubmitted = (city, leadData = {}) => {
        setUserState((prev) => ({
            ...prev,
            hasSubmitted: true,
            city,
            lastLeadData: leadData
        }));
    };

    return (
        <UserContext.Provider value={{ userState, markPageVisited, setSource, markSubmitted }}>
            {children}
        </UserContext.Provider>
    );
};
