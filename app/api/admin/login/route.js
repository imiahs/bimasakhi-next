import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { getServiceSupabase } from '@/utils/supabaseClientSingleton';

export const dynamic = 'force-dynamic';

/**
 * Stage 4 fix (C7): Real RBAC login.
 *
 * Auth flow:
 *   1. If ADMIN_USERS_ENABLED=true or admin_users already has seeded rows →
 *      look up email+password in admin_users table.
 *   2. Only if admin_users is still empty → allow the single ADMIN_PASSWORD
 *      bootstrap fallback.
 *
 * To fully enable real RBAC:
 *   1. Run migration 041_real_rbac_admin_users.sql
 *   2. Insert super_admin row (use scripts/hash_password.js to generate hash)
 *   3. Deploy UI/API changes that submit email+password
 *   4. Remove ADMIN_PASSWORD env var after verifying login works
 */
export async function POST(request) {
    try {
        const body = await request.json();

        const useRealAuth = await shouldUseRealAuth();

        if (useRealAuth) {
            return await handleRealAuth(body);
        } else {
            return await handleLegacyAuth(body);
        }
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

async function shouldUseRealAuth() {
    if (process.env.ADMIN_USERS_ENABLED === 'true') {
        return true;
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .limit(1);

    if (error) {
        console.error('[Auth] Failed to inspect admin_users seed state:', error);
        return false;
    }

    return Array.isArray(data) && data.length > 0;
}

/**
 * Real RBAC: email + password against admin_users table.
 */
async function handleRealAuth(body) {
    const { email, password } = body;

    if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('id, email, name, password_hash, role, is_active')
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .single();

    if (error || !adminUser) {
        // Constant-time delay to prevent timing attacks
        await bcrypt.compare('dummy', '$2b$12$dummy.hash.to.prevent.timing.attack.x');
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const passwordValid = await bcrypt.compare(password, adminUser.password_hash);
    if (!passwordValid) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update last_login_at (non-blocking)
    supabase.from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', adminUser.id)
        .then(() => {}).catch(() => {});

    return issueToken(adminUser.id, adminUser.email, adminUser.role);
}

/**
 * Bootstrap-only fallback: single ADMIN_PASSWORD env var.
 * This is allowed only before admin_users is seeded.
 */
async function handleLegacyAuth(body) {
    const { password } = body;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_PASSWORD) {
        console.error('[Auth] ADMIN_PASSWORD not set and ADMIN_USERS_ENABLED is not true');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (password !== ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Invalid Password' }, { status: 401 });
    }

    const sessionId = crypto.randomUUID();
    return issueToken(sessionId, 'admin@system', 'super_admin');
}

/**
 * Shared: sign JWT and set httpOnly cookie.
 */
async function issueToken(userId, email, role) {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ role, sub: userId, email })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

    const response = NextResponse.json({ success: true, role });

    response.cookies.set({
        name: 'admin_session',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });

    return response;
}
