import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    return NextResponse.json({
        success: true,
        data: {
            total_leads: 0,
            conversions: 0,
            conversion_rate: 0,
            active_pages: 0
        }
    });
});
