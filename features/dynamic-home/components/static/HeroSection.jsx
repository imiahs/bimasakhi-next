'use client';

import React, { useState, useEffect, useContext } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext'; // Adjust path if needed


const HeroSection = () => {
    const { language } = useContext(LanguageContext);
    const [activeIndex, setActiveIndex] = useState(0);
    const totalSlides = 4;
    const [progress, setProgress] = useState(0);

    // Auto-rotate every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % totalSlides);
            setProgress(0);
        }, 10000);

        const progressInterval = setInterval(() => {
            setProgress((prev) => (prev >= 100 ? 100 : prev + 2));
        }, 100);

        return () => {
            clearInterval(interval);
            clearInterval(progressInterval);
        };
    }, []);

    const goToSlide = (index) => {
        setActiveIndex(index);
        setProgress(0);
    };
    const nextSlide = () => {
        setActiveIndex((prev) => (prev + 1) % totalSlides);
        setProgress(0);
    };
    const prevSlide = () => {
        setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
        setProgress(0);
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

    return (
        <section className="hero">
            <div className="hero-bg"></div>
            <div className="hero-overlay">
                <div className="hero-inner">

                    {/* Slide 1 */}
                    <div className={`hero-content ${activeIndex === 0 ? "active" : ""}`}>
                        <h2 className="hero-intro">{t.slide1.intro}</h2>
                        <h1 className="hero-title">{t.slide1.title}</h1>
                        <h3 className="hero-subtitle">{t.slide1.subtitle}</h3>
                        <img src="/images/home/hero-bg.jpg" alt="Bima Sakhi Visual" className="hero-image" />
                        <p className="hero-description">{t.slide1.desc}</p>
                        <ul className="hero-options">
                            {t.slide1.options.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                        <div className="hero-cta"><button>{t.slide1.cta}</button></div>
                    </div>

                    {/* Slide 2 - Stipend Highlight */}
                    <div className={`hero-content ${activeIndex === 1 ? "active" : ""}`}>
                        <h2 className="hero-intro">{t.slide2.intro}</h2>
                        <h1 className="hero-title">{t.slide2.title}</h1>
                        <h3 className="hero-subtitle">{t.slide2.subtitle}</h3>
                        <img src="/Bima_Sakhi_Ai.png" alt="Empowerment Visual" className="hero-image" />
                        <p className="hero-description">{t.slide2.desc}</p>
                        <ul className="hero-options">
                            {t.slide2.options.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                        <div className="hero-cta"><button>{t.slide2.cta}</button></div>
                    </div>

                    {/* Slide 3 */}
                    <div className={`hero-content ${activeIndex === 2 ? "active" : ""}`}>
                        <h2 className="hero-intro">{t.slide3.intro}</h2>
                        <h1 className="hero-title">{t.slide3.title}</h1>
                        <h3 className="hero-subtitle">{t.slide3.subtitle}</h3>
                        <img src="/Bima_Sakhi_Amita.png" alt="Outreach Visual" className="hero-image" />
                        <p className="hero-description">{t.slide3.desc}</p>
                        <ul className="hero-options">
                            {t.slide3.options.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                        <div className="hero-cta"><button>{t.slide3.cta}</button></div>
                    </div>

                    {/* Slide 4 */}
                    <div className={`hero-content ${activeIndex === 3 ? "active" : ""}`}>
                        <h2 className="hero-intro">{t.slide4.intro}</h2>
                        <h1 className="hero-title">{t.slide4.title}</h1>
                        <h3 className="hero-subtitle">{t.slide4.subtitle}</h3>
                        <img src="/Bima_Sakhi_Avneet.png" alt="Digital Visual" className="hero-image" />
                        <p className="hero-description">{t.slide4.desc}</p>
                        <ul className="hero-options">
                            {t.slide4.options.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                        <div className="hero-cta"><button>{t.slide4.cta}</button></div>
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
                            >
                                {activeIndex === index && (
                                    <span
                                        className="progress-bar"
                                        style={{ width: `${progress}%` }}
                                    ></span>
                                )}
                            </span>
                        ))}
                    </div>

                </div>
            </div>
        </section>
    );
};

export default HeroSection;