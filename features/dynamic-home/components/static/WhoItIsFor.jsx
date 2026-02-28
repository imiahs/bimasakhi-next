'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext'; // Adjust path as needed

const WhoItIsFor = () => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: "Who is Bima Sakhi Yojana For?",
            suitableTitle: "This is suitable for you if:",
            suitableItems: [
                "You are a woman aged between 18 and 70 years.",
                "You have passed at least Class 10 (10th standard) or higher.",
                "You are seeking flexible work timings instead of a fixed 9-to-5 office schedule.",
                "You are willing to learn about life insurance products and interact with people to help them secure their future.",
                "You are comfortable with an income model that includes a fixed stipend for the first 3 years plus performance-based commission."
            ],
            notSuitableTitle: "This may not be suitable for you if:",
            notSuitableItems: [
                "You are looking for an immediate fixed monthly salary without any performance or sales requirements.",
                "You prefer not to interact with new people or explain financial products to clients.",
                "You are unable or unwilling to dedicate time to learning, attending training, and building client relationships.",
                "You are a current or retired employee/agent of LIC, or related to existing LIC employees/agents (as per scheme rules)."
            ]
        },
        hi: {
            title: "बीमा सखी योजना किसके लिए है?",
            suitableTitle: "यह आपके लिए उपयुक्त है यदि:",
            suitableItems: [
                "आप एक महिला हैं और आपकी आयु 18 से 70 वर्ष के बीच है।",
                "आपने कम से कम 10वीं कक्षा उत्तीर्ण की है या उससे अधिक।",
                "आप निश्चित 9 से 5 की ऑफिस जॉब की बजाय लचीले समय पर काम करना चाहती हैं।",
                "आप जीवन बीमा उत्पादों के बारे में सीखने और लोगों से बात करके उनके भविष्य को सुरक्षित करने में मदद करने के लिए तैयार हैं।",
                "आप पहले 3 वर्षों के लिए निश्चित स्टाइपेंड और उसके बाद प्रदर्शन-आधारित कमीशन वाली आय मॉडल से सहज हैं।"
            ],
            notSuitableTitle: "यह आपके लिए उपयुक्त नहीं हो सकता यदि:",
            notSuitableItems: [
                "आप बिना किसी प्रदर्शन या बिक्री लक्ष्य के तत्काल निश्चित मासिक वेतन चाहती हैं।",
                "आप नए लोगों से बातचीत करने या वित्तीय उत्पादों की जानकारी देने में सहज नहीं हैं।",
                "आप सीखने, प्रशिक्षण लेने और ग्राहक संबंध बनाने के लिए समय देने में असमर्थ या अनिच्छुक हैं।",
                "आप वर्तमान या सेवानिवृत्त LIC कर्मचारी/एजेंट हैं, या LIC के मौजूदा कर्मचारियों/एजेंटों से संबंधित हैं (योजना नियमों के अनुसार)।"
            ]
        }
    };

    const t = content[language] || content.en;

    return (
        <section className="who-for">
            <div className="who-for-inner">
                <div className="who-for-header">
                    <h2>{t.title}</h2>
                </div>

                <div className="who-for-grid">

                    {/* Suitable Block (Yes) */}
                    <div className="who-for-block who-for-yes">
                        <h3>{t.suitableTitle}</h3>
                        <div className="who-for-list">
                            <ul>
                                {t.suitableItems.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Not Suitable Block (No) */}
                    <div className="who-for-block who-for-no">
                        <h3>{t.notSuitableTitle}</h3>
                        <div className="who-for-list">
                            <ul>
                                {t.notSuitableItems.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default WhoItIsFor;