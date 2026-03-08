'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext';

const BenefitsSection = () => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: "Why Become a Bima Sakhi? Key Benefits & Support",
            subtitle: "Joining Bima Sakhi Yojana gives you financial support to start, flexible work, lifelong earning potential, and the pride of helping families secure their future.",
            items: [
                {
                    icon: "💰",
                    title: "Monthly Stipend for First 3 Years",
                    description: "Year 1: ₹7,000/month • Year 2: ₹6,000/month • Year 3: ₹5,000/month — financial support while you learn.",
                    highlight: "₹2.16 Lakhs Total"
                },
                {
                    icon: "📈",
                    title: "Lifetime Commission Earnings",
                    description: "Earn attractive commission on every policy sold — no upper limit. Build strong recurring renewal income over time.",
                    highlight: "No Upper Limit"
                },
                {
                    icon: "🕐",
                    title: "Complete Flexibility",
                    description: "Choose your own hours — work from home or field, part-time or full-time. Perfect for homemakers balancing family.",
                    highlight: "Work-Life Balance"
                },
                {
                    icon: "🎓",
                    title: "Free Training & Guidance",
                    description: "Free materials, exam prep, product knowledge, and ongoing mentorship from authorized LIC Development Officer.",
                    highlight: "100% Free"
                },
                {
                    icon: "🏅",
                    title: "Respect & Recognition",
                    description: "Earn respect as a trusted LIC agent. Help protect families' futures and build a prestigious long-term career.",
                    highlight: "Social Status"
                },
                {
                    icon: "🏥",
                    title: "Insurance & Medical Benefits",
                    description: "Group Term Insurance, Mediclaim coverage, and gratuity benefits after qualifying period as per LIC norms.",
                    highlight: "Family Security"
                }
            ]
        },
        hi: {
            title: "बीमा सखी क्यों बनें? मुख्य लाभ और सहायता",
            subtitle: "बीमा सखी योजना में शामिल होने से आपको शुरुआत में आर्थिक सहायता, लचीला काम और जीवन भर की कमाई का अवसर मिलता है।",
            items: [
                {
                    icon: "💰",
                    title: "पहले 3 साल मासिक स्टाइपेंड",
                    description: "पहला साल: ₹7,000/माह • दूसरा साल: ₹6,000/माह • तीसरा साल: ₹5,000/माह — सीखते हुए आर्थिक सहायता।",
                    highlight: "कुल ₹2.16 लाख"
                },
                {
                    icon: "📈",
                    title: "जीवन भर कमीशन कमाई",
                    description: "हर बेची गई पॉलिसी पर आकर्षक कमीशन — कोई ऊपरी सीमा नहीं। समय के साथ मजबूत रिन्यूअल इनकम बनाएं।",
                    highlight: "असीमित कमाई"
                },
                {
                    icon: "🕐",
                    title: "पूर्ण लचीलापन",
                    description: "अपने समय का चुनाव करें — घर से या फील्ड में, पार्ट-टाइम या फुल-टाइम। गृहिणियों के लिए आदर्श।",
                    highlight: "वर्क-लाइफ बैलेंस"
                },
                {
                    icon: "🎓",
                    title: "निःशुल्क प्रशिक्षण और मार्गदर्शन",
                    description: "निःशुल्क सामग्री, परीक्षा तैयारी, उत्पाद ज्ञान और LIC विकास अधिकारी से निरंतर मेंटरशिप।",
                    highlight: "100% निःशुल्क"
                },
                {
                    icon: "🏅",
                    title: "सम्मान और पहचान",
                    description: "विश्वसनीय LIC एजेंट के रूप में सम्मान कमाएं। परिवारों की सुरक्षा करें और प्रतिष्ठित करियर बनाएं।",
                    highlight: "सामाजिक प्रतिष्ठा"
                },
                {
                    icon: "🏥",
                    title: "बीमा और चिकित्सा लाभ",
                    description: "ग्रुप टर्म इंश्योरेंस, मेडिक्लेम कवरेज और ग्रेच्युटी लाभ — LIC नियमों के अनुसार।",
                    highlight: "पारिवारिक सुरक्षा"
                }
            ]
        }
    };

    const t = content[language] || content.en;

    return (
        <section className="benefits">
            <div className="benefits-inner">
                <div className="benefits-header">
                    <h2>{t.title}</h2>
                    <p>{t.subtitle}</p>
                </div>

                <div className="benefits-grid">
                    {t.items.map((item, index) => (
                        <div className="benefit-item" key={index}>
                            <div className="benefit-icon">{item.icon}</div>
                            <h3>{item.title}</h3>
                            <p>{item.description}</p>
                            <span className="benefit-highlight">{item.highlight}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default BenefitsSection;