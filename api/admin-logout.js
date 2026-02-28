import Redis from 'ioredis';
import { withLogger } from './_middleware/logger.js';

// Initialize Redis outside handler
const redis = new Redis(process.env.REDIS_URL);

export default withLogger(async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Parse Cookies to get session ID for KV deletion
        const cookieHeader = req.headers.cookie || '';
        const cookies = Object.fromEntries(
            cookieHeader.split('; ').map(c => {
                const [key, ...v] = c.split('=');
                return [key, v.join('=')];
            })
        );

        const sessionId = cookies['admin_session'];

        if (sessionId) {
            // Delete from Redis (Best effort)
            await redis.del(`session:${sessionId}`);
        }

        // Clear Cookie
        // Max-Age=0 expires it immediately
        const isProd = process.env.NODE_ENV === 'production';
        const cookieValue = `admin_session=; Path=/; HttpOnly; ${isProd ? 'Secure;' : ''} SameSite=Strict; Max-Age=0`;
        res.setHeader('Set-Cookie', cookieValue);

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Logout Error:', error);
        return res.status(500).json({ error: 'Logout Failed' });
    }
});
