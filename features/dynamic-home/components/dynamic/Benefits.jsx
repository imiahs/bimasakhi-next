'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext';
import Card from '../../../../components/ui/Card';

const Benefits = ({ title = "Why Bima Sakhi?", items = [] }) => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: "Benefits of Becoming Bima Sakhi",
            items: [
                { title: "Work from Home", description: "Manage both home and career together." },
                { title: "Digital Platform", description: "Complete work via LIC ANANDA App." },
                { title: "No Investment", description: "Free training and guidance by LIC." },
                { title: "Freedom & Respect", description: "No boss, decide your own time." }
            ]
        },
        hi: {
            title: "Bima Sakhi बनने के फायदे",
            items: [
                { title: "घर से काम", description: "घर और करियर दोनों संभालें।" },
                { title: "डिजिटल प्लेटफॉर्म", description: "LIC ANANDA ऐप से पूरा काम।" },
                { title: "कोई निवेश नहीं", description: "ट्रेनिंग और मार्गदर्शन LIC द्वारा।" },
                { title: "फ्रीडम और सम्मान", description: "कोई बॉस नहीं, अपना समय खुद तय करें।" }
            ]
        }
    };

    const t = content[language];
    const displayItems = items.length > 0 ? items : t.items;

    return (
        <section className="benefits-section">
            <div className="container">
                <h2>{t.title}</h2>
                <div className="benefits-grid">
                    {displayItems.map((b, index) => (
                        <Card key={index} className="benefit-card">
                            <h3>{b.title}</h3>
                            <p>{b.description}</p>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Benefits;
