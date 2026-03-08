'use client';

import { useEffect, useContext } from "react";
import { LanguageContext } from "@/context/LanguageContext";
import Link from "next/link";
import Button from "@/components/ui/Button";
import "@/styles/About.css";

const AboutContent = () => {
    const { language } = useContext(LanguageContext);

    useEffect(() => {
        const sections = document.querySelectorAll(".about-reveal");
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
            heroTitle: "About Your LIC Mentor & Guide",
            heroSubtitle: "You're not alone in this journey. Behind Bima Sakhi is a real LIC Development Officer who personally guides, trains, and supports you — from your first step to your long-term success.",
            heroBadge: "10+ Years of LIC Experience",
            mentorTitle: "Meet Your Mentor",
            mentorName: "Raj Kumar",
            mentorDesignation: "Development Officer, LIC of India",
            mentorBio1: "Since 2013, I have been working as an official LIC Development Officer, guiding hundreds of aspiring agents through their registration, IC-38 training, exam preparation, and business launch.",
            mentorBio2: "I started Bima Sakhi because I saw that many women hesitate due to lack of clear information about the process, documents, and support system. This platform eliminates that confusion and provides step-by-step guidance.",
            mentorHighlights: [
                { icon: "📋", text: "Official LIC Development Officer" },
                { icon: "👥", text: "Mentored 100+ Agents" },
                { icon: "👩", text: "Women Career Specialist" },
                { icon: "📍", text: "Delhi NCR Based" }
            ],
            legalNote: "This platform provides independent career guidance and is not the official LIC website. All information is provided for educational purposes.",
            trustTitle: "Why Trust Our Guidance?",
            trustCards: [
                { icon: "🏛️", title: "Official LIC Officer", desc: "Not a third-party recruiter. Direct guidance from an authorized LIC Development Officer since 2013." },
                { icon: "🔍", title: "100% Transparent Process", desc: "No hidden fees, no false promises. We show you exactly what the process looks like and what to expect." },
                { icon: "🎓", title: "Free Training & Guidance", desc: "Complete IC-38 exam preparation, product knowledge training, and ongoing mentorship — absolutely free." },
                { icon: "🤝", title: "Long-term Mentorship", desc: "Our support doesn't stop after registration. We help you grow your business for years to come." },
                { icon: "📍", title: "Local Office Support", desc: "Walk into our Delhi NCR office anytime. Get face-to-face guidance, doubt clearing, and personal attention." }
            ],
            commitTitle: "Our Commitment to You",
            commitIntro: "When you join through Bima Sakhi, we promise you the following:",
            commitPoints: [
                "Honest, accurate information about LIC agency — no exaggeration, no false promises.",
                "Zero hidden charges — all fees are transparent and clearly explained upfront.",
                "Complete IC-38 exam preparation with study materials and mock tests.",
                "Continuous training on LIC products, selling skills, and client management.",
                "Ongoing career growth support — help you reach Club Member, CCA, and beyond."
            ],
            officeTitle: "Our Office",
            officeDetails: [
                { icon: "📍", label: "Address", value: "Bima Sakhi Office, Delhi NCR" },
                { icon: "🕐", label: "Working Hours", value: "Monday – Saturday: 10:00 AM – 5:30 PM" },
                { icon: "🚇", label: "Nearest Metro", value: "Accessible via Delhi Metro network" },
                { icon: "📞", label: "Digital Support", value: "Available 24/7 via WhatsApp & Website" }
            ],
            mapBtnText: "📍 Open in Google Maps",
            contactTitle: "Get in Touch",
            contactCards: [
                { icon: "💬", title: "WhatsApp", desc: "Fastest way to reach us. Get instant reply.", btnText: "Chat Now", btnClass: "whatsapp", href: "https://wa.me/919315abortnumber" },
                { icon: "📞", title: "Phone Call", desc: "Speak directly with our team.", btnText: "Call Now", btnClass: "phone", href: "tel:+919315000000" },
                { icon: "📧", title: "Email", desc: "Send detailed queries anytime.", btnText: "Send Email", btnClass: "email", href: "mailto:info@bimasakhi.com" },
                { icon: "🏢", title: "Visit Office", desc: "Meet us in person at our Delhi NCR office.", btnText: "Get Directions", btnClass: "visit", href: "https://maps.app.goo.gl/NtTeB6VSMcUFFH3G9" }
            ],
            ctaTitle: "Ready to Check Your Eligibility?",
            ctaSub: "Now that you know who's guiding you — let's see if you're eligible to join the Bima Sakhi program.",
            ctaBtn: "Next: Check Your Eligibility →"
        },
        hi: {
            heroTitle: "आपके LIC मेंटर और गाइड के बारे में",
            heroSubtitle: "आप इस यात्रा में अकेली नहीं हैं। बीमा सखी के पीछे एक असली LIC विकास अधिकारी हैं जो आपको व्यक्तिगत रूप से मार्गदर्शन, प्रशिक्षण और सहायता प्रदान करते हैं — पहले कदम से लेकर दीर्घकालिक सफलता तक।",
            heroBadge: "10+ वर्षों का LIC अनुभव",
            mentorTitle: "अपने मेंटर से मिलें",
            mentorName: "राज कुमार",
            mentorDesignation: "विकास अधिकारी, भारतीय जीवन बीमा निगम",
            mentorBio1: "2013 से, मैं एक आधिकारिक LIC विकास अधिकारी के रूप में काम कर रहा हूँ, सैकड़ों इच्छुक एजेंटों को उनके पंजीकरण, IC-38 प्रशिक्षण, परीक्षा तैयारी और व्यवसाय शुरू करने में मार्गदर्शन कर रहा हूँ।",
            mentorBio2: "मैंने बीमा सखी इसलिए शुरू किया क्योंकि मैंने देखा कि कई महिलाएं प्रक्रिया, दस्तावेजों और सहायता प्रणाली के बारे में स्पष्ट जानकारी की कमी के कारण हिचकिचाती हैं। यह प्लेटफॉर्म उस भ्रम को दूर करता है।",
            mentorHighlights: [
                { icon: "📋", text: "आधिकारिक LIC विकास अधिकारी" },
                { icon: "👥", text: "100+ एजेंटों को मेंटोर किया" },
                { icon: "👩", text: "महिला करियर विशेषज्ञ" },
                { icon: "📍", text: "दिल्ली NCR आधारित" }
            ],
            legalNote: "यह प्लेटफॉर्म स्वतंत्र करियर मार्गदर्शन प्रदान करता है और LIC की आधिकारिक वेबसाइट नहीं है। सभी जानकारी शैक्षिक उद्देश्यों के लिए है।",
            trustTitle: "हमारे मार्गदर्शन पर क्यों भरोसा करें?",
            trustCards: [
                { icon: "🏛️", title: "आधिकारिक LIC अधिकारी", desc: "कोई थर्ड-पार्टी रिक्रूटर नहीं। 2013 से अधिकृत LIC विकास अधिकारी से सीधा मार्गदर्शन।" },
                { icon: "🔍", title: "100% पारदर्शी प्रक्रिया", desc: "कोई छिपी फीस नहीं, कोई झूठे वादे नहीं। हम आपको स्पष्ट रूप से बताते हैं कि प्रक्रिया कैसी है।" },
                { icon: "🎓", title: "निःशुल्क प्रशिक्षण और मार्गदर्शन", desc: "पूर्ण IC-38 परीक्षा तैयारी, उत्पाद ज्ञान प्रशिक्षण, और निरंतर मेंटरशिप — बिल्कुल मुफ्त।" },
                { icon: "🤝", title: "दीर्घकालिक मेंटरशिप", desc: "हमारी सहायता पंजीकरण के बाद बंद नहीं होती। हम आने वाले वर्षों तक आपका व्यवसाय बढ़ाने में मदद करते हैं।" },
                { icon: "📍", title: "स्थानीय ऑफिस सहायता", desc: "कभी भी हमारे दिल्ली NCR ऑफिस में आएं। आमने-सामने मार्गदर्शन और व्यक्तिगत ध्यान पाएं।" }
            ],
            commitTitle: "आपके प्रति हमारी प्रतिबद्धता",
            commitIntro: "जब आप बीमा सखी के माध्यम से जुड़ती हैं, हम आपसे ये वादे करते हैं:",
            commitPoints: [
                "LIC एजेंसी के बारे में ईमानदार, सटीक जानकारी — कोई अतिशयोक्ति नहीं, कोई झूठे वादे नहीं।",
                "शून्य छिपे शुल्क — सभी फीस पारदर्शी हैं और पहले से स्पष्ट रूप से बताई जाती हैं।",
                "अध्ययन सामग्री और मॉक टेस्ट के साथ पूर्ण IC-38 परीक्षा तैयारी।",
                "LIC उत्पादों, बिक्री कौशल और ग्राहक प्रबंधन पर निरंतर प्रशिक्षण।",
                "करियर ग्रोथ सहायता — क्लब मेंबर, CCA और उससे आगे पहुँचने में मदद।"
            ],
            officeTitle: "हमारा कार्यालय",
            officeDetails: [
                { icon: "📍", label: "पता", value: "बीमा सखी कार्यालय, दिल्ली NCR" },
                { icon: "🕐", label: "कार्य समय", value: "सोमवार – शनिवार: सुबह 10:00 – शाम 5:30" },
                { icon: "🚇", label: "निकटतम मेट्रो", value: "दिल्ली मेट्रो नेटवर्क से सुलभ" },
                { icon: "📞", label: "डिजिटल सहायता", value: "WhatsApp और वेबसाइट पर 24/7 उपलब्ध" }
            ],
            mapBtnText: "📍 Google Maps में खोलें",
            contactTitle: "संपर्क करें",
            contactCards: [
                { icon: "💬", title: "WhatsApp", desc: "हम तक पहुँचने का सबसे तेज़ तरीका। तुरंत जवाब पाएं।", btnText: "चैट करें", btnClass: "whatsapp", href: "https://wa.me/919315000000" },
                { icon: "📞", title: "फोन कॉल", desc: "हमारी टीम से सीधे बात करें।", btnText: "अभी कॉल करें", btnClass: "phone", href: "tel:+919315000000" },
                { icon: "📧", title: "ईमेल", desc: "विस्तृत प्रश्न कभी भी भेजें।", btnText: "ईमेल भेजें", btnClass: "email", href: "mailto:info@bimasakhi.com" },
                { icon: "🏢", title: "ऑफिस आएं", desc: "दिल्ली NCR ऑफिस में व्यक्तिगत रूप से मिलें।", btnText: "दिशा निर्देश", btnClass: "visit", href: "https://maps.app.goo.gl/NtTeB6VSMcUFFH3G9" }
            ],
            ctaTitle: "अपनी पात्रता जांचने के लिए तैयार?",
            ctaSub: "अब जब आप जानती हैं कि कौन आपका मार्गदर्शन कर रहा है — चलिए देखते हैं कि आप बीमा सखी कार्यक्रम में शामिल होने के योग्य हैं या नहीं।",
            ctaBtn: "अगला: पात्रता जांचें →"
        }
    };

    const c = t[language] || t.en;

    return (
        <div className="about-container">

            {/* ===== 1. HERO ===== */}
            <section className="about-hero">
                <h1>{c.heroTitle}</h1>
                <p className="subtitle">{c.heroSubtitle}</p>
                <div className="experience-badge">{c.heroBadge}</div>
            </section>

            {/* ===== 2. MENTOR INTRODUCTION ===== */}
            <section className="about-section about-reveal">
                <h2><span className="section-icon">👨‍💼</span> {c.mentorTitle}</h2>
                <div className="mentor-grid">
                    <div className="mentor-photo">
                        <img src="/images/home/mentor-profile.jpg" alt={c.mentorName} />
                    </div>
                    <div className="mentor-info">
                        <h3>{c.mentorName}</h3>
                        <span className="mentor-designation">{c.mentorDesignation}</span>
                        <p>{c.mentorBio1}</p>
                        <p>{c.mentorBio2}</p>
                        <div className="mentor-highlights">
                            {c.mentorHighlights.map((item, i) => (
                                <div className="mentor-highlight-item" key={i}>
                                    <span className="mh-icon">{item.icon}</span>
                                    <span>{item.text}</span>
                                </div>
                            ))}
                        </div>
                        <div className="legal-note">{c.legalNote}</div>
                    </div>
                </div>
            </section>

            {/* ===== 3. WHY TRUST ===== */}
            <section className="about-section about-reveal">
                <h2><span className="section-icon">🛡️</span> {c.trustTitle}</h2>
                <div className="trust-grid">
                    {c.trustCards.map((card, i) => (
                        <div className="trust-card" key={i}>
                            <div className="trust-icon">{card.icon}</div>
                            <h3>{card.title}</h3>
                            <p>{card.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== 4. OUR COMMITMENT ===== */}
            <section className="about-section about-reveal">
                <h2><span className="section-icon">🤝</span> {c.commitTitle}</h2>
                <div className="commitment-banner">
                    <p style={{ marginBottom: '16px', fontWeight: 500, color: '#1b5e20', fontSize: '1.05rem' }}>
                        {c.commitIntro}
                    </p>
                    <ul className="commitment-list">
                        {c.commitPoints.map((point, i) => (
                            <li key={i}>{point}</li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* ===== 5. OFFICE PRESENCE ===== */}
            <section className="about-section about-reveal">
                <h2><span className="section-icon">🏢</span> {c.officeTitle}</h2>
                <div className="office-grid">
                    <div className="office-details">
                        {c.officeDetails.map((detail, i) => (
                            <div className="office-detail-row" key={i}>
                                <span className="od-icon">{detail.icon}</span>
                                <div className="od-info">
                                    <h4>{detail.label}</h4>
                                    <p>{detail.value}</p>
                                </div>
                            </div>
                        ))}
                        <a
                            href="https://maps.app.goo.gl/NtTeB6VSMcUFFH3G9"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="map-link"
                        >
                            {c.mapBtnText}
                        </a>
                    </div>
                    <div className="map-container">
                        <iframe
                            src="https://www.google.com/maps?q=Delhi+NCR&output=embed"
                            allowFullScreen=""
                            loading="lazy"
                            title="Office Location"
                        ></iframe>
                    </div>
                </div>
            </section>

            {/* ===== 6. CONTACT OPTIONS ===== */}
            <section className="about-section about-reveal">
                <h2><span className="section-icon">📱</span> {c.contactTitle}</h2>
                <div className="contact-options-grid">
                    {c.contactCards.map((card, i) => (
                        <div className="contact-option-card" key={i}>
                            <div className="co-icon">{card.icon}</div>
                            <h3>{card.title}</h3>
                            <p>{card.desc}</p>
                            <a
                                href={card.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`co-action-btn ${card.btnClass}`}
                            >
                                {card.btnText}
                            </a>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== 7. CTA ===== */}
            <section className="about-cta about-reveal">
                <h2>{c.ctaTitle}</h2>
                <p>{c.ctaSub}</p>
                <Link href="/eligibility">
                    <Button variant="primary" size="large">
                        {c.ctaBtn}
                    </Button>
                </Link>
            </section>

        </div>
    );
};

export default AboutContent;
