// api/admin/[action].js
// Consolidated Admin Auth handler: login + logout + check
import crypto from 'crypto';
import { parse } from 'cookie';
import { SignJWT } from 'jose';
import { redis } from '../_middleware/auth.js';
import { withLogger } from '../_middleware/logger.js';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';
import { rateLimit } from '@/utils/rateLimiter.js';
import { safeLog } from '@/lib/safeLogger.js';
import { generateAlerts, generateActionQueue, generateRecommendations } from '@/lib/intelligenceEngine.js';

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

        // Basic stateless login, defer rate limiting to edge middleware or Vercel WAF
        const { password } = req.body;
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

        if (!ADMIN_PASSWORD) {
            console.error('ADMIN_PASSWORD is not set in environment variables');
            return res.status(500).json({ error: 'Server Misconfiguration' });
        }

        if (password !== ADMIN_PASSWORD) {
            console.warn(`Failed login attempt from ${ip}`);
            return res.status(401).json({ error: 'Invalid Password' });
        }

        // --- Successful login ---

        // Generate base UUID
        const baseTarget = crypto.randomUUID();

        // Wrap as JWT to satisfy Edge Middleware boundary (which strictly demands jwtVerify natively)
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const jwtPayload = await new SignJWT({ role: 'admin', sub: baseTarget })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(secret);

        const sessionId = jwtPayload;

        console.log("SESSION CREATED:", sessionId);
        console.log("SET COOKIE:", sessionId);

        const isProd = process.env.NODE_ENV === 'production';
        const cookieValue = `admin_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; ${isProd ? 'Secure;' : ''} Max-Age=86400`;

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

        // Token invalidation requires a blacklist if purely stateless JWT is used.
        // For now, expiring the cookie immediately is sufficient on the client.

        // Clear Cookie
        // Max-Age=0 expires it immediately
        const isProd = process.env.NODE_ENV === 'production';
        const cookieValue = `admin_session=; Path=/; HttpOnly; SameSite=Lax; ${isProd ? 'Secure;' : ''} Max-Age=0`;
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
        // If middleware allowed this request through, the JWT is valid.
        const role = req.headers['x-admin-role'];
        if (role) {
            return res.status(200).json({ authenticated: true, role });
        }
        return res.status(200).json({ authenticated: false });

    } catch (error) {
        console.error('Auth Check Error:', error);
        // Fail closed
        return res.status(200).json({ authenticated: false, error: 'Check Failed' });
    }
}

// ============================================================
// ADMIN HELPERS & NEW ACTIONS
// ============================================================
// TASK 3: RESPONSE VALIDATOR
function sanitizeResponse(data) {
    if (!data || typeof data !== 'object') return data;
    Object.keys(data).forEach(key => {
        if (data[key] === undefined || data[key] === null) {
            data[key] = 0;
        }
    });
    return data;
}

async function verifyAdmin(req) {
    // Middleware already validates JWT and injects x-admin-role
    const role = req.headers['x-admin-role'];
    return !!role;
}

async function handleSystemHealth(req, res) {
    const startTime = Date.now();
    try {
        const supabase = getServiceSupabase();
        
        const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString();
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const { count: total_leads_today } = await supabase.from('lead_queue')
                                        .select('id', {count: 'exact', head: true})
                                        .gte('created_at', today.toISOString());
        
        const { count: failed_leads_count } = await supabase.from('failed_leads')
                                        .select('id', {count: 'exact', head: true})
                                        .gte('created_at', yesterday);
        
        const { count: retry_pending } = await supabase.from('failed_leads')
                                        .select('id', {count: 'exact', head: true})
                                        .lt('retry_count', 3)
                                        .gte('created_at', yesterday);
        
        const { data: last_10_errors } = await supabase.from('observability_logs')
                                        .select('id, level, message, created_at')
                                        .eq('level', 'ERROR')
                                        .order('created_at', {ascending: false})
                                        .limit(10);
        
        // TASK 1: DATA CONSISTENCY CHECK
        if ((retry_pending || 0) > (failed_leads_count || 0)) {
            safeLog('DATA_MISMATCH', 'Admin metrics mismatch', {
                failed_leads_count: failed_leads_count || 0,
                retry_pending: retry_pending || 0
            });
        }

        // TASK 2: SANITY CHECK RULES
        if ((failed_leads_count || 0) > (total_leads_today || 0)) {
            safeLog('DATA_WARNING', 'Failed leads exceed daily volume', {
                failed_leads_count: failed_leads_count || 0,
                total_leads_today: total_leads_today || 0
            });
        }

        const data = sanitizeResponse({
            total_leads_today,
            failed_leads_count,
            retry_pending,
            last_10_errors: last_10_errors || [],
            ai_status: "Operational",
            crm_status: (failed_leads_count || 0) > 10 ? "Degraded" : "Operational"
        });

        const responsePayload = { success: true, data };

        // TASK 4: ADMIN DEBUG MODE
        if (process.env.ADMIN_DEBUG === 'true') {
            responsePayload.debug = {
                raw_queries: ['leads_count', 'failed_leads_count', 'retry_pending_count', 'last_10_errors'],
                execution_time: Date.now() - startTime
            };
        }

        return res.status(200).json(responsePayload);
    } catch (e) {
        return res.status(500).json({error: e.message});
    }
}

async function handleQueueStatus(req, res) {
    const startTime = Date.now();
    try {
        const supabase = getServiceSupabase();
        
        const [
            { count: pending },
            { count: processing },
            { count: completed },
            { count: failed }
        ] = await Promise.all([
            supabase.from('generation_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('generation_queue').select('id', { count: 'exact', head: true }).eq('status', 'processing'),
            supabase.from('generation_queue').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
            supabase.from('generation_queue').select('id', { count: 'exact', head: true }).eq('status', 'failed')
        ]);
        
        const data = sanitizeResponse({ 
            pending, 
            processing, 
            completed, 
            failed 
        });

        const responsePayload = { success: true, data };

        // TASK 4: ADMIN DEBUG MODE
        if (process.env.ADMIN_DEBUG === 'true') {
            responsePayload.debug = {
                raw_queries: ['generation_queue_pending', 'generation_queue_processing', 'generation_queue_completed', 'generation_queue_failed'],
                execution_time: Date.now() - startTime
            };
        }
        
        return res.status(200).json(responsePayload);
    } catch (e) {
        return res.status(500).json({error: e.message});
    }
}

async function handleRetryFailed(req, res) {
    try {
        const proto = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host;
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon';
        
        const response = await fetch(`${proto}://${host}/api/jobs/retry-failed-leads`, { 
            method: 'POST',
            headers: { 'x-forwarded-for': `retry_admin:${ip}` }
        });
        
        const result = await response.json();
        return res.status(200).json({ success: true, data: result });
    } catch (e) {
        return res.status(500).json({error: e.message});
    }
}

async function handleClearFailed(req, res) {
    try {
        const supabase = getServiceSupabase();
        // Delete safely bounded by origin epoch
        await supabase.from('failed_leads').delete().gt('created_at', '1970-01-01'); 
        return res.status(200).json({ success: true, data: { message: 'All failed leads cleared.' } });
    } catch (e) {
        return res.status(500).json({error: e.message});
    }
}

async function handleGetFailed(req, res) {
    const startTime = Date.now();
    try {
        const supabase = getServiceSupabase();
        
        // Capped query fetching the 50 most recent anomalous leads
        const { data: failed, error } = await supabase.from('failed_leads')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
            
        if (error) {
            if (error.code === 'PGRST205') return res.status(200).json({ success: true, data: sanitizeResponse({ failed_leads: [] }) });
            throw error;
        }
        
        const payload = sanitizeResponse({ failed_leads: failed || [] });
        return res.status(200).json({ success: true, data: payload, debug: process.env.ADMIN_DEBUG === 'true' ? { execution_time: Date.now() - startTime } : undefined });
    } catch(e) {
        return res.status(500).json({error: e.message});
    }
}

async function handleGetLogs(req, res) {
    const startTime = Date.now();
    try {
        const supabase = getServiceSupabase();
        const { type } = req.query;
        
        let query = supabase.from('observability_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); // Hard limit 50
            
        if (type) {
            query = query.eq('level', type);
        }
        
        const { data: logs, error } = await query;
        if (error) {
            if (error.code === 'PGRST205') return res.status(200).json({ success: true, data: sanitizeResponse({ logs: [] }) });
            throw error;
        }
        
        const payload = sanitizeResponse({ logs: logs || [] });
        return res.status(200).json({ success: true, data: payload, debug: process.env.ADMIN_DEBUG === 'true' ? { execution_time: Date.now() - startTime } : undefined });
    } catch(e) {
        return res.status(500).json({error: e.message});
    }
}

async function handleMarkConverted(req, res) {
    try {
        if (req.method !== 'POST') return res.status(405).json({error: 'Method Not Allowed'});
        const { lead_id, conversion_value } = req.body;
        if (!lead_id) return res.status(400).json({error: 'lead_id is required'});
        
        const supabase = getServiceSupabase();
        const value = parseInt(conversion_value) || 0;
        
        const { error } = await supabase.from('lead_queue')
            .update({
                synced_to_zoho: true
            })
            .eq('id', lead_id);
            
        if (error) throw error;
        
        return res.status(200).json({ success: true, data: { message: "Lead marked as converted", lead_id, value } });
    } catch (e) { 
        return res.status(500).json({error: e.message}); 
    }
}

async function handleBusinessMetrics(req, res) {
    const startTime = Date.now();
    try {
        const supabase = getServiceSupabase();
        
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const { count: total_leads } = await supabase.from('lead_queue').select('*', {count: 'exact', head: true});
        const { count: converted_leads } = await supabase.from('lead_queue').select('*', {count: 'exact', head: true}).eq('synced_to_zoho', true);
        const { count: today_leads } = await supabase.from('lead_queue').select('*', {count: 'exact', head: true}).gte('created_at', today.toISOString());
        const { count: today_conversions } = await supabase.from('lead_queue').select('*', {count: 'exact', head: true}).eq('synced_to_zoho', true).gte('created_at', today.toISOString());
        
        const { data: revData } = await supabase.from('lead_queue').select('id').eq('synced_to_zoho', true);
        let estimated_revenue = 0;
        if (revData) estimated_revenue = revData.reduce((acc, lead) => acc + (lead.conversion_value || 0), 0);
        
        const conversion_rate = total_leads > 0 ? ((converted_leads / total_leads) * 100).toFixed(2) + '%' : '0%';
        
        // Sampling top performance (bounded node memory protection)
        const { data: sampleData } = await supabase.from('lead_queue').select('city, source, synced_to_zoho').order('created_at', {ascending: false}).limit(50);
        
        let cityMap = {}, sourceMap = {}, convertSourceMap = {};
        if (sampleData) {
            sampleData.forEach(l => {
                const c = l.city || 'Unknown';
                const s = l.source || 'Organic';
                cityMap[c] = (cityMap[c] || 0) + 1;
                sourceMap[s] = (sourceMap[s] || 0) + 1;
                if (l.synced_to_zoho) convertSourceMap[s] = (convertSourceMap[s] || 0) + 1;
            });
        }
        
        const payload = sanitizeResponse({
            total_leads: total_leads ?? 0,
            converted_leads: converted_leads ?? 0,
            today_leads: today_leads ?? 0,
            today_conversions: today_conversions ?? 0,
            estimated_revenue,
            conversion_rate,
            revenue_per_lead: (total_leads ?? 0) > 0 ? Math.round(estimated_revenue / total_leads) : 0
        });
        
        payload.top_cities = Object.entries(cityMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>({name:x[0], value:x[1]}));
        payload.top_sources = Object.entries(sourceMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>({name:x[0], value:x[1]}));
        payload.top_converting_sources = Object.entries(convertSourceMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>({name:x[0], value:x[1]}));
        
        const responsePayload = { success: true, data: payload };
        if (process.env.ADMIN_DEBUG === 'true') {
            responsePayload.debug = {
                raw_queries: ['business_aggregation'],
                execution_time: Date.now() - startTime
            };
        }
        return res.status(200).json(responsePayload);
    } catch(e) { 
        return res.status(500).json({error: e.message}); 
    }
}

async function handleGetAlerts(req, res) {
    try {
        const alerts = await generateAlerts();
        return res.status(200).json({ success: true, data: alerts });
    } catch (e) { return res.status(500).json({error: e.message}); }
}

async function handleGetActionQueue(req, res) {
    try {
        const alerts = await generateAlerts();
        const queue = generateActionQueue(alerts);
        return res.status(200).json({ success: true, data: queue });
    } catch (e) { return res.status(500).json({error: e.message}); }
}

async function handleGetRecommendations(req, res) {
    try {
        const recommendations = await generateRecommendations();
        return res.status(200).json({ success: true, data: recommendations });
    } catch (e) { return res.status(500).json({error: e.message}); }
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
    const { action } = req.query;

    // TASK 5: LOG EVERY ADMIN CALL
    try {
        safeLog('ADMIN_ACCESS', 'Admin API used', { action: action || 'unknown', ip });
    } catch (e) { 
        console.error("Admin log failed:", e); 
    }

    const rateLimitPrefix = action === 'login' ? 'admin_login' : 'admin_actions';
    const rateLimitResult = await rateLimit(`${rateLimitPrefix}:${ip}`, 60, 3600); // Admin API limits
    
    if (!rateLimitResult.success) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

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
        case 'get-failed':
            if (!await verifyAdmin(req)) return res.status(401).json({error: 'Unauthorized'});
            return handleGetFailed(req, res);
        case 'get-logs':
            if (!await verifyAdmin(req)) return res.status(401).json({error: 'Unauthorized'});
            return handleGetLogs(req, res);
        case 'mark-converted':
            if (!await verifyAdmin(req)) return res.status(401).json({error: 'Unauthorized'});
            return handleMarkConverted(req, res);
        case 'business-metrics':
            if (!await verifyAdmin(req)) return res.status(401).json({error: 'Unauthorized'});
            return handleBusinessMetrics(req, res);
        case 'get-alerts':
            if (!await verifyAdmin(req)) return res.status(401).json({error: 'Unauthorized'});
            return handleGetAlerts(req, res);
        case 'get-action-queue':
            if (!await verifyAdmin(req)) return res.status(401).json({error: 'Unauthorized'});
            return handleGetActionQueue(req, res);
        case 'get-recommendations':
            if (!await verifyAdmin(req)) return res.status(401).json({error: 'Unauthorized'});
            return handleGetRecommendations(req, res);
        default:
            return res.status(404).json({ error: `Unknown admin action: ${action}` });
    }
});
