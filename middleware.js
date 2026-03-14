import { logError } from '@/lib/monitoring/logError';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured. Middleware cannot secure admin routes.');
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Basic sliding window rate store for Edge environments (resets per cold boot)
// Map<IP, { count: number, startTime: number }>
const rateLimitStore = new Map();

/**
 * Injects security headers into every response.
 */
function addSecurityHeaders(response) {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' data: https: blob:; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://region1.google-analytics.com; " +
        "frame-src 'self' https://www.googletagmanager.com; " +
        "frame-ancestors 'none';"
    );
    return response;
}

export async function middleware(request) {
    const { pathname } = request.nextUrl;
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'anon';

    // 0. LOGIN BYPASS (allow login page without auth)
    if (pathname.includes('/login')) {
        return addSecurityHeaders(NextResponse.next());
    }

    // 0.1 DEBUG ROUTE PROTECTION — block debug routes in production
    if (pathname.includes('/debug/')) {
        if (process.env.NODE_ENV === 'production') {
            return addSecurityHeaders(
                NextResponse.json({ error: 'Not Found' }, { status: 404 })
            );
        }
        return addSecurityHeaders(NextResponse.next());
    }

    console.log(`[Middleware] ${request.method} ${pathname} from ${ip}`);

    // 1. RATE LIMITING FOR API ROUTES & JOBS
    if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/jobs')) {
        const now = Date.now();
        const windowSize = 60 * 1000; // 1 minute
        let record = rateLimitStore.get(ip) || { count: 0, startTime: now };

        // Reset window if TTL surpassed
        if (now - record.startTime > windowSize) {
            record = { count: 0, startTime: now };
        }

        record.count++;
        rateLimitStore.set(ip, record);

        if (record.count > 100) {
            return addSecurityHeaders(
                NextResponse.json({ error: 'Too many requests / Rate limit globally exceeded.' }, { status: 429 })
            );
        }

        // CSRF Protection Check for Mutations
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) &&
            pathname !== '/api/admin/auth/login' &&
            pathname !== '/api/admin/debug/worker-test') {
            const origin = request.headers.get('origin') || request.headers.get('referer') || '';
            const host = request.headers.get('host') || '';
            // Basic Origin/Host verification for CSRF in Admin
            if (!origin.includes(host)) {
                return addSecurityHeaders(
                    NextResponse.json({ error: 'CSRF token missing or origin mismatch.' }, { status: 403 })
                );
            }
        }
    }

    // 2. JWT ADMIN SESSION VALIDATION
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {

        // Exclude specific auth and public data routes from strict JWT validation
        if (
            pathname.includes('/login') ||
            pathname === '/api/admin-data/config-get'
        ) {
            return addSecurityHeaders(NextResponse.next());
        }

        const authCookie = request.cookies.get('admin-session')?.value;

        if (!authCookie) {
            if (pathname.startsWith('/api/')) {
                return addSecurityHeaders(
                    NextResponse.json({ error: 'Unauthorized. Missing token.' }, { status: 401 })
                );
            }
            const loginUrl = new URL('/admin/login', request.url);
            loginUrl.searchParams.set('redirect_to', pathname);
            return addSecurityHeaders(NextResponse.redirect(loginUrl));
        }

        try {
            // Cryptographically verify the JWT using Edge-compatible logic
            const { payload } = await jwtVerify(authCookie, JWT_SECRET);

            // Allow request through, append headers if needed
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('x-admin-role', payload.role);
            requestHeaders.set('x-admin-id', payload.sub);

            return addSecurityHeaders(NextResponse.next({
                request: {
                    headers: requestHeaders,
                },
            }));
        } catch (err) {
            // Token is invalid/expired
            if (pathname.startsWith('/api/')) {
                return addSecurityHeaders(
                    NextResponse.json({ error: 'Session expired or invalid token.' }, { status: 401 })
                );
            }
            const loginUrl = new URL('/admin/login', request.url);
            loginUrl.searchParams.set('error', 'session_expired');
            return addSecurityHeaders(NextResponse.redirect(loginUrl));
        }
    }

    // 3. BOT CACHE DELIVERY FOR SEO
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
    const botList = ['googlebot', 'bingbot', 'ahrefsbot', 'semrushbot', 'mj12bot', 'dotbot'];
    const isBot = botList.some(bot => userAgent.includes(bot));

    if (isBot && pathname.startsWith('/bima-sakhi-')) {
        const slug = pathname.substring(1); // removes leading slash
        try {
            const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
            const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

            if (upstashUrl && upstashToken) {
                // Direct REST fetch to Upstash KV cache
                const cacheRes = await fetch(`${upstashUrl}/get/page_cache:${slug}`, {
                    headers: { 'Authorization': `Bearer ${upstashToken}` }
                });
                const data = await cacheRes.json();

                if (data && data.result) {
                    const htmlContent = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
                    const response = new NextResponse(htmlContent, {
                        status: 200,
                        headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Edge-Cache': 'HIT-KV' }
                    });
                    return addSecurityHeaders(response);
                }
            }
        } catch (e) {
            // Silently fallback to SSR render if edge fetch fails
            try {
                await logError('EdgeMiddleware', 'SEO Cache Edge Fetch Failed', e);
            } catch (loggingErr) { }
        }
    }

    return addSecurityHeaders(NextResponse.next());
}

export const config = {
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
