import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    
    // Clear the cookie securely
    response.cookies.set({
        name: 'admin_session',
        value: '',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 0
    });
    
    return response;
}
