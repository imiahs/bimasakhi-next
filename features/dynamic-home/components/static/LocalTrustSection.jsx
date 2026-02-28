'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext'; // Adjust path if needed

const LocalTrustSection = () => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: "Strong Local Support in East Delhi & Delhi NCR",
            para1: "Our guidance is specially focused on women in East Delhi and the wider Delhi NCR region. Being based locally allows us to understand your everyday challenges and provide personalized, reliable support throughout your journey as a Bima Sakhi.",
            para2: "While most steps — like training, exam preparation, and licensing — can be completed digitally from anywhere, having a local mentor makes a real difference. You get clear explanations of LIC procedures, quick help with documentation, and assistance whenever you need in-person clarification or local branch support.",
            para3: "This is not distant call-center support. Our mentors are familiar with local processes, rules, and resources — ensuring you feel confident, secure, and never alone while building your career and helping families in your community."
        },
        hi: {
            title: "पूर्वी दिल्ली एवं दिल्ली NCR में मजबूत स्थानीय सहायता",
            para1: "हमारा मार्गदर्शन विशेष रूप से पूर्वी दिल्ली और व्यापक दिल्ली NCR क्षेत्र की महिलाओं पर केंद्रित है। स्थानीय होने से हम आपकी रोजमर्रा की चुनौतियों को समझते हैं और बीमा सखी के रूप में आपकी पूरी यात्रा में व्यक्तिगत, विश्वसनीय सहायता प्रदान कर सकते हैं।",
            para2: "हालांकि अधिकांश कदम — जैसे प्रशिक्षण, परीक्षा तैयारी और लाइसेंसिंग — डिजिटल रूप से कहीं से भी पूरे किए जा सकते हैं, लेकिन स्थानीय मेंटर का होना बड़ा फर्क लाता है। आपको LIC प्रक्रियाओं की स्पष्ट व्याख्या, दस्तावेज़ में त्वरित मदद और जब भी व्यक्तिगत स्पष्टीकरण या स्थानीय ब्रांच सहायता चाहिए, तब उपलब्धता मिलती है।",
            para3: "यह दूरस्थ कॉल सेंटर सहायता नहीं है। हमारे मेंटर स्थानीय प्रक्रियाओं, नियमों और संसाधनों से अच्छी तरह परिचित हैं — जिससे आप आत्मविश्वास के साथ, सुरक्षित महसूस करती हैं और अपने करियर को बनाने तथा अपने समुदाय के परिवारों की मदद करते हुए कभी अकेली नहीं पड़तीं।"
        }
    };

    const t = content[language] || content.en;

    return (
        <section className="local-trust">
            <div className="local-trust-inner">
                <div className="local-trust-content">
                    <h2>{t.title}</h2>
                    <p>{t.para1}</p>
                    <p>{t.para2}</p>
                    <p>{t.para3}</p>
                </div>
            </div>
        </section>
    );
};

export default LocalTrustSection;