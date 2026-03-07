'use client';

import { useEffect, useContext } from 'react';
import { UserContext } from '@/context/UserContext';
import { LanguageContext } from '@/context/LanguageContext';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import '@/styles/Income.css';

/* ===================================================================
   BILINGUAL CONTENT
   =================================================================== */
const content = {
    en: {
        heroTitle: "Income & Benefits — Know the Full Picture",
        heroSubtitle: "This is NOT a salary job. It's a commission-based LIC agency career. Understand the complete income structure before you decide.",

        // Reality Check
        realityTitle: "⚠️ Reality Check: Commission-Only Career",
        realityNote: "Bima Sakhi / LIC Agency is a performance-based business, NOT a fixed-salary job.",
        realityPoints: [
            "Your income depends 100% on the policies you sell",
            "Stipend support is available for the first 3 years (performance-based)",
            "Real long-term wealth comes from renewal commissions",
            "The more policies you sell → the more you earn — no ceiling"
        ],

        // Stipend
        stipendTitle: "Monthly Stipend Structure (First 3 Years)",
        stipendHeaders: ["Year", "Monthly Stipend", "Condition", "Annual Total"],
        stipendRows: [
            ["1st Year", "₹7,000 / month", "Active selling", "₹84,000"],
            ["2nd Year", "₹6,000 / month", "Subject to policy retention", "₹72,000"],
            ["3rd Year", "₹5,000 / month", "Subject to policy retention", "₹60,000"]
        ],
        stipendHighlight: ["Total Stipend (3 Years)", "", "", "₹2,16,000"],
        stipendNote: "Stipend is in addition to commission income. After 3 years, your renewal commissions act as your steady income source.",
        stipendBonus: "Bonus: Earn up to ₹48,000 additional in Year 1 by selling 24 policies (excluding other bonuses).",

        // Commission
        commissionTitle: "Commission Structure",
        commissionHeaders: ["Period", "Commission Rate", "Details"],
        commissionRows: [
            ["1st Year", "Up to 35%", "Depends on policy type and term"],
            ["1st Year Bonus", "40% of 1st year commission", "Paid as additional bonus"],
            ["2nd & 3rd Year", "7.5% each year", "Renewal commission on existing policies"],
            ["4th Year Onwards", "5% annually", "Lifetime renewal on active policies"]
        ],
        commissionNote: "Commission is calculated as a percentage of the premium collected from your clients' policies.",

        // Example
        exampleTitle: "📊 Example: First Year Earnings (24 Policies Sold)",
        exampleRows: [
            { label: "Stipend (12 months × ₹7,000)", value: "₹84,000" },
            { label: "Commission on 24 policies (avg ₹10,000 premium × 35%)", value: "₹84,000" },
            { label: "1st Year Bonus (40% of ₹84,000)", value: "₹33,600" },
            { label: "Performance Bonus (24 policies)", value: "₹48,000" },
            { label: "Total Approximate Year 1 Earnings", value: "₹2,49,600" }
        ],

        // Gratuity
        gratuityTitle: "Gratuity Benefits",
        gratuityItems: [
            { icon: "🏦", title: "Eligibility", desc: "Available at age 60 after minimum 15 years of service as an LIC agent" },
            { icon: "💰", title: "Maximum Payout", desc: "Up to ₹2,00,000 gratuity based on your renewal commission earnings" },
            { icon: "👨‍👩‍👧‍👦", title: "Hereditary", desc: "Commission and benefits are transferable to your nominees after your lifetime" },
            { icon: "📈", title: "Pension-Like", desc: "Renewal commissions continue for 20–25 years, providing steady retirement income" }
        ],

        // Benefits
        benefitsTitle: "Additional Benefits & Perks",
        benefits: [
            { icon: "🏢", title: "Office Allowance", desc: "Financial support to maintain your workspace and office setup" },
            { icon: "📱", title: "Phone Reimbursement", desc: "Reimbursement for telephone and mobile bills used for business" },
            { icon: "🚗", title: "Interest-Free Advances", desc: "Advances for car, motorbike, office equipment, training, and festivals" },
            { icon: "🏠", title: "Housing Loan", desc: "Concessional interest rate on housing loans for agents" },
            { icon: "🛡️", title: "Term Insurance", desc: "Access to term insurance coverage for personal security" },
            { icon: "🏥", title: "Mediclaim", desc: "Medical insurance benefits for you and your family" }
        ],

        // Passive Income
        passiveTitle: "Passive Income — The Real Wealth Builder",
        passiveSubtitle: "Unlike regular jobs, LIC agency builds long-term passive income through renewal commissions.",
        passiveHighlights: [
            { number: "20-25", label: "Years of renewal income per policy" },
            { number: "5%", label: "Annual renewal commission rate" },
            { number: "∞", label: "No limit on number of policies" }
        ],
        passiveNote: "After building a strong client base in the first few years, your renewal commissions alone can provide ₹5–15 lakhs+ annually — even without selling new policies.",

        // CTA
        ctaTitle: "Ready to Check If You're Eligible?",
        ctaSubtitle: "If this income model excites you, the next step is to check your eligibility for the Bima Sakhi program.",
        ctaButton: "Next: Check Eligibility →"
    },
    hi: {
        heroTitle: "कमाई और फायदे — पूरी तस्वीर जानें",
        heroSubtitle: "यह सैलरी वाली नौकरी नहीं है। यह कमीशन-आधारित LIC एजेंसी करियर है। निर्णय लेने से पहले पूरी इनकम स्ट्रक्चर समझें।",

        realityTitle: "⚠️ सच्चाई: केवल कमीशन-आधारित करियर",
        realityNote: "बीमा सखी / LIC एजेंसी एक परफॉरमेंस-आधारित बिज़नेस है, फिक्स सैलरी नौकरी नहीं।",
        realityPoints: [
            "आपकी कमाई 100% आपकी बेची हुई पॉलिसी पर निर्भर है",
            "पहले 3 साल स्टाइपेंड सपोर्ट मिलता है (परफॉरमेंस-आधारित)",
            "असली लॉन्ग-टर्म कमाई रिन्यूअल कमीशन से होती है",
            "जितनी ज़्यादा पॉलिसी बेचो → उतनी ज़्यादा कमाई — कोई सीमा नहीं"
        ],

        stipendTitle: "मासिक स्टाइपेंड संरचना (पहले 3 साल)",
        stipendHeaders: ["साल", "मासिक स्टाइपेंड", "शर्त", "वार्षिक कुल"],
        stipendRows: [
            ["पहला साल", "₹7,000 / माह", "सक्रिय बिक्री", "₹84,000"],
            ["दूसरा साल", "₹6,000 / माह", "पॉलिसी रिटेंशन के अधीन", "₹72,000"],
            ["तीसरा साल", "₹5,000 / माह", "पॉलिसी रिटेंशन के अधीन", "₹60,000"]
        ],
        stipendHighlight: ["कुल स्टाइपेंड (3 साल)", "", "", "₹2,16,000"],
        stipendNote: "स्टाइपेंड कमीशन इनकम के अलावा मिलता है। 3 साल बाद, आपकी रिन्यूअल कमीशन ही आपकी स्थिर आय बन जाती है।",
        stipendBonus: "बोनस: पहले साल में 24 पॉलिसी बेचकर ₹48,000 अतिरिक्त कमाएँ (अन्य बोनस को छोड़कर)।",

        commissionTitle: "कमीशन संरचना",
        commissionHeaders: ["अवधि", "कमीशन दर", "विवरण"],
        commissionRows: [
            ["पहला साल", "35% तक", "पॉलिसी प्रकार और अवधि पर निर्भर"],
            ["पहला साल बोनस", "पहले साल की कमीशन का 40%", "अतिरिक्त बोनस के रूप में"],
            ["दूसरा और तीसरा साल", "हर साल 7.5%", "मौजूदा पॉलिसियों पर रिन्यूअल कमीशन"],
            ["चौथे साल से आगे", "सालाना 5%", "सक्रिय पॉलिसियों पर आजीवन रिन्यूअल"]
        ],
        commissionNote: "कमीशन की गणना आपके ग्राहकों की पॉलिसियों से एकत्र प्रीमियम के प्रतिशत के रूप में होती है।",

        exampleTitle: "📊 उदाहरण: पहले साल की कमाई (24 पॉलिसी बेचने पर)",
        exampleRows: [
            { label: "स्टाइपेंड (12 माह × ₹7,000)", value: "₹84,000" },
            { label: "24 पॉलिसी पर कमीशन (औसत ₹10,000 प्रीमियम × 35%)", value: "₹84,000" },
            { label: "पहले साल का बोनस (₹84,000 का 40%)", value: "₹33,600" },
            { label: "परफॉरमेंस बोनस (24 पॉलिसी)", value: "₹48,000" },
            { label: "अनुमानित कुल पहले साल की कमाई", value: "₹2,49,600" }
        ],

        gratuityTitle: "ग्रेच्युटी लाभ",
        gratuityItems: [
            { icon: "🏦", title: "पात्रता", desc: "LIC एजेंट के रूप में न्यूनतम 15 साल सेवा के बाद 60 वर्ष की आयु में उपलब्ध" },
            { icon: "💰", title: "अधिकतम भुगतान", desc: "रिन्यूअल कमीशन की कमाई के आधार पर ₹2,00,000 तक ग्रेच्युटी" },
            { icon: "👨‍👩‍👧‍👦", title: "वंशानुगत", desc: "कमीशन और लाभ आपके जीवनकाल के बाद आपके नॉमिनी को हस्तांतरित होते हैं" },
            { icon: "📈", title: "पेंशन जैसा", desc: "रिन्यूअल कमीशन 20–25 साल तक जारी रहती है, स्थिर रिटायरमेंट इनकम प्रदान करती है" }
        ],

        benefitsTitle: "अतिरिक्त लाभ और सुविधाएँ",
        benefits: [
            { icon: "🏢", title: "ऑफिस भत्ता", desc: "आपके कार्यस्थल और ऑफिस सेटअप के लिए वित्तीय सहायता" },
            { icon: "📱", title: "फोन प्रतिपूर्ति", desc: "बिज़नेस के लिए उपयोग किए गए टेलीफोन और मोबाइल बिलों की प्रतिपूर्ति" },
            { icon: "🚗", title: "ब्याज-मुक्त अग्रिम", desc: "कार, मोटरसाइकिल, ऑफिस उपकरण, प्रशिक्षण और त्योहारों के लिए" },
            { icon: "🏠", title: "हाउसिंग लोन", desc: "एजेंटों के लिए रियायती ब्याज दर पर हाउसिंग लोन" },
            { icon: "🛡️", title: "टर्म इंश्योरेंस", desc: "व्यक्तिगत सुरक्षा के लिए टर्म इंश्योरेंस कवरेज" },
            { icon: "🏥", title: "मेडिक्लेम", desc: "आपके और आपके परिवार के लिए चिकित्सा बीमा लाभ" }
        ],

        passiveTitle: "पैसिव इनकम — असली दौलत बनाने का रास्ता",
        passiveSubtitle: "सामान्य नौकरियों के विपरीत, LIC एजेंसी रिन्यूअल कमीशन के माध्यम से लॉन्ग-टर्म पैसिव इनकम बनाती है।",
        passiveHighlights: [
            { number: "20-25", label: "प्रति पॉलिसी रिन्यूअल इनकम के साल" },
            { number: "5%", label: "वार्षिक रिन्यूअल कमीशन दर" },
            { number: "∞", label: "पॉलिसियों की संख्या पर कोई सीमा नहीं" }
        ],
        passiveNote: "पहले कुछ सालों में मजबूत ग्राहक आधार बनाने के बाद, अकेले आपकी रिन्यूअल कमीशन सालाना ₹5–15 लाख+ प्रदान कर सकती है — बिना नई पॉलिसी बेचे।",

        ctaTitle: "पात्रता जाँचने के लिए तैयार हैं?",
        ctaSubtitle: "अगर यह कमाई मॉडल आपको पसंद आया, तो अगला कदम बीमा सखी प्रोग्राम के लिए अपनी पात्रता जाँचना है।",
        ctaButton: "अगला: पात्रता जाँचें →"
    }
};


/* ===================================================================
   COMPONENT
   =================================================================== */
const IncomeContent = () => {
    const { markPageVisited } = useContext(UserContext);
    const { language } = useContext(LanguageContext);
    const t = content[language];

    useEffect(() => {
        markPageVisited('income');
    }, []);

    // Reveal-on-scroll animation
    useEffect(() => {
        const sections = document.querySelectorAll('.reveal');
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

    return (
        <div className="income-container">

            {/* ========== HERO ========== */}
            <section className="income-hero reveal">
                <h1>{t.heroTitle}</h1>
                <p className="subtitle">{t.heroSubtitle}</p>
            </section>

            {/* ========== REALITY CHECK ========== */}
            <section className="income-section reveal">
                <h2><span className="section-icon">⚠️</span> {t.realityTitle}</h2>
                <div className="reality-banner">
                    <p>{t.realityNote}</p>
                    <ul className="highlight-points">
                        {t.realityPoints.map((point, i) => (
                            <li key={i}>{point}</li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* ========== STIPEND STRUCTURE ========== */}
            <section className="income-section reveal">
                <h2><span className="section-icon">💰</span> {t.stipendTitle}</h2>
                <div className="income-table-wrapper">
                    <table className="income-table">
                        <thead>
                            <tr>
                                {t.stipendHeaders.map((h, i) => (
                                    <th key={i}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {t.stipendRows.map((row, i) => (
                                <tr key={i}>
                                    {row.map((cell, j) => (
                                        <td key={j}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                            <tr className="table-highlight-row">
                                {t.stipendHighlight.map((cell, j) => (
                                    <td key={j}>{cell}</td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="table-note">{t.stipendNote}</p>
                <div className="stipend-total">{t.stipendBonus}</div>
            </section>

            {/* ========== COMMISSION STRUCTURE ========== */}
            <section className="income-section reveal">
                <h2><span className="section-icon">📊</span> {t.commissionTitle}</h2>
                <div className="income-table-wrapper">
                    <table className="income-table">
                        <thead>
                            <tr>
                                {t.commissionHeaders.map((h, i) => (
                                    <th key={i}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {t.commissionRows.map((row, i) => (
                                <tr key={i}>
                                    {row.map((cell, j) => (
                                        <td key={j}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="table-note">{t.commissionNote}</p>

                {/* Worked Example */}
                <div className="example-card">
                    <h3>{t.exampleTitle}</h3>
                    {t.exampleRows.map((row, i) => (
                        <div className="calc-row" key={i}>
                            <span className="calc-label">{row.label}</span>
                            <span className="calc-value">{row.value}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ========== GRATUITY ========== */}
            <section className="income-section reveal">
                <h2><span className="section-icon">🏦</span> {t.gratuityTitle}</h2>
                <div className="gratuity-card">
                    {t.gratuityItems.map((item, i) => (
                        <div className="gratuity-item" key={i}>
                            <div className="gratuity-icon">{item.icon}</div>
                            <h4>{item.title}</h4>
                            <p>{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ========== ADDITIONAL BENEFITS ========== */}
            <section className="income-section reveal">
                <h2><span className="section-icon">🎁</span> {t.benefitsTitle}</h2>
                <div className="benefits-grid">
                    {t.benefits.map((b, i) => (
                        <div className="benefit-card" key={i}>
                            <div className="benefit-icon">{b.icon}</div>
                            <h4>{b.title}</h4>
                            <p>{b.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ========== PASSIVE INCOME ========== */}
            <section className="income-section reveal">
                <h2><span className="section-icon">🔄</span> {t.passiveTitle}</h2>
                <div className="passive-income-card">
                    <p>{t.passiveSubtitle}</p>
                    <div className="passive-highlights">
                        {t.passiveHighlights.map((h, i) => (
                            <div className="passive-highlight-item" key={i}>
                                <div className="passive-number">{h.number}</div>
                                <div className="passive-label">{h.label}</div>
                            </div>
                        ))}
                    </div>
                    <p className="table-note" style={{ marginTop: '16px' }}>{t.passiveNote}</p>
                </div>
            </section>

            {/* ========== CTA ========== */}
            <section className="income-cta reveal">
                <h2>{t.ctaTitle}</h2>
                <p>{t.ctaSubtitle}</p>
                <Link href="/eligibility">
                    <Button variant="primary">{t.ctaButton}</Button>
                </Link>
            </section>

        </div>
    );
};

export default IncomeContent;
