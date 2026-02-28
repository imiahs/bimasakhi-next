'use client';

import React, { useContext } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext';

const FAQ = () => {
    const { language } = useContext(LanguageContext);

    const questions = {
        en: [
            {
                q: "What is Bima Sakhi Scheme?",
                a: "It is an LIC scheme where women become agents and become self-reliant."
            },
            {
                q: "Is there a salary?",
                a: "No. This is commission-based work. Stipend support may be available initially."
            },
            {
                q: "Age and Education?",
                a: "10th Pass and age 18 to 70 years."
            },
            {
                q: "Can I work from home?",
                a: "Yes. Most of the work is digital."
            }
        ],
        hi: [
            {
                q: "Bima Sakhi क्या है?",
                a: "यह LIC की योजना है जिसमें महिलाएँ एजेंट बनकर आत्मनिर्भर बनती हैं।"
            },
            {
                q: "क्या सैलरी मिलती है?",
                a: "नहीं। यह कमीशन आधारित काम है। शुरुआती समय में स्टाइपेंड का सपोर्ट हो सकता है।"
            },
            {
                q: "उम्र और पढ़ाई?",
                a: "10वीं पास और उम्र 18 से 70 वर्ष।"
            },
            {
                q: "क्या घर से काम हो सकता है?",
                a: "हाँ। ज़्यादातर काम डिजिटल है।"
            }
        ]
    };

    const items = questions[language];

    return (
        <section className="py-12 bg-gray-50">
            <div className="container px-4 mx-auto max-w-3xl">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
                    {language === 'hi' ? 'अक्सर पूछे जाने वाले सवाल (FAQs)' : 'Frequently Asked Questions'}
                </h2>

                <div className="space-y-4">
                    {items.map((item, index) => (
                        <details key={index} className="group bg-white rounded-lg shadow-sm border border-gray-200">
                            <summary className="flex justify-between items-center cursor-pointer p-4 font-semibold text-gray-800 list-none">
                                <span>{item.q}</span>
                                <span className="transition group-open:rotate-180">
                                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                </span>
                            </summary>
                            <div className="text-gray-600 mt-0 px-4 pb-4 leading-relaxed">
                                {item.a}
                            </div>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
