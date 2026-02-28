import React from 'react';

const FAQSchema = () => {
    // Strictly copied from FAQ.jsx (Phase 5.7 content)
    const faqData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": "Bima Sakhi क्या है?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "यह LIC की योजना है जिसमें महिलाएँ एजेंट बनकर आत्मनिर्भर बनती हैं।"
                }
            },
            {
                "@type": "Question",
                "name": "क्या सैलरी मिलती है?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "नहीं। यह कमीशन आधारित काम है। शुरुआती समय में स्टाइपेंड का सपोर्ट हो सकता है।"
                }
            },
            {
                "@type": "Question",
                "name": "उम्र और पढ़ाई?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "10वीं पास और उम्र 18 से 70 वर्ष।"
                }
            },
            {
                "@type": "Question",
                "name": "क्या घर से काम हो सकता है?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "हाँ। ज़्यादातर काम डिजिटल है।"
                }
            }
        ]
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
        />
    );
};

export default FAQSchema;
