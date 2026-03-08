'use client';

import { useEffect, useContext } from "react";
import { UserContext } from "@/context/UserContext";
import { LanguageContext } from "@/context/LanguageContext";
import Link from "next/link";
import Button from "@/components/ui/Button";
import "@/styles/Why.css";

const WhyContent = () => {
    const { markPageVisited } = useContext(UserContext);
    const { language } = useContext(LanguageContext);

    useEffect(() => {
        markPageVisited("why");
    }, [markPageVisited]);

    useEffect(() => {
        const sections = document.querySelectorAll(".why-reveal");
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("active");
                    }
                });
            },
            { threshold: 0.15 }
        );
        sections.forEach((section) => observer.observe(section));
        return () => observer.disconnect();
    }, []);

    const t = {
        en: {
            heroTitle: "Why Choose LIC Bima Sakhi?",
            heroSubtitle: "You're not just joining a scheme — you're building a lifelong career backed by India's most trusted financial institution. LIC Bima Sakhi gives you freedom, income, respect, and a legacy that lasts generations.",
            trustTitle: "LIC – India's Most Trusted Financial Institution",
            trustStats: [
                { number: "68+", label: "Years of Trust & Service" },
                { number: "15L+", label: "Active Insurance Agents" },
                { number: "₹31L Cr", label: "Total Asset Base" },
                { number: "2048+", label: "Branch Offices Across India" }
            ],
            trustNote: "LIC is a Government of India undertaking — the largest and most trusted life insurance company in the country. Your clients already trust the brand.",
            entreTitle: "Not Just a Job — It's Your Own Business",
            entreCards: [
                { icon: "💰", title: "Unlimited Income", desc: "No salary cap. Your earning depends 100% on your effort. Top agents earn lakhs per month." },
                { icon: "👑", title: "Be Your Own Boss", desc: "No office, no boss, no attendance. You decide when, where, and how to work." },
                { icon: "🤝", title: "Build Client Network", desc: "Every family you help becomes a lifelong client. Your network is your wealth." },
                { icon: "🔄", title: "Renewal Income for Life", desc: "Commission on renewals for 20-25 years. It's like earning a pension from your own efforts." }
            ],
            legacyText: "💎 This business can be inherited — your commission income continues for your nominees even after you. It's a legacy, not just a career.",
            whoCan: "Who Can Become a Bima Sakhi?",
            whoCards: [
                { icon: "🏠", title: "Homemakers", desc: "Turn your free hours into monthly income without leaving family duties." },
                { icon: "👩‍🏫", title: "Teachers & Tutors", desc: "Your communication skills are your biggest asset in insurance." },
                { icon: "👩‍🎓", title: "Students", desc: "Start earning part-time while studying. Build a career from day one." },
                { icon: "👵", title: "Retired Persons", desc: "No age limit up to 70. Experience & network make you a natural fit." },
                { icon: "👩‍💼", title: "Business Women", desc: "Add LIC to your existing business network. Additional income stream." },
                { icon: "🔍", title: "Job Seekers", desc: "If you're looking for work, this is an instant career with lifetime potential." }
            ],
            skillsTitle: "Skills You Will Develop",
            skillsCards: [
                { icon: "🗣️", title: "Communication Skills", desc: "Learn how to explain financial products clearly and build trust with families in your community." },
                { icon: "📊", title: "Financial Literacy", desc: "Understand insurance, investments, tax benefits, and financial planning — knowledge that benefits you and your clients." },
                { icon: "🎤", title: "Presentation Ability", desc: "Master the art of presenting solutions to individuals and groups with confidence and clarity." },
                { icon: "📱", title: "Digital Marketing Skills", desc: "Learn WhatsApp marketing, social media presence, and digital tools to grow your client base." }
            ],
            respectTitle: "Social Respect & Trusted Identity",
            respectIntro: "Becoming a LIC agent is not just about money — it's about identity. You become a trusted advisor in your community.",
            respectPoints: [
                { icon: "🏆", text: "You help families protect their future — people respect and trust you." },
                { icon: "🤝", text: "You become a known & reliable financial advisor in your neighbourhood." },
                { icon: "👩‍👧‍👦", text: "Your family feels proud — \"She is a LIC Agent.\"" },
                { icon: "🎖️", text: "LIC recognizes top performers with awards, club memberships, and national recognition." },
                { icon: "💪", text: "Financial independence gives you confidence, voice, and decision-making power." }
            ],
            compareTitle: "Normal Job vs Bima Sakhi — See the Difference",
            compareHeaders: ["Aspect", "Normal 9-5 Job", "LIC Bima Sakhi"],
            compareRows: [
                ["Working Hours", "Fixed 9 AM – 5 PM", "Flexible — You decide"],
                ["Income Limit", "Fixed salary, slow increments", "No limit — Earn by performance"],
                ["Flexibility", "Leave = salary cut", "Work from home or field, anytime"],
                ["Growth", "Depends on boss/company", "Depends on YOUR effort only"],
                ["Job Security", "Can be fired anytime", "Self-employed, no termination fear"],
                ["Legacy", "Stops when you leave", "Continues for 20-25 years + inherited"]
            ],
            compareVerdict: "✅ Bima Sakhi wins on every front!",
            careerTitle: "Your Career Growth Path",
            careerSteps: [
                { num: "1", title: "LIC Agent (Bima Sakhi)", desc: "Start your journey with free training, stipend support, and commission on every policy. This is your foundation.", badge: "Start Here", badgeClass: "badge-start" },
                { num: "2", title: "Club Member", desc: "Meet annual performance targets and join exclusive LIC clubs. Get recognition, trips, and bonuses.", badge: "Growth", badgeClass: "badge-growth" },
                { num: "3", title: "CCA (Chief Club Agent)", desc: "Achieve consistent high performance. Get enhanced commission rates, special allowances, and leadership status.", badge: "Leadership", badgeClass: "badge-leadership" },
                { num: "4", title: "ADO (Apprentice Dev. Officer)", desc: "After 5 years as agent (graduate required), apply for Development Officer role — a permanent salaried position in LIC.", badge: "Pinnacle", badgeClass: "badge-pinnacle" }
            ],
            ctaTitle: "Ready to Know How Much You Can Earn?",
            ctaSub: "Now that you understand WHY Bima Sakhi is the smartest career choice — let's show you the actual income structure.",
            ctaBtn: "Next: Understand Income Structure →"
        },
        hi: {
            heroTitle: "LIC बीमा सखी क्यों चुनें?",
            heroSubtitle: "आप सिर्फ एक योजना में शामिल नहीं हो रही हैं — आप भारत की सबसे भरोसेमंद वित्तीय संस्था के साथ एक जीवन भर का करियर बना रही हैं। बीमा सखी आपको आज़ादी, आमदनी, सम्मान और पीढ़ियों तक चलने वाली विरासत देती है।",
            trustTitle: "LIC – भारत की सबसे भरोसेमंद वित्तीय संस्था",
            trustStats: [
                { number: "68+", label: "वर्षों का भरोसा और सेवा" },
                { number: "15L+", label: "सक्रिय बीमा एजेंट" },
                { number: "₹31L करोड़", label: "कुल संपत्ति आधार" },
                { number: "2048+", label: "पूरे भारत में शाखाएं" }
            ],
            trustNote: "LIC भारत सरकार की संस्था है — देश की सबसे बड़ी और भरोसेमंद जीवन बीमा कंपनी। आपके ग्राहक पहले से ही इस ब्रांड पर भरोसा करते हैं।",
            entreTitle: "सिर्फ नौकरी नहीं — यह आपका अपना बिज़नेस है",
            entreCards: [
                { icon: "💰", title: "असीमित आय", desc: "कोई वेतन सीमा नहीं। आपकी कमाई 100% आपकी मेहनत पर निर्भर। टॉप एजेंट लाखों कमाते हैं।" },
                { icon: "👑", title: "अपनी खुद की बॉस बनें", desc: "कोई ऑफिस नहीं, कोई बॉस नहीं, कोई हाज़िरी नहीं। आप तय करें कब, कहाँ और कैसे काम करना है।" },
                { icon: "🤝", title: "ग्राहक नेटवर्क बनाएं", desc: "हर परिवार जिसकी आप मदद करती हैं वो जीवन भर का ग्राहक बनता है। आपका नेटवर्क ही आपकी दौलत है।" },
                { icon: "🔄", title: "जीवन भर रिन्यूअल आय", desc: "20-25 साल तक रिन्यूअल कमीशन। यह आपकी अपनी मेहनत से कमाई हुई पेंशन जैसी है।" }
            ],
            legacyText: "💎 यह बिज़नेस विरासत में मिल सकता है — आपकी कमीशन आय आपके नॉमिनी को भी मिलती रहेगी। यह सिर्फ करियर नहीं, विरासत है।",
            whoCan: "बीमा सखी कौन बन सकती है?",
            whoCards: [
                { icon: "🏠", title: "गृहिणियां", desc: "अपने खाली समय को मासिक आय में बदलें — बिना पारिवारिक ज़िम्मेदारियां छोड़े।" },
                { icon: "👩‍🏫", title: "शिक्षिकाएं एवं ट्यूटर", desc: "आपकी संवाद कौशल बीमा में आपकी सबसे बड़ी ताकत है।" },
                { icon: "👩‍🎓", title: "छात्राएं", desc: "पढ़ाई के साथ पार्ट-टाइम कमाई शुरू करें। पहले दिन से करियर बनाएं।" },
                { icon: "👵", title: "सेवानिवृत्त महिलाएं", desc: "70 साल तक कोई उम्र सीमा नहीं। अनुभव और नेटवर्क आपको स्वाभाविक रूप से उपयुक्त बनाते हैं।" },
                { icon: "👩‍💼", title: "व्यवसायी महिलाएं", desc: "अपने मौजूदा बिज़नेस नेटवर्क में LIC जोड़ें। अतिरिक्त आय का स्रोत।" },
                { icon: "🔍", title: "नौकरी की तलाश में", desc: "अगर आप काम ढूंढ रही हैं, तो यह जीवन भर की संभावना वाला तत्काल करियर है।" }
            ],
            skillsTitle: "आप क्या सीखेंगी",
            skillsCards: [
                { icon: "🗣️", title: "संवाद कौशल", desc: "जानें कि वित्तीय उत्पादों को स्पष्ट रूप से कैसे समझाना है और अपने समुदाय में भरोसा कैसे बनाना है।" },
                { icon: "📊", title: "वित्तीय साक्षरता", desc: "बीमा, निवेश, टैक्स लाभ और वित्तीय योजना समझें — यह ज्ञान आपको और आपके ग्राहकों दोनों को लाभ देगा।" },
                { icon: "🎤", title: "प्रस्तुति कौशल", desc: "व्यक्तियों और समूहों को आत्मविश्वास और स्पष्टता के साथ समाधान प्रस्तुत करने की कला सीखें।" },
                { icon: "📱", title: "डिजिटल मार्केटिंग", desc: "WhatsApp मार्केटिंग, सोशल मीडिया उपस्थिति और डिजिटल टूल्स सीखें ताकि ग्राहक आधार बढ़ा सकें।" }
            ],
            respectTitle: "सामाजिक सम्मान और विश्वसनीय पहचान",
            respectIntro: "LIC एजेंट बनना सिर्फ पैसों के बारे में नहीं है — यह पहचान के बारे में है। आप अपने समुदाय में एक भरोसेमंद सलाहकार बन जाती हैं।",
            respectPoints: [
                { icon: "🏆", text: "आप परिवारों के भविष्य की रक्षा करती हैं — लोग आप पर भरोसा और सम्मान करते हैं।" },
                { icon: "🤝", text: "आप अपने मोहल्ले में एक जानी-मानी और विश्वसनीय वित्तीय सलाहकार बन जाती हैं।" },
                { icon: "👩‍👧‍👦", text: "आपका परिवार गर्व महसूस करता है — \"वो LIC एजेंट हैं।\"" },
                { icon: "🎖️", text: "LIC शीर्ष प्रदर्शनकर्ताओं को पुरस्कार, क्लब सदस्यता और राष्ट्रीय मान्यता देता है।" },
                { icon: "💪", text: "आर्थिक आत्मनिर्भरता आपको आत्मविश्वास, आवाज़ और फैसले लेने की ताकत देती है।" }
            ],
            compareTitle: "सामान्य नौकरी vs बीमा सखी — फर्क देखें",
            compareHeaders: ["पहलू", "सामान्य 9-5 नौकरी", "LIC बीमा सखी"],
            compareRows: [
                ["काम के घंटे", "निश्चित 9 AM – 5 PM", "लचीले — आप तय करें"],
                ["आय सीमा", "तय वेतन, धीमी बढ़ोतरी", "कोई सीमा नहीं — प्रदर्शन से कमाएं"],
                ["लचीलापन", "छुट्टी = वेतन कटौती", "घर से या फील्ड में, कभी भी"],
                ["ग्रोथ", "बॉस/कंपनी पर निर्भर", "केवल आपकी मेहनत पर निर्भर"],
                ["जॉब सुरक्षा", "कभी भी निकाला जा सकता है", "स्व-रोज़गार, कोई निकालने का डर नहीं"],
                ["विरासत", "छोड़ने पर बंद", "20-25 साल + विरासत में मिलती है"]
            ],
            compareVerdict: "✅ बीमा सखी हर मामले में बेहतर है!",
            careerTitle: "आपका करियर ग्रोथ पथ",
            careerSteps: [
                { num: "1", title: "LIC एजेंट (बीमा सखी)", desc: "निःशुल्क ट्रेनिंग, स्टाइपेंड सहायता और हर पॉलिसी पर कमीशन के साथ अपनी यात्रा शुरू करें। यह आपकी नींव है।", badge: "शुरुआत", badgeClass: "badge-start" },
                { num: "2", title: "क्लब मेंबर", desc: "वार्षिक प्रदर्शन लक्ष्य पूरे करें और LIC के विशेष क्लब में शामिल हों। मान्यता, ट्रिप और बोनस पाएं।", badge: "विकास", badgeClass: "badge-growth" },
                { num: "3", title: "CCA (चीफ क्लब एजेंट)", desc: "लगातार उच्च प्रदर्शन हासिल करें। बढ़ी हुई कमीशन दरें, विशेष भत्ते और नेतृत्व का दर्जा पाएं।", badge: "नेतृत्व", badgeClass: "badge-leadership" },
                { num: "4", title: "ADO (अप्रेंटिस विकास अधिकारी)", desc: "5 साल एजेंट रहने के बाद (ग्रेजुएट होना ज़रूरी), विकास अधिकारी पद के लिए आवेदन करें — LIC में स्थायी वेतनभोगी पद।", badge: "शिखर", badgeClass: "badge-pinnacle" }
            ],
            ctaTitle: "जानना चाहती हैं आप कितना कमा सकती हैं?",
            ctaSub: "अब जब आप समझ गई हैं कि बीमा सखी सबसे समझदारी भरा करियर क्यों है — चलिए आपको असली इनकम स्ट्रक्चर दिखाते हैं।",
            ctaBtn: "अगला: आय संरचना समझें →"
        }
    };

    const c = t[language] || t.en;

    return (
        <div className="why-container">

            {/* ===== 1. HERO ===== */}
            <section className="why-hero">
                <h1>{c.heroTitle}</h1>
                <p className="subtitle">{c.heroSubtitle}</p>
            </section>

            {/* ===== 2. LIC TRUST & AUTHORITY ===== */}
            <section className="why-section why-reveal">
                <h2><span className="section-icon">🏛️</span> {c.trustTitle}</h2>
                <div className="trust-stats-grid">
                    {c.trustStats.map((stat, i) => (
                        <div className="trust-stat-card" key={i}>
                            <div className="stat-number">{stat.number}</div>
                            <div className="stat-label">{stat.label}</div>
                        </div>
                    ))}
                </div>
                <div className="trust-note">{c.trustNote}</div>
            </section>

            {/* ===== 3. ENTREPRENEURSHIP ===== */}
            <section className="why-section why-reveal">
                <h2><span className="section-icon">💼</span> {c.entreTitle}</h2>
                <div className="entrepreneur-grid">
                    {c.entreCards.map((card, i) => (
                        <div className="entrepreneur-card" key={i}>
                            <div className="entre-icon">{card.icon}</div>
                            <h3>{card.title}</h3>
                            <p>{card.desc}</p>
                        </div>
                    ))}
                </div>
                <div className="legacy-banner">
                    <p>{c.legacyText}</p>
                </div>
            </section>

            {/* ===== 4. WHO CAN JOIN ===== */}
            <section className="why-section why-reveal">
                <h2><span className="section-icon">👥</span> {c.whoCan}</h2>
                <div className="who-can-grid">
                    {c.whoCards.map((card, i) => (
                        <div className="who-can-card" key={i}>
                            <div className="who-icon">{card.icon}</div>
                            <h3>{card.title}</h3>
                            <p>{card.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== 5. SKILL DEVELOPMENT ===== */}
            <section className="why-section why-reveal">
                <h2><span className="section-icon">🎓</span> {c.skillsTitle}</h2>
                <div className="skills-grid">
                    {c.skillsCards.map((card, i) => (
                        <div className="skill-card" key={i}>
                            <div className="skill-icon">{card.icon}</div>
                            <div>
                                <h3>{card.title}</h3>
                                <p>{card.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== 6. SOCIAL RESPECT ===== */}
            <section className="why-section why-reveal">
                <h2><span className="section-icon">🏅</span> {c.respectTitle}</h2>
                <div className="respect-banner">
                    <p style={{ color: '#4a148c', fontWeight: 500, marginBottom: '12px' }}>{c.respectIntro}</p>
                    <ul className="respect-points">
                        {c.respectPoints.map((point, i) => (
                            <li key={i}>
                                <span className="respect-icon">{point.icon}</span>
                                {point.text}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* ===== 7. WORK-LIFE COMPARISON TABLE ===== */}
            <section className="why-section why-reveal">
                <h2><span className="section-icon">⚖️</span> {c.compareTitle}</h2>
                <div className="comparison-table-wrapper">
                    <table className="comparison-table">
                        <thead>
                            <tr>
                                {c.compareHeaders.map((h, i) => (
                                    <th key={i}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {c.compareRows.map((row, i) => (
                                <tr key={i}>
                                    <td><strong>{row[0]}</strong></td>
                                    <td>{row[1]}</td>
                                    <td>{row[2]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="comparison-verdict">{c.compareVerdict}</div>
            </section>

            {/* ===== 8. CAREER GROWTH PATH ===== */}
            <section className="why-section why-reveal">
                <h2><span className="section-icon">📈</span> {c.careerTitle}</h2>
                <div className="career-timeline">
                    {c.careerSteps.map((step, i) => (
                        <div className="career-step" key={i}>
                            <div className="career-step-number">{step.num}</div>
                            <div className="career-step-content">
                                <h4>{step.title}</h4>
                                <p>{step.desc}</p>
                                <span className={`career-badge ${step.badgeClass}`}>{step.badge}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== 9. CTA ===== */}
            <section className="why-cta why-reveal">
                <h2>{c.ctaTitle}</h2>
                <p>{c.ctaSub}</p>
                <Link href="/income">
                    <Button variant="primary" size="large">
                        {c.ctaBtn}
                    </Button>
                </Link>
            </section>

        </div>
    );
};

export default WhyContent;
