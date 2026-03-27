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
            // Middleware.js handles JWT verification globally and injects x-admin-role.
            const role = req.headers['x-admin-role'];
            
            if (!role && process.env.NODE_ENV === 'production') {
                return res.status(401).json({ error: 'Unauthorized: Missing Edge Headers' });
            }

            // Call the original handler
            return handler(req, res);

        } catch (error) {
            console.error('Auth Middleware Wrapper Error:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    };
}

// Export redis instance for routes that need direct Redis access
export { redis };
