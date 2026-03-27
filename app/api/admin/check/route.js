import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    // If withAdminAuth allows this through, the session is fully valid.
    return NextResponse.json({ authenticated: true, role: user?.role });
});
