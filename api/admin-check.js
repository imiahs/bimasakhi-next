import Redis from 'ioredis';
import { withLogger } from './_middleware/logger.js';
import { parse } from 'cookie';

// Initialize Redis outside handler
const redis = new Redis(process.env.REDIS_URL);

export default withLogger(async function handler(req, res) {
    // Should be GET usually, but no harm in supporting POST if needed. Sticking to GET.
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Parse Cookies using standardized cookie.parse
        const cookies = parse(req.headers.cookie || '');
        const sessionId = cookies.admin_session;

        if (!sessionId) {
            return res.status(200).json({ authenticated: false });
        }

        // Check Redis for session validity
        const sessionStatus = await redis.get(`session:${sessionId}`);

        if (sessionStatus !== 'active') {
            return res.status(200).json({ authenticated: false });
        }

        // Sliding Window: Extend session by 15 mins (900s) on active check
        // This assumes admin-check is only called on navigation/load, NOT polled.
        await redis.expire(`session:${sessionId}`, 900);

        return res.status(200).json({ authenticated: true });

    } catch (error) {
        console.error('Auth Check Error:', error);
        // Fail open? No, fail closed.
        return res.status(200).json({ authenticated: false, error: 'Check Failed' });
    }
});
