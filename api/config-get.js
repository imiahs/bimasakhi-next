import Redis from 'ioredis';
import { withLogger } from './_middleware/logger.js';

// Initialize Redis outside handler
const redis = new Redis(process.env.REDIS_URL);

// Default Configuration to ensure the app never crashes on empty KV
const DEFAULT_CONFIG = {
    isAppPaused: false,
    isRedirectPaused: false,
    delhiOnlyMessage: 'Currently onboarding women from Delhi NCR only.',
    ctaText: 'Apply on WhatsApp',
    heroTitle: 'Become a LIC Agent',
    heroTitle: 'Become a LIC Agent',
    heroSubtitle: 'Government Backed Commission Career',
    // Analytics (Default: Disabled)
    isAnalyticsEnabled: false,
    gaMeasurementId: '', // G-XXXXXXXXXX
    gtmContainerId: '',  // GTM-XXXXXXX
    pages: {
        home: {
            title: "Home Page",
            sections: [
                { id: "hero_default", type: "HeroSection", props: {} },
                { id: "trust_default", type: "TrustSignals", props: {} },
                { id: "income_default", type: "IncomeRealityBlock", props: {} },
                { id: "benefits_default", type: "BenefitsBlock", props: {} },
                { id: "how_it_works_default", type: "HowItWorks", props: {} },
                { id: "eligibility_default", type: "EligibilityBlock", props: { id: "elig_home" } },
                { id: "testimonials_default", type: "TestimonialsBlock", props: {} },
                { id: "gallery_default", type: "GalleryBlock", props: {} },
                { id: "faq_default", type: "FAQBlock", props: {} },
                { id: "apply_default", type: "ApplyFormBlock", props: {} }
            ]
        }
    }
};

export default withLogger(async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Fetch from Redis (String)
        const rawConfig = await redis.get('config:global');

        let config = {};
        if (rawConfig) {
            config = JSON.parse(rawConfig);
        }

        // Merge with defaults
        const finalConfig = { ...DEFAULT_CONFIG, ...config };

        return res.status(200).json(finalConfig);

    } catch (error) {
        console.error('Config Verification Error:', error);
        // Fallback to defaults
        return res.status(200).json(DEFAULT_CONFIG);
    }
});
