import { verifyAdminSession, requireRole } from './verifyAdminSession';
import { rateLimit } from '@/utils/rateLimiter';
import { NextResponse } from 'next/server';

/**
 * Higher-order wrapper for admin API route handlers.
 * Verifies admin session before executing the handler.
 * 
 * Usage:
 *   export const GET = withAdminAuth(async (request, user) => {
 *       // user is { id, role, email, session_id }
 *       return NextResponse.json({ data: '...' });
 *   });
 * 
 * With role enforcement:
 *   export const DELETE = withAdminAuth(async (request, user) => {
 *       return NextResponse.json({ deleted: true });
 *   }, ['super_admin']);
 * 
 * @param {Function} handler - Async function(request, user) => NextResponse
 * @param {string[]} [allowedRoles] - Optional array of roles allowed to access this route
 * @returns {Function} Wrapped route handler
 */
export function withAdminAuth(handler, allowedRoles = null) {
    return async function protectedHandler(request, context) {
        const ip = request?.ip || request?.headers?.get('x-forwarded-for') || 'anon_admin';

        // Global Admin Route Rate Limiter (200 req / minute for valid admins/crons)
        const limitRes = await rateLimit(`admin_api:${ip}`, 200, 60);
        if (!limitRes.success) {
            return NextResponse.json({ error: 'Rate limit exceeded for admin API.' }, { status: 429 });
        }

        // 1. Verify admin session
        const auth = await verifyAdminSession(request);
        if (!auth.authenticated) {
            return auth.response;
        }

        // 2. Check role if specified
        if (allowedRoles && allowedRoles.length > 0) {
            const roleCheck = requireRole(auth.user, allowedRoles);
            if (!roleCheck.authorized) {
                return roleCheck.response;
            }
        }

        // 3. Execute the actual handler with the authenticated user
        return handler(request, auth.user, context);
    };
}
