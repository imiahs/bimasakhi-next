import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getShosSnapshot } from '@/lib/system/shos';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
    try {
        const snapshot = await getShosSnapshot({ dlqLimit: 5, queueLimit: 5, deliveryLimit: 5, alertLimit: 5, errorLimit: 5 });
        return NextResponse.json({
            ...snapshot.health,
            operator_metrics: snapshot.metrics,
            consistency: snapshot.consistency,
            source: snapshot.source,
        });
    } catch (err) {
        console.error('[SystemHealth] Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);
