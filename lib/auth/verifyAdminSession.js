import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) {
        return null;
    }

    return new TextEncoder().encode(process.env.JWT_SECRET);
};

/**
 * Verify admin session from the request's admin-session cookie.
 * Returns { authenticated: true, user } on success.
 * Returns { authenticated: false, response } on failure (response is a 401 NextResponse).
 */
export async function verifyAdminSession(request) {
    try {
        // Support Vercel CRON or programmatic service execution via Bearer token
        const authHeader = request?.headers?.get('authorization') || request?.headers?.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const bearerToken = authHeader.split(' ')[1];
            if (process.env.CRON_SECRET && bearerToken === process.env.CRON_SECRET) {
                return {
                    authenticated: true,
                    user: {
                        id: 'cron',
                        role: 'super_admin',
                        email: 'cron@system',
                        session_id: 'cron-session'
                    }
                };
            }
        }

        // Support both App Router (request object) and direct cookie access
        let token;
        try {
            if (request?.cookies?.get) {
                token = request.cookies.get('admin_session')?.value;
            } else {
                const cookieStore = await cookies();
                token = cookieStore.get('admin_session')?.value;
            }
        } catch (e) { }

        if (!token) {
            return {
                authenticated: false,
                response: NextResponse.json(
                    { error: 'Unauthorized. No admin session found.' },
                    { status: 401 }
                )
            };
        }

        const secret = getJwtSecret();
        if (!secret || secret.byteLength === 0) {
            console.error('[Auth] JWT_SECRET is not configured.');
            return {
                authenticated: false,
                response: NextResponse.json(
                    { error: 'Server authentication misconfigured.' },
                    { status: 500 }
                )
            };
        }

        const { payload } = await jwtVerify(token, secret);

        return {
            authenticated: true,
            user: {
                id: payload.sub,
                role: payload.role,
                email: payload.email,
                session_id: payload.session_id,
            }
        };
    } catch (error) {
        return {
            authenticated: false,
            response: NextResponse.json(
                { error: 'Session expired or invalid.' },
                { status: 401 }
            )
        };
    }
}

/**
 * Check if the authenticated user has one of the allowed roles.
 * @param {Object} user - The user object from verifyAdminSession
 * @param {string[]} allowedRoles - Array of allowed roles, e.g. ['super_admin', 'editor']
 * @returns {{ authorized: boolean, response?: NextResponse }}
 */
export function requireRole(user, allowedRoles) {
    if (!user || !user.role) {
        return {
            authorized: false,
            response: NextResponse.json(
                { error: 'User role not found.' },
                { status: 403 }
            )
        };
    }

    if (!allowedRoles.includes(user.role)) {
        return {
            authorized: false,
            response: NextResponse.json(
                { error: `Insufficient permissions. Required: ${allowedRoles.join(', ')}` },
                { status: 403 }
            )
        };
    }

    return { authorized: true };
}
