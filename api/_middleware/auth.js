import Redis from 'ioredis';
import { parse } from 'cookie';

// Initialize Redis outside handler for connection reuse
const redis = new Redis(process.env.REDIS_URL);

/**
 * Shared authentication middleware for protected admin API routes.
 * Validates session cookie against Redis and extends TTL (sliding window).
 *
 * Usage:
 *   export default withAuth(async (req, res) => { ... });
 *
 * @param {Function} handler - The route handler to wrap
 * @returns {Function} - Wrapped handler with auth guard
 */
export function withAuth(handler) {
    return async (req, res) => {
        try {
            // Parse cookies using cookie.parse (standardized)
            const cookies = parse(req.headers.cookie || '');
            const sessionId = cookies.admin_session;

            if (!sessionId) {
                return res.status(401).json({ error: 'Unauthorized: No Session' });
            }

            // Check Redis for session validity
            const sessionStatus = await redis.get(`session:${sessionId}`);
            if (!sessionStatus) {
                return res.status(401).json({ error: 'Unauthorized: Invalid Session' });
            }

            // Sliding Window: Extend session by 15 minutes (900s) on every authenticated request
            await redis.expire(`session:${sessionId}`, 900);

            // Attach sessionId to request for downstream use (optional)
            req.sessionId = sessionId;

            // Call the original handler
            return handler(req, res);

        } catch (error) {
            console.error('Auth Middleware Error:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    };
}

// Export redis instance for routes that need direct Redis access
export { redis };
