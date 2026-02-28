'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext'; // Adjust path if needed

const BenefitsSection = () => {
    const { language } = useContext(LanguageContext);

    const content = {
        en: {
            title: "Why Become a Bima Sakhi? Key Benefits & Support",
            subtitle: "Joining Bima Sakhi Yojana gives you financial support to start, flexible work, lifelong earning potential, and the pride of helping families secure their future — all while building your own independent career.",
            items: [
                {
                    title: "Monthly Stipend for First 3 Years",
                    description: "To help you focus on learning without financial stress:\n• Year 1: ₹7,000 per month\n• Year 2: ₹6,000 per month\n• Year 3: ₹5,000 per month\n(Subject to meeting minimum performance criteria as per LIC rules)"
                },
                {
                    title: "Lifetime Commission Earnings",
                    description: "After the stipend period, earn attractive commission on every policy sold — no upper limit. The more families you help, the more you earn. Many agents build a strong recurring income over time."
                },
                {
                    title: "Complete Flexibility & Work-Life Balance",
                    description: "Choose your own working hours — work from home or in the field, part-time or full-time. Perfect for homemakers, teachers, or anyone balancing family responsibilities."
                },
                {
                    title: "Free Training & Professional Guidance",
                    description: "Get free training materials, exam preparation support, product knowledge sessions, and ongoing mentorship from an authorized LIC Development Officer — everything needed to succeed confidently."
                },
                {
                    title: "Respect, Recognition & Lifelong Career",
                    description: "Earn respect in your community as a trusted LIC agent. Help protect families' futures, gain social prestige, and build a respected, long-term career with unlimited growth potential."
                }
            ]
        },
        hi: {
            title: "बीमा सखी क्यों बनें? मुख्य लाभ और सहायता",
            subtitle: "बीमा सखी योजना में शामिल होने से आपको शुरुआत में आर्थिक सहायता, लचीला काम, जीवन भर की कमाई की संभावना और परिवारों के भविष्य को सुरक्षित करने का गर्व मिलता है — साथ ही अपना स्वतंत्र करियर बनाने का मौका।",
            items: [
                {
                    title: "पहले 3 साल के लिए मासिक स्टाइपेंड",
                    description: "सीखने पर ध्यान केंद्रित करने के लिए आर्थिक सहायता:\n• पहला साल: ₹7000 प्रति माह\n• दूसरा साल: ₹6000 प्रति माह\n• तीसरा साल: ₹5000 प्रति माह\n(LIC नियमों के अनुसार न्यूनतम प्रदर्शन मानदंडों पर निर्भर)"
                },
                {
                    title: "जीवन भर कमीशन कमाई",
                    description: "स्टाइपेंड अवधि के बाद हर बेची गई पॉलिसी पर आकर्षक कमीशन — कोई ऊपरी सीमा नहीं। जितने अधिक परिवारों की मदद करेंगी, उतनी अधिक कमाई। कई एजेंट समय के साथ मजबूत recurring आय बनाते हैं।"
                },
                {
                    title: "पूर्ण लचीलापन और वर्क-लाइफ बैलेंस",
                    description: "अपने समय का चुनाव करें — घर से काम करें या फील्ड में, पार्ट-टाइम या फुल-टाइम। गृहिणियों, शिक्षिकाओं या परिवार की जिम्मेदारियों को संभालने वालों के लिए आदर्श।"
                },
                {
                    title: "निःशुल्क प्रशिक्षण और प्रोफेशनल मार्गदर्शन",
                    description: "निःशुल्क प्रशिक्षण सामग्री, परीक्षा तैयारी सहायता, उत्पाद ज्ञान सत्र और अधिकृत LIC विकास अधिकारी से निरंतर मेंटरशिप — सफलता के लिए सब कुछ मिलेगा।"
                },
                {
                    title: "सम्मान, पहचान और जीवन भर का करियर",
                    description: "समुदाय में विश्वसनीय LIC एजेंट के रूप में सम्मान कमाएं। परिवारों के भविष्य की रक्षा करें, सामाजिक प्रतिष्ठा प्राप्त करें और असीमित विकास संभावना वाला सम्मानजनक, दीर्घकालिक करियर बनाएं।"
                }
            ]
        }
    };

    const t = content[language] || content.en;

    return (
        <section className="benefits">
            <div className="benefits-inner">
                <div className="benefits-header">
                    <h2>{t.title}</h2>
                    <p>{t.subtitle}</p>
                </div>

                <div className="benefits-grid">
                    {t.items.map((item, index) => (
                        <div className="benefit-item" key={index}>
                            <h3>{item.title}</h3>
                            <p>{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default BenefitsSection;