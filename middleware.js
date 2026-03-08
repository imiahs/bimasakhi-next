import { NextResponse } from 'next/server';

export function middleware(request) {
    const { pathname } = request.nextUrl;

    // Only protect /admin routes
    if (pathname.startsWith('/admin')) {
        // Skip login page
        if (pathname === '/admin/login') {
            return NextResponse.next();
        }

        // Check for session cookie (Supabase standard)
        // Note: The specific cookie name might be sb-access-token, or we use a custom one.
        const authCookie = request.cookies.get('sb-access-token') || request.cookies.get('admin-session');

        if (!authCookie) {
            // Redirect to login if unauthorized
            const loginUrl = new URL('/admin/login', request.url);
            loginUrl.searchParams.set('redirect_to', pathname);
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
