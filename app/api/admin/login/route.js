import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { SignJWT } from 'jose';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { password } = body;
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

        if (!ADMIN_PASSWORD) {
            console.error('ADMIN_PASSWORD is not set in environment variables');
            return NextResponse.json({ error: 'Server Misconfiguration' }, { status: 500 });
        }

        if (password !== ADMIN_PASSWORD) {
            return NextResponse.json({ error: 'Invalid Password' }, { status: 401 });
        }

        // --- Successful login ---
        const baseTarget = crypto.randomUUID();
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        
        const token = await new SignJWT({ role: 'admin', sub: baseTarget })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(secret);

        const response = NextResponse.json({ success: true });

        // Phase 4: COOKIE FLOW FIX
        response.cookies.set({
            name: 'admin_session',
            value: token,
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/'
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
