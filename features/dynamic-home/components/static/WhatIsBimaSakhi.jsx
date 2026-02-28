'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext';

const WhatIsBimaSakhi = () => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: "What is Bima Sakhi Yojana?",
            visualText: "Empowering Women through Bima Sakhi",
            para1: "Bima Sakhi Yojana is a special initiative by LIC of India and the Government of India to empower women. It enables eligible women to become licensed LIC life insurance agents and achieve financial independence while serving their communities.",
            para2: "This is not a traditional salaried job with fixed office hours. It is a flexible agency role where you decide your working time. For the first three years you receive a monthly stipend (₹7,000 in year 1, ₹6,000 in year 2, ₹5,000 in year 3) to support you while you learn the business, along with commission on every policy sold.",
            para3: "We provide complete guidance — from eligibility check and exam preparation to training and licensing — at no cost to you. After the initial three years you continue as a regular LIC agent with the opportunity to build a long-term career, earn according to your efforts, gain respect in society and support your family securely."
        },
        hi: {
            title: "बीमा सखी योजना क्या है?",
            visualText: "महिलाओं को सशक्त बनाने वाली बीमा सखी योजना",
            para1: "बीमा सखी योजना भारतीय जीवन बीमा निगम (LIC) और भारत सरकार की एक विशेष पहल है जो महिलाओं को सशक्त बनाने के लिए शुरू की गई है। यह योग्य महिलाओं को लाइसेंस प्राप्त LIC जीवन बीमा एजेंट बनने और आर्थिक रूप से आत्मनिर्भर होने का अवसर देती है, साथ ही अपने समुदाय की सेवा करने का मौका भी।",
            para2: "यह कोई पारंपरिक वेतन वाली नौकरी नहीं है जिसमें निश्चित ऑफिस समय होता है। यह एक लचीला एजेंसी कार्य है जिसमें आप अपना समय स्वयं निर्धारित करती हैं। पहले तीन वर्षों में मासिक स्टाइपेंड (पहला वर्ष ₹7000, दूसरा वर्ष ₹6000, तीसरा वर्ष ₹5000) मिलता है ताकि आप सीखते हुए आर्थिक सहायता प्राप्त करें, साथ ही हर बेची गई पॉलिसी पर कमीशन भी।",
            para3: "हम पूरी सहायता प्रदान करते हैं — योग्यता जांच से लेकर परीक्षा की तैयारी, प्रशिक्षण और लाइसेंसिंग तक — यह सब आपके लिए निःशुल्क है। तीन वर्षों के बाद आप नियमित LIC एजेंट के रूप में कार्य जारी रख सकती हैं, अपनी मेहनत के अनुसार कमाई कर सकती हैं, समाज में सम्मान प्राप्त कर सकती हैं और परिवार को सुरक्षित भविष्य दे सकती हैं।"
        }
    };

    const t = content[language] || content.en;

    return (
        <section className="what-is">
            <div className="what-is-inner">

                <div className="what-is-visual">
                    {/* Replace with real image: confident women in professional yet approachable setting */}
                    <span>{t.visualText}</span>
                </div>

                <div className="what-is-content">
                    <h2>{t.title}</h2>
                    <p>{t.para1}</p>
                    <p>{t.para2}</p>
                    <p>{t.para3}</p>
                </div>

            </div>
        </section>
    );
};

export default WhatIsBimaSakhi;