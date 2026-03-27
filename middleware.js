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

export async function middleware(request) {
    const { pathname } = request.nextUrl;
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'anon';

    // 0. WHITESPACE / DEBUG BYPASS (Absolute Top Priority)
    if (pathname.includes('/debug/') || pathname.includes('/login')) {
        return NextResponse.next();
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
            return NextResponse.json({ error: 'Too many requests / Rate limit globally exceeded.' }, { status: 429 });
        }

        // CSRF Protection Check for Mutations
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) &&
            pathname !== '/api/admin/auth/login' &&
            pathname !== '/api/admin/debug/worker-test' &&
            !pathname.startsWith('/api/jobs')) {
            const origin = request.headers.get('origin') || request.headers.get('referer') || '';
            const host = request.headers.get('host') || '';
            // Basic Origin/Host verification for CSRF in Admin
            if (!origin.includes(host) && !origin.includes(process.env.NEXT_PUBLIC_SUPABASE_URL || 'never-match')) {
                return NextResponse.json({ error: 'CSRF token missing or origin mismatch.' }, { status: 403 });
            }
        }
    }

    // 2. JWT ADMIN SESSION VALIDATION FOR API
    if (pathname.startsWith('/api/admin')) {
        const action = request.nextUrl.searchParams.get('action');

        const publicActions = ['login'];

        if (publicActions.includes(action) || pathname === '/api/admin-data/config-get' || pathname.includes('/debug/')) {
            return NextResponse.next();
        }

        const authCookie = request.cookies.get('admin_session');

        if (!authCookie) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        try {
            // Cryptographically verify the JWT using Edge-compatible logic
            const { payload } = await jwtVerify(authCookie?.value || authCookie, JWT_SECRET);

            // Allow request through, append headers if needed
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('x-admin-role', payload.role);
            requestHeaders.set('x-admin-user', payload.sub);

            return NextResponse.next({
                request: {
                    headers: requestHeaders,
                },
            });
        } catch (err) {
            return NextResponse.json({ error: 'Session expired or invalid token.' }, { status: 401 });
        }
    }

    // 2.5 JWT ADMIN SESSION VALIDATION FOR FRONTEND
    else if (pathname.startsWith('/admin')) {
        // Exclude specific auth and public data routes from strict JWT validation
        if (
            pathname.includes('/login') ||
            pathname.includes('/debug/')
        ) {
            return NextResponse.next();
        }

        const authCookie = request.cookies.get('admin_session');

        if (!authCookie) {
            const loginUrl = new URL('/admin/login', request.url);
            loginUrl.searchParams.set('redirect_to', pathname);
            return NextResponse.redirect(loginUrl);
        }

        try {
            // Cryptographically verify the JWT using Edge-compatible logic
            const { payload } = await jwtVerify(authCookie?.value || authCookie, JWT_SECRET);

            // Allow request through, append headers if needed
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('x-admin-role', payload.role);
            requestHeaders.set('x-admin-user', payload.sub);

            return NextResponse.next({
                request: {
                    headers: requestHeaders,
                },
            });
        } catch (err) {
            // Token is invalid/expired
            const loginUrl = new URL('/admin/login', request.url);
            loginUrl.searchParams.set('error', 'session_expired');
            return NextResponse.redirect(loginUrl);
        }
    }

    // 3. BOT CACHE DELIVERY FOR SEO
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
    const botList = ['googlebot', 'bingbot', 'ahrefsbot', 'semrushbot', 'mj12bot', 'dotbot'];
    const isBot = botList.some(bot => userAgent.includes(bot));

    if (isBot && pathname.startsWith('/bima-sakhi-')) {
        const slug = pathname.substring(1); // removes leading slash
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            // Direct REST fetch bypassing heavyweight Supabase client initialization at edge
            const cacheRes = await fetch(`${supabaseUrl}/rest/v1/page_cache?page_slug=eq.${slug}&select=cached_html`, {
                headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
            });
            const data = await cacheRes.json();

            if (data && data.length > 0 && data[0].cached_html) {
                return new NextResponse(data[0].cached_html, {
                    status: 200,
                    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Edge-Cache': 'HIT' }
                });
            }
        } catch (e) {
            // Silently fallback to SSR render if edge fetch fails
            // Avoid blocking edge thread execution
            try {
                await logError('EdgeMiddleware', 'SEO Cache Edge Fetch Failed', e);
            } catch (loggingErr) { }
        }
    }

    return NextResponse.next();
}

export const config = {
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
