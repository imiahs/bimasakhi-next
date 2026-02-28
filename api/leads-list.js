import { withAuth } from './_middleware/auth.js';
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
        // Zoho COQL Query
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

        const coqlUrl = `${ZOHO_API_DOMAIN}/crm/v2.1/coql`;

        // Fetch Recent 50 Leads
        // Fields: Last_Name (Name), Mobile, Lead_Status, Lead_Source, Created_Time
        const query = `select Last_Name, Mobile, Lead_Status, Lead_Source, Created_Time from Leads order by Created_Time desc limit 50`;

        const response = await axios.post(coqlUrl, { select_query: query }, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });

        const leads = response.data.data || [];

        return res.status(200).json({ leads });

    } catch (error) {
        console.error("Leads List API Error", error.response ? error.response.data : error.message);
        return res.status(500).json({ error: "Failed to fetch leads" });
    }
}));
