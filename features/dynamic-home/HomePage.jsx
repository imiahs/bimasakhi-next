'use client';

// Homepage Controller (Phase 8: Consolidated)
// Static fallback is the ULTIMATE safety net.

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import './components/static/homepage.css';

// Section Imports (Static Fallback - Locked Order)
import HeroSection from './components/static/HeroSection';
import WhatIsBimaSakhi from './components/static/WhatIsBimaSakhi';
import WhoItIsFor from './components/static/WhoItIsFor';
import ProcessOverview from './components/static/ProcessOverview';
import TransparencySection from './components/static/TransparencySection';
import SocialProofSection from './components/static/SocialProofSection';
import AuthoritySection from './components/static/AuthoritySection';
import BenefitsSection from './components/static/BenefitsSection';
import LocalTrustSection from './components/static/LocalTrustSection';
import FAQSection from './components/static/FAQSection';
import FinalCTASection from './components/static/FinalCTASection';

// Dynamic Engine (co-located in this domain)
import SectionRenderer from './engine/SectionRenderer';
import { fetchHomepageSections } from './services/homepageService';
import { logger } from '@/utils/logger';

const HomePage = () => {
    // ACTIVATION STRATEGY (Phase 5.5 - Stability Hardening)
    const pathname = usePathname();

    // Config
    const MODE = process.env.NEXT_PUBLIC_DYNAMIC_HOME_MODE || 'off'; // off | preview | on
    const ROLLOUT_PCT = Number(process.env.NEXT_PUBLIC_DYNAMIC_ROLLOUT_PERCENTAGE) || 0.1;
    const FAILURE_LIMIT = 3;

    // SYNCHRONOUS INITIALIZATION (Prevent Flicker)
    const [isDynamicActive] = useState(() => {
        // 1. GLOBAL KILL SWITCH
        if (MODE === 'off') return false;

        // 2. CIRCUIT BREAKER (Session Persistent)
        const failCount = Number(sessionStorage.getItem('dynamic_home_failures') || 0);
        if (failCount >= FAILURE_LIMIT) {
            if (process.env.NODE_ENV === 'development') logger.warn('HomePage', 'Dynamic Engine Disabled (Circuit Breaker)');
            return false;
        }

        // 3. ADMIN PREVIEW OVERRIDE (?previewDynamic=true)
        const params = new URLSearchParams(window.location.search);
        if (params.get('previewDynamic') === 'true') {
            if (process.env.NODE_ENV === 'development') logger.info('HomePage', 'Preview Mode Activated');
            return true;
        }

        // 4. PREVIEW MODE GUARD (only query param activates)
        if (MODE === 'preview') return false;

        // 5. STABLE ROLLOUT (Session Persistent Bucket)
        let bucket = sessionStorage.getItem('dynamic_rollout_val');
        if (!bucket) {
            bucket = Math.random().toString();
            sessionStorage.setItem('dynamic_rollout_val', bucket);
        }
        return Number(bucket) < ROLLOUT_PCT;
    });

    // State for Dynamic Engine
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dynamicError, setDynamicError] = useState(false);

    // Mounted Guard
    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // Fetch Effect (only runs if activation check passed)
    useEffect(() => {
        if (!isDynamicActive) return;

        const controller = new AbortController();

        const loadSections = async () => {
            setLoading(true);
            try {
                const data = await fetchHomepageSections(controller.signal);

                if (isMounted.current) {
                    if (data && data.length > 0) {
                        setSections(data);
                    }
                }
            } catch (err) {
                logger.error('HomePage', 'Critical Dynamic Engine Error', err);

                const current = Number(sessionStorage.getItem('dynamic_home_failures') || 0);
                sessionStorage.setItem('dynamic_home_failures', current + 1);

                if (isMounted.current) {
                    setDynamicError(true);
                }
            } finally {
                if (isMounted.current) {
                    setLoading(false);
                }
            }
        };

        loadSections();
        return () => controller.abort();
    }, [isDynamicActive]);

    // RENDER LOGIC: Priority Cascade (Safety First)

    // 1. Dynamic Mode: Active + Loaded + Safe + Has Content
    if (isDynamicActive && !loading && !dynamicError && sections.length > 0) {
        if (process.env.NODE_ENV === 'development') {
            logger.info('HomePage', 'Dynamic homepage rendered successfully');
        }
        return <SectionRenderer sections={sections} />;
    }

    // 2. Static Fallback (Ultimate Safety Net)
    // SEO metadata is handled by app/page.js generateMetadata
    return (
        <div className="homepage-wrapper">
            <HeroSection />
            <WhatIsBimaSakhi />
            <WhoItIsFor />
            <ProcessOverview />
            <TransparencySection />
            <SocialProofSection />
            <AuthoritySection />
            <BenefitsSection />
            <LocalTrustSection />
            <FAQSection />
            <FinalCTASection />
        </div>
    );
};

export default HomePage;
