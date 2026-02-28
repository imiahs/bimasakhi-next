'use client';

import React, { useContext, useState } from 'react';
import { LanguageContext } from '../../../../context/LanguageContext'; // Adjust path if needed

const FAQSection = () => {
    const { language } = useContext(LanguageContext);
    const [activeIndex, setActiveIndex] = useState(null); // Default all closed

    const toggleFAQ = (index) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    const content = {
        en: {
            title: "Frequently Asked Questions about Bima Sakhi Yojana",
            faqs: [
                {
                    question: "What is LIC Bima Sakhi Yojana?",
                    answer: "Bima Sakhi Yojana (also known as Mahila Career Agent scheme) is a special initiative by LIC of India and the Government of India to empower women. It trains eligible women to become licensed LIC life insurance agents, providing financial independence, a monthly stipend for 3 years, and commission-based earnings."
                },
                {
                    question: "Who is eligible to apply for Bima Sakhi Yojana?",
                    answer: "Any woman aged 18 to 70 years (as on date of application) who has passed at least Class 10 (10th standard) or higher is eligible. Priority is given to women from rural and semi-urban areas, but the scheme is open pan-India. Relatives of existing LIC agents/employees are not eligible."
                },
                {
                    question: "Is there any joining fee or cost to become a Bima Sakhi?",
                    answer: "There is no joining fee from our side. However, as part of the mandatory IRDAI licensing process, you need to pay the prescribed examination and registration fees (approximately ₹650) to the regulatory authorities."
                },
                {
                    question: "What is the stipend amount in Bima Sakhi Yojana?",
                    answer: "You receive a monthly stipend for the first 3 years to support you while learning:\n• Year 1: ₹7,000 per month\n• Year 2: ₹6,000 per month\n• Year 3: ₹5,000 per month\n(This is subject to meeting minimum performance norms like policy sales and retention as per LIC rules.) After 3 years, earnings are purely commission-based."
                },
                {
                    question: "Is there an exam to become a Bima Sakhi?",
                    answer: "Yes, clearing the IRDAI pre-recruitment examination (IC-38 or equivalent) is mandatory to get the LIC agent license. Free training material and preparation guidance are provided to help you pass the exam easily."
                },
                {
                    question: "Can I do Bima Sakhi work part-time or from home?",
                    answer: "Yes, this is a flexible independent agency role. You can work part-time or full-time, from home or in the field, as per your convenience — ideal for homemakers, teachers, or women balancing family responsibilities."
                },
                {
                    question: "Is Bima Sakhi Yojana safe and legitimate?",
                    answer: "Absolutely. It is an official scheme by LIC of India (a Government of India undertaking). All agents work after completing the regulated licensing process under IRDAI guidelines. No fake promises — success depends on your effort and ethical practices."
                },
                {
                    question: "What support do I get after becoming a Bima Sakhi?",
                    answer: "You receive ongoing guidance from an authorized LIC Development Officer/mentor, free product knowledge sessions, help with procedures, and a professional network. You work independently but never alone."
                },
                {
                    question: "Can Bima Sakhi lead to a permanent career in LIC?",
                    answer: "Yes. After successful performance and meeting criteria (especially if graduate), Bima Sakhis can explore opportunities like Apprentice Development Officer roles in LIC, in addition to lifelong commission earnings as an agent."
                }
            ]
        },
        hi: {
            title: "बीमा सखी योजना से जुड़े अक्सर पूछे जाने वाले सवाल",
            faqs: [
                {
                    question: "LIC बीमा सखी योजना क्या है?",
                    answer: "बीमा सखी योजना (महिला कैरियर एजेंट स्कीम) भारतीय जीवन बीमा निगम (LIC) और भारत सरकार की विशेष पहल है जो महिलाओं को सशक्त बनाने के लिए है। योग्य महिलाओं को लाइसेंस प्राप्त LIC जीवन बीमा एजेंट बनने की ट्रेनिंग दी जाती है, साथ ही 3 साल तक मासिक स्टाइपेंड और कमीशन आधारित कमाई का अवसर मिलता है।"
                },
                {
                    question: "बीमा सखी योजना के लिए कौन आवेदन कर सकती है?",
                    answer: "कोई भी महिला जिसकी उम्र आवेदन की तिथि पर 18 से 70 वर्ष के बीच हो और कम से कम 10वीं कक्षा उत्तीर्ण हो, आवेदन कर सकती है। ग्रामीण और अर्ध-शहरी क्षेत्रों की महिलाओं को प्राथमिकता दी जाती है, लेकिन योजना पूरे भारत में खुली है। मौजूदा LIC एजेंट/कर्मचारियों के रिश्तेदार पात्र नहीं हैं।"
                },
                {
                    question: "बीमा सखी बनने के लिए कोई फीस या खर्च है?",
                    answer: "हमारी ओर से कोई जॉइनिंग फीस नहीं है। हालांकि, IRDAI लाइसेंसिंग प्रक्रिया के तहत निर्धारित परीक्षा और रजिस्ट्रेशन फीस (लगभग ₹650) संबंधित अथॉरिटी को देनी पड़ती है।"
                },
                {
                    question: "बीमा सखी योजना में स्टाइपेंड कितना मिलता है?",
                    answer: "पहले 3 साल तक सीखने में मदद के लिए मासिक स्टाइपेंड मिलता है:\n• पहला साल: ₹7000 प्रति माह\n• दूसरा साल: ₹6000 प्रति माह\n• तीसरा साल: ₹5000 प्रति माह\n(यह LIC नियमों के अनुसार न्यूनतम प्रदर्शन जैसे पॉलिसी बिक्री और रिटेंशन पर निर्भर है।) 3 साल बाद कमाई पूरी तरह कमीशन पर आधारित होती है।"
                },
                {
                    question: "बीमा सखी बनने के लिए परीक्षा देनी पड़ती है?",
                    answer: "हाँ, IRDAI द्वारा निर्धारित प्री-रिक्रूटमेंट परीक्षा (IC-38 या समकक्ष) पास करना अनिवार्य है ताकि LIC एजेंट लाइसेंस मिल सके। परीक्षा पास करने के लिए निःशुल्क ट्रेनिंग सामग्री और तैयारी सहायता दी जाती है।"
                },
                {
                    question: "क्या मैं बीमा सखी का काम पार्ट-टाइम या घर से कर सकती हूँ?",
                    answer: "हाँ, यह एक लचीला स्वतंत्र एजेंसी रोल है। आप पार्ट-टाइम या फुल-टाइम, घर से या फील्ड में, अपनी सुविधा अनुसार काम कर सकती हैं — गृहिणियों, शिक्षिकाओं या परिवार की जिम्मेदारियों को संभालने वाली महिलाओं के लिए आदर्श।"
                },
                {
                    question: "क्या बीमा सखी योजना सुरक्षित और वैध है?",
                    answer: "बिल्कुल। यह LIC ऑफ इंडिया (भारत सरकार की संस्था) की आधिकारिक योजना है। सभी एजेंट IRDAI दिशानिर्देशों के तहत रेगुलेटेड लाइसेंसिंग प्रक्रिया पूरी करने के बाद काम करते हैं। कोई फर्जी वादा नहीं — सफलता आपके प्रयास और नैतिक प्रथाओं पर निर्भर है।"
                },
                {
                    question: "बीमा सखी बनने के बाद क्या सहायता मिलती है?",
                    answer: "आपको अधिकृत LIC विकास अधिकारी/मेंटर से निरंतर मार्गदर्शन, उत्पाद ज्ञान सत्र, प्रक्रियाओं में मदद और प्रोफेशनल नेटवर्क मिलता है। आप स्वतंत्र रूप से काम करती हैं लेकिन कभी अकेली नहीं पड़तीं।"
                },
                {
                    question: "क्या बीमा सखी से LIC में स्थायी करियर बन सकता है?",
                    answer: "हाँ। सफल प्रदर्शन और निर्धारित मानदंडों (खासकर ग्रेजुएट होने पर) के बाद बीमा सखी LIC में अपरेंटिस डेवलपमेंट ऑफिसर जैसे रोल के लिए आवेदन कर सकती हैं, साथ ही एजेंट के रूप में जीवन भर कमीशन कमाई जारी रहती है।"
                }
            ]
        }
    };

    const t = content[language] || content.en;

    return (
        <section className="faq">
            <div className="faq-inner">
                <h2>{t.title}</h2>

                <div className="faq-list">
                    {t.faqs.map((faq, index) => (
                        <div
                            className={`faq-item ${activeIndex === index ? 'active' : ''}`}
                            key={index}
                            onClick={() => toggleFAQ(index)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFAQ(index); }}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="faq-question-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3>{faq.question}</h3>
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{activeIndex === index ? '−' : '+'}</span>
                            </div>

                            {/* Conditional Rendering for Phase 1 (No CSS changes) */}
                            {activeIndex === index && (
                                <p style={{ marginTop: '1rem' }}>{faq.answer}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQSection;