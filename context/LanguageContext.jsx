'use client';

import { createContext, useState, useEffect } from 'react';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('hi');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const savedLang = localStorage.getItem('app_lang');
        if (savedLang && (savedLang === 'en' || savedLang === 'hi')) {
            setLanguage(savedLang);
        }
    }, []);

    const switchLanguage = (lang) => {
        if (lang !== 'en' && lang !== 'hi') return;
        setLanguage(lang);
        localStorage.setItem('app_lang', lang);

        if (lang === 'hi') {
            document.title = "Bima Sakhi - LIC Mahila Agent Baney";
        } else {
            document.title = "Bima Sakhi - Government Backed Career for Women";
        }
    };

    return (
        <LanguageContext.Provider value={{ language, switchLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};
