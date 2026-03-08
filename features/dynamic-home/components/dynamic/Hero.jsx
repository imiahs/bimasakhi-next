'use client';

import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LanguageContext } from '../../../../context/LanguageContext';
import './Hero.css';
const Hero = ({
    isAdsMode = false,
    customTitle,
    customSubtitle,
    customTrust,
    primaryCTA,
    onApplyClick
}) => {

    const { language } = useContext(LanguageContext);
    const router = useRouter();

    const content = {
        en: {
            title: "Become a Successful LIC Agent with Bima Sakhi Support",
            subtitle: "Flexible, Respectable & Commission-Based Career in Delhi NCR",
            trust: "3 Years Stipend Support | Free Training | No Joining Fee",
            cta: "Check Eligibility & Apply Now"
        },
        hi: {
            title: "Bima Sakhi सपोर्ट के साथ सफल LIC एजेंट बनें",
            subtitle: "दिल्ली NCR में लचीला, सम्मानजनक और कमीशन आधारित करियर",
            trust: "3 साल स्टाइपेंड सहायता | निःशुल्क प्रशिक्षण | कोई जॉइनिंग फीस नहीं",
            cta: "अपनी योग्यता जांचें और आवेदन करें"
        }
    };

    const t = content[language] || content.en;

    const handleApplyClick = () => {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: isAdsMode ? "ads_hero_apply_click" : "hero_apply_click"
        });

        // Use passed callback if available, otherwise navigate directly
        if (onApplyClick) {
            onApplyClick();
        } else {
            router.push(isAdsMode ? '/apply?source=google_ads' : '/apply');
        }
    };

    return (
        <section className="ads-hero">

            <div className="container ads-hero-flex">

                {/* TEXT BLOCK */}
                <div className="ads-hero-text">

                    <h1>
                        {customTitle || t.title}
                    </h1>

                    <p className="ads-sub">
                        {customSubtitle || t.subtitle}
                    </p>

                    <p className="ads-trust">
                        {customTrust || t.trust}
                    </p>

                    <button
                        className="ads-btn-primary"
                        onClick={handleApplyClick}
                    >
                        {primaryCTA || t.cta}
                    </button>

                </div>

                {/* IMAGE BLOCK */}
                <div className="ads-hero-img">
                    <Image
                        src="/Bima_Sakhi_Ai.png"
                        alt="Confident LIC Agent"
                        width={500}
                        height={600}
                        priority
                        style={{ width: '100%', height: 'auto' }}
                    />
                </div>

            </div>

        </section>
    );
};

export default Hero;