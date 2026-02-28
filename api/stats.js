import { withAuth, redis } from './_middleware/auth.js';
import { withLogger } from './_middleware/logger.js';
import axios from 'axios';

// --- FAIL-FAST ENV GUARD (per-request) ---
function assertEnv(vars) {
    const missing = vars.filter(v => !process.env[v]);
    if (missing.length) {
        throw new Error(`Missing required ENV: ${missing.join(', ')}`);
    }
}

export default withLogger(withAuth(async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    assertEnv(['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN']);

    try {
        // 1. Parse Params
        const { range = 'today' } = req.query; // 'today', '7d', '30d'

        // 2. Cache Check
        const cacheKey = `stats:${range}`;
        const cachedStats = await redis.get(cacheKey);
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

        // 4. Zoho COQL Query
        // Fetch Token
        const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_API_DOMAIN = 'https://www.zohoapis.in' } = process.env;
        const accountsUrl = ZOHO_API_DOMAIN.replace('www.zohoapis', 'accounts.zoho');

        const tokenResponse = await axios.post(`${accountsUrl}/oauth/v2/token`, null, {
            params: {
                refresh_token: ZOHO_REFRESH_TOKEN,
                client_id: ZOHO_CLIENT_ID,
                client_secret: ZOHO_CLIENT_SECRET,
                grant_type: 'refresh_token'
            }
        });

        const accessToken = tokenResponse.data.access_token;
        if (!accessToken) throw new Error("Zoho Token Failed");

        // Execute Queries
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
        await redis.set(cacheKey, JSON.stringify(stats), 'EX', 600);

        return res.status(200).json(stats);

    } catch (error) {
        console.error("Stats API Error", error.response ? error.response.data : error.message);
        // Fail gracefully
        return res.status(500).json({ error: "Failed to fetch stats" });
    }
}));
