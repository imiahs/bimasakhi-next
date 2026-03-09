import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.ADMIN_PASSWORD || 'fallback_secret_for_development_only'
);

// In-memory rate limiting for brute force protection
const loginAttempts = new Map();

export async function POST(request) {
    try {
        const ip = request.ip || request.headers.get('x-forwarded-for') || 'anon';
        const now = Date.now();

        // Rate limiting logic: Max 5 attempts per minute per IP
        const attemptRecord = loginAttempts.get(ip) || { count: 0, firstAttempt: now };
        if (now - attemptRecord.firstAttempt > 60000) {
            // Reset after 1 minute
            attemptRecord.count = 1;
            attemptRecord.firstAttempt = now;
        } else {
            attemptRecord.count += 1;
        }
        loginAttempts.set(ip, attemptRecord);

        if (attemptRecord.count > 5) {
            return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });
        }

        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        // Fetch user from admin_users table
        const { data: user, error: userError } = await supabase
            .from('admin_users')
            .select('id, email, password_hash, role, active')
            .eq('email', email)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        if (!user.active) {
            return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
        }

        // Check password against hash
        // For local development fallback if you haven't hashed the password yet:
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            // Development fallback backdoor check: 
            // In case the DB was just seeded without hashes, allow the env var password once to securely set the hash.
            // DO NOT leave this in production.
            if (password === process.env.ADMIN_PASSWORD && user.password_hash === 'TEMP_HASH_PLACEHOLDER') {
                const newHash = await bcrypt.hash(password, 10);
                await supabase.from('admin_users').update({ password_hash: newHash }).eq('id', user.id);
            } else {
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }
        }

        // Create JWT Session Token using jose (Edge compatible)
        const token = await new SignJWT({
            sub: user.id,
            role: user.role,
            email: user.email,
            session_id: crypto.randomUUID() // Force new session generation
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('8h') // 8 hours
            .sign(JWT_SECRET);

        // Prepare response with HttpOnly cookie
        const response = NextResponse.json({ success: true, user: { email: user.email, role: user.role } });

        response.cookies.set({
            name: 'admin-session',
            value: token,
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 8 // 8 hours
        });

        return response;

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
