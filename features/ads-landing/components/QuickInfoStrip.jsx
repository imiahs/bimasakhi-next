'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../context/LanguageContext';
import './QuickInfoStrip.css';

const QuickInfoStrip = () => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: [
            "10th Pass Minimum",
            "Age 18–70 Years",
            "3-Year Stipend Support",
            "Commission-Based Career"
        ],
        hi: [
            "न्यूनतम 10वीं पास",
            "उम्र 18–70 वर्ष",
            "3 साल स्टाइपेंड सहायता",
            "कमीशन आधारित करियर"
        ]
    };

    const items = content[language] || content.en;

    return (
        <section className="quick-info-strip">
            <div className="quick-info-container">
                {items.map((item, index) => (
                    <div key={index} className="quick-info-item">
                        ✔ {item}
                    </div>
                ))}
            </div>
        </section>
    );
};

export default QuickInfoStrip;