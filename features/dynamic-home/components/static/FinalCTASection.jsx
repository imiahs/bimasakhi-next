'use client';

import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { LanguageContext } from '../../../../context/LanguageContext'; // Adjust path if needed
import Button from '../../../../components/ui/Button'; // Assuming your Button component

const FinalCTASection = () => {
    const { language } = useContext(LanguageContext);
    const router = useRouter();

    const content = {
        en: {
            title: "Ready to Become a Bima Sakhi and Secure Your Future?",
            subtitle: "Thousands of women are already taking this step toward financial independence, respect in society, and the ability to protect families. With free training, 3 years of monthly stipend support (₹7,000 → ₹6,000 → ₹5,000), and unlimited commission potential, this is your opportunity to build a meaningful, flexible career.",
            primaryCTA: "Check Eligibility & Get Started",
            secondaryCTA: "Apply Now"
        },
        hi: {
            title: "बीमा सखी बनकर अपना भविष्य सुरक्षित करने के लिए तैयार हैं?",
            subtitle: "हजारों महिलाएं पहले से ही आर्थिक आत्मनिर्भरता, समाज में सम्मान और परिवारों की सुरक्षा की दिशा में यह कदम उठा रही हैं। निःशुल्क प्रशिक्षण, 3 साल का मासिक स्टाइपेंड (₹7000 → ₹6000 → ₹5000), और असीमित कमीशन की संभावना के साथ, यह आपका एक अर्थपूर्ण, लचीला करियर बनाने का मौका है।",
            primaryCTA: "योग्यता जांचें और शुरू करें",
            secondaryCTA: "अभी आवेदन करें"
        }
    };

    const t = content[language] || content.en;

    return (
        <section className="final-cta">
            <div className="final-cta-inner">

                <div className="final-cta-content">
                    <h2>{t.title}</h2>
                    <p>{t.subtitle}</p>
                </div>

                <div className="final-cta-action">
                    {/* Phase 1 Fix: Replace nested Link with onClick to prevent invalid HTML */}
                    <Button
                        variant="primary"
                        size="large"
                        onClick={() => router.push('/eligibility')}
                    >
                        {t.primaryCTA}
                    </Button>

                    <Button
                        variant="secondary"
                        size="large"
                        onClick={() => router.push('/apply')}
                    >
                        {t.secondaryCTA}
                    </Button>
                </div>

            </div>
        </section>
    );
};

export default FinalCTASection;