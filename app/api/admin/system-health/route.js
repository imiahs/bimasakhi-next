import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    return NextResponse.json({
        success: true,
        data: {
            crm_status: 'operational',
            ai_status: 'operational',
            total_leads_today: 0,
            failed_leads_count: 0,
            retry_pending: 0,
            last_10_errors: []
        }
    });
});
