// api/admin/[action].js
// Consolidated Admin Auth handler: login + logout + check
import crypto from 'crypto';
import { parse } from 'cookie';
import { redis } from '../_middleware/auth.js';
import { withLogger } from '../_middleware/logger.js';

// --- FAIL-FAST ENV GUARD ---
function assertEnv(vars) {
    const missing = vars.filter(v => !process.env[v]);
    if (missing.length) {
        throw new Error(`Missing required ENV: ${missing.join(', ')}`);
    }
}

// Rate limiting constants
const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 900; // 15 minutes

// ============================================================
// ACTION: login
// ============================================================
async function handleLogin(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    assertEnv(['REDIS_URL', 'ADMIN_PASSWORD']);

    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const rateLimitKey = `login_attempts:${ip}`;

        // --- Rate Limit Check ---
        const attempts = await redis.get(rateLimitKey);
        if (attempts && parseInt(attempts, 10) >= MAX_ATTEMPTS) {
            console.warn(`Rate limited login from ${ip} (${attempts} attempts)`);
            return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
        }

        const { password } = req.body;
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

        if (!ADMIN_PASSWORD) {
            console.error('ADMIN_PASSWORD is not set in environment variables');
            return res.status(500).json({ error: 'Server Misconfiguration' });
        }

        if (password !== ADMIN_PASSWORD) {
            // --- Increment failed attempt counter ---
            const current = await redis.incr(rateLimitKey);
            if (current === 1) {
                // First failure — set the expiry window
                await redis.expire(rateLimitKey, WINDOW_SECONDS);
            }

            console.warn(`Failed login attempt from ${ip} (attempt ${current}/${MAX_ATTEMPTS})`);
            return res.status(401).json({ error: 'Invalid Password' });
        }

        // --- Successful login: clear rate limit counter ---
        await redis.del(rateLimitKey);

        // Generate a random session ID
        const sessionId = crypto.randomUUID();

        // Store session in Redis with 15-minute sliding window (900 seconds)
        await redis.set(`session:${sessionId}`, 'active', 'EX', 900);

        // Set HttpOnly Cookie (Session Cookie - No Max-Age)
        const isProd = process.env.NODE_ENV === 'production';
        const cookieValue = `admin_session=${sessionId}; Path=/; HttpOnly; ${isProd ? 'Secure;' : ''} SameSite=Strict`;

        res.setHeader('Set-Cookie', cookieValue);

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

// ============================================================
// ACTION: logout
// ============================================================
async function handleLogout(req, res) {
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
}

// ============================================================
// ACTION: check
// ============================================================
async function handleCheck(req, res) {
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
        await redis.expire(`session:${sessionId}`, 900);

        return res.status(200).json({ authenticated: true });

    } catch (error) {
        console.error('Auth Check Error:', error);
        // Fail closed
        return res.status(200).json({ authenticated: false, error: 'Check Failed' });
    }
}

// ============================================================
// ROUTER
// ============================================================
export default withLogger(async function handler(req, res) {
    const { action } = req.query;

    switch (action) {
        case 'login':
            return handleLogin(req, res);
        case 'logout':
            return handleLogout(req, res);
        case 'check':
            return handleCheck(req, res);
        default:
            return res.status(404).json({ error: `Unknown admin action: ${action}` });
    }
});
