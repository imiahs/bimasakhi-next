// api/admin/[action].js
// Consolidated Admin Auth handler: login + logout + check
import crypto from 'crypto';
import { parse } from 'cookie';
import { redis } from '../_middleware/auth.js';
import { withLogger } from '../_middleware/logger.js';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { rateLimit } from '@/utils/rateLimiter.js';

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
// ADMIN HELPERS & NEW ACTIONS
// ============================================================
async function verifyAdmin(req) {
    try {
        const cookies = parse(req.headers.cookie || '');
        const sessionId = cookies.admin_session;
        if (!sessionId) return false;
        const sessionStatus = await redis.get(`session:${sessionId}`);
        return sessionStatus === 'active';
    } catch {
        return false;
    }
}

async function handleSystemHealth(req, res) {
    try {
        const supabase = getServiceSupabase();
        
        const today = new Date();
        today.setHours(0,0,0,0);
        const { count: total_leads_today } = await supabase.from('leads')
                                        .select('*', {count: 'exact', head: true})
                                        .gte('created_at', today.toISOString());
        
        const { count: failed_leads_count } = await supabase.from('failed_leads')
                                        .select('*', {count: 'exact', head: true});
        
        const { count: retry_pending } = await supabase.from('failed_leads')
                                        .select('*', {count: 'exact', head: true})
                                        .lt('retry_count', 3);
        
        const { data: last_10_errors } = await supabase.from('system_logs')
                                        .select('*')
                                        .eq('type', 'CRM_ERROR')
                                        .order('created_at', {ascending: false})
                                        .limit(10);
        
        return res.status(200).json({
            total_leads_today,
            failed_leads_count,
            retry_pending,
            last_10_errors,
            ai_status: "Operational",
            crm_status: failed_leads_count > 10 ? "Degraded" : "Operational"
        });
    } catch (e) {
        return res.status(500).json({error: e.message});
    }
}

async function handleQueueStatus(req, res) {
    try {
        const supabase = getServiceSupabase();
        const { data: qData } = await supabase.from('generation_queue').select('status');
        
        let pending = 0, processing = 0, completed = 0, failed = 0;
        if (qData) {
            qData.forEach(q => {
                if (q.status === 'pending') pending++;
                if (q.status === 'processing') processing++;
                if (q.status === 'completed') completed++;
                if (q.status === 'failed') failed++;
            });
        }
        
        return res.status(200).json({ pending, processing, completed, failed });
    } catch (e) {
        return res.status(500).json({error: e.message});
    }
}

async function handleRetryFailed(req, res) {
    try {
        const proto = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host;
        const response = await fetch(`${proto}://${host}/api/jobs/retry-failed-leads`, { method: 'POST' });
        const result = await response.json();
        return res.status(200).json(result);
    } catch (e) {
        return res.status(500).json({error: e.message});
    }
}

async function handleClearFailed(req, res) {
    try {
        const supabase = getServiceSupabase();
        // Delete all bypasses RLS
        await supabase.from('failed_leads').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
        return res.status(200).json({ success: true, message: 'All failed leads cleared.' });
    } catch (e) {
        return res.status(500).json({error: e.message});
    }
}

// ============================================================
// ROUTER
// ============================================================
export default withLogger(async function handler(req, res) {
    const requiredEnvs = ['ADMIN_PASSWORD', 'REDIS_URL'];
    for (const envStr of requiredEnvs) {
        if (!process.env[envStr]) {
            console.error("Missing ENV:", envStr);
            return res.status(500).json({ error: "Server Misconfigured" });
        }
    }

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon';
    const rateLimitResult = await rateLimit(`admin_api:${ip}`, 60, 3600); // Admin API limits
    if (!rateLimitResult.success) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const { action } = req.query;

    switch (action) {
        case 'login':
            return handleLogin(req, res);
        case 'logout':
            return handleLogout(req, res);
        case 'check':
            return handleCheck(req, res);
        case 'system-health':
            if (!await verifyAdmin(req)) return res.status(401).json({error: 'Unauthorized'});
            return handleSystemHealth(req, res);
        case 'queue-status':
            if (!await verifyAdmin(req)) return res.status(401).json({error: 'Unauthorized'});
            return handleQueueStatus(req, res);
        case 'retry-failed':
            if (!await verifyAdmin(req)) return res.status(401).json({error: 'Unauthorized'});
            return handleRetryFailed(req, res);
        case 'clear-failed':
            if (!await verifyAdmin(req)) return res.status(401).json({error: 'Unauthorized'});
            return handleClearFailed(req, res);
        default:
            return res.status(404).json({ error: `Unknown admin action: ${action}` });
    }
});
