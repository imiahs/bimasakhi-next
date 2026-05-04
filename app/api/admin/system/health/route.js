import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/withAdminAuth';
import { getSystemHealthSnapshot } from '@/lib/system/systemHealth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
    try {
        return NextResponse.json(await getSystemHealthSnapshot());
    } catch (err) {
        console.error('[SystemHealth] Error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}, ['super_admin']);
