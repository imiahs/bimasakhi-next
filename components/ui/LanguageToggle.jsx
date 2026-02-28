'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import '../../styles/LanguageToggle.css';

const LanguageToggle = () => {
    const { language, switchLanguage } = useContext(LanguageContext);

    // Current language check
    const isEnglish = language === 'en';

    // Next language (what button should switch to)
    const nextLanguage = isEnglish ? 'hi' : 'en';

    // Button label (what user sees)
    const buttonLabel = isEnglish ? 'हिंदी' : 'English';

    return (
        <div className="language-toggle-floating">
            <button
                className="lang-btn"
                onClick={() => switchLanguage(nextLanguage)}
                aria-label={`Switch to ${buttonLabel}`}
            >
                {buttonLabel}
            </button>
        </div>
    );
};

export default LanguageToggle;
