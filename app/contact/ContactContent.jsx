'use client';

import { useState, useEffect, useContext } from "react";
import { LanguageContext } from "@/context/LanguageContext";
import { getWhatsAppUrl } from "@/utils/whatsapp";
import { WHATSAPP_LINK, PHONE_LINK } from "@/utils/config";
import Link from "next/link";
import Button from "@/components/ui/Button";
import "@/styles/Contact.css";

const ContactContent = () => {
    const { language } = useContext(LanguageContext);
    const [openFaq, setOpenFaq] = useState(null);

    const [formData, setFormData] = useState({
        name: "",
        mobile: "",
        preferredTime: ""
    });

    const [status, setStatus] = useState({
        loading: false,
        error: null,
        success: false
    });

    useEffect(() => {
        const sections = document.querySelectorAll(".contact-reveal");
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

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (status.loading) return;
        setStatus({ loading: true, error: null, success: false });

        try {
            const response = await fetch("/api/crm/create-contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    mobile: formData.mobile,
                    message: `Callback requested. Preferred time: ${formData.preferredTime || "Any time"}`,
                    source: "Contact Page - Callback",
                    pipeline: "Recruitment",
                    tag: "Callback Request"
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Submission failed");
            }

            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: "callback_request_success",
                contact_id: data.contact_id || "unknown",
                lead_source: "contact_page",
                page: "/contact"
            });

            setStatus({ loading: false, error: null, success: true });
            setFormData({ name: "", mobile: "", preferredTime: "" });

        } catch (error) {
            console.error(error);
            setStatus({
                loading: false,
                error: language === 'hi'
                    ? "कुछ गलत हो गया। कृपया पुनः प्रयास करें।"
                    : "Something went wrong. Please try again.",
                success: false
            });
        }
    };

    const t = {
        en: {
            heroTitle: "Need Help Joining LIC Bima Sakhi?",
            heroSubtitle: "Have questions before applying? Want guidance on eligibility, documents, or the process? Our team is here to help you every step of the way — absolutely free.",
            quickTitle: "Quick Ways to Reach Us",
            quickCards: [
                { icon: "💬", title: "WhatsApp Chat", desc: "Get instant reply. Fastest way to reach us.", btnText: "Chat Now", btnClass: "whatsapp", href: WHATSAPP_LINK },
                { icon: "📞", title: "Phone Call", desc: "Speak directly with our guidance team.", btnText: "Call Now", btnClass: "phone", href: PHONE_LINK },
                { icon: "📧", title: "Email Us", desc: "Send detailed queries anytime.", btnText: "Send Email", btnClass: "email", href: "mailto:info@bimasakhi.com" },
                { icon: "🏢", title: "Visit Office", desc: "Meet us in person at Delhi NCR office.", btnText: "Get Directions", btnClass: "visit", href: "https://maps.app.goo.gl/NtTeB6VSMcUFFH3G9" }
            ],
            callbackTitle: "Request a Callback",
            formName: "Your Full Name",
            formMobile: "Mobile Number",
            formTime: "Preferred Call Time",
            formTimeOptions: ["Any Time", "Morning (10 AM – 12 PM)", "Afternoon (12 PM – 3 PM)", "Evening (3 PM – 6 PM)"],
            formBtn: "Request Callback",
            formBtnLoading: "Submitting...",
            formSuccess: "✅ Your callback request has been received! Our team will call you soon.",
            callbackInfoTitle: "What Happens Next?",
            callbackInfoPoints: [
                { icon: "📞", text: "Our team will call you within 2 hours during working hours." },
                { icon: "💬", text: "You'll also get a WhatsApp message confirming your request." },
                { icon: "🎓", text: "We'll answer all your questions about eligibility, process, and income." },
                { icon: "🆓", text: "This guidance is completely free — no charges, no obligations." }
            ],
            officeTitle: "Our Office Location",
            officeDetails: [
                { icon: "📍", label: "Address", value: "Bima Sakhi Office, Delhi NCR" },
                { icon: "🕐", label: "Working Hours", value: "Monday – Saturday: 10:00 AM – 5:30 PM" },
                { icon: "🚇", label: "Nearest Metro", value: "Accessible via Delhi Metro network" },
                { icon: "📞", label: "Digital Support", value: "Available 24/7 via WhatsApp & Website" }
            ],
            faqTitle: "Frequently Asked Questions",
            faqs: [
                { q: "How long does the registration process take?", a: "The entire process — from document submission to getting your LIC agent code — typically takes 15 to 30 days. We guide you through each step to make it as fast as possible." },
                { q: "Is there any hidden fee or charge?", a: "No hidden charges at all. There is only a standard IRDAI exam fee (₹750) and LIC registration deposit (₹2,000 approx, refundable). We are fully transparent about all costs upfront." },
                { q: "Do I need any sales experience to join?", a: "Absolutely not. LIC provides complete training on products, selling techniques, and client management. Many of our most successful agents started with zero experience." },
                { q: "Can I work as a Bima Sakhi part-time?", a: "Yes! One of the biggest advantages of Bima Sakhi is complete flexibility. You can work part-time alongside your studies, home duties, or other work. There's no fixed timing." },
                { q: "What happens after my registration is approved?", a: "After registration, you receive your official LIC Agent Code. You'll start earning commission on every policy you sell, plus receive stipend support for the first 3 years under the Bima Sakhi scheme." },
                { q: "Is this the official LIC website?", a: "No, this is an independent guidance platform run by an authorized LIC Development Officer. We provide career guidance and recruitment support — all information is for educational purposes." }
            ],
            trustTitle: "Why You Can Trust Us",
            trustItems: [
                { icon: "🏛️", title: "Official LIC Mentorship", desc: "Guided by an authorized Development Officer since 2013." },
                { icon: "🔍", title: "Transparent Process", desc: "No hidden fees, no false promises. 100% clarity." },
                { icon: "🆓", title: "Free Guidance", desc: "Complete support from registration to career growth — free." }
            ],
            ctaTitle: "Ready to Check If You're Eligible?",
            ctaSub: "Don't wait — take the first step towards financial independence. Check your eligibility now.",
            ctaBtn: "Check Your Eligibility →"
        },
        hi: {
            heroTitle: "LIC बीमा सखी से जुड़ने में मदद चाहिए?",
            heroSubtitle: "अप्लाई करने से पहले कोई सवाल है? पात्रता, दस्तावेज़ या प्रक्रिया के बारे में मार्गदर्शन चाहिए? हमारी टीम हर कदम पर आपकी मदद के लिए तैयार है — बिल्कुल मुफ्त।",
            quickTitle: "हमसे जुड़ने के तरीके",
            quickCards: [
                { icon: "💬", title: "WhatsApp चैट", desc: "तुरंत जवाब पाएं। हम तक पहुँचने का सबसे तेज़ तरीका।", btnText: "अभी चैट करें", btnClass: "whatsapp", href: WHATSAPP_LINK },
                { icon: "📞", title: "फोन कॉल", desc: "हमारी मार्गदर्शन टीम से सीधे बात करें।", btnText: "अभी कॉल करें", btnClass: "phone", href: PHONE_LINK },
                { icon: "📧", title: "ईमेल करें", desc: "विस्तृत प्रश्न कभी भी भेजें।", btnText: "ईमेल भेजें", btnClass: "email", href: "mailto:info@bimasakhi.com" },
                { icon: "🏢", title: "ऑफिस आएं", desc: "दिल्ली NCR ऑफिस में व्यक्तिगत रूप से मिलें।", btnText: "दिशा निर्देश", btnClass: "visit", href: "https://maps.app.goo.gl/NtTeB6VSMcUFFH3G9" }
            ],
            callbackTitle: "कॉलबैक का अनुरोध करें",
            formName: "आपका पूरा नाम",
            formMobile: "मोबाइल नंबर",
            formTime: "कॉल का पसंदीदा समय",
            formTimeOptions: ["कोई भी समय", "सुबह (10 AM – 12 PM)", "दोपहर (12 PM – 3 PM)", "शाम (3 PM – 6 PM)"],
            formBtn: "कॉलबैक का अनुरोध करें",
            formBtnLoading: "भेज रहे हैं...",
            formSuccess: "✅ आपका कॉलबैक अनुरोध प्राप्त हो गया है! हमारी टीम जल्द ही आपको कॉल करेगी।",
            callbackInfoTitle: "आगे क्या होगा?",
            callbackInfoPoints: [
                { icon: "📞", text: "हमारी टीम कार्य समय में 2 घंटे के भीतर आपको कॉल करेगी।" },
                { icon: "💬", text: "आपको अनुरोध की पुष्टि के लिए WhatsApp संदेश भी मिलेगा।" },
                { icon: "🎓", text: "हम पात्रता, प्रक्रिया और आय के बारे में आपके सभी सवालों का जवाब देंगे।" },
                { icon: "🆓", text: "यह मार्गदर्शन पूरी तरह मुफ्त है — कोई शुल्क नहीं, कोई बाध्यता नहीं।" }
            ],
            officeTitle: "हमारे कार्यालय का पता",
            officeDetails: [
                { icon: "📍", label: "पता", value: "बीमा सखी कार्यालय, दिल्ली NCR" },
                { icon: "🕐", label: "कार्य समय", value: "सोमवार – शनिवार: सुबह 10:00 – शाम 5:30" },
                { icon: "🚇", label: "निकटतम मेट्रो", value: "दिल्ली मेट्रो नेटवर्क से सुलभ" },
                { icon: "📞", label: "डिजिटल सहायता", value: "WhatsApp और वेबसाइट पर 24/7 उपलब्ध" }
            ],
            faqTitle: "अक्सर पूछे जाने वाले प्रश्न",
            faqs: [
                { q: "पंजीकरण प्रक्रिया में कितना समय लगता है?", a: "पूरी प्रक्रिया — दस्तावेज़ जमा करने से लेकर LIC एजेंट कोड मिलने तक — आमतौर पर 15 से 30 दिन लगते हैं। हम हर कदम पर आपका मार्गदर्शन करते हैं।" },
                { q: "क्या कोई छिपा हुआ शुल्क है?", a: "बिल्कुल कोई छिपा शुल्क नहीं। केवल मानक IRDAI परीक्षा शुल्क (₹750) और LIC पंजीकरण जमा (लगभग ₹2,000, वापसी योग्य) है। हम सभी लागतों के बारे में पहले से पूरी तरह पारदर्शी हैं।" },
                { q: "क्या मुझे जुड़ने के लिए सेल्स का अनुभव चाहिए?", a: "बिल्कुल नहीं। LIC उत्पादों, बिक्री तकनीकों और ग्राहक प्रबंधन पर पूर्ण प्रशिक्षण प्रदान करता है। हमारी कई सफल एजेंट शून्य अनुभव से शुरू हुई हैं।" },
                { q: "क्या मैं पार्ट-टाइम काम कर सकती हूँ?", a: "हाँ! बीमा सखी का सबसे बड़ा फायदा पूर्ण लचीलापन है। आप पढ़ाई, घर के काम या अन्य नौकरी के साथ पार्ट-टाइम काम कर सकती हैं। कोई निश्चित समय नहीं है।" },
                { q: "पंजीकरण स्वीकृत होने के बाद क्या होता है?", a: "पंजीकरण के बाद आपको आधिकारिक LIC एजेंट कोड मिलता है। आप हर पॉलिसी पर कमीशन कमाना शुरू करती हैं, साथ ही बीमा सखी योजना के तहत पहले 3 वर्षों के लिए स्टाइपेंड सहायता मिलती है।" },
                { q: "क्या यह LIC की आधिकारिक वेबसाइट है?", a: "नहीं, यह एक अधिकृत LIC विकास अधिकारी द्वारा संचालित स्वतंत्र मार्गदर्शन प्लेटफॉर्म है। हम करियर मार्गदर्शन और भर्ती सहायता प्रदान करते हैं।" }
            ],
            trustTitle: "हम पर क्यों भरोसा करें",
            trustItems: [
                { icon: "🏛️", title: "आधिकारिक LIC मेंटरशिप", desc: "2013 से अधिकृत विकास अधिकारी द्वारा मार्गदर्शित।" },
                { icon: "🔍", title: "पारदर्शी प्रक्रिया", desc: "कोई छिपी फीस नहीं, कोई झूठे वादे नहीं। 100% स्पष्टता।" },
                { icon: "🆓", title: "निःशुल्क मार्गदर्शन", desc: "पंजीकरण से करियर ग्रोथ तक पूर्ण सहायता — मुफ्त।" }
            ],
            ctaTitle: "जानना चाहती हैं आप योग्य हैं या नहीं?",
            ctaSub: "इंतज़ार न करें — आर्थिक आत्मनिर्भरता की ओर पहला कदम उठाएं। अभी अपनी पात्रता जांचें।",
            ctaBtn: "अपनी पात्रता जांचें →"
        }
    };

    const c = t[language] || t.en;

    return (
        <div className="contact-container">

            {/* ===== 1. HERO ===== */}
            <section className="contact-hero">
                <h1>{c.heroTitle}</h1>
                <p className="subtitle">{c.heroSubtitle}</p>
            </section>

            {/* ===== 2. QUICK CONTACT OPTIONS ===== */}
            <section className="contact-section contact-reveal">
                <h2><span className="section-icon">📱</span> {c.quickTitle}</h2>
                <div className="quick-contact-grid">
                    {c.quickCards.map((card, i) => (
                        <div className="quick-contact-card" key={i}>
                            <div className="qc-icon">{card.icon}</div>
                            <h3>{card.title}</h3>
                            <p>{card.desc}</p>
                            <a
                                href={card.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`qc-btn ${card.btnClass}`}
                            >
                                {card.btnText}
                            </a>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== 3. REQUEST CALLBACK ===== */}
            <section className="contact-section contact-reveal">
                <h2><span className="section-icon">📞</span> {c.callbackTitle}</h2>
                <div className="callback-wrapper">
                    <div className="callback-form-card">
                        <form onSubmit={handleSubmit} className="callback-form">
                            <input
                                type="text"
                                name="name"
                                placeholder={c.formName}
                                required
                                value={formData.name}
                                onChange={handleChange}
                            />
                            <input
                                type="tel"
                                name="mobile"
                                placeholder={c.formMobile}
                                required
                                value={formData.mobile}
                                onChange={handleChange}
                            />
                            <select
                                name="preferredTime"
                                value={formData.preferredTime}
                                onChange={handleChange}
                            >
                                <option value="">{c.formTime}</option>
                                {c.formTimeOptions.map((opt, i) => (
                                    <option key={i} value={opt}>{opt}</option>
                                ))}
                            </select>

                            {status.error && (
                                <div className="form-error">{status.error}</div>
                            )}
                            {status.success && (
                                <div className="form-success">{c.formSuccess}</div>
                            )}

                            <button
                                type="submit"
                                className="callback-submit-btn"
                                disabled={status.loading}
                            >
                                {status.loading ? c.formBtnLoading : c.formBtn}
                            </button>
                        </form>
                    </div>
                    <div className="callback-info">
                        <h3>{c.callbackInfoTitle}</h3>
                        <ul className="callback-info-list">
                            {c.callbackInfoPoints.map((point, i) => (
                                <li key={i}>
                                    <span className="ci-icon">{point.icon}</span>
                                    {point.text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* ===== 4. OFFICE LOCATION ===== */}
            <section className="contact-section contact-reveal">
                <h2><span className="section-icon">🏢</span> {c.officeTitle}</h2>
                <div className="office-grid">
                    <div className="office-details-card">
                        {c.officeDetails.map((detail, i) => (
                            <div className="office-row" key={i}>
                                <span className="or-icon">{detail.icon}</span>
                                <div className="or-info">
                                    <h4>{detail.label}</h4>
                                    <p>{detail.value}</p>
                                </div>
                            </div>
                        ))}
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

            {/* ===== 5. FAQ ACCORDION ===== */}
            <section className="contact-section contact-reveal">
                <h2><span className="section-icon">❓</span> {c.faqTitle}</h2>
                <div className="faq-list">
                    {c.faqs.map((faq, i) => (
                        <div
                            className={`faq-item ${openFaq === i ? 'open' : ''}`}
                            key={i}
                        >
                            <button
                                className="faq-question"
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                            >
                                {faq.q}
                                <span className="faq-arrow">▼</span>
                            </button>
                            <div className="faq-answer">
                                <p>{faq.a}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== 6. TRUST REMINDER ===== */}
            <section className="contact-section contact-reveal">
                <h2><span className="section-icon">🛡️</span> {c.trustTitle}</h2>
                <div className="trust-reminder">
                    {c.trustItems.map((item, i) => (
                        <div className="trust-reminder-item" key={i}>
                            <div className="tr-icon">{item.icon}</div>
                            <h3>{item.title}</h3>
                            <p>{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== 7. CTA ===== */}
            <section className="contact-cta contact-reveal">
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

export default ContactContent;
