'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext'; // Adjust path if needed

const TransparencySection = () => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: "Important Information to Understand",
            points: [
                "Bima Sakhi Yojana is a commission-based independent agency role with LIC of India, not a salaried job. There is no fixed monthly salary except the limited stipend support provided during the first three years.",
                "Your earnings will primarily come from commission on life insurance policies sold. Income depends on your consistent effort, ability to build client relationships, and understanding of insurance products.",
                "Building a successful career as a Bima Sakhi requires time, regular learning, and dedication. Results are not immediate and vary from person to person based on individual effort and market conditions.",
                "We provide complete free training, study material, exam preparation support, and ongoing guidance. However, the daily work, client outreach, and final outcomes depend entirely on your initiative and persistence.",
                "This opportunity is best suited for women who are looking for a flexible, long-term career with potential for growth and respect in society, rather than those seeking quick or guaranteed fixed income."
            ]
        },
        hi: {
            title: "महत्वपूर्ण जानकारी जो समझना जरूरी है",
            points: [
                "बीमा सखी योजना भारतीय जीवन बीमा निगम (LIC) के साथ एक कमीशन-आधारित स्वतंत्र एजेंसी भूमिका है, न कि वेतन वाली नौकरी। पहले तीन वर्षों के दौरान मिलने वाले सीमित स्टाइपेंड को छोड़कर कोई निश्चित मासिक वेतन नहीं है।",
                "आपकी कमाई मुख्य रूप से बेची गई जीवन बीमा पॉलिसियों पर मिलने वाले कमीशन से होगी। आय आपके निरंतर प्रयास, ग्राहक संबंध बनाने की क्षमता और बीमा उत्पादों की समझ पर निर्भर करती है।",
                "बीमा सखी के रूप में सफल करियर बनाने में समय और लगातार मेहनत लगती है। परिणाम तुरंत नहीं मिलते और व्यक्ति के प्रयास तथा बाजार की स्थिति के अनुसार अलग-अलग होते हैं।",
                "हम पूरी तरह निःशुल्क प्रशिक्षण, अध्ययन सामग्री, परीक्षा तैयारी सहायता और निरंतर मार्गदर्शन प्रदान करते हैं। हालांकि, दैनिक कार्य, ग्राहक संपर्क और अंतिम परिणाम पूरी तरह आपके प्रयास और निरंतरता पर निर्भर करते हैं।",
                "यह अवसर उन महिलाओं के लिए सबसे उपयुक्त है जो लचीला, दीर्घकालिक करियर चाहती हैं जिसमें विकास और समाज में सम्मान की संभावना हो, न कि जो त्वरित या गारंटीड निश्चित आय की अपेक्षा रखती हों।"
            ]
        }
    };

    const t = content[language] || content.en;

    return (
        <section className="transparency">
            <div className="transparency-inner">
                <div className="transparency-content">
                    <h2>{t.title}</h2>

                    <div className="transparency-text">
                        {t.points.map((point, index) => (
                            <p key={index}>{point}</p>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TransparencySection;