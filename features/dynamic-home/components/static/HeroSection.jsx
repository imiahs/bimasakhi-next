'use client';

import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { LanguageContext } from '../../../../context/LanguageContext';


const HeroSection = () => {
    const { language } = useContext(LanguageContext);
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(0);
    const totalSlides = 4;

    const goToSlide = (index) => {
        setActiveIndex(index);
    };
    const nextSlide = () => {
        setActiveIndex((prev) => (prev + 1) % totalSlides);
    };
    const prevSlide = () => {
        setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    };

    const text = {
        en: {
            slide1: {
                intro: "LIC & Government of India Initiative",
                title: "Bima Sakhi Yojana",
                subtitle: "Special Opportunity for Women in East Delhi",
                desc: "Become a LIC Bima Sakhi and gain financial independence. Special scheme only for women!",
                options: [
                    "Only for Women",
                    "Min. 10th Pass",
                    "Zero Investment",
                    "Flexible Work"
                ],
                cta: "Know More"
            },
            slide2: {
                intro: "Stipend for 3 Years",
                title: "Monthly Stipend + Commission",
                subtitle: "Earn While You Learn in East Delhi",
                desc: "Get monthly stipend for first 3 years + regular commission on policies (as per LIC terms).",
                options: [
                    "1st Year: ₹7000/month",
                    "2nd Year: ₹6000/month",
                    "3rd Year: ₹5000/month",
                    "Plus Commission"
                ],
                cta: "Join Now"
            },
            slide3: {
                intro: "Empower Yourself Today",
                title: "Women of East Delhi – Your Chance!",
                subtitle: "Flexible Work | Good Income | Respect",
                desc: "Work as LIC agent in your area. Help families, earn money, and become strong & independent.",
                options: [
                    "Free Training",
                    "Flexible Work",
                    "Only for Female",
                    "Financial Independence"
                ],
                cta: "Get Started"
            },
            slide4: {
                intro: "Build Your Bright Future",
                title: "Become a Successful Bima Sakhi",
                subtitle: "Stipend for 3 Years – Earn More After That!",
                desc: "After stipend period, continue as regular LIC agent and earn good commission for life (as per LIC rules).",
                options: [
                    "Rewarding Career",
                    "Respect in Society",
                    "Help Your Community",
                    "Financial Independence"
                ],
                cta: "Apply Today"
            }
        },
        hi: {
            slide1: {
                intro: "एलआईसी और भारत सरकार की पहल",
                title: "बीमा सखी योजना",
                subtitle: "पूर्वी दिल्ली की महिलाओं के लिए खास अवसर",
                desc: "एलआईसी बीमा सखी बनें और आर्थिक रूप से आत्मनिर्भर बनें। सिर्फ महिलाओं के लिए विशेष योजना!",
                options: [
                    "केवल महिलाओं के लिए",
                    "10वीं पास",
                    "शून्य निवेश",
                    "लचीला काम"
                ],
                cta: "और जानें"
            },
            slide2: {
                intro: "3 साल की स्टाइपेंड",
                title: "मासिक स्टाइपेंड + कमीशन",
                subtitle: "पूर्वी दिल्ली में सीखते हुए कमाएं",
                desc: "पहले 3 साल तक मासिक स्टाइपेंड + हर पॉलिसी पर नियमित कमीशन (एलआईसी नियमों के अनुसार)।",
                options: [
                    "पहला साल: ₹7000/माह",
                    "दूसरा साल: ₹6000/माह",
                    "तीसरा साल: ₹5000/माह",
                    "प्लस कमीशन!"
                ],
                cta: "अभी जुड़ें"
            },
            slide3: {
                intro: "आज खुद को सशक्त बनाएं",
                title: "पूर्वी दिल्ली की महिलाएं – आपका मौका!",
                subtitle: "सरल काम | अच्छी कमाई | सम्मान",
                desc: "अपने इलाके में एलआईसी एजेंट बनकर काम करें। परिवारों की मदद करें, पैसा कमाएं और मजबूत व आत्मनिर्भर बनें।",
                options: [
                    "ट्रेनिंग दी जाएगी",
                    "घर से या फील्ड में काम",
                    "पूर्वी दिल्ली पर विशेष फोकस",
                    "महिलाओं के लिए आर्थिक आजादी"
                ],
                cta: "शुरू करें"
            },
            slide4: {
                intro: "अपना उज्ज्वल भविष्य बनाएं",
                title: "सफल बीमा सखी बनें",
                subtitle: "3 साल बाद – असीमित कमाई!",
                desc: "स्टाइपेंड पीरियड के बाद नियमित एलआईसी एजेंट बनकर जीवन भर अच्छा कमीशन कमाएं (एलआईसी नियमों के अनुसार)।",
                options: [
                    "जीवन भर का करियर",
                    "समाज में सम्मान",
                    "अपने समुदाय की मदद",
                    "परिवार को सुरक्षित करें"
                ],
                cta: "आज आवेदन करें"
            }
        }
    };

    const t = text[language] || text.en; // Fallback to English
    const slides = [
        { ...t.slide1, image: 'https://litucwmzwhpqfgyahpcl.supabase.co/storage/v1/object/public/media/hero/hero-bg-1779744603094.webp', alt: 'Bima Sakhi Visual', route: '/why' },
        { ...t.slide2, image: 'https://litucwmzwhpqfgyahpcl.supabase.co/storage/v1/object/public/media/lic-bima-sakhi-client-meeting-1778562840168.webp', alt: 'Empowerment Visual', route: '/income' },
        { ...t.slide3, image: 'https://litucwmzwhpqfgyahpcl.supabase.co/storage/v1/object/public/media/successful-woman-lic-career-1778562617342.webp', alt: 'Outreach Visual', route: '/why' },
        { ...t.slide4, image: 'https://litucwmzwhpqfgyahpcl.supabase.co/storage/v1/object/public/media/woman-supporting-family-lic-1778562506570.webp', alt: 'Digital Visual', route: '/apply' },
    ];
    const currentSlide = slides[activeIndex] || slides[0];

    return (
        <section className="hero">
            <div className="hero-bg"></div>
            <div className="hero-overlay">
                <div className="hero-inner">
                    <div className="hero-content active">
                        <h2 className="hero-intro">{currentSlide.intro}</h2>
                        <h1 className="hero-title">{currentSlide.title}</h1>
                        <h3 className="hero-subtitle">{currentSlide.subtitle}</h3>
                        <img
                            src={currentSlide.image}
                            alt={currentSlide.alt}
                            className="hero-image"
                            width="960"
                            height="720"
                            loading="eager"
                            fetchPriority="high"
                            decoding="async"
                        />
                        <p className="hero-description">{currentSlide.desc}</p>
                        <ul className="hero-options">
                            {currentSlide.options.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                        <div className="hero-cta"><button onClick={() => router.push(currentSlide.route)}>{currentSlide.cta}</button></div>
                    </div>

                    {/* Navigation Controls */}
                    <div className="hero-nav">
                        <button onClick={prevSlide} className="nav-btn">‹</button>
                        <button onClick={nextSlide} className="nav-btn">›</button>
                    </div>

                    {/* Dots + Progress Bar */}
                    <div className="hero-dots">
                        {[...Array(totalSlides)].map((_, index) => (
                            <span
                                key={index}
                                className={`dot ${activeIndex === index ? "active" : ""}`}
                                onClick={() => goToSlide(index)}
                            ></span>
                        ))}
                    </div>

                </div>
            </div>
        </section>
    );
};

export default HeroSection;