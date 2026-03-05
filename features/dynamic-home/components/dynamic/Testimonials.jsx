'use client';

import React, { useContext, useState, useEffect, useMemo } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext';
import './Testimonials.css';

const Testimonials = () => {
    const { language } = useContext(LanguageContext);
    const [currentIndex, setCurrentIndex] = useState(0);

    const data = {
        en: {
            title: "Real Success Stories",
            items: [
                {
                    name: "Raj Kumar",
                    role: "LIC Development Officer",
                    location: "Delhi NCR",
                    image: "/images/home/mentor-profile.jpg",
                    rating: 5,
                    verified: true,
                    message:
                        "Many of my agents started from zero. Today they are financially independent and respected in society."
                },
                {
                    name: "Sunita Sharma",
                    role: "Bima Sakhi",
                    location: "Noida",
                    image: "/images/home/mentor-profile.jpg",
                    rating: 5,
                    verified: true,
                    message:
                        "I began as a homemaker. Now I manage clients confidently and support my family."
                },
                {
                    name: "Pooja Verma",
                    role: "LIC Agent",
                    location: "Delhi",
                    image: "/images/home/mentor-profile.jpg",
                    rating: 4,
                    verified: true,
                    message:
                        "Flexible timing and commission income changed my confidence completely."
                }
            ]
        },
        hi: {
            title: "सफलता की असली कहानियाँ",
            items: [
                {
                    name: "राज कुमार",
                    role: "एलआईसी विकास अधिकारी",
                    location: "दिल्ली NCR",
                    image: "/images/home/mentor-profile.jpg",
                    rating: 5,
                    verified: true,
                    message:
                        "मेरे कई एजेंट शून्य से शुरू हुए थे। आज वे आत्मनिर्भर और सम्मानित हैं।"
                },
                {
                    name: "सुनीता शर्मा",
                    role: "बीमा सखी",
                    location: "नोएडा",
                    image: "/images/home/mentor-profile.jpg",
                    rating: 5,
                    verified: true,
                    message:
                        "मैंने गृहिणी के रूप में शुरुआत की थी। आज मैं आत्मविश्वास से क्लाइंट संभालती हूँ।"
                },
                {
                    name: "पूजा वर्मा",
                    role: "एलआईसी एजेंट",
                    location: "दिल्ली",
                    image: "/images/home/mentor-profile.jpg",
                    rating: 4,
                    verified: true,
                    message:
                        "लचीला समय और कमीशन आय ने मेरा आत्मविश्वास बढ़ाया।"
                }
            ]
        }
    };

    const t = useMemo(() => data[language], [language]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % t.items.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [t]);

    const item = t.items[currentIndex];

    return (
        <section className="testimonial-section">
            <div className="testimonial-container">

                <h2>{t.title}</h2>

                <div className="testimonial-card">

                    <div className="testimonial-image-wrapper">
                        <img
                            src={item.image}
                            alt={item.name}
                            className="testimonial-image"
                        />
                        {item.verified && (
                            <span className="verified-badge">
                                ✓ Verified
                            </span>
                        )}
                    </div>

                    <p className="testimonial-message">
                        “{item.message}”
                    </p>

                    <div className="testimonial-rating">
                        {"★".repeat(item.rating)}
                        {"☆".repeat(5 - item.rating)}
                    </div>

                    <h4>{item.name}</h4>
                    <span className="testimonial-meta">
                        {item.role} | {item.location}
                    </span>

                    <div className="testimonial-dots">
                        {t.items.map((_, index) => (
                            <span
                                key={index}
                                className={`dot ${index === currentIndex ? "active" : ""}`}
                                onClick={() => setCurrentIndex(index)}
                            />
                        ))}
                    </div>

                </div>
            </div>
        </section>
    );
};

export default Testimonials;