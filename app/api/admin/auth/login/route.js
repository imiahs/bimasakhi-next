import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { rateLimit } from '@/utils/rateLimiter';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || process.env.ADMIN_PASSWORD
);

export async function POST(request) {
    try {
        const ip = request.ip || request.headers.get('x-forwarded-for') || 'anon';

        // Distributed Redis Rate Limiting (5 attempts / 60s)
        const rateLimitResult = await rateLimit(`login:${ip}`, 5, 60);
        if (!rateLimitResult.success) {
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
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
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
