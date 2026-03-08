'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext';

const SocialProofSection = () => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: "What Women Are Saying",
            subtitle: "Hear from women across India who embraced the Bima Sakhi opportunity and transformed their lives.",
            testimonials: [
                {
                    name: "Sunita Verma",
                    role: "Bima Sakhi, Preet Vihar",
                    quote: "I was a homemaker for 15 years. Bima Sakhi gave me the confidence to step out and earn my own income. Today my family is proud of me!",
                    avatar: "👩‍💼",
                    yearsActive: "2+ years"
                },
                {
                    name: "Rekha Sharma",
                    role: "Bima Sakhi, Laxmi Nagar",
                    quote: "The stipend helped me start without pressure. After 2 years, my commission income alone is more than a regular office job. Best decision ever.",
                    avatar: "👩‍🏫",
                    yearsActive: "3+ years"
                },
                {
                    name: "Meena Gupta",
                    role: "Bima Sakhi, Shahdara",
                    quote: "As a teacher, I work part-time as Bima Sakhi. The flexible hours let me manage both — and the extra income changed our family's life.",
                    avatar: "👩‍🎓",
                    yearsActive: "1+ year"
                }
            ],
            statsTitle: "The Numbers Speak",
            stats: [
                { value: "10,000+", label: "Bima Sakhis Active Across India" },
                { value: "₹7,000", label: "Monthly Stipend in Year 1" },
                { value: "35%", label: "1st Year Commission Rate" },
                { value: "20-25", label: "Years of Renewal Income" }
            ]
        },
        hi: {
            title: "महिलाएं क्या कह रही हैं",
            subtitle: "उन महिलाओं की आवाज़ सुनें जिन्होंने बीमा सखी का अवसर अपनाया और अपना जीवन बदल दिया।",
            testimonials: [
                {
                    name: "सुनीता वर्मा",
                    role: "बीमा सखी, प्रीत विहार",
                    quote: "मैं 15 साल से गृहिणी थी। बीमा सखी ने मुझे बाहर निकलकर कमाने का आत्मविश्वास दिया। आज मेरा परिवार मुझ पर गर्व करता है!",
                    avatar: "👩‍💼",
                    yearsActive: "2+ वर्ष"
                },
                {
                    name: "रेखा शर्मा",
                    role: "बीमा सखी, लक्ष्मी नगर",
                    quote: "स्टाइपेंड ने मुझे बिना दबाव शुरुआत करने में मदद की। 2 साल बाद सिर्फ कमीशन इनकम ही ऑफिस जॉब से ज्यादा है। सबसे अच्छा फैसला था।",
                    avatar: "👩‍🏫",
                    yearsActive: "3+ वर्ष"
                },
                {
                    name: "मीना गुप्ता",
                    role: "बीमा सखी, शाहदरा",
                    quote: "शिक्षिका होने के नाते मैं पार्ट-टाइम बीमा सखी का काम करती हूँ। लचीले घंटों से दोनों संभाल लेती हूँ — और अतिरिक्त आय ने हमारा जीवन बदल दिया।",
                    avatar: "👩‍🎓",
                    yearsActive: "1+ वर्ष"
                }
            ],
            statsTitle: "आंकड़े बोलते हैं",
            stats: [
                { value: "10,000+", label: "पूरे भारत में सक्रिय बीमा सखी" },
                { value: "₹7,000", label: "पहले साल मासिक स्टाइपेंड" },
                { value: "35%", label: "पहले साल कमीशन दर" },
                { value: "20-25", label: "वर्षों तक रिन्यूअल आय" }
            ]
        }
    };

    const t = content[language] || content.en;

    return (
        <section className="social-proof">
            <div className="social-proof-inner">
                <div className="social-proof-header">
                    <h2>{t.title}</h2>
                    <p>{t.subtitle}</p>
                </div>

                {/* Testimonial Cards */}
                <div className="testimonial-grid">
                    {t.testimonials.map((item, index) => (
                        <div className="testimonial-card" key={index}>
                            <div className="testimonial-quote">
                                <span className="quote-mark">"</span>
                                <p>{item.quote}</p>
                            </div>
                            <div className="testimonial-author">
                                <div className="author-avatar">{item.avatar}</div>
                                <div className="author-info">
                                    <strong>{item.name}</strong>
                                    <span>{item.role}</span>
                                </div>
                                <span className="author-badge">{item.yearsActive}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Stats Counter */}
                <div className="stats-section">
                    <h3>{t.statsTitle}</h3>
                    <div className="stats-grid">
                        {t.stats.map((stat, index) => (
                            <div className="stat-item" key={index}>
                                <div className="stat-value">{stat.value}</div>
                                <div className="stat-label">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SocialProofSection;