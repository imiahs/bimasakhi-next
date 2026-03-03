'use client';

import { useEffect, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

import { UserContext } from '@/context/UserContext';
import { LanguageContext } from '@/context/LanguageContext';

import Hero from '@/features/dynamic-home/components/dynamic/Hero';
import Testimonials from '@/features/dynamic-home/components/dynamic/Testimonials';
import QuickInfoStrip from '@/features/ads-landing/components/QuickInfoStrip';
import UrgencyTicker from '@/features/ads-landing/components/UrgencyTicker';
import EmotionalSection from '@/features/ads-landing/components/EmotionalSection';
import SocialProofSection from '@/features/ads-landing/components/SocialProofSection';
import FinalCTASection from '@/features/ads-landing/components/FinalCTASection';
//import IncomeJourneySection from '@/features/ads-landing/components/IncomeJourneySection';
import PerformanceTierSection from '@/features/ads-landing/components/PerformanceTierSection';
import EligibilityHighlightSection from '@/features/ads-landing/components/EligibilityHighlightSection';
import TrustMicroSection from '@/features/ads-landing/components/TrustMicroSection';
import PrestigeClubsSection from '@/features/ads-landing/components/PrestigeClubsSection';
import '@/styles/AdsLanding.css';

const AdsLandingContent = () => {

    const { setSource } = useContext(UserContext);
    const { language } = useContext(LanguageContext);
    const router = useRouter();

    useEffect(() => {
        setSource('google_ads');
    }, [setSource]);

    const handleApplyClick = () => {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: "ads_landing_apply_click",
            page: "ads_landing",
            source: "google_ads"
        });
        router.push('/apply?source=google_ads');
    };

    const jobSchema = useMemo(() => ({
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "LIC Insurance Advisor – Bima Sakhi Program",
        "description": "Commission-based LIC agency career opportunity for women in Delhi NCR. Flexible income, training support and long-term growth.",
        "employmentType": "Contractor",
        "hiringOrganization": {
            "@type": "Organization",
            "name": "Bima Sakhi",
            "sameAs": "https://bimasakhi.com"
        },
        "jobLocation": {
            "@type": "Place",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "Delhi NCR",
                "addressCountry": "IN"
            }
        }
    }), []);

    const content = {
        en: {
            heroTitle: "Become a Successful LIC Agent with Bima Sakhi Support",
            heroSub: "A Flexible, Respectable & Commission-Based Career in Delhi NCR",
            heroTrust: "3 Years Stipend Support | Free Training | No Joining Fee",
            heroBtn: "Check Eligibility & Apply Now",
            emotionalTitle: "Why Do People Choose LIC Agency Career?",
            emotionalText: "Because it gives freedom. Income control. Respect in society. And the power to build your own identity.",
            socialProofTitle: "2.5 Lakh+ Women Have Already Joined Across India",
            socialProofText: "Thousands have transformed their lives through this opportunity.",
            finalCTA: "Take the First Step Towards Your Independent Future",
            finalBtn: "Apply Now"
        },
        hi: {
            heroTitle: "Bima Sakhi सपोर्ट के साथ सफल LIC एजेंट बनें",
            heroSub: "दिल्ली NCR में लचीला, सम्मानजनक और कमीशन आधारित करियर",
            heroTrust: "3 साल स्टाइपेंड सहायता | निःशुल्क प्रशिक्षण | कोई जॉइनिंग फीस नहीं",
            heroBtn: "अपनी योग्यता जांचें और आवेदन करें",
            emotionalTitle: "लोग LIC एजेंट क्यों बनते हैं?",
            emotionalText: "क्योंकि यह देता है स्वतंत्रता। आय पर नियंत्रण। समाज में सम्मान। और अपनी पहचान बनाने का अवसर।",
            socialProofTitle: "2.5 लाख+ महिलाएं पूरे भारत में जुड़ चुकी हैं",
            socialProofText: "हजारों लोगों ने इस अवसर से अपना जीवन बदला है।",
            finalCTA: "अपने आत्मनिर्भर भविष्य की ओर पहला कदम उठाएं",
            finalBtn: "अभी आवेदन करें"
        }
    };

    const t = content[language] || content.en;

    return (
        <div className="ads-landing-wrapper">

            {/* JSON-LD Schema */}
            <Script
                id="job-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jobSchema) }}
            />

            <UrgencyTicker />
            <Hero
                isAdsMode={true}
                customTitle={t.heroTitle}
                customSubtitle={t.heroSub}
                customTrust={t.heroTrust}
                primaryCTA={t.heroBtn}
                onApplyClick={handleApplyClick}
            />
            <QuickInfoStrip />
            <EmotionalSection />
            {/* <IncomeJourneySection /> */}
            <PerformanceTierSection />
            <EligibilityHighlightSection />
            <TrustMicroSection />
            <PrestigeClubsSection />
            <SocialProofSection />
            <Testimonials />
            <FinalCTASection onApplyClick={handleApplyClick} />
        </div>
    );
};

export default AdsLandingContent;
