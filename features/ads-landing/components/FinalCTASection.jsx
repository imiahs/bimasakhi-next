'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../context/LanguageContext';
import './FinalCTASection.css';

const FinalCTASection = ({ onApplyClick }) => {

    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: "Take the First Step Towards Your Independent Future",
            subtitle:
                "Your journey as a respected LIC agent can start today. All it takes is one decision.",
            button: "Apply Now",
            microNote: "No registration fee. Free training support."
        },
        hi: {
            title: "अपने आत्मनिर्भर भविष्य की ओर पहला कदम उठाएं",
            subtitle:
                "एक सम्मानजनक LIC एजेंट बनने की आपकी यात्रा आज से शुरू हो सकती है। बस एक निर्णय की जरूरत है।",
            button: "अभी आवेदन करें",
            microNote: "कोई रजिस्ट्रेशन फीस नहीं। निःशुल्क प्रशिक्षण सहायता।"
        }
    };

    const t = content[language] || content.en;

    return (
        <section className="ads-final-cta-section">

            <div className="ads-final-container">

                <h2 className="ads-final-title">
                    {t.title}
                </h2>

                <p className="ads-final-subtitle">
                    {t.subtitle}
                </p>

                <button
                    className="ads-final-button"
                    onClick={onApplyClick}
                >
                    {t.button}
                </button>

                <p className="ads-final-note">
                    {t.microNote}
                </p>

            </div>

        </section>
    );
};

export default FinalCTASection;