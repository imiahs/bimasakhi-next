import { jwtVerify } from 'jose';
import { parse } from 'cookie';

const getJwtSecret = () => new TextEncoder().encode(
    process.env.JWT_SECRET || process.env.ADMIN_PASSWORD
);

/**
 * Verify admin session cryptographically from the request's admin_session cookie.
 * Acts as Layer 2 Defense-in-Depth for Pages API routes.
 *
 * @param {import('http').IncomingMessage} req - The HTTP request
 * @returns {Promise<{ authenticated: boolean, user?: any, error?: string }>}
 */
export async function verifyEdgeSession(req) {
    try {
        const cookies = parse(req.headers?.cookie || '');
        const token = cookies.admin_session;

        if (!token) {
            return { authenticated: false, error: 'No admin session found in cookies' };
        }

        const secret = getJwtSecret();
        if (!secret || secret.byteLength === 0) {
            console.error('[VerifyEdgeSession] JWT_SECRET missing.');
            return { authenticated: false, error: 'Server authentication misconfigured' };
        }

        const { payload } = await jwtVerify(token, secret);

        return {
            authenticated: true,
            user: {
                id: payload.sub,
                role: payload.role,
                target: payload.target,
                iat: payload.iat,
                exp: payload.exp
            }
        };
    } catch (error) {
        console.error('[VerifyEdgeSession] JWT verification failed:', error.message);
        return { authenticated: false, error: 'Session expired or invalid' };
    }
}
