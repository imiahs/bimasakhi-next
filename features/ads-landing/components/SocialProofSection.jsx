'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../context/LanguageContext';
import './SocialProofSection.css';

const SocialProofSection = () => {

    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: "2.5 Lakh+ Women Have Already Joined Across India",
            subtitle:
                "Thousands are building independent LIC agency careers with structured support.",
            stats: [
                { number: "2.5L+", label: "Women Joined Nationwide" },
                { number: "Delhi NCR", label: "Active Phase-1 Zone" },
                { number: "100%", label: "Free Training Support" }
            ]
        },
        hi: {
            title: "2.5 लाख+ महिलाएं पूरे भारत में जुड़ चुकी हैं",
            subtitle:
                "हजारों लोग संरचित मार्गदर्शन के साथ सफल LIC एजेंसी करियर बना रहे हैं।",
            stats: [
                { number: "2.5L+", label: "महिलाएं जुड़ीं" },
                { number: "दिल्ली NCR", label: "सक्रिय Phase-1 क्षेत्र" },
                { number: "100%", label: "निःशुल्क प्रशिक्षण" }
            ]
        }
    };

    const t = content[language] || content.en;

    return (
        <section className="ads-social-proof">

            <div className="ads-social-container">

                <h2>{t.title}</h2>

                <p className="ads-social-subtitle">
                    {t.subtitle}
                </p>

                <div className="ads-social-stats">
                    {t.stats.map((stat, index) => (
                        <div key={index} className="ads-stat-card">
                            <div className="ads-stat-number">
                                {stat.number}
                            </div>
                            <div className="ads-stat-label">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

            </div>

        </section>
    );
};

export default SocialProofSection;