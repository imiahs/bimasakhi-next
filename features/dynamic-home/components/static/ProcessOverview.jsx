'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext'; // Adjust path if needed

const ProcessOverview = () => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: "How to Become a Bima Sakhi",
            subtitle: "The process is simple, guided, and completely free of cost at every step. We support you from the beginning until you receive your license.",
            steps: [
                {
                    number: "1",
                    title: "Check Your Eligibility",
                    description: "Confirm that you meet the basic requirements: you are a woman aged 18–70 years and have passed at least Class 10 (10th standard). This quick check helps ensure the opportunity is right for you."
                },
                {
                    number: "2",
                    title: "Contact & Get Guidance",
                    description: "Reach out through WhatsApp or call. A mentor (experienced woman agent) will explain the scheme in detail, answer all your questions, and guide you on the next steps."
                },
                {
                    number: "3",
                    title: "Complete Training & Pass the Exam",
                    description: "You will receive free training material and preparation support for the IRDAI-mandated LIC agent examination. The exam is straightforward and conducted online or at designated centres."
                },
                {
                    number: "4",
                    title: "Receive License & Start Working",
                    description: "After successfully clearing the exam, you receive your official LIC agent license. You can then begin working independently, receive your stipend, and earn commission on policies sold."
                }
            ]
        },
        hi: {
            title: "बीमा सखी कैसे बनें",
            subtitle: "यह प्रक्रिया बहुत सरल, पूरी तरह से निर्देशित और हर चरण में निःशुल्क है। हम शुरुआत से लेकर लाइसेंस मिलने तक आपका पूरा सहयोग करते हैं।",
            steps: [
                {
                    number: "1",
                    title: "योग्यता जांचें",
                    description: "सुनिश्चित करें कि आप बुनियादी शर्तें पूरी करती हैं: आप महिला हैं, उम्र 18 से 70 वर्ष के बीच है और कम से कम 10वीं कक्षा पास है। यह त्वरित जांच यह पक्का करती है कि यह अवसर आपके लिए सही है।"
                },
                {
                    number: "2",
                    title: "संपर्क करें और मार्गदर्शन लें",
                    description: "व्हाट्सएप या कॉल के माध्यम से संपर्क करें। एक अनुभवी महिला एजेंट (मेंटर) आपको योजना की पूरी जानकारी देंगी, आपके सभी सवालों के जवाब देंगी और अगले कदम बताएंगी।"
                },
                {
                    number: "3",
                    title: "प्रशिक्षण पूरा करें और परीक्षा पास करें",
                    description: "आपको निःशुल्क प्रशिक्षण सामग्री और तैयारी सहायता मिलेगी। IRDAI द्वारा निर्धारित LIC एजेंट परीक्षा देनी होगी, जो सरल है और ऑनलाइन या निर्धारित केंद्रों पर आयोजित होती है।"
                },
                {
                    number: "4",
                    title: "लाइसेंस प्राप्त करें और कार्य शुरू करें",
                    description: "परीक्षा सफलतापूर्वक उत्तीर्ण करने के बाद आपको आधिकारिक LIC एजेंट लाइसेंस मिलेगा। इसके बाद आप स्वतंत्र रूप से काम शुरू कर सकती हैं, स्टाइपेंड प्राप्त कर सकती हैं और बेची गई पॉलिसियों पर कमीशन कमा सकती हैं।"
                }
            ]
        }
    };

    const t = content[language] || content.en;

    return (
        <section className="process">
            <div className="process-inner">
                <div className="process-header">
                    <h2>{t.title}</h2>
                    <p>{t.subtitle}</p>
                </div>

                <div className="process-steps">
                    {t.steps.map((step, index) => (
                        <div className="process-step" key={index}>
                            <div className="process-step-header" data-step={step.number}>
                                {step.title}
                            </div>
                            <div className="process-step-body">
                                {step.description}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ProcessOverview;