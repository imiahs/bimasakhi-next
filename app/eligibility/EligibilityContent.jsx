'use client';

import { useEffect, useContext, useState } from 'react';
import { UserContext } from '@/context/UserContext';
import { LanguageContext } from '@/context/LanguageContext';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import '@/styles/Eligibility.css';

/* ===================================================================
   BILINGUAL CONTENT
   =================================================================== */
const content = {
    en: {
        heroTitle: "Eligibility & Requirements — Everything You Need to Know",
        heroSubtitle: "Before applying for the Bima Sakhi / LIC agent opportunity, make sure you meet the criteria below and have all required documents ready.",

        // Criteria
        criteriaTitle: "Who Can Apply?",
        criteria: [
            { icon: "👩", title: "Gender", desc: "Open to women candidates. Bima Sakhi is exclusively designed to empower women.", highlight: "Women Only" },
            { icon: "🎂", title: "Age", desc: "You must be between 18 and 70 years old at the time of application.", highlight: "18 – 70 Years" },
            { icon: "📚", title: "Education", desc: "Minimum educational qualification is 10th standard pass (SSC/Equivalent).", highlight: "Min. 10th Pass" },
            { icon: "📍", title: "Location", desc: "You should be a resident of Delhi NCR (Delhi, Noida, Gurugram, Faridabad, Ghaziabad).", highlight: "Delhi NCR" },
            { icon: "🇮🇳", title: "Nationality", desc: "Must be an Indian citizen with valid identity documents.", highlight: "Indian Citizen" },
            { icon: "💼", title: "Work Status", desc: "Can be a homemaker, student, working professional, or anyone looking for a flexible career.", highlight: "Any Background" }
        ],

        // Exclusions
        exclusionTitle: "Who Cannot Apply?",
        exclusions: [
            "Relatives (spouse, children, siblings) of existing LIC agents or employees",
            "Retired LIC employees",
            "Currently active LIC agents",
            "Persons with criminal conviction or pending cases",
            "Those seeking a fixed salary or desk job only"
        ],

        // Documents
        docsTitle: "Required Documents (Keep Ready)",
        docs: [
            { icon: "📸", title: "4 Colour Photographs", desc: "Passport size, white background" },
            { icon: "🎓", title: "Education Certificate", desc: "10th / 12th / Graduation marksheet" },
            { icon: "📜", title: "School Leaving Certificate", desc: "Original or attested copy" },
            { icon: "🪪", title: "PAN Card", desc: "Original PAN card (mandatory)" },
            { icon: "🆔", title: "Aadhaar Card", desc: "For identity and address proof" },
            { icon: "🏦", title: "Cancelled Cheque", desc: "Original cancelled cheque from your bank" },
            { icon: "📋", title: "Address Proof", desc: "Aadhaar / Voter ID / Passport / Utility Bill" },
            { icon: "📝", title: "Age Proof", desc: "Birth certificate / 10th marksheet / Passport" }
        ],
        docsNote: "💡 Tip: Keep both original and 2 photocopies of each document ready. Some documents may need to be self-attested.",

        // Fee Structure
        feeTitle: "Fee Structure",
        feeHeaders: ["Item", "Amount", "Details"],
        feeRows: [
            ["IC-38 Training (25 Hours)", "₹1,500 – ₹2,000", "Classroom training covering insurance fundamentals"],
            ["IRDAI Exam Fee", "₹500 – ₹750", "Online exam booking via IRDAI portal"],
            ["Medical Examination", "₹200 – ₹500", "Basic medical test (if required)"],
            ["Documentation & Processing", "₹200 – ₹500", "Document verification and processing charges"]
        ],
        feeHighlight: ["Approximate Total", "₹2,500 – ₹3,750", "One-time investment for a lifetime career"],
        feeNote: "These are approximate fees and may vary. Your Development Officer will guide you on exact amounts.",
        feeRefund: "💡 This is a one-time investment — your first commission can cover this cost many times over!",

        // Process
        processTitle: "Step-by-Step Process to Become an Agent",
        steps: [
            { title: "Online Registration", desc: "Fill out the application form on our website with your basic details. Our team will review your application." },
            { title: "Document Submission", desc: "Submit all required documents (listed above) to your assigned Development Officer for verification." },
            { title: "IC-38 Training (25 Hours)", desc: "Attend a comprehensive insurance training program covering LIC products, regulations, and selling techniques." },
            { title: "URN Generation & Exam Booking", desc: "Your documents are uploaded to generate a Unique Registration Number (URN). Exam slot is booked via IRDAI portal." },
            { title: "IRDAI Licensing Exam", desc: "Clear the online IC-38 exam conducted by IRDAI. We provide full exam preparation support and practice materials." },
            { title: "Agent Code & Activation", desc: "Upon passing, you receive your official LIC Agent Code. Start selling policies and earning commissions!" }
        ],

        // Checker
        checkerTitle: "✅ Quick Eligibility Check",
        checks: {
            gender: "I am a woman.",
            age: "I am between 18 – 70 years old.",
            education: "I have completed at least 10th standard education.",
            location: "I live in Delhi NCR (Delhi, Noida, Gurugram, etc.).",
            noRelation: "I am NOT related to any existing LIC agent or employee."
        },
        eligibleMsg: "🎉 Congratulations! You appear to meet all the eligibility criteria. Proceed to apply!",
        partialMsg: "⚠️ Please confirm all criteria above to check your eligibility.",

        // CTA
        ctaTitle: "Ready to Apply?",
        ctaSubtitle: "If you meet the eligibility criteria and have your documents ready, the next step is to submit your application.",
        ctaButtonApply: "Apply Now →",
        ctaButtonIncome: "← Back: Income & Benefits"
    },
    hi: {
        heroTitle: "पात्रता और आवश्यकताएँ — वह सब जो आपको जानना ज़रूरी है",
        heroSubtitle: "बीमा सखी / LIC एजेंट अवसर के लिए आवेदन करने से पहले, सुनिश्चित करें कि आप नीचे दी गई कसौटियों को पूरा करती हैं और सभी आवश्यक दस्तावेज़ तैयार हैं।",

        criteriaTitle: "कौन आवेदन कर सकती हैं?",
        criteria: [
            { icon: "👩", title: "लिंग", desc: "महिला उम्मीदवारों के लिए खुला। बीमा सखी विशेष रूप से महिला सशक्तिकरण के लिए बना है।", highlight: "केवल महिलाएँ" },
            { icon: "🎂", title: "उम्र", desc: "आवेदन के समय आपकी उम्र 18 से 70 वर्ष के बीच होनी चाहिए।", highlight: "18 – 70 वर्ष" },
            { icon: "📚", title: "शिक्षा", desc: "न्यूनतम शैक्षिक योग्यता 10वीं कक्षा पास (SSC/समकक्ष) है।", highlight: "न्यूनतम 10वीं पास" },
            { icon: "📍", title: "स्थान", desc: "आप दिल्ली NCR (दिल्ली, नोएडा, गुरुग्राम, फरीदाबाद, गाज़ियाबाद) की निवासी होनी चाहिए।", highlight: "दिल्ली NCR" },
            { icon: "🇮🇳", title: "राष्ट्रीयता", desc: "वैध पहचान दस्तावेजों के साथ भारतीय नागरिक होना आवश्यक है।", highlight: "भारतीय नागरिक" },
            { icon: "💼", title: "कार्य स्थिति", desc: "गृहिणी, छात्रा, कामकाजी पेशेवर, या लचीले करियर की तलाश में कोई भी हो सकती हैं।", highlight: "कोई भी पृष्ठभूमि" }
        ],

        exclusionTitle: "कौन आवेदन नहीं कर सकतीं?",
        exclusions: [
            "मौजूदा LIC एजेंटों या कर्मचारियों के रिश्तेदार (पति/पत्नी, बच्चे, भाई-बहन)",
            "सेवानिवृत्त LIC कर्मचारी",
            "वर्तमान में सक्रिय LIC एजेंट",
            "आपराधिक दोषसिद्धि या लंबित मामलों वाले व्यक्ति",
            "जो केवल फिक्स सैलरी या डेस्क जॉब चाहते हैं"
        ],

        docsTitle: "आवश्यक दस्तावेज़ (तैयार रखें)",
        docs: [
            { icon: "📸", title: "4 रंगीन फोटो", desc: "पासपोर्ट साइज, सफेद बैकग्राउंड" },
            { icon: "🎓", title: "शिक्षा प्रमाणपत्र", desc: "10वीं / 12वीं / स्नातक मार्कशीट" },
            { icon: "📜", title: "स्कूल छोड़ने का प्रमाणपत्र", desc: "मूल या प्रमाणित प्रति" },
            { icon: "🪪", title: "पैन कार्ड", desc: "मूल पैन कार्ड (अनिवार्य)" },
            { icon: "🆔", title: "आधार कार्ड", desc: "पहचान और पते के प्रमाण के लिए" },
            { icon: "🏦", title: "कैंसल्ड चेक", desc: "आपके बैंक से मूल कैंसल्ड चेक" },
            { icon: "📋", title: "पते का प्रमाण", desc: "आधार / वोटर ID / पासपोर्ट / बिजली बिल" },
            { icon: "📝", title: "उम्र का प्रमाण", desc: "जन्म प्रमाणपत्र / 10वीं मार्कशीट / पासपोर्ट" }
        ],
        docsNote: "💡 सुझाव: हर दस्तावेज़ की मूल और 2 फोटोकॉपी दोनों तैयार रखें। कुछ दस्तावेज़ों को सेल्फ-अटेस्ट करना पड़ सकता है।",

        feeTitle: "शुल्क संरचना",
        feeHeaders: ["मद", "राशि", "विवरण"],
        feeRows: [
            ["IC-38 प्रशिक्षण (25 घंटे)", "₹1,500 – ₹2,000", "बीमा की बुनियादी बातें सिखाने वाला क्लासरूम ट्रेनिंग"],
            ["IRDAI परीक्षा शुल्क", "₹500 – ₹750", "IRDAI पोर्टल के माध्यम से ऑनलाइन परीक्षा बुकिंग"],
            ["मेडिकल जाँच", "₹200 – ₹500", "बुनियादी मेडिकल टेस्ट (यदि आवश्यक हो)"],
            ["दस्तावेज़ और प्रोसेसिंग", "₹200 – ₹500", "दस्तावेज़ सत्यापन और प्रोसेसिंग शुल्क"]
        ],
        feeHighlight: ["अनुमानित कुल", "₹2,500 – ₹3,750", "आजीवन करियर के लिए एकमुश्त निवेश"],
        feeNote: "ये अनुमानित शुल्क हैं और भिन्न हो सकते हैं। आपके डेवलपमेंट ऑफिसर सही राशि की जानकारी देंगे।",
        feeRefund: "💡 यह एकमुश्त निवेश है — आपकी पहली कमीशन ही इस खर्च को कई गुना कवर कर सकती है!",

        processTitle: "एजेंट बनने की चरण-दर-चरण प्रक्रिया",
        steps: [
            { title: "ऑनलाइन पंजीकरण", desc: "हमारी वेबसाइट पर अपनी बुनियादी जानकारी के साथ आवेदन पत्र भरें। हमारी टीम आपके आवेदन की समीक्षा करेगी।" },
            { title: "दस्तावेज़ जमा करना", desc: "सत्यापन के लिए अपने असाइन किए गए डेवलपमेंट ऑफिसर को सभी आवश्यक दस्तावेज़ (ऊपर सूचीबद्ध) जमा करें।" },
            { title: "IC-38 प्रशिक्षण (25 घंटे)", desc: "LIC उत्पादों, नियमों और बिक्री तकनीकों को कवर करने वाले व्यापक बीमा प्रशिक्षण कार्यक्रम में भाग लें।" },
            { title: "URN जनरेशन और परीक्षा बुकिंग", desc: "यूनिक रजिस्ट्रेशन नंबर (URN) जनरेट करने के लिए आपके दस्तावेज़ अपलोड किए जाते हैं। IRDAI पोर्टल से परीक्षा स्लॉट बुक होता है।" },
            { title: "IRDAI लाइसेंसिंग परीक्षा", desc: "IRDAI द्वारा आयोजित ऑनलाइन IC-38 परीक्षा पास करें। हम पूर्ण परीक्षा तैयारी सहायता और अभ्यास सामग्री प्रदान करते हैं।" },
            { title: "एजेंट कोड और सक्रियण", desc: "पास होने पर, आपको अपना आधिकारिक LIC एजेंट कोड मिलता है। पॉलिसी बेचना शुरू करें और कमीशन कमाएँ!" }
        ],

        checkerTitle: "✅ त्वरित पात्रता जाँच",
        checks: {
            gender: "मैं एक महिला हूँ।",
            age: "मेरी उम्र 18 – 70 वर्ष के बीच है।",
            education: "मैंने कम से कम 10वीं कक्षा की शिक्षा पूरी की है।",
            location: "मैं दिल्ली NCR (दिल्ली, नोएडा, गुरुग्राम, आदि) में रहती हूँ।",
            noRelation: "मैं किसी मौजूदा LIC एजेंट या कर्मचारी की रिश्तेदार नहीं हूँ।"
        },
        eligibleMsg: "🎉 बधाई हो! आप सभी पात्रता मानदंडों को पूरा करती दिखती हैं। आवेदन करने के लिए आगे बढ़ें!",
        partialMsg: "⚠️ अपनी पात्रता जाँचने के लिए कृपया ऊपर दी गई सभी कसौटियों की पुष्टि करें।",

        ctaTitle: "आवेदन करने के लिए तैयार हैं?",
        ctaSubtitle: "अगर आप पात्रता मानदंडों को पूरा करती हैं और आपके दस्तावेज़ तैयार हैं, तो अगला कदम अपना आवेदन जमा करना है।",
        ctaButtonApply: "अभी आवेदन करें →",
        ctaButtonIncome: "← पीछे: कमाई और फायदे"
    }
};


/* ===================================================================
   COMPONENT
   =================================================================== */
const EligibilityContent = () => {
    const { markPageVisited } = useContext(UserContext);
    const { language } = useContext(LanguageContext);
    const t = content[language];

    const [checks, setChecks] = useState({
        gender: false,
        age: false,
        education: false,
        location: false,
        noRelation: false
    });

    const allChecked = Object.values(checks).every(Boolean);
    const anyChecked = Object.values(checks).some(Boolean);

    useEffect(() => {
        markPageVisited('eligibility');
    }, []);

    // Reveal-on-scroll animation
    useEffect(() => {
        const sections = document.querySelectorAll('.elig-reveal');
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active');
                    }
                });
            },
            { threshold: 0.1 }
        );
        sections.forEach((s) => observer.observe(s));
        return () => observer.disconnect();
    }, []);

    const handleCheck = (field) => {
        setChecks(prev => ({ ...prev, [field]: !prev[field] }));
    };

    return (
        <div className="eligibility-container">

            {/* ========== HERO ========== */}
            <section className="eligibility-hero elig-reveal">
                <h1>{t.heroTitle}</h1>
                <p className="subtitle">{t.heroSubtitle}</p>
            </section>

            {/* ========== CRITERIA ========== */}
            <section className="eligibility-section elig-reveal">
                <h2><span className="section-icon">🎯</span> {t.criteriaTitle}</h2>
                <div className="criteria-grid">
                    {t.criteria.map((item, i) => (
                        <div className="criteria-card" key={i}>
                            <div className="criteria-icon">{item.icon}</div>
                            <h3>{item.title}</h3>
                            <p>{item.desc}</p>
                            <span className="criteria-highlight">{item.highlight}</span>
                        </div>
                    ))}
                </div>

                {/* Exclusions */}
                <div className="exclusion-banner">
                    <h3>🚫 {t.exclusionTitle}</h3>
                    <ul className="exclusion-list">
                        {t.exclusions.map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* ========== DOCUMENTS ========== */}
            <section className="eligibility-section elig-reveal">
                <h2><span className="section-icon">📋</span> {t.docsTitle}</h2>
                <div className="doc-checklist">
                    {t.docs.map((doc, i) => (
                        <div className="doc-item" key={i}>
                            <div className="doc-icon">{doc.icon}</div>
                            <div className="doc-info">
                                <h4>{doc.title}</h4>
                                <p>{doc.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="doc-note">{t.docsNote}</div>
            </section>

            {/* ========== FEE STRUCTURE ========== */}
            <section className="eligibility-section elig-reveal">
                <h2><span className="section-icon">💳</span> {t.feeTitle}</h2>
                <div className="fee-table-wrapper">
                    <table className="fee-table">
                        <thead>
                            <tr>
                                {t.feeHeaders.map((h, i) => (
                                    <th key={i}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {t.feeRows.map((row, i) => (
                                <tr key={i}>
                                    {row.map((cell, j) => (
                                        <td key={j}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                            <tr className="fee-table-highlight">
                                {t.feeHighlight.map((cell, j) => (
                                    <td key={j}>{cell}</td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="fee-note">{t.feeNote}</p>
                <div className="fee-refund-badge">{t.feeRefund}</div>
            </section>

            {/* ========== PROCESS ========== */}
            <section className="eligibility-section elig-reveal">
                <h2><span className="section-icon">🔄</span> {t.processTitle}</h2>
                <div className="process-steps">
                    {t.steps.map((step, i) => (
                        <div className="process-step" key={i}>
                            <div className="step-number">{i + 1}</div>
                            <div className="step-content">
                                <h4>{step.title}</h4>
                                <p>{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ========== ELIGIBILITY CHECKER ========== */}
            <section className="eligibility-section elig-reveal">
                <div className="checker-card">
                    <h3>{t.checkerTitle}</h3>

                    {Object.entries(t.checks).map(([key, label]) => (
                        <div
                            className="checkbox-group"
                            key={key}
                            onClick={() => handleCheck(key)}
                        >
                            <input
                                type="checkbox"
                                id={`check-${key}`}
                                checked={checks[key]}
                                onChange={() => handleCheck(key)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <label htmlFor={`check-${key}`}>{label}</label>
                        </div>
                    ))}

                    {anyChecked && (
                        <div className={`checker-result ${allChecked ? 'eligible' : 'not-eligible'}`}>
                            {allChecked ? t.eligibleMsg : t.partialMsg}
                        </div>
                    )}
                </div>
            </section>

            {/* ========== CTA ========== */}
            <section className="eligibility-cta elig-reveal">
                <h2>{t.ctaTitle}</h2>
                <p>{t.ctaSubtitle}</p>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link href="/income">
                        <Button variant="secondary">{t.ctaButtonIncome}</Button>
                    </Link>
                    <Link href="/apply">
                        <Button variant="primary" disabled={!allChecked}>
                            {t.ctaButtonApply}
                        </Button>
                    </Link>
                </div>
            </section>

        </div>
    );
};

export default EligibilityContent;
