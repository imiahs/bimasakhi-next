import { requireRole } from './verifyAdminSession';
import { rateLimit } from '@/utils/rateLimiter';
import { NextResponse } from 'next/server';
import { safeInsert } from '@/lib/safeSupabase';

// Determines the business action taken based on URL and Verb
const analyzeAdminAction = (method, path) => {
    const urlLower = path.toLowerCase();

    if (urlLower.includes('/api/admin/auth/login')) return 'login';
    if (urlLower.includes('/api/admin/auth/logout')) return 'logout';
    if (urlLower.includes('/api/admin/jobs')) return 'job trigger';
    if (urlLower.includes('/api/admin/seo')) return 'SEO changes';
    if (urlLower.includes('/api/admin/users')) return 'user management';
    if (urlLower.includes('/api/admin/pages') || urlLower.includes('/api/admin/blog')) return 'content changes';

    switch (method) {
        case 'POST': return 'create';
        case 'PUT':
        case 'PATCH': return 'update';
        case 'DELETE': return 'delete';
        case 'GET': return 'read';
        default: return method;
    }
};

/**
 * Higher-order wrapper for admin API route handlers.
 * Verifies admin session before executing the handler.
 */
export function withAdminAuth(handler, allowedRoles = null) {
    return async function protectedHandler(request, context) {
        let ip = 'anon_admin';
        try {
            ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.ip || 'anon_admin';
        } catch (e) { }

        // Global Admin Route Rate Limiter (200 req / minute for valid admins/crons)
        const limitRes = await rateLimit(`admin_api:${ip}`, 200, 60);
        if (!limitRes.success) {
            return NextResponse.json({ error: 'Rate limit exceeded for admin API.' }, { status: 429 });
        }

        // 1. Verify admin session via Middleware injected headers (SINGLE SYSTEM)
        const role = request.headers.get('x-admin-role');
        const userId = request.headers.get('x-admin-user');

        if (!role) {
            return NextResponse.json({ error: 'Unauthorized. No active admin session found.' }, { status: 401 });
        }

        const user = {
            id: userId,
            role: role,
        };

        // 2. Check role if specified
        if (allowedRoles && allowedRoles.length > 0) {
            const roleCheck = requireRole(user, allowedRoles);
            if (!roleCheck.authorized) {
                return roleCheck.response;
            }
        }

        // 3. Execute the actual handler with the authenticated user
        const response = await handler(request, user, context);

        // 4. Background Telemetry: Non-blocking, fail-safe logging
        try {
            const urlObj = new URL(request.url);
            const path = urlObj.pathname;
            const action = analyzeAdminAction(request.method, path);

            // Don't flood logs with simple read operations
            if (action !== 'read') {
                safeInsert('admin_audit_logs', {
                    admin_id: user.id || 'system_worker',
                    admin_email: user.email || 'cron_execution',
                    action: action,
                    target_resource: path,
                    metadata: { params: Object.fromEntries(urlObj.searchParams) },
                    ip_address: ip
                });
            }

            // Global API request monitoring
            safeInsert('api_requests', {
                endpoint: path,
                method: request.method,
                status_code: response.status,
                ip_address: ip,
                user_agent: request.headers.get('user-agent') || 'admin-console'
            });
        } catch {
            // Absolute failsafe — logging must never destroy the response
        }

        return response;
    };
}
