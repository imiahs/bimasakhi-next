import axios from 'axios';

/**
 * Zoho OAuth Token Manager
 * 
 * Generates a fresh access token using the refresh token flow.
 * This is the correct approach for serverless environments where
 * static access tokens expire (1 hour validity) and cold starts
 * can make cached tokens invalid.
 * 
 * Uses: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_API_DOMAIN
 */

// In-memory cache for access token (survives warm invocations)
let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get a valid Zoho access token.
 * Uses in-memory cache for warm invocations (avoids redundant token calls).
 * Falls back to refresh token flow if cache is expired or empty.
 * 
 * @returns {Promise<string>} Valid access token
 * @throws {Error} If token refresh fails
 */
export async function getZohoAccessToken() {
    // Return cached token if still valid (with 60s buffer)
    if (cachedToken && Date.now() < tokenExpiry - 60000) {
        return cachedToken;
    }

    const {
        ZOHO_CLIENT_ID,
        ZOHO_CLIENT_SECRET,
        ZOHO_REFRESH_TOKEN,
        ZOHO_API_DOMAIN = 'https://www.zohoapis.in'
    } = process.env;

    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
        throw new Error('Missing Zoho OAuth ENV variables (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN)');
    }

    // Explicit domain mapping (more predictable than string replace)
    const accountsUrl = ZOHO_API_DOMAIN.includes('.in')
        ? 'https://accounts.zoho.in'
        : 'https://accounts.zoho.com';
    const tokenUrl = `${accountsUrl}/oauth/v2/token`;

    const tokenResponse = await axios.post(tokenUrl, null, {
        params: {
            refresh_token: ZOHO_REFRESH_TOKEN,
            client_id: ZOHO_CLIENT_ID,
            client_secret: ZOHO_CLIENT_SECRET,
            grant_type: 'refresh_token'
        }
    });

    if (tokenResponse.data.error) {
        throw new Error(`Zoho Auth Failed: ${tokenResponse.data.error}`);
    }

    cachedToken = tokenResponse.data.access_token;
    // Zoho access tokens are valid for 1 hour (3600s)
    // Cache for 50 minutes to be safe
    tokenExpiry = Date.now() + (50 * 60 * 1000);

    return cachedToken;
}

/**
 * Get the Zoho API domain.
 * @returns {string} API domain URL
 */
export function getZohoApiDomain() {
    return process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.in';
}
