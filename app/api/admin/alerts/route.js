import { NextResponse } from 'next/server';
import { generateAlerts } from '@/lib/intelligenceEngine';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const alerts = await generateAlerts();
        return NextResponse.json({ success: true, data: alerts });
    } catch (error) {
        console.error('Alerts API error:', error);
        return NextResponse.json({ success: false, error: 'Failed to generate alerts' }, { status: 500 });
    }
});
