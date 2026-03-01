// api/admin-data/[action].js
// Consolidated Admin Data handler: config-get (public), config-save, leads-list, stats (protected)
import axios from 'axios';
import { withAuth, redis as sharedRedis } from '../_middleware/auth.js';
import { withLogger } from '../_middleware/logger.js';
import { getZohoAccessToken, getZohoApiDomain } from '../_middleware/zoho.js';

// --- FAIL-FAST ENV GUARD ---
function assertEnv(vars) {
    const missing = vars.filter(v => !process.env[v]);
    if (missing.length) {
        throw new Error(`Missing required ENV: ${missing.join(', ')}`);
    }
}

// Default Configuration to ensure the app never crashes on empty KV
const DEFAULT_CONFIG = {
    isAppPaused: false,
    isRedirectPaused: false,
    delhiOnlyMessage: 'Currently onboarding women from Delhi NCR only.',
    ctaText: 'Apply on WhatsApp',
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

// ============================================================
// ACTION: config-get (PUBLIC — no auth)
// ============================================================
async function handleConfigGet(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Fetch from Redis (String)
        const rawConfig = await sharedRedis.get('config:global');

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
}

// ============================================================
// ACTION: config-save (PROTECTED)
// ============================================================
async function handleConfigSave(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Process Data
        const newConfig = req.body;

        if (typeof newConfig !== 'object' || newConfig === null) {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        // Safe Merge (Read existing -> Merge -> Write)
        const rawConfig = await sharedRedis.get('config:global');
        const currentConfig = rawConfig ? JSON.parse(rawConfig) : {};

        const mergedConfig = { ...currentConfig, ...newConfig };

        // Store as Stringified JSON
        await sharedRedis.set('config:global', JSON.stringify(mergedConfig));

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Config Save Error:', error);
        return res.status(500).json({ error: 'Failed to update config' });
    }
}

// ============================================================
// ACTION: leads-list (PROTECTED)
// ============================================================
async function handleLeadsList(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    assertEnv(['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN']);

    try {
        const accessToken = await getZohoAccessToken();
        const ZOHO_API_DOMAIN = getZohoApiDomain();
        const coqlUrl = `${ZOHO_API_DOMAIN}/crm/v2.1/coql`;

        // Fetch Recent 50 Leads
        const query = `select Last_Name, Mobile, Lead_Status, Lead_Source, Created_Time from Leads order by Created_Time desc limit 50`;

        const response = await axios.post(coqlUrl, { select_query: query }, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });

        const leads = response.data.data || [];

        return res.status(200).json({ leads });

    } catch (error) {
        console.error("Leads List API Error", error.response ? error.response.data : error.message);
        return res.status(500).json({ error: "Failed to fetch leads" });
    }
}

// ============================================================
// ACTION: stats (PROTECTED)
// ============================================================
async function handleStats(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    assertEnv(['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN']);

    try {
        // 1. Parse Params
        const { range = 'today' } = req.query; // 'today', '7d', '30d'

        // 2. Cache Check
        const cacheKey = `stats:${range}`;
        const cachedStats = await sharedRedis.get(cacheKey);
        if (cachedStats) {
            return res.status(200).json(JSON.parse(cachedStats));
        }

        // 3. Calculate Date Range for Zoho
        const now = new Date();

        // Define Start Date based on Range
        let startDate = new Date();
        if (range === '7d') startDate.setDate(now.getDate() - 7);
        else if (range === '30d') startDate.setDate(now.getDate() - 30);
        else startDate.setHours(0, 0, 0, 0); // Today start

        const startDateStr = startDate.toISOString();

        // 4. Zoho COQL Query (using shared token manager with caching)
        const accessToken = await getZohoAccessToken();
        const ZOHO_API_DOMAIN = getZohoApiDomain();
        const coqlUrl = `${ZOHO_API_DOMAIN}/crm/v2.1/coql`;

        // Q1: Total Applications in Range
        const queryTotal = `select count(id) from Leads where Created_Time >= '${startDateStr}'`;

        // Q2: Attribution (Group By Source)
        const querySource = `select Lead_Source, count(id) from Leads where Created_Time >= '${startDateStr}' group by Lead_Source`;

        const [resTotal, resSource] = await Promise.all([
            axios.post(coqlUrl, { select_query: queryTotal }, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }),
            axios.post(coqlUrl, { select_query: querySource }, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } })
        ]);

        const totalApplications = resTotal.data.data ? resTotal.data.data[0].count : 0;
        const sources = resSource.data.data || [];

        const stats = {
            range,
            generatedAt: new Date().toISOString(),
            totalApplications,
            eligible: 0, // Placeholder
            manualEntries: 0, // Placeholder
            duplicates: 0, // Placeholder
            attribution: sources.map(s => ({ source: s.Lead_Source, count: s.count }))
        };

        // 5. Cache Result (10 Mins = 600s)
        await sharedRedis.set(cacheKey, JSON.stringify(stats), 'EX', 600);

        return res.status(200).json(stats);

    } catch (error) {
        console.error("Stats API Error", error.response ? error.response.data : error.message);
        // Fail gracefully
        return res.status(500).json({ error: "Failed to fetch stats" });
    }
}

// ============================================================
// ROUTER
// config-get is PUBLIC, all others require auth
// ============================================================
export default withLogger(async function handler(req, res) {
    const { action } = req.query;

    switch (action) {
        case 'config-get':
            // Public — no auth wrapper
            return handleConfigGet(req, res);
        case 'config-save':
            // Protected
            return withAuth(handleConfigSave)(req, res);
        case 'leads-list':
            // Protected
            return withAuth(handleLeadsList)(req, res);
        case 'stats':
            // Protected
            return withAuth(handleStats)(req, res);
        default:
            return res.status(404).json({ error: `Unknown admin-data action: ${action}` });
    }
});
