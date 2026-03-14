import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/utils/supabase';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { rateLimit } from '@/utils/rateLimiter';

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured. Please add it to your environment variables.");
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const failedLoginStore = new Map();
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request) {
    try {
        const ip = request.ip || request.headers.get('x-forwarded-for') || 'anon';
        const now = Date.now();

        // 1. Check strict IP lockout (Memory Fallback for absolute security)
        const lockoutData = failedLoginStore.get(ip);
        if (lockoutData && lockoutData.count >= MAX_FAILURES && (now - lockoutData.lastFailure < LOCKOUT_MS)) {
            return NextResponse.json({ error: 'IP locked due to excessive failed attempts. Try again in 15 minutes.' }, { status: 429 });
        }

        // 2. Clear old lockout if expired
        if (lockoutData && (now - lockoutData.lastFailure >= LOCKOUT_MS)) {
            failedLoginStore.delete(ip);
        }

        const registerFailure = () => {
            const data = failedLoginStore.get(ip) || { count: 0, lastFailure: now };
            data.count++;
            data.lastFailure = Date.now();
            failedLoginStore.set(ip, data);
        };

        // Distributed Redis Rate Limiting (10 requests global limit per minute per IP to prevent spamming the endpoint entirely)
        const rateLimitResult = await rateLimit(`login:${ip}`, 10, 60);
        if (!rateLimitResult.success) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        // Execute login securely inside a timeout guard protecting from Vercel 504 execution hangs
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Login process timed out gracefully')), 8000)
        );

        const processLogin = async () => {
            // Fetch user from admin_users table
            const { data: user, error: userError } = await supabase
                .from('admin_users')
                .select('id, email, password_hash, role, active')
                .eq('email', email)
                .single();

            if (userError || !user) {
                registerFailure();
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }

            if (!user.active) {
                return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
            }

            // Check password against hash
            const isMatch = await bcrypt.compare(password, user.password_hash);

            if (!isMatch) {
                registerFailure();
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }

            // Success - Reset failure count
            failedLoginStore.delete(ip);

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
        };

        return await Promise.race([
            processLogin(),
            timeoutPromise
        ]);

    } catch (error) {
        console.error('Runtime Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
