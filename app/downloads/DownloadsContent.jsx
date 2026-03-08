'use client';

import { useEffect, useContext } from "react";
import { LanguageContext } from "@/context/LanguageContext";
import Link from "next/link";
import Button from "@/components/ui/Button";
import "@/styles/Downloads.css";

const DownloadsContent = () => {
    const { language } = useContext(LanguageContext);

    useEffect(() => {
        const sections = document.querySelectorAll(".dl-reveal");
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
            heroTitle: "LIC Agent Study Materials & Resources",
            heroSubtitle: "Everything you need to prepare for your LIC agent career — IC-38 exam guides, study materials, model papers, official links, and preparation checklists. All in one place.",
            examTitle: "IC-38 Exam — What You Need to Know",
            examDesc1: "To become a licensed LIC insurance agent, you must pass the IC-38 examination conducted by IRDAI (Insurance Regulatory and Development Authority of India). This exam tests your understanding of insurance principles, LIC products, and regulations.",
            examDesc2: "The exam is taken at NSEIT centers across India. It consists of multiple-choice questions (MCQs) and requires a minimum score to pass. Don't worry — with proper preparation, the pass rate is very high.",
            examKeyPoints: [
                { icon: "📝", label: "Exam Type", value: "Multiple Choice (MCQ)" },
                { icon: "⏱️", label: "Duration", value: "60 Minutes" },
                { icon: "🎯", label: "Pass Marks", value: "35 out of 50" }
            ],
            studyTitle: "Study Material & Preparation",
            studyCards: [
                { icon: "📚", title: "IC-38 Syllabus Overview", desc: "Comprehensive overview of all chapters covered in the IC-38 exam — including insurance basics, LIC products, regulations, and customer service.", link: "https://www.irdai.gov.in", linkText: "IRDAI Syllabus →" },
                { icon: "🏢", title: "LIC Insurance Basics", desc: "Understand the fundamentals — what is life insurance, types of policies (endowment, term, money-back, ULIP), premium calculation, and claims process.", link: "https://licindia.in", linkText: "LIC Products →" },
                { icon: "💡", title: "Exam Preparation Tips", desc: "Focus on key chapters: Insurance Act 1938, LIC product features, agent responsibilities, and regulatory guidelines. Practice MCQs daily for best results.", link: null, linkText: null },
                { icon: "📌", title: "Important Topics to Focus", desc: "Pay special attention to: Principles of Insurance, IRDAI regulations, Claim settlement procedures, Agent code of conduct, and Policy documentation.", link: null, linkText: null }
            ],
            mockTitle: "Model Question Papers & Practice",
            mockCards: [
                { icon: "📋", title: "Practice Questions", desc: "Sample multiple-choice questions covering all chapters of the IC-38 syllabus. Practice regularly to build confidence." },
                { icon: "📝", title: "Mock Tests", desc: "Full-length practice tests simulating the actual IC-38 exam format. Timed tests help you manage exam pressure." },
                { icon: "📊", title: "Exam Pattern Guide", desc: "Detailed breakdown of question distribution — which chapters carry more weight and where to focus your preparation." }
            ],
            officialTitle: "Useful Official Links",
            officialLinks: [
                { icon: "🏛️", title: "IRDAI Website", desc: "Official Insurance Regulatory Authority — exam rules, regulations, and agent licensing information.", link: "https://www.irdai.gov.in", btnText: "Visit IRDAI →" },
                { icon: "🏢", title: "LIC of India", desc: "Official LIC website — product details, premium calculators, and policy information.", link: "https://licindia.in", btnText: "Visit LIC →" },
                { icon: "💻", title: "NSEIT Exam Portal", desc: "Register for your IC-38 exam, find test centers, and check exam schedules.", link: "https://www.nseit.com", btnText: "Visit NSEIT →" }
            ],
            checklistTitle: "Preparation Checklists",
            checklists: [
                { icon: "📄", title: "Document Checklist", desc: "Documents needed for LIC agent registration:", items: ["Aadhaar Card (original + copy)", "PAN Card", "10th Marksheet", "4 Passport Photos", "Cancelled Cheque / Passbook", "Mobile Number linked to Aadhaar"] },
                { icon: "🎓", title: "Exam Prep Checklist", desc: "Steps to prepare for IC-38 exam:", items: ["Get IC-38 study material", "Read all chapters at least twice", "Practice 200+ MCQs", "Take 3+ full mock tests", "Revise key formulas & rules", "Visit exam center day before"] },
                { icon: "📋", title: "Registration Guide", desc: "Steps in the registration process:", items: ["Contact Development Officer", "Submit required documents", "Complete 25-hour training", "Register for IC-38 exam", "Pass IC-38 examination", "Receive LIC Agent Code"] }
            ],
            ctaTitle: "Ready to Join LIC Bima Sakhi?",
            ctaSub: "You've got the resources — now check if you're eligible and take the first step towards your LIC career.",
            ctaBtn: "Check Your Eligibility →"
        },
        hi: {
            heroTitle: "LIC एजेंट अध्ययन सामग्री और संसाधन",
            heroSubtitle: "LIC एजेंट करियर की तैयारी के लिए सब कुछ — IC-38 परीक्षा गाइड, अध्ययन सामग्री, मॉडल पेपर, आधिकारिक लिंक, और तैयारी चेकलिस्ट। सब एक जगह।",
            examTitle: "IC-38 परीक्षा — आपको क्या जानना चाहिए",
            examDesc1: "लाइसेंस प्राप्त LIC बीमा एजेंट बनने के लिए, आपको IRDAI (भारतीय बीमा नियामक और विकास प्राधिकरण) द्वारा आयोजित IC-38 परीक्षा पास करनी होगी। यह परीक्षा बीमा सिद्धांतों, LIC उत्पादों और नियमों की आपकी समझ का परीक्षण करती है।",
            examDesc2: "परीक्षा पूरे भारत में NSEIT केंद्रों पर ली जाती है। इसमें बहुविकल्पीय प्रश्न (MCQ) होते हैं और पास होने के लिए न्यूनतम अंक चाहिए। चिंता न करें — सही तैयारी से पास दर बहुत अच्छी है।",
            examKeyPoints: [
                { icon: "📝", label: "परीक्षा प्रकार", value: "बहुविकल्पीय (MCQ)" },
                { icon: "⏱️", label: "अवधि", value: "60 मिनट" },
                { icon: "🎯", label: "उत्तीर्ण अंक", value: "50 में से 35" }
            ],
            studyTitle: "अध्ययन सामग्री और तैयारी",
            studyCards: [
                { icon: "📚", title: "IC-38 पाठ्यक्रम अवलोकन", desc: "IC-38 परीक्षा में शामिल सभी अध्यायों का व्यापक अवलोकन — बीमा मूलभूत, LIC उत्पाद, नियम और ग्राहक सेवा।", link: "https://www.irdai.gov.in", linkText: "IRDAI पाठ्यक्रम →" },
                { icon: "🏢", title: "LIC बीमा मूलभूत", desc: "मूलभूत बातें समझें — जीवन बीमा क्या है, पॉलिसी के प्रकार (एंडोमेंट, टर्म, मनी-बैक, ULIP), प्रीमियम गणना और दावा प्रक्रिया।", link: "https://licindia.in", linkText: "LIC उत्पाद →" },
                { icon: "💡", title: "परीक्षा तैयारी टिप्स", desc: "मुख्य अध्यायों पर ध्यान दें: बीमा अधिनियम 1938, LIC उत्पाद विशेषताएं, एजेंट जिम्मेदारियां, और नियामक दिशानिर्देश। सर्वोत्तम परिणामों के लिए प्रतिदिन MCQ अभ्यास करें।", link: null, linkText: null },
                { icon: "📌", title: "ध्यान देने योग्य महत्वपूर्ण विषय", desc: "विशेष ध्यान दें: बीमा के सिद्धांत, IRDAI नियम, दावा निपटान प्रक्रिया, एजेंट आचार संहिता, और पॉलिसी दस्तावेज।", link: null, linkText: null }
            ],
            mockTitle: "मॉडल प्रश्न पत्र और अभ्यास",
            mockCards: [
                { icon: "📋", title: "अभ्यास प्रश्न", desc: "IC-38 पाठ्यक्रम के सभी अध्यायों को कवर करने वाले नमूना बहुविकल्पीय प्रश्न। आत्मविश्वास बढ़ाने के लिए नियमित अभ्यास करें।" },
                { icon: "📝", title: "मॉक टेस्ट", desc: "वास्तविक IC-38 परीक्षा प्रारूप का अनुकरण करने वाले पूर्ण-लंबाई अभ्यास टेस्ट। समयबद्ध टेस्ट परीक्षा दबाव को प्रबंधित करने में मदद करते हैं।" },
                { icon: "📊", title: "परीक्षा पैटर्न गाइड", desc: "प्रश्न वितरण का विस्तृत विश्लेषण — कौन से अध्यायों का अधिक वजन है और तैयारी कहाँ केंद्रित करनी है।" }
            ],
            officialTitle: "उपयोगी आधिकारिक लिंक",
            officialLinks: [
                { icon: "🏛️", title: "IRDAI वेबसाइट", desc: "आधिकारिक बीमा नियामक प्राधिकरण — परीक्षा नियम, विनियम और एजेंट लाइसेंसिंग जानकारी।", link: "https://www.irdai.gov.in", btnText: "IRDAI देखें →" },
                { icon: "🏢", title: "LIC ऑफ इंडिया", desc: "आधिकारिक LIC वेबसाइट — उत्पाद विवरण, प्रीमियम कैलकुलेटर और पॉलिसी जानकारी।", link: "https://licindia.in", btnText: "LIC देखें →" },
                { icon: "💻", title: "NSEIT परीक्षा पोर्टल", desc: "IC-38 परीक्षा के लिए पंजीकरण करें, टेस्ट सेंटर खोजें और परीक्षा कार्यक्रम देखें।", link: "https://www.nseit.com", btnText: "NSEIT देखें →" }
            ],
            checklistTitle: "तैयारी चेकलिस्ट",
            checklists: [
                { icon: "📄", title: "दस्तावेज़ चेकलिस्ट", desc: "LIC एजेंट पंजीकरण के लिए आवश्यक दस्तावेज़:", items: ["आधार कार्ड (मूल + प्रतिलिपि)", "पैन कार्ड", "10वीं मार्कशीट", "4 पासपोर्ट फोटो", "कैंसल चेक / पासबुक", "आधार से लिंक मोबाइल नंबर"] },
                { icon: "🎓", title: "परीक्षा तैयारी चेकलिस्ट", desc: "IC-38 परीक्षा की तैयारी के चरण:", items: ["IC-38 अध्ययन सामग्री प्राप्त करें", "सभी अध्याय कम से कम दो बार पढ़ें", "200+ MCQ का अभ्यास करें", "3+ पूर्ण मॉक टेस्ट दें", "मुख्य सूत्र और नियम दोहराएं", "परीक्षा से एक दिन पहले केंद्र देखें"] },
                { icon: "📋", title: "पंजीकरण गाइड", desc: "पंजीकरण प्रक्रिया के चरण:", items: ["विकास अधिकारी से संपर्क करें", "आवश्यक दस्तावेज़ जमा करें", "25 घंटे का प्रशिक्षण पूरा करें", "IC-38 परीक्षा के लिए पंजीकरण करें", "IC-38 परीक्षा पास करें", "LIC एजेंट कोड प्राप्त करें"] }
            ],
            ctaTitle: "LIC बीमा सखी से जुड़ने के लिए तैयार?",
            ctaSub: "आपके पास संसाधन हैं — अब जांचें कि आप योग्य हैं और अपने LIC करियर की ओर पहला कदम उठाएं।",
            ctaBtn: "अपनी पात्रता जांचें →"
        }
    };

    const c = t[language] || t.en;

    return (
        <div className="downloads-container">

            {/* ===== 1. HERO ===== */}
            <section className="downloads-hero">
                <h1>{c.heroTitle}</h1>
                <p className="subtitle">{c.heroSubtitle}</p>
            </section>

            {/* ===== 2. IC-38 EXAM OVERVIEW ===== */}
            <section className="downloads-section dl-reveal">
                <h2><span className="section-icon">🎓</span> {c.examTitle}</h2>
                <div className="exam-info-card">
                    <p>{c.examDesc1}</p>
                    <p>{c.examDesc2}</p>
                    <div className="exam-key-points">
                        {c.examKeyPoints.map((point, i) => (
                            <div className="exam-key-point" key={i}>
                                <div className="ekp-icon">{point.icon}</div>
                                <div className="ekp-label">{point.label}</div>
                                <div className="ekp-value">{point.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== 3. STUDY MATERIAL ===== */}
            <section className="downloads-section dl-reveal">
                <h2><span className="section-icon">📚</span> {c.studyTitle}</h2>
                <div className="resource-grid">
                    {c.studyCards.map((card, i) => (
                        <div className="resource-card" key={i}>
                            <div className="resource-card-header">
                                <span className="rc-icon">{card.icon}</span>
                                <h3>{card.title}</h3>
                            </div>
                            <p>{card.desc}</p>
                            {card.link && (
                                <a
                                    href={card.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="resource-link"
                                >
                                    {card.linkText}
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== 4. MODEL QUESTION PAPERS ===== */}
            <section className="downloads-section dl-reveal">
                <h2><span className="section-icon">📝</span> {c.mockTitle}</h2>
                <div className="mock-grid">
                    {c.mockCards.map((card, i) => (
                        <div className="mock-card" key={i}>
                            <div className="mock-icon">{card.icon}</div>
                            <h3>{card.title}</h3>
                            <p>{card.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== 5. OFFICIAL LINKS ===== */}
            <section className="downloads-section dl-reveal">
                <h2><span className="section-icon">🔗</span> {c.officialTitle}</h2>
                <div className="official-links-grid">
                    {c.officialLinks.map((link, i) => (
                        <div className="official-link-card" key={i}>
                            <div className="ol-icon">{link.icon}</div>
                            <h3>{link.title}</h3>
                            <p>{link.desc}</p>
                            <a
                                href={link.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="official-link-btn"
                            >
                                {link.btnText}
                            </a>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== 6. PREPARATION CHECKLISTS ===== */}
            <section className="downloads-section dl-reveal">
                <h2><span className="section-icon">✅</span> {c.checklistTitle}</h2>
                <div className="checklist-grid">
                    {c.checklists.map((list, i) => (
                        <div className="checklist-card" key={i}>
                            <div className="cl-icon">{list.icon}</div>
                            <h3>{list.title}</h3>
                            <p>{list.desc}</p>
                            <ul className="checklist-items">
                                {list.items.map((item, j) => (
                                    <li key={j}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== 7. CTA ===== */}
            <section className="downloads-cta dl-reveal">
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

export default DownloadsContent;
