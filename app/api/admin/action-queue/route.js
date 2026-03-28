import { NextResponse } from 'next/server';
import { generateActionQueue, generateAlerts } from '@/lib/intelligenceEngine';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request, user) => {
    try {
        const alerts = await generateAlerts();
        const queue = generateActionQueue(alerts);
        return NextResponse.json({ success: true, data: queue });
    } catch (error) {
        console.error('Action queue API error:', error);
        return NextResponse.json({ success: false, error: 'Failed to generate action queue' }, { status: 500 });
    }
});
