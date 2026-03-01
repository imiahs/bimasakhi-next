// api/lookup/[action].js
// Consolidated Lookup handler: pincode-lookup + callback
import axios from 'axios';
import { redis } from '../_middleware/auth.js';
import { withLogger } from '../_middleware/logger.js';

// Logic for Delhi NCR Eligibility
const DELHI_NCR_STATES = ['Delhi'];
const DELHI_NCR_DISTRICTS = ['Gurugram', 'Gurgaon', 'Faridabad', 'Noida', 'Gautam Buddha Nagar', 'Ghaziabad'];

// ============================================================
// ACTION: pincode
// ============================================================
async function handlePincodeLookup(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { pincode } = req.query;

    if (!pincode || !/^\d{6}$/.test(pincode)) {
        return res.status(400).json({ error: 'Invalid Pincode' });
    }

    try {
        const cacheKey = `pincode:${pincode}`;

        // 1. Check Redis Cache
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log(`Pincode Cache HIT: ${pincode}`);
            return res.status(200).json(JSON.parse(cachedData));
        }

        console.log(`Pincode Cache MISS: ${pincode}`);

        // 2. Fetch from India Post API
        const apiResponse = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = apiResponse.data;

        // India Post returns array: [{ Message, Status, PostOffice: [...] }]
        if (!data || data.length === 0 || data[0].Status !== 'Success') {
            return res.status(404).json({ error: 'Pincode not found' });
        }

        const postOffices = data[0].PostOffice;
        if (!postOffices || postOffices.length === 0) {
            return res.status(404).json({ error: 'No Post Office found for this pincode' });
        }

        // 3. Extract Meaningful Data
        const firstEntry = postOffices[0];

        // Extract localities (all unique Names)
        const localities = [...new Set(postOffices.map(po => po.Name))];

        const result = {
            pincode: pincode,
            city: firstEntry.District,
            state: firstEntry.State,
            district: firstEntry.District,
            localities: localities,
            eligible: false
        };

        // 4. Determine Eligibility
        const isStateMatch = DELHI_NCR_STATES.some(s => result.state.includes(s));
        const isDistrictMatch = DELHI_NCR_DISTRICTS.some(d => result.district.includes(d));

        if (isStateMatch || isDistrictMatch) {
            result.eligible = true;
        }

        // 5. Cache in Redis (TTL: 30 Days = 2592000 seconds)
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 2592000);

        return res.status(200).json(result);

    } catch (error) {
        console.error('Pincode Lookup Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

// ============================================================
// ACTION: callback (Zoho OAuth callback)
// ============================================================
async function handleCallback(req, res) {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: "Authorization code missing" });
    }

    return res.status(200).json({
        success: true,
        message: "Zoho authorization code received",
        code
    });
}

// ============================================================
// ROUTER
// ============================================================
export default withLogger(async function handler(req, res) {
    const { action } = req.query;

    switch (action) {
        case 'pincode':
            return handlePincodeLookup(req, res);
        case 'callback':
            return handleCallback(req, res);
        default:
            return res.status(404).json({ error: `Unknown lookup action: ${action}` });
    }
});
