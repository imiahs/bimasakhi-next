'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext'; // Adjust path if needed

const SocialProofSection = () => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: "Women Succeeding as Bima Sakhi",
            subtitle: "Across India, thousands of women from diverse backgrounds are embracing this opportunity. They are achieving financial independence, gaining respect in their communities, and helping families secure their future — all while balancing home responsibilities.",
            items: [
                {
                    strong: "Homemakers & Housewives",
                    text: "Many women restart their journey after a career break or family focus. With flexible timings, they manage work around household duties and find great satisfaction in earning their own income while supporting family security."
                },
                {
                    strong: "Teachers, Tutors & Educators",
                    text: "Educators naturally excel in this role as it involves clear communication and guiding people. Many successfully balance teaching with Bima Sakhi work, using their patience and knowledge to build trust and help clients understand insurance benefits."
                },
                {
                    strong: "Small Business Owners & Community Women",
                    text: "Women running small shops, tailoring units or from self-help groups use their local networks to promote insurance. They earn additional income, expand their influence, and contribute to community financial awareness and protection."
                }
            ]
        },
        hi: {
            title: "बीमा सखी के रूप में सफल महिलाएं",
            subtitle: "पूरे भारत में विभिन्न पृष्ठभूमि की हजारों महिलाएं इस अवसर को अपना रही हैं। वे आर्थिक आत्मनिर्भरता हासिल कर रही हैं, समाज में सम्मान प्राप्त कर रही हैं और परिवारों के भविष्य को सुरक्षित करने में मदद कर रही हैं — साथ ही घरेलू जिम्मेदारियों को संतुलित करते हुए।",
            items: [
                {
                    strong: "गृहिणियां एवं घरेलू महिलाएं",
                    text: "कई महिलाएं करियर ब्रेक या परिवार पर फोकस के बाद इस यात्रा की शुरुआत करती हैं। लचीले समय के कारण वे घरेलू कामों के साथ काम संभालती हैं और अपनी कमाई से खुशी महसूस करती हैं, साथ ही परिवार की सुरक्षा सुनिश्चित करती हैं।"
                },
                {
                    strong: "शिक्षिकाएं, ट्यूटर एवं शिक्षाविद्",
                    text: "शिक्षिकाएं इस भूमिका में स्वाभाविक रूप से उत्कृष्ट प्रदर्शन करती हैं क्योंकि इसमें स्पष्ट संवाद और मार्गदर्शन की जरूरत होती है। कई शिक्षण कार्य के साथ बीमा सखी का काम सफलतापूर्वक संभालती हैं और ग्राहकों को बीमा के लाभ समझाने में विश्वास बनाती हैं।"
                },
                {
                    strong: "छोटे व्यवसायी महिलाएं एवं समुदाय की महिलाएं",
                    text: "छोटी दुकान चलाने वाली, सिलाई करने वाली या स्वयं सहायता समूहों से जुड़ी महिलाएं अपने स्थानीय नेटवर्क का उपयोग बीमा को बढ़ावा देने में करती हैं। वे अतिरिक्त आय कमाती हैं, अपनी पहुंच बढ़ाती हैं और समुदाय में वित्तीय जागरूकता व सुरक्षा बढ़ाती हैं।"
                }
            ]
        }
    };

    const t = content[language] || content.en;

    return (
        <section className="social-proof">
            <div className="social-proof-inner">
                <div className="social-proof-header">
                    <h2>{t.title}</h2>
                    <p>{t.subtitle}</p>
                </div>

                <div className="social-proof-grid">
                    {t.items.map((item, index) => (
                        <div className="proof-item" key={index}>
                            <p>
                                <strong>{item.strong}:</strong> {item.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default SocialProofSection;