'use client';

import { useContext } from 'react';
import Link from 'next/link';
import { LanguageContext } from '../../../../context/LanguageContext';
import Button from '../../../../components/ui/Button';

const HowItWorks = () => {
    const { language } = useContext(LanguageContext);

    const text = {
        en: {
            title: "How to Become Bima Sakhi?",
            steps: [
                { num: 1, title: "Apply Online", desc: "Just 2 minutes process" },
                { num: 2, title: "Training & Exam", desc: "Online preparation by LIC" },
                { num: 3, title: "Get License", desc: "Start working immediately" },
                { num: 4, title: "Start Earning", desc: "Commission + Potential Stipend" }
            ],
            cta: "Start Application Now"
        },
        hi: {
            title: "Bima Sakhi कैसे बनें?",
            steps: [
                { num: 1, title: "ऑनलाइन आवेदन करें", desc: "सिर्फ 2 मिनट का प्रोसेस" },
                { num: 2, title: "ट्रेनिंग और परीक्षा", desc: "LIC द्वारा ऑनलाइन तैयारी" },
                { num: 3, title: "लाइसेंस प्राप्त करें", desc: "और काम शुरू करें" },
                { num: 4, title: "कमाई शुरू", desc: "कमीशन + संभावित स्टाइपेंड" }
            ],
            cta: "अभी आवेदन शुरू करें"
        }
    };

    const t = text[language];

    return (
        <section className="py-8 bg-gray-50">
            <div className="container text-center">
                <h2 className="text-2xl font-bold mb-8 text-gray-800">{t.title}</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8 relative">
                    {/* Visual Connector Line (Removed for simplified 4-step layout) */}

                    {t.steps.map((step, index) => (
                        <div key={index} className="relative bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4 border-4 border-white shadow-md">
                                {step.num}
                            </div>
                            <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                            <p className="text-gray-600 text-sm">{step.desc}</p>
                        </div>
                    ))}
                </div>

                <Link href="/apply">
                    <Button variant="primary" className="px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all">
                        {t.cta} ➝
                    </Button>
                </Link>
            </div>
        </section>
    );
};

export default HowItWorks;
