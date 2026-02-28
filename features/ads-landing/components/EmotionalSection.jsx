'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../context/LanguageContext';
import './EmotionalSection.css';

const EmotionalSection = () => {

    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: "Why Do People Choose LIC Agency Career?",
            intro:
                "Because it gives freedom, respect, and the ability to build your own identity.",
            points: [
                "Control Over Your Income",
                "Flexible Working Hours",
                "Respect in Society",
                "Long-Term Growth Opportunity"
            ],
            highlight:
                "Every successful agent once started from zero."
        },
        hi: {
            title: "लोग LIC एजेंट क्यों बनते हैं?",
            intro:
                "क्योंकि यह देता है स्वतंत्रता, सम्मान और अपनी पहचान बनाने का अवसर।",
            points: [
                "अपनी आय पर पूरा नियंत्रण",
                "लचीला कार्य समय",
                "समाज में सम्मान",
                "लंबी अवधि का विकास अवसर"
            ],
            highlight:
                "हर सफल एजेंट ने शून्य से शुरुआत की थी।"
        }
    };

    const t = content[language] || content.en;

    return (
        <section className="ads-emotional-section">
            <div className="ads-container ads-emotional-flex">

                {/* LEFT CONTENT */}
                <div className="ads-emotional-text">

                    <h2>{t.title}</h2>

                    <p className="emotional-intro">
                        {t.intro}
                    </p>

                    <ul className="emotional-points">
                        {t.points.map((point, index) => (
                            <li key={index}>✔ {point}</li>
                        ))}
                    </ul>

                    <div className="emotional-highlight">
                        {t.highlight}
                    </div>

                </div>

                {/* RIGHT VISUAL */}
                <div className="ads-emotional-visual">
                    <img
                        src="/images/home/mentor-profile.jpg"
                        alt="Successful LIC Agent"
                    />
                </div>

            </div>
        </section>
    );
};

export default EmotionalSection;