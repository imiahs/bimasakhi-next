import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.ADMIN_PASSWORD || 'fallback_secret_for_development_only'
);

// Basic in-memory rate store for Edge environments (resets per cold boot)
const rateLimitStore = new Map();

export async function middleware(request) {
    const { pathname } = request.nextUrl;
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'anon';

    // 1. RATE LIMITING FOR API ROUTES
    if (pathname.startsWith('/api/admin')) {
        const currentCount = rateLimitStore.get(ip) || 0;
        if (currentCount > 60) {
            return NextResponse.json({ error: 'Too many requests / Rate limit globally exceeded.' }, { status: 429 });
        }
        rateLimitStore.set(ip, currentCount + 1);

        // CSRF Protection Check for Mutations
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
            const origin = request.headers.get('origin') || request.headers.get('referer');
            if (origin && !origin.includes(process.env.NEXT_PUBLIC_SUPABASE_URL) && !origin.includes('bimasakhi')) {
                // Mock implementation, would strictly check against allowed origins
                // console.warn('Suspicious CSRF matched against origin:', origin);
            }
        }
    }

    // 2. JWT ADMIN SESSION VALIDATION
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {

        // Exclude specific auth routes from JWT validation
        if (pathname === '/admin/login' || pathname === '/api/admin/auth/login') {
            return NextResponse.next();
        }

        const authCookie = request.cookies.get('admin-session')?.value;

        if (!authCookie) {
            if (pathname.startsWith('/api/')) {
                return NextResponse.json({ error: 'Unauthorized. Missing token.' }, { status: 401 });
            }
            const loginUrl = new URL('/admin/login', request.url);
            loginUrl.searchParams.set('redirect_to', pathname);
            return NextResponse.redirect(loginUrl);
        }

        try {
            // Cryptographically verify the JWT using Edge-compatible logic
            const { payload } = await jwtVerify(authCookie, JWT_SECRET);

            // Allow request through, append headers if needed
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('x-admin-role', payload.role);
            requestHeaders.set('x-admin-id', payload.sub);

            return NextResponse.next({
                request: {
                    headers: requestHeaders,
                },
            });
        } catch (err) {
            // Token is invalid/expired
            if (pathname.startsWith('/api/')) {
                return NextResponse.json({ error: 'Session expired or invalid token.' }, { status: 401 });
            }
            const loginUrl = new URL('/admin/login', request.url);
            loginUrl.searchParams.set('error', 'session_expired');
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    // Match all request paths except for the ones starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
