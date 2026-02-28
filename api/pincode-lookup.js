import Redis from 'ioredis';
import axios from 'axios';
import { withLogger } from './_middleware/logger.js';

// Initialize Redis Client
// We assume REDIS_URL is already present in Vercel env
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Logic for Delhi NCR Eligibility
// We define "Delhi NCR" loosely as Delhi state + key NCR districts
const DELHI_NCR_STATES = ['Delhi'];
const DELHI_NCR_DISTRICTS = ['Gurugram', 'Gurgaon', 'Faridabad', 'Noida', 'Gautam Buddha Nagar', 'Ghaziabad'];

export default withLogger(async function handler(req, res) {
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
        // Endpoint: https://api.postalpincode.in/pincode/{PINCODE}
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
        // We usually take the first entry for City/State/District
        const firstEntry = postOffices[0];

        // Extract localities (all unique Names)
        const localities = [...new Set(postOffices.map(po => po.Name))];

        const result = {
            pincode: pincode,
            city: firstEntry.District, // Usually District maps better to City logic (e.g. New Delhi)
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
});
