'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext'; // Adjust path if needed

const AuthoritySection = () => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: "Your Trusted Guidance & Support",
            para1: "This initiative is led and supported by an authorized Development Officer of LIC of India. The role of this guidance is to help women understand the Bima Sakhi Yojana process clearly, meet all regulatory requirements, and start their journey confidently.",
            para2: "As your mentor, the Development Officer provides step-by-step assistance during licensing, training, and initial policy sales. You will receive accurate information about rules, ethical practices, and how to serve clients responsibly.",
            para3: "Even after you become a licensed agent and work independently, support remains available. Whenever you need clarification on procedures, product knowledge, compliance, or any professional matter, guidance is just a call or message away."
        },
        hi: {
            title: "आपका विश्वसनीय मार्गदर्शन और सहायता",
            para1: "यह पहल भारतीय जीवन बीमा निगम (LIC) के एक अधिकृत विकास अधिकारी द्वारा संचालित और समर्थित है। इस मार्गदर्शन का उद्देश्य महिलाओं को बीमा सखी योजना की प्रक्रिया स्पष्ट रूप से समझाना, सभी नियामक आवश्यकताओं को पूरा करना और आत्मविश्वास के साथ शुरुआत कराना है।",
            para2: "मेंटर के रूप में विकास अधिकारी लाइसेंसिंग, प्रशिक्षण और शुरुआती पॉलिसी बिक्री के दौरान चरणबद्ध सहायता प्रदान करते हैं। आपको नियमों, नैतिक प्रथाओं और ग्राहकों की जिम्मेदारीपूर्वक सेवा करने के तरीके की सटीक जानकारी मिलेगी।",
            para3: "लाइसेंस प्राप्त करने और स्वतंत्र रूप से कार्य शुरू करने के बाद भी सहायता उपलब्ध रहती है। जब भी आपको प्रक्रियाओं, उत्पाद ज्ञान, अनुपालन या किसी भी व्यावसायिक मामले में स्पष्टीकरण चाहिए, मार्गदर्शन कॉल या संदेश से तुरंत मिल जाता है।"
        }
    };

    const t = content[language] || content.en;

    return (
        <section className="authority">
            <div className="authority-inner">

                {/* Visual Column – add real photo of the authorized Development Officer / mentor here */}
                <div className="authority-visual">
                    {/* Example: <img src="/images/mentor-profile.jpg" alt="Authorized LIC Development Officer" /> */}
                    {/* Keep placeholder or add circular profile styling via CSS */}
                </div>

                {/* Content Column */}
                <div className="authority-content">
                    <h2>{t.title}</h2>
                    <p>{t.para1}</p>
                    <p>{t.para2}</p>
                    <p>{t.para3}</p>
                </div>

            </div>
        </section>
    );
};

export default AuthoritySection;