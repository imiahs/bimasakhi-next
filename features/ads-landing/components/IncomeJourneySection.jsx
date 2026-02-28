'use client';

import React, { useEffect, useState, useRef, useContext } from "react";
import { LanguageContext } from "../../../context/LanguageContext";
import "./IncomeJourneySection.css";

const IncomeJourneySection = () => {

    const { language } = useContext(LanguageContext);

    /* ============================
       1️⃣ Animated Counter Hook
    ============================ */
    const useCountUp = (end, duration = 1500) => {
        const [count, setCount] = useState(0);

        useEffect(() => {
            let start = 0;
            const increment = end / (duration / 16);

            const animate = () => {
                start += increment;
                if (start < end) {
                    setCount(Math.floor(start));
                    requestAnimationFrame(animate);
                } else {
                    setCount(end);
                }
            };

            animate();
        }, [end, duration]);

        return count;
    };

    const agentsCount = useCountUp(250000);

    /* ============================
       2️⃣ Scroll Fade-In Effect
    ============================ */
    const sectionRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                }
            },
            { threshold: 0.2 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    /* ============================
       3️⃣ Commission Modal
    ============================ */
    const [showModal, setShowModal] = useState(false);

    const content = {
        en: {
            title: "Your Income Growth Journey",
            subtitle: "Recurring Commission + Long-Term Growth Model",
            modalTitle: "How LIC Commission Works",
            disclaimer:
                "Income depends on individual performance, effort and LIC norms."
        },
        hi: {
            title: "आपकी आय वृद्धि यात्रा",
            subtitle: "नवीनीकरण कमीशन + दीर्घकालीन आय मॉडल",
            modalTitle: "LIC कमीशन कैसे काम करता है",
            disclaimer:
                "आय व्यक्ति के प्रयास, प्रदर्शन और LIC नियमों पर निर्भर करती है।"
        }
    };

    const t = content[language] || content.en;

    return (
        <section ref={sectionRef} className="income-section fade-in-section">

            <div className="income-container">

                <h2>{t.title}</h2>
                <p className="income-subtitle">{t.subtitle}</p>

                {/* Animated Counter */}
                <div className="income-counter">
                    <strong>{agentsCount.toLocaleString()}+</strong>
                    <span>{language === "hi" ? "एजेंट पूरे भारत में" : "Agents Nationwide"}</span>
                </div>

                {/* Animated Graph */}
                <div className="income-graph-wrapper">
                    <svg viewBox="0 0 300 150" className="income-graph">
                        <path
                            d="M10 130 Q 80 90 150 100 T 290 40"
                            className="income-curve"
                        />
                    </svg>
                </div>

                {/* Renewal Income Visual */}
                <div className="renewal-visual">
                    <div className="renewal-box">
                        <div>Year 1</div>
                        <strong>New Commission</strong>
                    </div>

                    <div className="arrow">→</div>

                    <div className="renewal-box">
                        <div>Year 2</div>
                        <strong>New + Renewal</strong>
                    </div>

                    <div className="arrow">→</div>

                    <div className="renewal-box highlight">
                        <div>Year 3+</div>
                        <strong>Growing Recurring Income</strong>
                    </div>
                </div>

                {/* Modal Button */}
                <button
                    className="commission-btn"
                    onClick={() => setShowModal(true)}
                >
                    {language === "hi"
                        ? "कमीशन कैसे काम करता है?"
                        : "How Commission Works?"}
                </button>

                <div className="income-disclaimer">{t.disclaimer}</div>

            </div>

            {/* Commission Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>{t.modalTitle}</h3>
                        <ul>
                            <li>✔ First year commission on policy sales</li>
                            <li>✔ Renewal commission every year</li>
                            <li>✔ Performance incentives</li>
                            <li>✔ No fixed income ceiling</li>
                        </ul>
                        <button onClick={() => setShowModal(false)}>Close</button>
                    </div>
                </div>
            )}

        </section>
    );
};

export default IncomeJourneySection;